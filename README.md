# FullScroll 1.3.0

FullScroll은 세로 풀페이지와 가로 슬라이드가 자주 교차하는 사이트를 위한 바닐라 JavaScript 컨트롤러입니다. Swiper를 애니메이션 엔진으로 사용하지만, 작성자가 Swiper용 래퍼나 슬라이드 클래스를 직접 붙일 필요는 없습니다.

로컬에서 기능별 설명과 실제 데모를 한 번에 보려면 [전체 기능 문서](examples/docs/index.html)를 엽니다.

```text
가로 1 → 가로 2 → 가로 3 → 세로 1 → 세로 2 → 가로 1 → 가로 2 → 가로 3
```

휠 한 번, 키보드 한 번, 터치 스와이프 한 번을 위 경로의 한 칸으로 해석합니다.

## 핵심 원칙

- Swiper는 FullScroll에 포함하지 않습니다. 페이지나 번들러에서 별도로 불러옵니다.
- FullScroll이 세로 루트 Swiper와 `[fs-horizon]` 가로 Swiper를 모두 생성하고 제거합니다.
- Swiper의 `mousewheel`과 `keyboard`는 사용하지 않습니다. 이동 순서는 FullScroll이 하나로 조정합니다.
- 일반 페이지와 가로 슬라이드에 작성자용 클래스를 요구하지 않습니다.
- JavaScript가 실행되지 않거나 반응형 모드가 되면 콘텐츠는 일반 세로 문서로 표시됩니다.
- `destroy()`는 FullScroll이 만든 래퍼, 클래스, 상태 속성을 제거하고 원본 DOM 순서를 복원합니다.

## 요구 환경

- Swiper 14.x
- ES2020 이상을 지원하는 최신 브라우저

Swiper는 MIT 라이선스이며 FullScroll과 별개의 의존성입니다.

## 가장 빠른 시작

브라우저에서 파일을 직접 불러오는 경우:

```html
<link rel="stylesheet" href="/swiper/swiper-bundle.min.css">
<link rel="stylesheet" href="/fullscroll/dist/fullscroll.min.css">

<main fs>
  <section id="intro" fs-horizon fs-anchor="intro">
    <article>가로 1</article>
    <article>가로 2</article>
    <article>가로 3</article>
  </section>

  <section fs-anchor="about">세로 1</section>

  <section fs-anchor="story">
    <div fs-scroll>이 영역은 내부 내용을 먼저 스크롤합니다.</div>
  </section>
</main>

<script src="/swiper/swiper-bundle.min.js"></script>
<script src="/fullscroll/dist/fullscroll.min.js"></script>
<script>
  const fullscroll = new FullScroll('[fs]', {
    dots: true,
    breakpoint: 720
  });
</script>
```

번들러를 사용하는 경우:

```js
import Swiper from 'swiper';
import 'swiper/css';
import FullScroll from '@fullscroll/core';
import '@fullscroll/core/style.css';

const fullscroll = new FullScroll('[fs]', { Swiper });
```

## 선언형 컨트롤

기존 DOM에 `fs-*` 속성만 붙이면 FullScroll이 자동으로 연결합니다. 컨트롤은 `[fs]` 안팎 어디에 있어도 되며 가로·세로를 합친 전체 경로를 기준으로 움직입니다.

```html
<button type="button" fs-prev>이전</button>
<output fs-current>1</output> / <output fs-total>8</output>
<progress fs-progress></progress>
<button type="button" fs-next>다음</button>
<a href="#intro/2" fs-move>인트로 두 번째 장면</a>
```

- `[fs-prev]`, `[fs-next]`는 처음·끝 및 반응형 모드에서 자동으로 비활성화됩니다.
- `[fs-move]`는 같은 요소의 `href` 또는 속성값에 적은 `anchor/slide` 경로를 사용합니다.
- `[fs-current]`와 `[fs-total]`은 1부터 시작하는 표시용 번호입니다.
- `[fs-progress]`가 `<progress>`이면 `value`와 `max`를, 그 밖의 요소이면 `--fs-progress` CSS 변수를 갱신합니다.
- 반응형 일반 문서 모드에서 `[fs-move]` 링크는 가로채지 않습니다. JavaScript 실패 시에도 이동하게 하려면 대상의 `id`를 `fs-anchor`와 같은 값으로 지정합니다.
- `refresh()`는 새 컨트롤을 다시 찾고 `destroy()`는 원래 속성과 자식 노드를 복원합니다.

