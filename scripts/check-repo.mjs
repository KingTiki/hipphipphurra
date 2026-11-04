import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const privateDirectory = /(?:^|\/)(?:data|backups|node_modules|\.cache|coverage|designs|\.aws|\.agents|\.codex|\.idea|\.vscode)(?:\/|$)/i;
const privateFile = /(?:^|\/)(?:\.env(?:\..*)?|[^/]+\.(?:sqlite(?:3)?(?:-.*)?|db(?:-.*)?|pem|key|p12|pfx|bak)|[^/]+\.log)$/i;
const secretPatterns = [
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['Cloud access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['Teams webhook credential', /https:\/\/[^\s"'<>]*(?:logic\.azure\.com|webhook\.office\.com|api\.powerplatform\.com)[^\s"'<>]+/g],
  ['URL with credentials', /https?:\/\/[^\s/:@]+:[^\s/@]+@/g],
];
const fontFiles = ['bricolage-grotesque', 'dm-sans'];
const required = ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md', 'SECURITY.md', 'CONTRIBUTING.md', '.env.example',
  ...fontFiles.flatMap(name => [`public/fonts/${name}-latin.woff2`, `public/fonts/${name}-OFL.txt`])];

export function checkRepository(cwd = process.cwd()) {
  const git = args => execFileSync('git', args, { cwd, maxBuffer: 16 * 1024 * 1024 });
  const paths = args => git(args).toString('utf8').split('\0').filter(Boolean);
  const files = [...new Set(paths(['ls-files', '-z', '--cached', '--others', '--exclude-standard']))];
  const indexed = new Set(paths(['ls-files', '-z', '--cached']));
  const issues = [];
  function scan(file, buffer, source) {
    if (buffer.includes(0)) return;
    const text = buffer.toString('utf8');
    for (const [kind, pattern] of secretPatterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        const line = text.slice(0, match.index).split('\n').length;
        issues.push(`${file}:${line} (${source}): ${kind}; value redacted`);
      }
    }
  }
  for (const file of files) {
    if (privateDirectory.test(file) || (file !== '.env.example' && privateFile.test(file))) {
      issues.push(`${file}: private/local file must not be published`);
      continue;
    }
    const fullPath = resolve(cwd, file);
    const working = existsSync(fullPath) ? readFileSync(fullPath) : null;
    if (working) scan(file, working, 'working tree');
    if (indexed.has(file)) {
      const staged = git(['show', `:${file}`]);
      if (!working || !staged.equals(working)) scan(file, staged, 'index');
    }
  }
  for (const file of required) {
    if (!files.includes(file) || !existsSync(resolve(cwd, file))) issues.push(`${file}: required publication/license file missing`);
  }
  const noticesPath = resolve(cwd, 'THIRD_PARTY_NOTICES.md');
  const notices = existsSync(noticesPath) ? readFileSync(noticesPath, 'utf8') : '';
  for (const name of fontFiles) {
    const fontPath = resolve(cwd, `public/fonts/${name}-latin.woff2`);
    const licensePath = resolve(cwd, `public/fonts/${name}-OFL.txt`);
    if (existsSync(fontPath)) {
      const hash = createHash('sha256').update(readFileSync(fontPath)).digest('hex');
      if (!notices.includes(hash)) issues.push(`${name}: font checksum missing from THIRD_PARTY_NOTICES.md`);
    }
    if (existsSync(licensePath) && !readFileSync(licensePath, 'utf8').includes('SIL OPEN FONT LICENSE Version 1.1')) {
      issues.push(`${name}: OFL license text missing`);
    }
  }
  const packagePath = resolve(cwd, 'package.json');
  if (existsSync(packagePath) && JSON.parse(readFileSync(packagePath, 'utf8')).license !== 'MIT') {
    issues.push('package.json: expected MIT license metadata');
  }
  return { files, issues };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { files, issues } = checkRepository();
    if (issues.length) {
      console.error(issues.join('\n'));
      process.exitCode = 1;
    } else console.log(`Checked ${files.length} Git publication candidates: private-file rules, credential patterns and font license notices passed.`);
  } catch (error) {
    console.error(`Repository check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
