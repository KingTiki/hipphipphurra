import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageMetadata } from '../scripts/image-tags.mjs';

const input = { repository: 'Example/Hipphipphurra', ref: 'refs/tags/v1.2.3', sha: 'a'.repeat(40),
  event: 'release', action: 'published', release: { tag_name: 'v1.2.3', draft: false, prerelease: false } };
const withVersion = tag => ({ ...input, ref: `refs/tags/${tag}`, release: { ...input.release, tag_name: tag } });

test('published stable release publishes its version, commit tag and latest', () => {
  assert.deepEqual(imageMetadata(input), { image: 'ghcr.io/example/hipphipphurra', tag: '1.2.3', shaTag: `sha-${input.sha}`, latest: true });
});
test('branch pushes, tag pushes and pull requests never publish an image', () => {
  for (const event of ['push', 'pull_request', 'pull_request_target']) {
    assert.equal(imageMetadata({ ...input, event }), null);
    assert.equal(imageMetadata({ ...input, event, ref: 'refs/heads/main' }), null);
  }
});
test('manual workflow runs never bypass release-only publication', () => {
  assert.equal(imageMetadata({ ...input, event: 'workflow_dispatch' }), null);
});
test('drafts and release actions other than published do not publish', () => {
  assert.equal(imageMetadata({ ...input, release: { ...input.release, draft: true } }), null);
  for (const action of ['created', 'edited', 'deleted', 'unpublished', 'released', 'prereleased']) {
    assert.equal(imageMetadata({ ...input, action }), null);
  }
});
test('GitHub prereleases publish a version but never update latest', () => {
  const metadata = imageMetadata({ ...input, release: { ...input.release, prerelease: true } });
  assert.equal(metadata.tag, '1.2.3'); assert.equal(metadata.latest, false);
});
test('prerelease version suffix protects latest even if the GitHub flag was missed', () => {
  const metadata = imageMetadata(withVersion('v1.2.3-rc.1'));
  assert.equal(metadata.tag, '1.2.3-rc.1'); assert.equal(metadata.latest, false);
});
test('release payload and checked-out tag must match', () => {
  assert.throws(() => imageMetadata({ ...input, ref: 'refs/heads/main' }));
  assert.throws(() => imageMetadata({ ...input, ref: 'refs/tags/v2.0.0' }));
  assert.throws(() => imageMetadata({ ...input, release: { ...input.release, prerelease: undefined } }));
});
test('malformed versions and unsupported build metadata fail before registry login', () => {
  for (const tag of ['v1', 'v01.2.3', 'v1.2.3-', 'v1.2.3-rc..1', 'v1.2.3-01', 'v1.2.3+build.1', 'vbad\nlatest', '1.2.3']) {
    assert.throws(() => imageMetadata(withVersion(tag)));
  }
});
test('image names and commit IDs cannot inject shell or GitHub output data', () => {
  for (const repository of ['owner/repo\nextra=value', 'owner/repo;command', '../repo', 'repo']) {
    assert.throws(() => imageMetadata({ ...input, repository }));
  }
  assert.throws(() => imageMetadata({ ...input, sha: 'short-sha' }));
});

test('CLI reads the published release payload and exports version and latest policy to GitHub', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hipphipphurra-release-'));
  try {
    const payload = join(dir, 'event.json'); const output = join(dir, 'output.txt');
    writeFileSync(payload, JSON.stringify({ action: input.action, release: input.release }));
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/image-tags.mjs', import.meta.url))], {
      env: { ...process.env, GITHUB_EVENT_PATH: payload, GITHUB_OUTPUT: output, GITHUB_EVENT_NAME: input.event,
        GITHUB_REPOSITORY: input.repository, GITHUB_REF: input.ref, GITHUB_SHA: input.sha }, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readFileSync(output, 'utf8').trim().split('\n'), [
      'image=ghcr.io/example/hipphipphurra', 'tag=1.2.3', `sha_tag=sha-${input.sha}`, 'latest=true',
    ]);
  } finally {
    assert.ok(resolve(dir).startsWith(resolve(tmpdir()) + sep + 'hipphipphurra-release-'));
    rmSync(dir, { recursive: true, force: true });
  }
});