## 마크업 규칙

| 선언 | 의미 |
| --- | --- |
| `[fs]` | FullScroll 루트. 1.3.0도 페이지당 한 개만 지원합니다. |
| 루트 바로 아래 `section` | 별도 선언 없이 세로 페이지가 됩니다. |
| `[fs-page]` | `section`이 아닌 요소를 세로 페이지로 쓸 때만 붙입니다. |
| `[fs-horizon]` | 해당 페이지의 직계 요소 자식 중 `[fs-overlay]`가 아닌 요소를 가로 슬라이드로 만듭니다. 최소 2개가 필요합니다. |
| `[fs-overlay]` | `[fs-horizon]`의 직계 자식일 때만 가로 그룹의 공용 레이어가 됩니다. route, slideIndex, history 경로와 가로 점 개수에서는 제외됩니다. |
| `[fs-horizon-only]` | 가로 슬라이드는 좌우 입력으로만 이동합니다. 위·아래 입력은 현재 가로 슬라이드 위치를 무시하고 앞뒤 세로 페이지로 이동합니다. |
| `[fs-horizon-first]` | 다른 세로 페이지에서 이 가로 그룹으로 들어올 때마다 첫 번째 슬라이드부터 시작합니다. |
| `[fs-flow]` | 일반 세로 페이지는 자연 높이, `fs-horizon`의 직계 슬라이드는 자연 너비로 처리합니다. 붙이지 않은 요소는 기존 화면 크기를 유지합니다. |
| `[fs-flow="footer"]` | 마지막 세로 페이지만 자연 높이로 하단 정렬합니다. 일반 세로 페이지의 `fs-effect`는 유지됩니다. |
| `[fs-flow="prev,next"]` | 가로 Flow의 동반 방향을 진입·이탈 순서로 지정합니다. 값이 없으면 자연 크기만 적용합니다. |
| `[fs-step="number"]` | 같은 영역에서 지정한 단계만큼 내부 연출을 진행한 뒤 다음 경로로 이동합니다. 일반 세로 섹션 또는 가로 그룹의 직계 슬라이드에 붙입니다. |
| `[fs-step-reentry]` | 단계 섹션 재진입 시점의 상태입니다. `preserve`, `first`, `last` 중 하나입니다. |
| `[fs-effect]` | `[fs]` 루트 또는 `[fs-horizon]`에 전환 효과를 지정합니다. |
| `[fs-video]` | 현재 경로에서만 내부 `video`, Vimeo 또는 YouTube iframe을 재생하고, 이탈하면 일시정지합니다. |
| `[fs-scroll]` | 내부 스크롤 영역. 스크롤 끝에 도달한 뒤에만 다음 바닥으로 이동합니다. |
| `[fs-scroll-reset]` | 해당 스크롤 페이지나 영역을 떠날 때 위치를 처음으로 되돌립니다. |
| `[fs-ignore]` | 휠·터치 입력을 FullScroll이 처리하지 않을 예외 영역입니다. |
| `[fs-anchor="name"]` | URL 해시 및 `moveTo()`에 사용할 선택 앵커입니다. |
| `[fs-theme="name"]` | 현재 섹션(가로 그룹에서는 슬라이드)의 테마 이름입니다. `themeTarget`에 자동 반영합니다. |

`[fs-horizon]` 내부에 다시 `[fs-horizon]`을 넣는 중첩 구조는 1.3.0에서 지원하지 않습니다.

### 가로 공용 레이어

슬라이드마다 반복하지 않을 제목, 링크, 화살표 같은 공용 UI는 `[fs-horizon]`의 직계 자식에 `[fs-overlay]`를 붙여 한 번만 작성합니다. overlay는 가로 wrapper 밖에서 현재 세로 페이지에 유지되며 여러 개를 둘 수 있습니다. `refresh()`와 `destroy()` 뒤에도 overlay와 슬라이드의 작성 순서가 복원됩니다. 더 깊은 자손에 붙인 `[fs-overlay]`에는 특별한 의미가 없습니다.

