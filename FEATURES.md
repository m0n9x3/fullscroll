# FullScroll 1.0.0 기능 체크리스트

이 문서는 현재 구현된 기능과 자동 검증 범위를 한눈에 확인하기 위한 기준표입니다. 상태는 `npm run check`를 통과한 소스와 배포 산출물을 기준으로 합니다.

## 마크업과 경로

- [x] `[fs]` 루트 초기화 및 같은 루트의 중복 초기화 방지
- [x] 루트 직계 `section` 자동 페이지 인식
- [x] 비 `section` 요소의 `[fs-page]` 예외 인식
- [x] `[fs-horizon]` 직계 요소를 가로 슬라이드로 자동 인식
- [x] 가로 슬라이드별 작성자 클래스 없이 Swiper 런타임 구성
- [x] 가로 → 세로 → 가로를 하나의 평면 경로로 계산
- [x] 2단계 이상 `[fs-horizon]` 중첩 거부
- [x] 중복 `[fs-anchor]` 경고 및 두 번째 앵커의 히스토리 제외

## 입력

- [x] 휠 누적 임계값 처리
- [x] 한 휠 제스처당 한 경로만 이동
- [x] 키보드 위·아래·PageUp·PageDown·Space·Home·End 이동
- [x] 가로 그룹 안의 좌·우 방향키 이동
- [x] 폼 요소와 `[fs-ignore]`에서 입력 가로채기 제외
- [x] 터치와 펜 제스처의 주 이동축 판정
- [x] 터치 최소 이동거리 적용

## 내부 스크롤

- [x] `[fs-scroll]`에 이동 공간이 있으면 내부 스크롤 우선
- [x] 내부 스크롤을 끝까지 움직인 현재 제스처에서는 페이지 고정
- [x] 경계에서 새로 시작한 터치·휠 제스처로 다음 페이지 이동
- [x] iOS 탄성 스크롤 값을 실제 스크롤 범위로 보정
- [x] 역방향도 맨 위에서만 이전 페이지로 이동

## 상태와 내비게이션

- [x] 현재 페이지와 현재 가로 슬라이드에만 `[fs-active]` 표시
- [x] `[fs-view]`, `[fs-moving]`, `[fs-direction]` 상태 표시
- [x] 선택형 세로·가로 점 내비게이션 생성
- [x] 점 내비게이션 `aria-current` 동기화
- [x] `ready`, `beforechange`, `change`, `responsive`, `resize`, `destroy` 이벤트
- [x] `beforechange` 취소로 이동 차단

## URL과 API

- [x] `[fs-anchor]` 해시 읽기와 기록
- [x] 가로 슬라이드 `#anchor/2` 형식 지원
- [x] 해시 제거·브라우저 뒤로 가기 시 첫 경로 복원
- [x] `next()`, `prev()`, `moveTo()`
- [x] `enable()`, `disable()`, `refresh()`, `destroy()`
- [x] `state`, `FullScroll.get()`, `FullScroll.version`

## 반응형과 생명주기

- [x] `breakpoint` 이하에서 일반 세로 문서로 전환
- [x] breakpoint 재진입 시 Swiper 런타임 재구성
- [x] `prefers-reduced-motion`에서 즉시 전환
- [x] `refresh()`로 추가된 페이지 재탐색
- [x] `destroy()` 후 원본 노드 순서와 작성자 속성 복원
- [x] FullScroll이 생성한 세로·가로 Swiper 인스턴스 제거

## 배포와 데모

- [x] ESM, IIFE, minified JavaScript 빌드
- [x] 일반·minified CSS 빌드
- [x] TypeScript 선언 파일 제공
- [x] Swiper를 포함하지 않는 라이브러리 배포물
- [x] 반응형 데스크톱 데모
- [x] Swiper와 FullScroll을 포함한 단일 파일 모바일 데모

## 1.0.0에서 제공하지 않음

- 여러 FullScroll 루트
- 가로 그룹의 다단 중첩
- 외부에서 생성한 Swiper 인스턴스 연결
- 무한 루프와 자동재생
- MutationObserver 자동 갱신
- fullPage.js API 호환 계층

이 범위는 `ROADMAP.md`의 승격 기준을 만족할 때만 확장합니다.
