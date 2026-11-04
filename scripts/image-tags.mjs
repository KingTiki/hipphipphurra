import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function imageMetadata({ repository, ref, sha, event, action, release }) {
  if (event !== 'release' || action !== 'published' || release?.draft !== false) return null;
  if (typeof release.tag_name !== 'string' || !release.tag_name.startsWith('v') || ref !== `refs/tags/${release.tag_name}`) {
    throw new Error('The checked-out tag must match the published release version tag.');
  }
  if (typeof release.prerelease !== 'boolean') throw new Error('The release prerelease flag is required.');
  const imagePath = String(repository || '').toLowerCase();
  const component = '[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*';
  if (!new RegExp(`^${component}/${component}$`).test(imagePath)) {
    throw new Error('GitHub repository must be a valid owner/repository Docker image path.');
  }
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('A full GitHub commit SHA is required.');
  const tag = release.tag_name.slice(1);
  const version = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(tag);
  if (!version || tag.length > 128 || version[4]?.split('.').some(part => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) {
    throw new Error('Release tags must use vMAJOR.MINOR.PATCH with an optional prerelease suffix; build metadata is not supported.');
  }
  return { image: `ghcr.io/${imagePath}`, tag, shaTag: `sha-${sha}`, latest: !release.prerelease && !version[4] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const payload = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
    const metadata = imageMetadata({ repository: process.env.GITHUB_REPOSITORY, ref: process.env.GITHUB_REF,
      sha: process.env.GITHUB_SHA, event: process.env.GITHUB_EVENT_NAME, action: payload.action, release: payload.release });
    if (!metadata) throw new Error('This event/ref is not eligible for image publication.');
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `image=${metadata.image}\ntag=${metadata.tag}\nsha_tag=${metadata.shaTag}\nlatest=${metadata.latest}\n`);
    }
    console.log(JSON.stringify(metadata));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