```html
<section fs-horizon fs-horizon-only fs-anchor="premium">
  <aside fs-overlay class="premium-ui">
    <h2>LUCKY PREMIUM</h2>
    <a href="/premium">MORE</a>
    <button type="button" data-premium-prev>이전</button>
    <button type="button" data-premium-next>다음</button>
  </aside>

  <article>프리미엄 01</article>
  <article>프리미엄 02</article>
  <article>프리미엄 03</article>
</section>
```

FullScroll의 기본 CSS는 활성 런타임에서만 `position: absolute`와 `z-index: 10`을 제공합니다. 위치, 크기와 디자인은 작성자 CSS로 정합니다. 생성되는 `.fs-nav-horizon`은 `z-index: 20`이므로 기본 overlay보다 위에 표시됩니다. overlay를 점보다 위에 둘 때는 작성자 CSS에서 z-index를 올리고 클릭 영역이 점을 가리지 않는지 함께 확인합니다. 반응형 문서 모드와 disabled 상태에서는 아래 위치 규칙이 적용되지 않아 overlay가 일반 콘텐츠 흐름으로 돌아갑니다.

```css
[fs][fs-ready] .premium-ui {
  top: 48px;
  right: 56px;
  left: 56px;
}
```

overlay 자체에는 `[fs-ignore]`가 암묵적으로 적용되지 않습니다. 링크와 버튼은 그대로 클릭하고 포커스할 수 있으며, 휠·터치 입력을 FullScroll에서 제외할 영역에만 기존 `[fs-ignore]`를 명시합니다. 사이트별 화살표는 새 속성 없이 기존 `moveTo(anchor, slideIndex)` API로 연결합니다.

```js
const premium = new FullScroll('[fs]', { Swiper, dots: true });

document.querySelector('[data-premium-prev]').addEventListener('click', () => {
  const index = premium.state.current.slideIndex ?? 0;
  premium.moveTo('premium', index - 1);
});

document.querySelector('[data-premium-next]').addEventListener('click', () => {
  const index = premium.state.current.slideIndex ?? 0;
  premium.moveTo('premium', index + 1);
});
```

`[fs-overlay]`는 독립 route나 GSAP scene이 아닙니다. `createGsapScenes()`는 계속 각 실제 슬라이드 안의 `[data-gsap]`만 처리합니다. 공용 레이어 자체의 연출은 작성자가 `fullscroll:change` 이벤트 등에 직접 연결합니다. 실제 예시는 [`examples/overlay-demo/index.html`](examples/overlay-demo/index.html)에서 확인할 수 있습니다.

### 가로 이동 예외

`[fs-horizon-only]`는 가로 그룹을 세로 이동 안에 가두지 않습니다. 가로 그룹에 들어온 상태에서 휠, 위·아래 키, 세로 터치, `next()`/`prev()`를 사용하면 내부 가로 슬라이드를 건너뛰고 이전 또는 다음 세로 페이지로 이동합니다. 좌우 키와 가로 터치는 그룹 안의 슬라이드를 이동합니다. 다른 세로 페이지에서 그룹으로 들어올 때는 항상 첫 번째 슬라이드가 표시됩니다.

`[fs-horizon-first]`는 일반 가로 그룹에 적용하는 재진입 규칙입니다. 마지막으로 보던 가로 슬라이드와 관계없이, 다른 세로 페이지에서 다시 들어오면 첫 슬라이드가 표시됩니다. 두 선언은 함께 사용할 수 있습니다.

### 자연 크기 예외

기본 섹션은 계속 화면 하나를 차지합니다. 콘텐츠가 짧은 세로 섹션에만 `[fs-flow]`를 붙이면 섹션 높이가 콘텐츠에 맞춰지고, 다음 섹션이 남은 화면에 보일 수 있습니다.

마지막 footer처럼 직전 페이지와 섞여 보이면 `[fs-flow="footer"]`를 사용합니다. FullScroll은 일반 세로 페이지를 effect Swiper에 유지하고 footer를 전용 flow stage로 분리합니다. 따라서 일반 페이지 사이에서는 `depth`, `fade` 등의 루트 효과가 그대로 작동하고, footer 진입·이탈만 자연스러운 세로 slide로 처리됩니다. 이 값은 `[fs]`의 마지막 세로 페이지에서만 유효합니다.

