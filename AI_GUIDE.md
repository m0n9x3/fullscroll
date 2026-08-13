# FullScroll 적용 AI 작업자 가이드

이 문서는 FullScroll을 다른 사이트에 적용하거나 코어를 수정하는 AI 작업자가 따라야 할 계약입니다. 먼저 해당 사이트의 기존 HTML, CSS, JavaScript와 Swiper 버전을 실제 파일에서 확인하십시오.

## 변하지 않는 1.3.0 계약

- Swiper 14.x는 외부 필수 의존성입니다. FullScroll 번들에 넣지 않습니다.
- GSAP은 외부 선택 의존성입니다. `@fullscroll/core/gsap` 어댑터에도 GSAP을 번들에 넣지 않습니다.
- FullScroll이 세로와 가로 Swiper 인스턴스를 생성·소유·제거합니다.
- Swiper의 `mousewheel`, `keyboard`, `allowTouchMove`를 직접 켜지 않습니다.
- `[fs-horizon]`만 가로 그룹 선언입니다. `fs-horizontal` 같은 별칭을 만들지 않습니다.
- 일반 세로 페이지는 루트 직계 `section`입니다. 다른 태그일 때만 `[fs-page]`를 사용합니다.
- 가로 슬라이드는 `[fs-horizon]`의 직계 요소 자식 중 `[fs-overlay]`가 아닌 요소입니다. 슬라이드별 클래스나 속성을 추가하지 않습니다.
- 반복하지 않을 가로 공용 UI에만 직계 `[fs-overlay]`를 사용합니다. 별칭이나 중첩 horizon 대체 규칙을 만들지 않습니다.
- 예외가 필요한 곳에만 `[fs-scroll]`, `[fs-scroll-reset]`, `[fs-ignore]`, `[fs-anchor]`를 붙입니다. 마지막 자연 높이 footer에는 `[fs-flow="footer"]`를 사용합니다.
- `[fs-flow="footer"]`는 전용 flow stage에서 움직이므로 일반 세로 페이지의 `[fs-effect]`를 유지합니다. footer와 맞닿는 이동만 slide입니다.
- 컨트롤은 `[fs-prev]`, `[fs-next]`, `[fs-move]`, `[fs-current]`, `[fs-total]`, `[fs-progress]`를 사용하며 별도 JavaScript 연결을 만들지 않습니다.
- 1.3.0은 한 페이지당 FullScroll 루트 하나, 가로 중첩 한 단계만 지원합니다.
- 이전 라이브러리 또는 구버전 API를 위한 호환 계층을 추가하지 않습니다.

## 사이트 적용 순서

1. 기존 Swiper 로딩 여부와 정확한 버전을 확인합니다.
2. Swiper CSS, FullScroll CSS, Swiper JS, FullScroll JS 순서로 연결합니다.
3. 전체 페이지 묶음 한 곳에 `[fs]`를 붙입니다.
4. 루트 바로 아래 페이지를 `section`으로 정리합니다. 태그를 바꿀 수 없는 예외에만 `[fs-page]`를 붙입니다.
5. 가로가 필요한 `section`에 `[fs-horizon]`을 붙이고, 직계 요소 자식만 슬라이드가 되도록 구조를 정리합니다.
6. 긴 콘텐츠는 실제 스크롤 컨테이너 또는 `section` 자체에 `[fs-scroll]`을 붙이고 높이가 계산되는지 확인합니다. 떠날 때 초기화할 예외에만 `[fs-scroll-reset]`을 추가합니다.
7. 지도, 캔버스, 별도 캐러셀처럼 입력권을 가져야 하는 영역에만 `[fs-ignore]`를 붙입니다.
8. 기존 이전·다음·메뉴·진행률 DOM이 있으면 대응하는 선언형 컨트롤 속성을 붙입니다.
9. `new FullScroll('[fs]', options)`는 DOM과 Swiper가 준비된 뒤 한 번만 실행합니다.
10. 콘텐츠나 컨트롤을 동적으로 바꾼 경우 변경이 끝난 뒤 `refresh()`를 한 번 호출합니다.
11. 데스크톱 휠, 트랙패드, 키보드, 모바일 터치, 내부 스크롤, 반응형 전환을 실제 브라우저에서 확인합니다.

## 권장 적용 예시

