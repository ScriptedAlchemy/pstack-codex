import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

path = Path(__file__).resolve().parents[2] / 'plugins/pstack/scripts/modal-run.py'
spec = importlib.util.spec_from_file_location('modal_run', path)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class SnapshotTest(unittest.TestCase):
    def test_entrypoints_refuse_execution_without_remote_marker(self):
        root = path.parents[3]
        env = {key: value for key, value in os.environ.items() if key != 'PSTACK_EXECUTOR'}
        for name in ['test.sh', 'validate.sh']:
            result = subprocess.run(['bash', str(root / 'scripts' / name)], env=env, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn('local execution is disabled', result.stderr)
            self.assertEqual(result.stdout, '')

    def test_current_contents_deletions_and_explicit_untracked_fixture(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source, target = root / 'source', root / 'target'
            source.mkdir()
            target.mkdir()
            subprocess.run(['git', 'init', '-q', str(source)], check=True)
            (source / 'code.txt').write_text('old')
            (source / 'deleted.txt').write_text('old')
            subprocess.run(['git', 'add', '.'], cwd=source, check=True)
            (source / 'code.txt').write_text('current')
            (source / 'deleted.txt').unlink()
            (source / 'fixture.txt').write_text('explicit')
            (source / 'private.txt').write_text('do not upload')
            hashes = runner.snapshot(source, target, ['fixture.txt'])
            self.assertEqual(set(hashes), {'code.txt', 'fixture.txt'})
            self.assertEqual((target / 'code.txt').read_text(), 'current')
            self.assertFalse((target / 'private.txt').exists())
            for name in ['../outside', '/absolute', '.env', '.npmrc']:
                with self.assertRaises(ValueError):
                    runner.snapshot(source, target, [name])
            (source / 'escape').symlink_to(root)
            with self.assertRaises(ValueError):
                runner.snapshot(source, target, ['escape'])
            with self.assertRaises(FileNotFoundError):
                runner.snapshot(source, target, ['missing.txt'])


if __name__ == '__main__':
    unittest.main()