가로 그룹에서는 `[fs-flow]`가 붙은 직계 슬라이드만 자연 너비가 됩니다. 지정하지 않은 슬라이드는 기존처럼 화면 너비를 유지합니다.

```html
<main fs>
  <section>기본 화면 섹션</section>

  <section fs-flow>
    짧은 세로 콘텐츠
  </section>

  <section fs-horizon>
    <article>1 · 화면 너비</article>
    <article fs-flow="prev,next">
      2 · 1과 함께 들어오고 3과 함께 나가는 자연 너비
    </article>
    <article>3 · 화면 너비</article>
    <article>4 · 화면 너비</article>
    <article fs-flow="next">
      5 · 들어올 때 6과 함께 보이는 자연 너비
    </article>
    <article>6 · 일반 이동</article>
  </section>
</main>
```

`fs-flow="prev,next"`의 첫 번째 값은 Flow 슬라이드 자체의 뷰, 두 번째 값은 이탈 방향의 인접 슬라이드 뷰를 지정합니다. 예를 들어 `fs-flow="prev,next"`인 2번 슬라이드는 항상 `1 | 2`, 다음 3번 슬라이드는 항상 `2 | 3`으로 보입니다. 정방향·역방향·해시 진입·API 이동 모두 같은 경로 뷰를 사용합니다. 슬라이드를 새 그룹으로 합치지 않으므로 URL 해시, 경로 번호, `fs-active`와 접근성 상태는 원래 슬라이드 단위로 유지됩니다. 자연 크기 콘텐츠가 바뀐 뒤에는 `refresh()`를 호출해 Swiper의 크기를 다시 계산합니다.

### 헤더 테마

`themeTarget`에 헤더·퀵 메뉴 선택자를 지정하면 현재 섹션의 `[fs-theme]` 값이 대상 요소의 `fs-theme` 속성으로 자동 반영됩니다. 별도 이벤트 처리 없이 CSS만 작성하면 됩니다. 테마가 없는 섹션에서는 대상의 초기 `fs-theme` 값으로 돌아갑니다.

```js
new FullScroll('[fs]', { themeTarget: '#header, .quick, .btn_all' });
```

```html
<section fs-theme="dark">...</section>
<section fs-theme="light">...</section>
```

```css
#header[fs-theme="dark"] { color: #fff; }
#header[fs-theme="light"] { color: #111; }
```

### 섹션 내부 단계와 영상

`[fs-step="3"]`을 붙이면 해당 화면은 그대로 유지되고, 위·아래 휠·키·세로 스와이프·`next()`/`prev()`가 먼저 1 → 2 → 3단계를 이동합니다. 마지막 단계에서만 다음 경로로 넘어갑니다. 현재 단계는 대상 요소의 `fs-step-current="1"`처럼 반영되므로 CSS로 요소 등장·이동 연출을 작성하면 됩니다. 단계는 URL과 브라우저 히스토리에 기록하지 않습니다.

기본 재진입 정책은 `stepReentry: 'preserve'`입니다. 섹션별로만 예외가 필요하면 `fs-step-reentry="first"` 또는 `fs-step-reentry="last"`를 붙입니다.

```html
<section fs-step="3" fs-step-reentry="first">
  <h2 class="scene-title">첫 장면</h2>
  <img class="scene-image" src="..." alt="">
  <p class="scene-copy">마지막 장면</p>
</section>

<section fs-video>
  <video muted playsinline src="movie.mp4"></video>
</section>
```

```css
[fs-step-current="1"] .scene-image,
[fs-step-current="1"] .scene-copy,
[fs-step-current="2"] .scene-copy { opacity: 0; transform: translateY(24px); }
[fs-step-current="2"] .scene-image,
[fs-step-current="3"] .scene-copy { opacity: 1; transform: none; }
```

`[fs-video]`는 활성 경로의 HTML `video`와 Vimeo·YouTube iframe에 재생을 요청하고, 경로를 떠나면 일시정지를 요청합니다. 브라우저 자동재생 정책상 무음(`muted`)과 `playsinline`을 권장합니다.

## GSAP 콘텐츠 연출

