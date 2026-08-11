# FullScroll 1.3.0 기능 체크리스트

이 문서는 `npm run check`를 통과한 소스, 실제 Swiper 통합 테스트, 타입 검사와 배포 산출물을 기준으로 합니다.

## 마크업과 경로

- [x] `[fs]` 루트 초기화 및 같은 루트의 중복 초기화 방지
- [x] 루트 직계 `section`과 비 `section`의 `[fs-page]` 예외 인식
- [x] `[fs-horizon]` 직계 요소를 가로 슬라이드로 자동 인식
- [x] 가로 → 세로 → 가로를 하나의 평면 경로로 계산
- [x] 2단계 이상 가로 중첩 거부
- [x] 중복 `[fs-anchor]` 경고 및 잘못된 히스토리 기록 방지
- [x] `[fs-flow]` 세로 자연 높이 예외
- [x] 가로 직계 `[fs-flow]` 슬라이드만 자연 너비 처리
- [x] `[fs-flow="prev,next"]` 경로별 고정 동반 슬라이드 뷰
- [x] 동반 뷰 슬라이드의 포커스 접근성 유지
- [x] `[fs-horizon-only]`의 세로 경로 통과와 좌우 전용 이동
- [x] `[fs-horizon-first]`의 첫 슬라이드 재진입

## 입력과 안정화

- [x] 휠 누적 임계값과 한 제스처당 한 경로 이동
- [x] 키보드 위·아래·좌·우·PageUp·PageDown·Space·Home·End 이동
- [x] 폼 요소와 `[fs-ignore]` 입력 제외
- [x] 터치·펜 주 이동축 판정과 최소 이동거리
- [x] iOS 탄성 스크롤 값을 실제 범위로 보정
- [x] 연속 `popstate`·`hashchange`에서 마지막 위치 적용
- [x] bfcache `pageshow`, 화면 회전, 동적 뷰포트 재동기화
- [x] 비활성 페이지와 가로 슬라이드의 `inert` 포커스 차단

## 선언형 퍼블리셔 컨트롤

- [x] `[fs-prev]`, `[fs-next]` 자동 연결과 처음·끝 비활성화
- [x] `[fs-move]`의 `href` 또는 속성값으로 앵커 이동
- [x] `[fs-current]`, `[fs-total]` 평면 경로 번호 동기화
- [x] `[fs-progress]`의 `<progress>` 값 및 `--fs-progress` 동기화
- [x] 현재 `[fs-move]`에 `aria-current="page"` 표시
- [x] 반응형 모드에서 단계 버튼 비활성화 및 앵커 기본 동작 유지
- [x] `refresh()` 컨트롤 재탐색
- [x] `destroy()` 후 외부 컨트롤의 원래 속성과 자식 노드 복원

## 긴 페이지와 내부 스크롤

- [x] 중첩 요소와 페이지 자체의 `[fs-scroll]`
- [x] CSS `overflow-y: auto|scroll` 중첩 영역 자동 판별
- [x] 자식 경계에서 스크롤 가능한 부모 영역 우선
- [x] 내부 스크롤을 움직인 현재 제스처에서는 페이지 고정
- [x] 전체 경계에서 새 제스처로만 다음·이전 경로 이동
- [x] 스크롤 위치 기본 유지
- [x] `[fs-scroll-reset]` 영역을 떠날 때 위치 초기화
- [x] 네이티브 모바일 관성과 스크롤바 드래그를 FullScroll 제스처에서 제외
- [x] `--fs-viewport-offset-top`, `--fs-viewport-offset-bottom` 뷰포트 보정

## 상태, URL과 API

- [x] `[fs-active]`, `[fs-view]`, `[fs-moving]`, `[fs-direction]` 상태
- [x] 선택형 세로·가로 점 내비게이션과 `aria-current`
- [x] 앵커 해시 읽기·기록·뒤로 가기
- [x] `next()`, `prev()`, `moveTo()`, `enable()`, `disable()`, `refresh()`, `destroy()`
- [x] `state`, `FullScroll.get()`, `FullScroll.version`
- [x] `ready`, `beforechange`, `change`, `responsive`, `resize`, `destroy` 이벤트

## 화면 연출과 활성 상태

- [x] `slide`, `fade`, `creative`, `depth`, `layers`, `zoom` 전환 효과
- [x] 세로 전환에 맞춘 creative·depth·layers의 Y축 구성
- [x] Flow 영역에서 자연 크기를 보존하는 slide 효과 고정
- [x] `[fs-theme]`와 `themeTarget`의 테마 자동 동기화 및 원래 테마 복원
- [x] `[fs-step]`의 같은 경로 내 단계 진행과 `fs-step-current` 상태
- [x] `[fs-video]`의 활성 경로 재생·이탈 일시정지

## 반응형, 복원과 배포

- [x] breakpoint 이하 일반 세로 문서 전환 및 재진입
- [x] `prefers-reduced-motion` 즉시 전환
- [x] `destroy()` 후 원본 DOM 순서와 작성자 속성 복원
- [x] ESM, IIFE, minified JavaScript·CSS와 TypeScript 선언
- [x] Swiper를 포함하지 않는 라이브러리 배포물
- [x] 실제 Swiper 패키지 통합 테스트
- [x] TypeScript 소비 코드 컴파일 검사
- [x] 배포 파일 존재·버전·크기 제한 자동 검사
- [x] 반응형 데스크톱 데모와 완전 독립형 모바일 데모

## 1.3.0에서 제공하지 않음

- 여러 FullScroll 루트
- 가로 그룹의 다단 중첩
- 외부에서 생성한 Swiper 인스턴스 연결
- 페이지 이동 잠금 API
- 무한 루프와 자동재생
- MutationObserver 자동 갱신
- fullPage.js API 호환 계층

## 자연 크기 동작 규칙

- `[fs-flow]`가 없는 페이지와 슬라이드는 기존처럼 화면 크기를 유지합니다.
- 루트 직계 `[fs-flow]` 페이지는 자연 높이를 사용합니다.
- `[fs-horizon]`의 직계 `[fs-flow]` 슬라이드만 자연 너비를 사용합니다.
- 자연 크기 슬라이드는 인접 콘텐츠가 같은 화면에 보일 수 있습니다.
- `fs-flow="prev,next"`는 가로 그룹의 바로 인접한 슬라이드를 경로별 동반 뷰로 지정합니다.
- 시각적으로 함께 보이는 슬라이드도 원래 경로와 해시를 유지하며, 현재 뷰에 포함된 슬라이드는 `inert`에서 제외합니다.

이후 범위는 `ROADMAP.md`의 승격 기준을 만족할 때만 확장합니다.