```html
<button fs-prev>이전</button>
<output fs-current></output> / <output fs-total></output>
<button fs-next>다음</button>

<main fs>
  <section id="visual" fs-horizon fs-anchor="visual">
    <aside fs-overlay class="visual-ui">
      <h2>프로젝트</h2>
      <button type="button" data-visual-prev>이전</button>
      <button type="button" data-visual-next>다음</button>
    </aside>
    <article>첫 장</article>
    <article>둘째 장</article>
  </section>
  <section fs-anchor="information" fs-scroll>긴 내용</section>
  <footer fs-page fs-flow="footer" fs-anchor="footer">Footer</footer>
</main>
```

```js
const pageFlow = new FullScroll('[fs]', {
  breakpoint: 720,
  dots: true
});
```

슬라이드마다 같은 고정 제목·화살표가 반복되면 해당 UI를 직계 `[fs-overlay]` 하나로 분리합니다. 사이트별 버튼은 `pageFlow.moveTo('visual', slideIndex)`로 연결하고 새로운 코어 컨트롤 속성을 만들지 않습니다. overlay는 route, history, 가로 점, GSAP scene에 포함되지 않습니다. overlay 자체 애니메이션은 `fullscroll:change` 같은 공개 이벤트로 작성자가 연결합니다. 슬라이드 안쪽 장식이나 중첩 가로 그룹을 overlay로 바꾸지 않습니다.

## 기존 사이트와 충돌 점검

- `html`, `body`, 루트 조상의 `height`, `overflow`, `transform` 규칙
- 기존 wheel/touch/keydown 이벤트의 `preventDefault()`와 전파 차단
- 기존 Swiper가 전역 `Swiper`를 덮어쓰는지, 버전이 14.x인지
- 고정 헤더·팝업·지도·폼·에디터가 `[fs-ignore]`를 필요로 하는지
- `[fs-scroll]` 요소가 실제로 `scrollHeight > clientHeight`가 되는지
- 외부 선언형 컨트롤이 다른 위젯의 동일 속성과 충돌하지 않는지
- 고정 헤더를 제외할 때 뷰포트 오프셋 CSS 변수를 중복 적용하지 않았는지
- 루트 직계 자식 중 페이지가 아닌 헤더·스크립트용 요소가 섞여 있는지
- URL 해시를 다른 탭 또는 라우터가 이미 사용하는지

충돌이 있으면 사이트 쪽 구조 또는 초기화 옵션을 최소 범위로 수정합니다. 코어에 특정 사이트 이름, 선택자, 예외 동작을 넣지 않습니다.

## 코어 수정 규칙

- 입력 해석, 경로 계산, Swiper 렌더링, 상태 표시의 책임을 섞지 않습니다.
- Swiper가 이미 제공하는 전환 기능은 다시 구현하지 않습니다. 먼저 설치된 버전의 문서와 타입을 확인합니다.
- 새 추상화는 현재 요구를 실제로 단순하게 만들 때만 추가합니다.
- obsolete API는 별칭이나 fallback으로 남기지 않고 주 버전 계약에 따라 제거합니다.
- 런타임 클래스는 Swiper 구동에 필요한 것과 내비게이션 UI에만 사용합니다.
- 콘텐츠 상태는 `[fs-active]`처럼 현재 상태에만 표시합니다.
- GSAP은 `.swiper-wrapper`와 `.swiper-slide`가 아니라 슬라이드 내부 콘텐츠에만 적용합니다.
- GSAP scene은 `state.routes`의 정식 route만 사용하고, 각 애니메이션 배열이 `prepare`, `at.initial`, `at.enter`, `at.leave`를 선택합니다.
- 초기 current route는 `ready`에 자동 재생하거나 `manual`로 두고 사이트 준비 시점에 `scenes.playCurrent()`를 호출합니다.
- destination 진입은 그룹 설정에 따라 `transitionstart` 또는 완료 이벤트인 `change`에서 시작하며, `transitioncancel`은 양쪽 상태를 복구합니다.
- GSAP timeline은 `context.revert()`로 `refresh()`, 반응형 전환과 `destroy()`에서 정리합니다.
- `destroy()` 후 작성자 DOM의 노드 순서와 속성이 초기화 전과 같아야 합니다.
- 소스 수정 후 `npm run check`를 통과시키고 `dist`를 다시 생성합니다.

### 모듈 책임