FullScroll의 세로·가로 이동은 계속 Swiper가 담당하고, GSAP은 실제 route 안쪽 콘텐츠만 연출합니다. GSAP은 FullScroll 번들에 포함하지 않으며 선택적 `@fullscroll/core/gsap` 엔트리로 연결합니다.

```js
import FullScroll from '@fullscroll/core';
import { createGsapScenes } from '@fullscroll/core/gsap';
import { gsap } from 'gsap';

const fullscroll = new FullScroll('[fs]', { Swiper });
const scenes = createGsapScenes(fullscroll, {
  gsap,
  animations: [{
    selector: '[data-gsap]',
    prepare: 'gsap',
    from: { autoAlpha: 0, y: 32 },
    to: { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 },
    at: {
      initial: 'manual',
      enter: 'change',
      leave: 'transitionstart'
    },
    reentry: 'always'
  }]
});

window.addEventListener('load', () => scenes.playCurrent(), { once: true });
```

`animations`의 각 항목은 독립된 애니메이션 그룹입니다. 따라서 제목은 이동 시작과 동시에, 본문은 이동 완료 후처럼 한 route 안에서도 시작 시점을 나눌 수 있습니다. GSAP transform은 Swiper가 소유한 `.swiper-wrapper`와 `.swiper-slide`가 아니라 그 안쪽 콘텐츠에만 적용합니다.

| 설정 | 값 | 동작 |
| --- | --- | --- |
| `prepare` | `gsap` | `from` 값을 즉시 적용해 진입 전 상태를 GSAP이 준비합니다. 기본값입니다. |
| `prepare` | `css` | 초기 표시 상태를 작성자 CSS에 맡기며, 어댑터 생성 시 인라인 시작 스타일을 적용하지 않습니다. |
| `at.initial` | `ready` / `manual` | 최초 현재 route를 즉시 재생하거나 `playCurrent()` 호출까지 기다립니다. 기본값은 `ready`입니다. |
| `at.enter` | `transitionstart` / `change` | 목적지 이동 시작 또는 이동 완료 시 진입합니다. 기본값은 `change`입니다. |
| `at.leave` | `transitionstart` / `change` / `none` | 출발 route의 이탈 처리 시점입니다. 기본값은 `transitionstart`입니다. |

`prepare: 'css'`에서는 선택자가 처음에 어떻게 보일지 CSS가 전적으로 결정합니다. CSS로 영구 숨김 처리하면 JavaScript가 실패했을 때 콘텐츠도 계속 숨겨질 수 있으므로 실패 안전성이 필요하면 기본 표시 상태를 유지하거나 별도 활성 클래스를 사용합니다.

`playCurrent()`는 `at.initial: 'manual'`인 현재 route 그룹만 최초 한 번 시작합니다. 로더 종료, 이미지·폰트 준비 등 사이트가 원하는 시점에 호출하면 됩니다. 다른 route의 진입은 각 그룹의 `at.enter` 설정을 따릅니다.

재진입 정책은 각 그룹별로 세 가지를 제공합니다.

| `reentry` | 동작 |
| --- | --- |
| `always` | 들어올 때마다 진입 연출을 처음부터 다시 재생하고, 떠날 때 역재생합니다. |
| `once` | 최초 진입에서만 재생하고, 이후에는 최종 상태로 즉시 표시합니다. |
| `preserve` | 떠날 때 현재 연출 상태를 유지하고 다시 들어와도 강제로 초기화하지 않습니다. |

`from` 기본값은 `{ autoAlpha: 0, y: 32 }`, `to` 기본값은 `{ autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }`입니다. `respectReducedMotion`은 기본값이 `true`이며 `prefers-reduced-motion: reduce`에서는 duration, delay, stagger를 0으로 처리합니다. `refresh()`와 `destroy()` 시 어댑터가 GSAP context를 되돌립니다.

## 슬라이드 전환 효과

기본은 `slide`입니다. `[fs]`에 지정하면 세로 전환과 별도 지정이 없는 가로 그룹의 기본값이 되고, `[fs-horizon]`에 지정하면 해당 가로 그룹만 바꿉니다.

```html
<main fs fs-effect="fade">
  <section fs-horizon fs-effect="depth">
    <article>...</article>
    <article>...</article>
  </section>
</main>
```

