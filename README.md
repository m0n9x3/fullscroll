# FullScroll 1.0.0

FullScroll은 세로 풀페이지와 가로 슬라이드가 자주 교차하는 사이트를 위한 바닐라 JavaScript 컨트롤러입니다. Swiper를 애니메이션 엔진으로 사용하지만, 작성자가 Swiper용 래퍼나 슬라이드 클래스를 직접 붙일 필요는 없습니다.

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
  <section fs-horizon fs-anchor="intro">
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

## 마크업 규칙

| 선언 | 의미 |
| --- | --- |
| `[fs]` | FullScroll 루트. 1.0.0은 페이지당 한 개만 지원합니다. |
| 루트 바로 아래 `section` | 별도 선언 없이 세로 페이지가 됩니다. |
| `[fs-page]` | `section`이 아닌 요소를 세로 페이지로 쓸 때만 붙입니다. |
| `[fs-horizon]` | 해당 페이지의 직계 요소 자식을 가로 슬라이드로 만듭니다. 최소 2개가 필요합니다. |
| `[fs-scroll]` | 내부 스크롤 영역. 스크롤 끝에 도달한 뒤에만 다음 바닥으로 이동합니다. |
| `[fs-ignore]` | 휠·터치 입력을 FullScroll이 처리하지 않을 예외 영역입니다. |
| `[fs-anchor="name"]` | URL 해시 및 `moveTo()`에 사용할 선택 앵커입니다. |

`[fs-horizon]` 내부에 다시 `[fs-horizon]`을 넣는 중첩 구조는 1.0.0에서 지원하지 않습니다.

## 이동 방식

- 휠/트랙패드: 누적값이 `wheelThreshold`를 넘으면 한 칸만 이동하고, 제스처가 끝날 때까지 잠급니다.
- 방향키: `ArrowDown`, `PageDown`, `Space`는 다음 칸, `ArrowUp`, `PageUp`, `Shift+Space`는 이전 칸입니다.
- 가로 방향키: 현재 가로 그룹 안에서만 `ArrowLeft`, `ArrowRight`가 동작합니다.
- 터치/펜: 가장 큰 이동축을 기준으로 한 칸 이동합니다.
- 폼 요소와 `[fs-ignore]` 안에서는 키보드 및 포인터 이동을 가로채지 않습니다.

## 옵션

```js
new FullScroll('[fs]', {
  speed: 700,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  breakpoint: 720,
  wheelThreshold: 40,
  wheelIdle: 160,
  touchThreshold: 44,
  dots: false,
  history: true,
  Swiper,
  verticalSwiper: {},
  horizontalSwiper: {}
});
```

| 옵션 | 기본값 | 설명 |
| --- | ---: | --- |
| `speed` | `700` | Swiper 전환 시간(ms) |
| `easing` | `cubic-bezier(...)` | 래퍼 전환 타이밍 함수 |
| `breakpoint` | `0` | 이 너비 이하에서 일반 세로 문서로 전환. `0`은 사용 안 함 |
| `wheelThreshold` | `40` | 한 번의 이동으로 인정할 휠 누적값 |
| `wheelIdle` | `160` | 하나의 휠 제스처가 끝났다고 판단할 대기 시간(ms) |
| `touchThreshold` | `44` | 터치 이동 최소 거리(px) |
| `dots` | `false` | 세로·가로 점 내비게이션 생성 여부 |
| `history` | `true` | `fs-anchor`가 있을 때 URL 해시 기록 여부 |
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

지원 이벤트: `fullscroll:ready`, `fullscroll:beforechange`, `fullscroll:change`, `fullscroll:responsive`, `fullscroll:resize`, `fullscroll:destroy`.

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

페이지 내부 콘텐츠의 제목 구조, 링크 이름, 색상 대비와 초점 스타일은 사이트 작성자가 구성해야 합니다.

## 1.0.0 범위 밖

루프, 무한 스크롤, 2단계 이상 가로 중첩, 작성자가 만든 Swiper 인스턴스 전달, 자동재생/특수 효과, MutationObserver 자동 갱신, 여러 FullScroll 루트, fullPage.js API 호환 계층은 제공하지 않습니다.

## 개발

```bash
npm install
npm run check
```

### 소스 구조

- `src/fullscroll.js`: 생명주기, Swiper 생성과 이동 조정
- `src/config.js`: 버전, 기본 옵션, 입력 예외 선택자
- `src/dom.js`: DOM 탐색, 속성 복원, 스크롤 경계 계산
- `src/gestures.js`: 휠 정규화와 터치 방향 판정
- `src/routes.js`: 페이지·가로 그룹 경로와 URL 해시 변환
- `src/navigation.js`: 점 내비게이션 생성과 활성 상태 동기화

현재 기능별 검증 상태는 `FEATURES.md`에서 확인할 수 있습니다.

실제 예제는 아래 두 가지입니다.

- `examples/index.html`: 720px 이하에서 일반 세로 문서로 전환하는 반응형 데모
- `examples/mobile/index.html`: Swiper CSS·Swiper JS·FullScroll JS까지 포함한 단일 파일 모바일 데모

개선 방향은 `ROADMAP.md`, 다른 AI 작업자의 적용 규칙은 `AI_GUIDE.md`를 참고하세요.
