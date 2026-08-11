import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const templateUrl = new URL('../examples/mobile/template.html', import.meta.url);
const outputUrl = new URL('../examples/mobile/index.html', import.meta.url);
const entryPath = fileURLToPath(new URL('../examples/mobile/entry.js', import.meta.url));
const swiperCssUrl = new URL('../node_modules/swiper/swiper-bundle.min.css', import.meta.url);
const fullscrollCssUrl = new URL('../src/fullscroll.css', import.meta.url);

const [template, swiperCss, fullscrollCss, bundle] = await Promise.all([
  readFile(templateUrl, 'utf8'),
  readFile(swiperCssUrl, 'utf8'),
  readFile(fullscrollCssUrl, 'utf8'),
  build({
    entryPoints: [entryPath],
    bundle: true,
    format: 'iife',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: false,
    write: false,
    target: ['es2020'],
    legalComments: 'none',
  }),
]);

const javascript = bundle.outputFiles[0]?.text;
if (!javascript) {
  throw new Error('모바일 데모 JavaScript 번들을 만들지 못했습니다.');
}

if (
  /<\/script/i.test(javascript) ||
  /<\/style/i.test(swiperCss) ||
  /<\/style/i.test(fullscrollCss)
) {
  throw new Error('HTML에 안전하게 삽입할 수 없는 종료 태그가 번들에 포함되어 있습니다.');
}

new Function(javascript);

const cssMarker = '<!-- FULLSCROLL_MOBILE_CSS -->';
const scriptMarker = '<!-- FULLSCROLL_MOBILE_SCRIPT -->';
if (!template.includes(cssMarker) || !template.includes(scriptMarker)) {
  throw new Error('모바일 데모 템플릿의 삽입 위치를 찾지 못했습니다.');
}

const html = template
  .replace(
    cssMarker,
    `<style data-bundle="swiper">${swiperCss}</style><style data-bundle="fullscroll">${fullscrollCss}</style>`,
  )
  .replace(
    scriptMarker,
    `<script data-bundle="fullscroll">${javascript}</script>`,
  );

await writeFile(outputUrl, html, 'utf8');