| 값 | 동작 |
| --- | --- |
| `slide` | 기본 밀기 전환 |
| `fade` | 이전·다음 화면을 교차 페이드 |
| `creative` | 기본 크리에이티브 전환 |
| `depth` | 뒤쪽 깊이로 밀려나는 전환 |
| `layers` | 양쪽 레이어가 회전하며 쌓이는 전환 |
| `zoom` | 원근 확대·축소 전환 |
| `blur` | 흐림·축소가 더해진 Fade 전환 |

`blur`는 별도 자산 없이 적용되며, Fade 전환에 흐림과 미세 확대를 더합니다.

일반 `fs-flow`가 있는 세로 루트 또는 가로 그룹은 자연 크기와 인접 슬라이드 노출을 보존하기 위해 `slide`로 동작합니다. 단, 마지막 `[fs-flow="footer"]`는 전용 flow stage로 분리되므로 일반 세로 페이지의 `fs-effect`, `effect`, `verticalSwiper.effect`를 강제 변경하지 않습니다.

효과 모듈과 CSS는 FullScroll에 포함하지 않습니다. 모듈 환경에서는 필요한 Swiper 효과 모듈과 CSS를 직접 불러오고, 가장 간단하게는 `swiper/bundle` 및 `swiper/css/bundle`을 사용하면 됩니다.

긴 페이지는 별도 래퍼 없이 `section` 자체에 `[fs-scroll]`을 붙일 수 있습니다.

```html
<section fs-anchor="article" fs-scroll>
  긴 콘텐츠
</section>
```

스크롤 위치는 페이지를 떠났다가 돌아와도 기본적으로 유지됩니다. 떠날 때마다 처음으로 돌려야 하는 예외에만 `[fs-scroll-reset]`을 함께 붙입니다. `[fs-scroll]` 안의 또 다른 스크롤 영역과 CSS의 `overflow-y: auto|scroll` 영역도 가까운 순서부터 자동 판별합니다.

## 이동 방식

- 휠/트랙패드: 누적값이 `wheelThreshold`를 넘으면 한 칸만 이동하고, 제스처가 끝날 때까지 잠급니다.
- 방향키: `ArrowDown`, `PageDown`, `Space`는 다음 칸, `ArrowUp`, `PageUp`, `Shift+Space`는 이전 칸입니다.
- 가로 방향키: 현재 가로 그룹 안에서만 `ArrowLeft`, `ArrowRight`가 동작합니다.
- 터치/펜: 가장 큰 이동축을 기준으로 한 칸 이동합니다.
- 폼 요소와 `[fs-ignore]` 안에서는 키보드 및 포인터 이동을 가로채지 않습니다.
- 스크롤 가능한 `textarea`와 일반 `overflow-y` 영역도 내부 스크롤을 우선합니다.

## 옵션

```js
new FullScroll('[fs]', {
  speed: 1200,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  breakpoint: 720,
  wheelThreshold: 40,
  wheelIdle: 160,
  touchThreshold: 44,
  dots: false,
  history: true,
  effect: 'slide',
  labels: { page: 'Page {index} of {total}' },
  Swiper,
  verticalSwiper: {},
  horizontalSwiper: {}
});
```

| 옵션 | 기본값 | 설명 |
| --- | ---: | --- |
| `speed` | `1200` | Swiper 전환 시간(ms) |
| `easing` | `cubic-bezier(0.22, 1, 0.36, 1)` | 전체 슬라이드 전환 타이밍 함수 |
| `breakpoint` | `0` | 이 너비 이하에서 일반 세로 문서로 전환. `0`은 사용 안 함 |
| `wheelThreshold` | `40` | 한 번의 이동으로 인정할 휠 누적값 |
| `wheelIdle` | `160` | 하나의 휠 제스처가 끝났다고 판단할 대기 시간(ms) |
| `touchThreshold` | `44` | 터치 이동 최소 거리(px) |
| `dots` | `false` | 세로·가로 점 내비게이션 생성 여부 |
| `history` | `true` | `fs-anchor`가 있을 때 URL 해시 기록 여부 |
| `effect` | `'slide'` | 루트 및 별도 지정 없는 가로 그룹의 전환 효과 |
| `stepReentry` | `'preserve'` | 단계 페이지 재진입 시 `preserve`, `first`, `last` 정책 |
| `themeTarget` | `null` | 현재 `[fs-theme]`를 함께 반영할 외부 요소 선택자 |
| `labels` | 영어 문구 | 점 내비게이션과 슬라이드의 `aria-label` 템플릿. `{index}`, `{total}` 사용 |
| `Swiper` | 전역 `Swiper` | 모듈 환경에서 전달할 Swiper 생성자 |
| `verticalSwiper` | `{}` | 세로 Swiper에 추가할 옵션 |
| `horizontalSwiper` | `{}` | 모든 가로 Swiper에 추가할 옵션 |

