import { readFile, stat } from 'node:fs/promises';

const limits = new Map([
  // 46KB: the author-attribute preserving restore added ~2KB (see src/dom.js).
  ['dist/fullscroll.min.js', 46 * 1024],
  ['dist/fullscroll.min.css', 6 * 1024],
  ['dist/fullscroll.d.ts', 12 * 1024],
  ['examples/mobile/index.html', 400 * 1024],
]);

for (const [file, maximum] of limits) {
  const details = await stat(file);
  if (details.size > maximum) {
    throw new Error(`${file} 크기가 제한을 넘었습니다: ${details.size} > ${maximum}`);
  }
}

const required = [
  'dist/fullscroll.esm.js',
  'dist/gsap.esm.js',
  'dist/fullscroll.js',
  'dist/fullscroll.css',
  'dist/fullscroll.d.ts',
  'dist/gsap.d.ts',
];

await Promise.all(required.map((file) => stat(file)));

const [packageJson, esm] = await Promise.all([
  readFile('package.json', 'utf8').then(JSON.parse),
  readFile('dist/fullscroll.esm.js', 'utf8'),
]);

if (!esm.includes(`var VERSION = "${packageJson.version}"`)) {
  throw new Error('package.json 버전과 배포 JavaScript 버전이 일치하지 않습니다.');
}
