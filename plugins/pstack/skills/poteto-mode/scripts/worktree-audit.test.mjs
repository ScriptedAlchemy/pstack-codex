import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const audit = fileURLToPath(new URL('./worktree-audit.sh', import.meta.url));
test('audit preserves spaced paths, scopes session metadata, and holds unpreserved work', () => {
  const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pstack audit ')));
  const repo = path.join(fixture, 'main repo');
  const home = path.join(fixture, 'home');
  const bin = path.join(fixture, 'bin');
  fs.mkdirSync(repo); fs.mkdirSync(bin); fs.mkdirSync(home);
  const env = {...process.env, HOME:home, PATH:`${bin}:${process.env.PATH}`, GIT_CONFIG_NOSYSTEM:'1'};
  const git = (...args) => execFileSync('git', ['-C',repo,...args], {env,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try {
    git('init','-b','main'); git('config','user.name','Fixture'); git('config','user.email','fixture@example.invalid');
    git('commit','--allow-empty','-m','base'); git('update-ref','refs/remotes/origin/main','HEAD');
    const paths = {};
    for (const branch of ['safe','recent','quoted','closed','scratch']) {
      paths[branch] = path.join(fixture,`${branch} tree`);
      git('worktree','add','-b',branch,paths[branch],'main');
    }
    execFileSync('git',['-C',paths.closed,'commit','--allow-empty','-m','unmerged'],{env,stdio:'ignore'});
    fs.writeFileSync(path.join(paths.scratch,'precious.txt'),'user work');
    fs.writeFileSync(path.join(bin,'gh'),'#!/bin/sh\nprintf \'[{"number":1,"state":"CLOSED","headRefName":"closed"}]\\n\'\n',{mode:0o755});
    const sessions=path.join(home,'.codex','sessions'); fs.mkdirSync(sessions,{recursive:true});
    fs.writeFileSync(path.join(sessions,'recent chat.jsonl'), JSON.stringify({type:'session_meta',payload:{cwd:paths.recent}})+'\n');
    fs.writeFileSync(path.join(sessions,'quoted chat.jsonl'), JSON.stringify({type:'session_meta',payload:{cwd:repo}})+'\n'+JSON.stringify({type:'message',text:paths.quoted})+'\n');
    const out=execFileSync('bash',[audit,repo],{env,encoding:'utf8'});
    const rows=new Map(out.trim().split('\n').slice(1).map(line=>{const c=line.split('\t'); return [c[8],c];}));
    assert.equal(rows.size,5);
    assert.equal(rows.get(paths.safe)[7],'safe');
    assert.equal(rows.get(paths.recent)[7],'verify-recent-chat');
    assert.equal(rows.get(paths.quoted)[7],'safe');
    assert.equal(rows.get(paths.closed)[7],'review');
    assert.equal(rows.get(paths.scratch)[7],'hold-wip');
    assert.equal(fs.readFileSync(path.join(paths.scratch,'precious.txt'),'utf8'),'user work');
  } finally { fs.rmSync(fixture,{recursive:true,force:true}); }
});