이동 정책을 깨지 않도록 `direction`, `initialSlide`, `allowTouchMove`, `mousewheel`, `keyboard` 등 핵심 옵션은 FullScroll 값이 최종 적용됩니다.

## API

```js
await fullscroll.next();
await fullscroll.prev();
await fullscroll.moveTo('intro', 2); // intro의 세 번째 가로 슬라이드
await fullscroll.moveTo(1);          // 두 번째 세로 페이지

fullscroll.disable();
fullscroll.enable();
fullscroll.refresh(); // 작성자가 DOM을 바꾼 뒤 다시 탐색
fullscroll.destroy();

console.log(fullscroll.state);
console.log(FullScroll.get('[fs]'));
console.log(FullScroll.version);
```

페이지 번호와 가로 번호는 API에서 모두 0부터 시작합니다.

`fullscroll.state.routes`는 현재 FullScroll이 인식한 전체 세로·가로 공개 route 목록입니다. `refresh()` 뒤에는 추가·제거된 route가 반영된 새 읽기 전용 배열을 반환합니다.

## 이벤트

이벤트는 `[fs]` 루트에서 버블링합니다.

```js
const root = document.querySelector('[fs]');

root.addEventListener('fullscroll:beforechange', (event) => {
  // 폼 검증 등으로 이동을 막으려면 취소합니다.
  // event.preventDefault();
});

root.addEventListener('fullscroll:change', (event) => {
  console.log(event.detail.origin, event.detail.destination);
});
```

지원 이벤트: `fullscroll:ready`, `fullscroll:beforechange`, `fullscroll:transitionstart`, `fullscroll:transitioncancel`, `fullscroll:change`, `fullscroll:beforestepchange`, `fullscroll:stepchange`, `fullscroll:responsive`, `fullscroll:resize`, `fullscroll:refresh`, `fullscroll:destroy`.

GSAP 연동은 각 애니메이션 그룹의 `at.enter`와 `at.leave`에 따라 `transitionstart` 또는 `change`에서 실행합니다. `transitioncancel`에서는 origin과 취소된 destination의 직전 진행 상태를 복구합니다. `responsive`와 `refresh`의 `detail.current`에는 현재 공개 경로가 포함됩니다.

## 런타임 상태 꾸미기

FullScroll은 현재 페이지에만 `[fs-active]`를 붙입니다. 가로 페이지라면 페이지와 현재 가로 슬라이드에 함께 붙습니다.

```css
[fs] section > * {
  opacity: 0;
  transform: translateY(24px);
  transition: 500ms ease;
}

[fs] section[fs-active] > * {
  opacity: 1;
  transform: none;
}
```

루트의 `[fs-view="intro/2"]`, `[fs-moving]`, `[fs-direction="next"]`, `[fs-responsive]`도 선택적으로 스타일에 사용할 수 있습니다.

## 반응형과 접근성

`breakpoint` 이하에서는 Swiper를 제거하고 원본 콘텐츠를 세로로 쌓습니다. 현재 위치에 가까운 콘텐츠를 유지하며, 다시 넓어지면 FullScroll을 재구성합니다. `prefers-reduced-motion: reduce` 환경에서는 전환 시간을 0으로 처리합니다.

활성 페이지와 현재 가로 슬라이드를 제외한 경로에는 런타임 동안 `inert`를 적용해 보이지 않는 컨트롤로 탭 포커스가 이동하지 않게 합니다. 작성자가 원래 지정한 `inert`는 유지되고 `destroy()` 후 모든 속성이 복원됩니다. 페이지 내부 콘텐츠의 제목 구조, 링크 이름, 색상 대비와 초점 스타일은 사이트 작성자가 구성해야 합니다.

