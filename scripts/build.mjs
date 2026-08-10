import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await Promise.all([
  build({
    entryPoints: ['src/index.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/fullscroll.esm.js',
    sourcemap: true,
    target: ['es2020'],
  }),
  build({
    entryPoints: ['src/browser.js'],
    bundle: true,
    format: 'iife',
    outfile: 'dist/fullscroll.js',
    sourcemap: true,
    target: ['es2020'],
  }),
  build({
    entryPoints: ['src/browser.js'],
    bundle: true,
    format: 'iife',
    outfile: 'dist/fullscroll.min.js',
    minify: true,
    sourcemap: true,
    target: ['es2020'],
  }),
  build({
    entryPoints: ['src/fullscroll.css'],
    bundle: true,
    outfile: 'dist/fullscroll.css',
    target: ['es2020'],
  }),
  build({
    entryPoints: ['src/fullscroll.css'],
    bundle: true,
    outfile: 'dist/fullscroll.min.css',
    minify: true,
    target: ['es2020'],
  }),
]);

await cp('src/fullscroll.d.ts', 'dist/fullscroll.d.ts');
