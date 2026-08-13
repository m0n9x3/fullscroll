import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const roots = ['src', 'scripts'];
const files = ['examples/mobile/entry.js'];

for (const root of roots) {
  const entries = await readdir(root, { withFileTypes: true });
  files.push(
    ...entries
      .filter((entry) => entry.isFile() && /\.m?js$/.test(entry.name))
      .map((entry) => join(root, entry.name)),
  );
}

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