한 손가락 이동은 FullScroll이 처리하고, 두 손가락 확대는 브라우저에 맡깁니다(`touch-action: pinch-zoom`). 핀치 중에는 페이지가 이동하지 않습니다.

점 내비게이션은 보이는 점 크기(`--fs-dot-size`, 기본 `10px`)와 별도로 `--fs-dot-target`(기본 `24px`)만큼 클릭·터치 영역을 확보합니다. 점 크기를 줄인다면 `--fs-dot-size + --fs-dot-gap`이 `24px` 이상이 되도록 간격을 함께 조정하세요.

점 내비게이션이 화면 낭독기에 읽히는 문구는 `labels` 옵션으로 사이트 언어에 맞게 바꿉니다.

```js
new FullScroll('[fs]', {
  dots: true,
  labels: {
    navigation: '페이지 이동',
    page: '{index}/{total} 페이지',
    horizonNavigation: '{index}번째 페이지의 가로 이동',
    horizonPage: '{index}/{total} 가로 페이지',
  },
});
```

고정 헤더나 하단 바를 제외하려면 다음 CSS 변수만 지정합니다.

```css
[fs] {
  --fs-viewport-offset-top: 72px;
  --fs-viewport-offset-bottom: 0px;
}
```

## 1.3.0 범위 밖

루프, 무한 스크롤, 2단계 이상 가로 중첩, 작성자가 만든 Swiper 인스턴스 전달, 자동재생/특수 효과, MutationObserver 자동 갱신, 여러 FullScroll 루트, fullPage.js API 호환 계층은 제공하지 않습니다.

## 개발

```bash
npm install
npm run check
```

### 소스 구조

- `src/fullscroll.js`: 공개 API, 생명주기와 경로 이동 조정
- `src/runtime.js`: Swiper DOM·인스턴스 생성과 작성자 DOM 원상복구
- `src/input.js`: 휠·키보드·포인터·터치 입력 상태와 런타임 리스너
- `src/location.js`: 해시 읽기·기록과 브라우저 위치 이벤트 직렬화
- `src/responsive.js`: breakpoint 감지와 뷰포트 기준 경로 선택
- `src/transitions.js`: Swiper 전환 완료와 안전 타임아웃 처리
- `src/flow.js`: 자연 크기 동반 뷰와 Swiper 위치 계산
- `src/config.js`: 버전, 기본 옵션, 입력 예외 선택자
- `src/dom.js`: DOM 탐색과 작성자 속성 복원
- `src/controls.js`: 선언형 컨트롤 탐색, 상태 동기화, 원상복구
- `src/scroll.js`: 페이지 자체·중첩 스크롤 탐색과 경계 판정
- `src/gestures.js`: 휠 정규화와 터치 방향 판정
- `src/routes.js`: 페이지·가로 그룹 경로, 자연 크기 규칙과 URL 해시 변환
- `src/route-state.js`: 현재 경로의 단계·테마·미디어·비활성 상태 동기화
- `src/navigation.js`: 점 내비게이션 생성과 활성 상태 동기화
- `src/media.js`: 활성 경로의 video·YouTube·Vimeo 재생 상태 동기화
- `src/gsap.js`: GSAP 선택적 콘텐츠 연출 어댑터

현재 기능별 검증 상태는 `FEATURES.md`에서 확인할 수 있습니다.

대표 예제는 아래와 같습니다.

- `examples/index.html`: 720px 이하에서 일반 세로 문서로 전환하는 반응형 데모
- `examples/mobile/index.html`: Swiper CSS·Swiper JS·FullScroll JS까지 포함한 단일 파일 모바일 데모
- `examples/flow-demo/index.html`: 세로 자연 높이, 가로 선택형 자연 너비와 전용 footer stage 데모
- `examples/overlay-demo/index.html`: route에서 제외되는 가로 공용 제목·링크·이동 버튼 데모

개선 방향은 `ROADMAP.md`, 다른 AI 작업자의 적용 규칙은 `AI_GUIDE.md`를 참고하세요.
