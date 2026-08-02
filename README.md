# 행복하자 우리 (Happy Together)

돌싱의 일상·친목·모임·대화를 연결하는 커뮤니티 — 모바일 웹앱 + 안드로이드 WebView 앱

## 👉 [웹페이지 열기](https://park-jongchul.github.io/happyTogether/)

| 구분 | 주소 |
|---|---|
| **웹페이지 (이 저장소)** | https://park-jongchul.github.io/happyTogether/ |
| 화면설계서 | https://park-jongchul.github.io/happyTogetherDoc/ |

---

## 구성

```
index.html              앱 셸 (스플래시 · 헤더 · 탭바 · 드로어 · 바텀시트)
assets/css/app.css      디자인 시스템 (Teal #21A3A4 / Coral #F28B82)
assets/css/screens.css  화면별 스타일
assets/js/data.js       목업 데이터 (화면설계서 9장 데이터 모델 기준)
assets/js/ui.js         공통 UI · 세션 · 권한 게이트
assets/js/screens-*.js  화면 구현 (D01~D27)
assets/js/app.js        해시 라우터 · 이벤트 위임

android/                안드로이드 WebView 앱 (APK 빌드용)  → android/README.md
docs/schema.sql         PostgreSQL / Supabase 스키마 + RLS 권한 정책
docs/BACKEND.md         백엔드 연동 가이드 · API 계약
```

## 구현한 화면

| 영역 | 화면 |
|---|---|
| 진입 | D01 스플래시 → D17 카페형 메인 (전체 / 인기 / 공지 / 프로필) |
| 탐색 | D27 통합검색, D23 전체메뉴 |
| 가입 | D18 가입유도, D02 로그인·본인인증, D03 돌싱 인증·심사, D04 프로필 설정, D19 정회원 전환 |
| 모임 | D06 탐색, D07 상세, D08 신청·결제, D09 개설(4단계), 내 모임 |
| 커뮤니티 | D10 게시판, D11 게시글 상세, D22 익명게시판, 글쓰기 |
| 대화 | D12 채팅, D20 단체채팅, D21 보이스룸 |
| 관계 | D13 회원 프로필, D14 활동 친구추천 |
| 내 정보 | D15 마이페이지, D16 안심센터, 공개범위 · 설정 · 결제내역 |

## 설계 원칙 구현

- **가입을 강요하지 않음** — 스플래시 다음 바로 메인. 가입 화면은 회원 전용 기능을 직접 눌렀을 때만 노출
- **3단계 권한** — 비회원 → 가입회원 → 정회원. 정회원 메뉴는 🔒 로 표시하고 누르면 안내
- **권한 없는 글은 검색 결과에 제목도 노출하지 않음** (익명게시판은 정회원 전용)
- **안전 장치** — 채팅 연락처 패턴 감지, 댓글 공격적 표현 경고, 보이스룸 상시 녹음 없음
- **낙인 없는 표현** — 자녀 유무·재혼 의향은 기본 비공개, 항목별 공개범위 선택

## 웹뷰(WebView) 대응

- 해시 라우팅 → 서버 설정 없이 동작하고 안드로이드 하드웨어 뒤로가기가 그대로 연결
- `viewport-fit=cover` + `env(safe-area-inset-*)` 로 노치·제스처바 처리
- **외부 CDN·폰트 의존성 0** → 오프라인 패키징 가능
- 세션은 `localStorage` 에 저장

APK 빌드는 [`android/README.md`](android/README.md) 참고.

## 데모 사용법

정회원 전용 기능을 보시려면:
**전체메뉴 ☰ → 회원가입 → 다음 → 프로필 완료 → 심사 요청 → 「(데모) 승인 처리해보기」**

되돌리려면 마이페이지 → 설정 → 「데모 데이터 초기화」.

## 현재 상태

프론트엔드는 목업 데이터로 완전히 동작합니다. 실제 서비스에 필요한
본인인증 · 결제 · 실시간 채팅 · 파일 업로드는 [`docs/BACKEND.md`](docs/BACKEND.md) 의 순서대로 붙이면 됩니다.
