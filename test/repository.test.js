import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRepository } from '../scripts/check-repo.mjs';

const source = fileURLToPath(new URL('../', import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'hipphipphurra-repository-'));
  t.after(() => {
    const expected = resolve(tmpdir()) + sep + 'hipphipphurra-repository-';
    assert.ok(resolve(root).startsWith(expected));
    rmSync(root, { recursive: true, force: true });
  });
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of new Set(files)) {
    const target = join(root, file); mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(source, file), target);
  }
  execFileSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: root });
  return root;
}

test('fresh Git checkout candidates pass without local data or design exports', t => {
  const root = fixture(t); const { files, issues } = checkRepository(root);
  assert.deepEqual(issues, []);
  assert.ok(files.includes('.env.example'));
  assert.ok(files.every(file => !file.startsWith('data/') && !file.startsWith('designs/')));
});

test('ignored private files are excluded, but forced tracked secrets are rejected', t => {
  const root = fixture(t);
  writeFileSync(join(root, '.env'), 'TEAMS_WEBHOOK_URL=\n');
  assert.deepEqual(checkRepository(root).issues, []);
  execFileSync('git', ['add', '--force', '.env'], { cwd: root });
  assert.ok(checkRepository(root).issues.some(issue => issue.startsWith('.env: private/local file')));
});

test('credential checks inspect staged contents even when working file was cleaned', t => {
  const root = fixture(t);
  const credential = ['gh', 'p_', 'a'.repeat(36)].join('');
  writeFileSync(join(root, 'notes.txt'), credential);
  execFileSync('git', ['add', 'notes.txt'], { cwd: root });
  writeFileSync(join(root, 'notes.txt'), 'redacted\n');
  const { issues } = checkRepository(root);
  assert.ok(issues.some(issue => issue.includes('notes.txt:1 (index): GitHub token')));
  assert.ok(issues.every(issue => !issue.includes(credential)));
});