- `fullscroll.js`는 전체 생명주기와 Swiper 이동 순서만 조정합니다.
- Swiper DOM·인스턴스 생성과 원상복구는 `runtime.js`, 전환 대기는 `transitions.js`에 둡니다.
- 휠·키보드·포인터·터치 입력 상태와 리스너는 `input.js`에 둡니다.
- 해시 읽기·기록과 브라우저 위치 이벤트 직렬화는 `location.js`에 둡니다.
- breakpoint 감지와 뷰포트 기준 경로 선택은 `responsive.js`에 둡니다.
- 일반 DOM 탐색과 속성 복원은 `dom.js`, 경로와 앵커 계산은 `routes.js`에 둡니다.
- 현재 경로의 단계·테마·미디어·비활성 표현은 `route-state.js`에 둡니다.
- 자연 크기 동반 뷰 판정과 Swiper 위치 계산은 `flow.js`에 둡니다.
- 페이지 자체·중첩 스크롤 판정은 `scroll.js`, 선언형 컨트롤은 `controls.js`에 둡니다.
- 휠·터치의 순수 계산은 `gestures.js`, 생성형 점 UI는 `navigation.js`에 둡니다.
- 활성 경로의 video·YouTube·Vimeo 상태 동기화는 `media.js`에 둡니다.
- 선택적 GSAP 콘텐츠 연출은 `gsap.js`에 두고 FullScroll의 이동 엔진과 분리합니다.
- 새 기능을 추가할 때 이미 분리된 책임을 다시 `fullscroll.js` 안에 중복 구현하지 않습니다.
- 공개 기능을 변경했다면 `FEATURES.md`, README, 타입 선언과 테스트를 함께 갱신합니다.

## 필수 검증 시나리오

| 구간 | 확인 내용 |
| --- | --- |
| 가로→가로 | 휠 한 제스처에 정확히 한 장만 이동 |
| 가로 끝→세로 | 마지막 가로 장 다음에 다음 세로 페이지로 이동 |
| 세로→가로 | 가로 그룹 첫 장으로 진입 |
| 역방향 | 세로에서 이전 가로 그룹의 마지막 장으로 돌아감 |
| 내부 스크롤 | 중간에서는 페이지가 고정되고, 끝에서만 다음 페이지로 이동 |
| 페이지 스크롤 | `section[fs-scroll]`이 네이티브 관성을 유지하고 reset 예외만 초기화 |
| 중첩 스크롤 | 자식의 경계에서 스크롤 가능한 부모가 있으면 페이지 이동하지 않음 |
| 선언형 컨트롤 | 이전·다음·직접 이동·번호·진행률 및 처음·끝 상태 동기화 |
| 접근성 | 비활성 경로가 `inert`이고 반응형·destroy에서 원래 상태 복원 |
| 키보드 | 폼 입력 중에는 가로채지 않으며 Home/End 포함 정상 이동 |
| 터치 | 세로·가로 제스처가 한 장만 이동하고 `[fs-scroll]`을 존중 |
| 해시 | 앵커와 `anchor/2`가 새로고침·뒤로 가기에서 일치 |
| 반응형 | breakpoint 진입 시 일반 문서, 이탈 시 현재 위치 재구성 |
| 축소 동작 | `prefers-reduced-motion`에서 즉시 이동 |
| 제거 | `destroy()` 뒤 생성 래퍼·클래스·내비게이션이 남지 않음 |
| GSAP 연출 | CSS·GSAP 초기화, 그룹별 ready/manual 및 transitionstart/change 시점, 취소 복구, 세 재진입 정책, context 정리가 동작하고 `prefers-reduced-motion`에서 즉시 상태가 적용됨 |
| 실패 안전 | FullScroll JS 없이도 모든 콘텐츠에 세로로 접근 가능 |

## 작업 완료 보고에 포함할 내용

- 적용한 실제 파일과 초기화 위치
- Swiper 버전 및 로딩 방식
- 사용한 FullScroll 선언과 옵션
- 자동 테스트 및 빌드 결과
- 데스크톱/모바일 실제 브라우저 확인 결과
- 지원하지 않는 구조 또는 남은 리스크

정적 검사만으로 스크롤 감각이나 경계 동작이 검증됐다고 보고하지 마십시오. 실제 브라우저에서 한 제스처당 한 이동과 내부 스크롤 경계를 확인해야 합니다.
