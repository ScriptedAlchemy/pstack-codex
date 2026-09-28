#!/usr/bin/env python3
"""Run a verification command on Modal; keep only source transfer and logs local."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def relative_path(value):
    path = Path(value)
    if path.is_absolute() or '..' in path.parts or not path.parts:
        raise ValueError(f'Expected a relative path: {value}')
    return path


def snapshot(source, target, includes):
    names = subprocess.check_output(['git', 'ls-files', '-z', '--cached'], cwd=source).decode().split('\0')
    names = set(filter(None, names)) | set(includes)
    hashes = {}
    for name in sorted(names):
        path = relative_path(name)
        if any(p in {'.git', 'node_modules', '.venv'} for p in path.parts):
            raise ValueError(f'Excluded source path: {name}')
        if path.name.startswith('.env') and path.name not in {'.env.example', '.env.sample'} or path.name in {'.npmrc', '.pypirc'}:
            raise ValueError(f'Use Modal secrets or explicit non-secret environment values instead: {name}')
        local = source / path
        if not local.exists():
            if name in includes:
                raise FileNotFoundError(local)
            continue
        if local.is_symlink() or not local.is_file() or not local.resolve().is_relative_to(source):
            raise ValueError(f'Source must be a regular file inside the checkout: {name}')
        dest = target / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(local, dest)
        hashes[name] = hashlib.sha256(dest.read_bytes()).hexdigest()
    return hashes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--command', required=True)
    parser.add_argument('--include', action='append', default=[], help='Additional untracked source file, relative to source')
    parser.add_argument('--dependency', action='append', default=[], help='File needed by cached setup, e.g. package-lock.json')
    parser.add_argument('--setup', action='append', default=[], help='Remote image setup command; never executes locally')
    parser.add_argument('--artifact', action='append', default=[], help='Required output path relative to /workspace, collected even on failure')
    parser.add_argument('--env', action='append', default=[], help='Non-secret KEY=value; never inherited from the host')
    parser.add_argument('--secret', action='append', default=[], help='Existing Modal secret name')
    parser.add_argument('--image', default='node:24.11.0-bookworm-slim')
    parser.add_argument('--timeout', type=int, default=1200)
    args = parser.parse_args()
    if not 1 <= args.timeout <= 3600:
        parser.error('--timeout must be between 1 and 3600 seconds')
    source = args.source.resolve()
    args.out = args.out.resolve()
    if args.out.is_relative_to(source):
        parser.error('--out must be outside the source checkout')
    args.out.mkdir(parents=True, exist_ok=False)
    env = {**dict(item.split('=', 1) for item in args.env), 'PSTACK_EXECUTOR': 'modal'}
    artifacts = [str(relative_path(p)) for p in args.artifact]
    record = {'executor': 'modal', 'source': str(source), 'command': args.command, 'image': args.image,
              'setup': args.setup, 'dependencies': args.dependency, 'artifacts': artifacts,
              'environment': env, 'secrets': args.secret, 'timeout': args.timeout, 'status': 'blocked', 'exitCode': None}
    sandbox = None
    try:
        import modal
        record['modalSdkVersion'] = modal.__version__
        with tempfile.TemporaryDirectory(prefix='pstack-source-') as temp:
            tree = Path(temp)
            record['files'] = snapshot(source, tree, args.include)
            record['gitHead'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=source, text=True).strip()
            (args.out / 'source.json').write_text(json.dumps(record['files'], indent=2) + '\n')
            image = modal.Image.from_registry(args.image, add_python='3.12').apt_install('git', 'ripgrep', 'jq').workdir('/workspace')
            for name in args.dependency:
                path = relative_path(name)
                if name not in record['files']:
                    raise ValueError(f'Dependency not in source snapshot: {name}')
                image = image.add_local_file(tree / path, '/workspace/' + str(path), copy=True)
            for command in args.setup:
                image = image.run_commands('cd /workspace && ' + command)
            image = image.add_local_dir(tree, '/workspace')
            with modal.enable_output():
                app = modal.App.lookup('pstack-verification', create_if_missing=True)
                sandbox = modal.Sandbox.create(app=app, image=image, workdir='/workspace', env=env,
                    secrets=[modal.Secret.from_name(name) for name in args.secret],
                    cpu=4, memory=8192, timeout=args.timeout + 120)
                record['sandboxId'] = sandbox.object_id
                record['imageId'] = image.object_id
                print(f'Modal sandbox: {sandbox.object_id}', flush=True)
                process = sandbox.exec('bash', '-o', 'pipefail', '-c', 'exec 2>&1\n' + args.command, timeout=args.timeout)
                with (args.out / 'command.log').open('w') as log:
                    for chunk in process.stdout:
                        log.write(chunk)
                        log.flush()
                        print(chunk, end='', flush=True)
                process.wait()
                record['exitCode'] = process.returncode
                record['status'] = 'blocked' if process.returncode < 0 else ('passed' if process.returncode == 0 else 'failed')
                if artifacts:
                    archive = sandbox.exec('tar', '-cf', '/tmp/pstack-artifacts.tar', '--', *artifacts, timeout=60)
                    archive.wait()
                    if archive.returncode:
                        raise RuntimeError('Artifact collection failed: ' + archive.stderr.read())
                    sandbox.filesystem.copy_to_local('/tmp/pstack-artifacts.tar', str(args.out / 'artifacts.tar'))
    except BaseException as error:
        record['status'] = 'blocked'
        record['error'] = str(error)
        raise
    finally:
        try:
            if sandbox is not None:
                sandbox.terminate(wait=True)
                record['cleanup'] = 'terminated'
        finally:
            (args.out / 'result.json').write_text(json.dumps(record, indent=2) + '\n')
    return record['exitCode']


if __name__ == '__main__':
    raise SystemExit(main())
