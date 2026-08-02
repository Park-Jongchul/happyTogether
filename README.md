# 행복하자 우리 (Happy Together)

돌싱의 일상·친목·모임·대화를 연결하는 커뮤니티 — 모바일 웹앱

## 👉 [웹페이지 열기](https://park-jongchul.github.io/happyTogether/)

| 구분 | 주소 |
|---|---|
| **웹페이지 (이 저장소)** | https://park-jongchul.github.io/happyTogether/ |
| 화면설계서 | https://park-jongchul.github.io/happyTogetherDoc/ |

## 구조

```
index.html              앱 셸 (스플래시 · 헤더 · 탭바 · 드로어 · 바텀시트)
assets/css/app.css      디자인 시스템 (Teal #21A3A4 / Coral #F28B82)
assets/css/screens.css  화면별 스타일
assets/js/data.js       목업 데이터 (화면설계서 9장 데이터 모델 기준)
assets/js/ui.js         공통 UI · 세션 · 권한 게이트
assets/js/screens-*.js  화면 구현 (D01~D27)
assets/js/app.js        해시 라우터 · 이벤트 위임
```

## 웹뷰(WebView) 적용

- 해시 라우팅이라 별도 서버 설정 없이 동작하고, 안드로이드 하드웨어 뒤로가기가 그대로 연결됩니다.
- `viewport-fit=cover` + `env(safe-area-inset-*)`로 노치·제스처바 영역을 처리합니다.
- 외부 CDN·폰트 의존성이 없어 오프라인/로컬 자산으로 패키징할 수 있습니다.
- 세션은 `localStorage`에 저장되어 앱을 다시 열어도 유지됩니다.

## 회원 등급 (화면설계서 6장)

비회원 → 가입회원 → 정회원. 정회원 전용 기능(익명게시판·모임 신청/개설·단체채팅·보이스룸)은
직접 눌렀을 때만 안내를 띄우고, 첫 진입에는 가입 화면을 노출하지 않습니다.

> 데모: 회원가입 → 프로필 → 인증 → 심사 화면의 **(데모) 승인 처리해보기** 버튼으로 정회원 기능을 확인할 수 있습니다.
