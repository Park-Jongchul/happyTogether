# 백엔드 연동 가이드

현재 웹앱은 `assets/js/data.js` 의 목업 데이터로 동작합니다.
백엔드를 붙일 때 **`data.js` 만 실제 API 호출로 교체**하면 화면 코드는 그대로 둘 수 있도록 구성했습니다.

---

## 1. 추천 스택

| 항목 | 추천 | 이유 |
|---|---|---|
| DB · 인증 · 스토리지 | **Supabase** (PostgreSQL) | `docs/schema.sql` 을 SQL Editor 에 붙여넣으면 끝. RLS 로 6장 권한표를 DB 레벨에서 강제 |
| 실시간 채팅 | Supabase Realtime | `chat_message` 테이블 구독만으로 단체채팅 동작 |
| 보이스룸 | **LiveKit** 또는 Agora | WebRTC SFU. 녹음은 정책상 비활성 |
| 본인인증 (SMS) | NICE평가정보 · KG이니시스 · 다날 | 실명·휴대폰 본인확인 (D02) |
| 결제 | **토스페이먼츠** 또는 포트원(아임포트) | 카드·간편결제·부분환불 지원 (D08) |
| 파일 | Supabase Storage (비공개 버킷) | 증빙 서류는 서명 URL + 보관기한 후 자동 파기 |
| 푸시 | Firebase Cloud Messaging | WebView 앱에서 네이티브 푸시 |

> 서버를 직접 운영하고 싶다면 NestJS + Prisma + PostgreSQL 조합도 동일한 스키마로 가능합니다.

---

## 2. 붙이는 순서 (권장)

각 단계가 끝날 때마다 앱이 동작하는 상태를 유지합니다.

| 단계 | 내용 | 영향받는 화면 |
|---|---|---|
| **1** | Supabase 프로젝트 생성 + `schema.sql` 적용 | – |
| **2** | 게시판 · 게시글 · 댓글 읽기 (비회원 공개글) | D17, D10, D11, D27 |
| **3** | 휴대폰 본인인증 + 회원가입/로그인 | D02, D18 |
| **4** | 돌싱 인증 제출 · 운영자 심사 | D03, D19, A02 |
| **5** | 글쓰기 · 댓글 · 공감 · 저장 | D10, D11, D22 |
| **6** | 모임 CRUD + 참가 신청 (무료 먼저) | D06, D07, D09 |
| **7** | 결제 · 환불 연동 | D08 |
| **8** | 단체채팅 (Realtime) — 최소 구성은 먼저 켤 수 있습니다 → [SUPABASE.md](SUPABASE.md) | D12, D20 |
| **9** | 보이스룸 (LiveKit) | D21 |
| **10** | 신고 · 제재 · 운영 콘솔 | D16, A01~A04 |

---

## 3. API 계약

모든 응답은 공통 봉투를 사용합니다 (화면설계서 10장).

```jsonc
// 성공
{ "ok": true, "data": { }, "meta": { "page": 1, "hasNext": true } }
// 실패
{ "ok": false, "error": { "code": "FORBIDDEN_GRADE", "message": "정회원 인증이 필요합니다." } }
```

### 인증

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/auth/sms/send` | 인증번호 발송 (60초 재요청 제한) |
| `POST` | `/auth/sms/verify` | 인증번호 확인 (5회 실패 시 10분 잠금) |
| `POST` | `/auth/signup` | 가입 — 이름·휴대폰·약관동의 |
| `POST` | `/auth/login` | 로그인 |
| `GET`  | `/me` | 내 세션 (grade, verifyStep 포함) |

### 인증심사 (D03)

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/verifications` | 혼인상태·인증방법·가입답변·증빙 토큰 제출 |
| `GET`  | `/verifications/me` | 내 심사 상태 (접수 순서·보완 여부만 노출) |
| `POST` | `/admin/verifications/:id/decide` | 운영자 승인/보완/거절 — **열람 로그 필수** |

### 게시판

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET`  | `/boards` | 내 등급에서 보이는 게시판만 |
| `GET`  | `/posts?board=&sort=new\|cmt\|view&page=` | 목록 |
| `GET`  | `/posts/:id` | 상세 (조회수 증가) |
| `POST` | `/posts` | 작성 — 게시판 write_access 검사 |
| `POST` | `/posts/:id/reactions` | `{ kind: "like" \| "save" }` 토글 |
| `GET`  | `/posts/:id/comments` / `POST` 동일 경로 | 댓글 |

### 통합검색 (D27)

```
GET /search?q=등산&type=all|post|comment|meeting|user&period=&board=&sort=
```

- 응답에 `counts: { all, post, comment, meeting, user }` 포함
- **읽을 권한 없는 글은 결과에서 완전히 제외** (제목도 반환 금지)
- 삭제·숨김·탈퇴회원 비공개 글은 색인에서 즉시 제거
- 검색어는 `search_log` 에 적재 → 인기 검색어 산출

### 모임

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET`  | `/meetings?region=&date=&interest=&age=&fee=` | 탐색 |
| `GET`  | `/meetings/:id` | 상세 — 정확한 장소는 확정 참가자에게만 |
| `POST` | `/meetings` | 개설 → `state=review` (운영 검수 대기) |
| `POST` | `/meetings/:id/apply` | 신청 `{ answer, paymentMethod }` |
| `POST` | `/meetings/:id/members/:uid/decide` | 모임장 승인/거절 |
| `POST` | `/meetings/:id/checkin` | 당일 체크인 |
| `POST` | `/meetings/:id/cancel` | 취소 → 환불 규정에 따라 부분/전액 |

### 대화

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET`  | `/rooms` | 내 채팅방 |
| `GET`  | `/rooms/:id/messages?before=` | 메시지 (커서 페이징) |
| `POST` | `/rooms/:id/messages` | 전송 — 연락처·계좌 패턴 감지 시 경고 플래그 |
| `WS`   | `/rooms/:id` | 실시간 구독 |
| `GET`  | `/voice-rooms` · `POST /voice-rooms/:id/join` | 보이스룸 (LiveKit 토큰 발급) |

### 안전

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/reports` | 신고 — `blockNow=true` 면 즉시 차단 |
| `GET`  | `/reports/me` | 내 신고 처리 결과 |
| `POST` | `/blocks/:uid` / `DELETE` | 차단 |
| `POST` | `/safety/checkin` | 안심 체크인 — 지정 연락처에만 공유 |

---

## 4. 반드시 지켜야 할 규칙

화면설계서에 명시된 것 중 **서버에서 강제해야** 하는 항목입니다. 클라이언트 검증만으로는 부족합니다.

1. **권한 없는 콘텐츠는 존재 자체를 숨긴다** — 목록·검색·알림 미리보기·OG 메타 어디에도 제목을 넣지 않습니다.
2. **증빙 서류 열람은 최소 권한 + 로그** — `verification_access_log` 에 열람자·목적·시각을 남기고, `purge_at` 경과분은 배치로 파기합니다.
3. **익명글은 글마다 새 익명번호** — 같은 작성자의 글들이 번호로 연결되면 안 됩니다. 운영자만 신고 처리 목적으로 식별 가능.
4. **보이스룸 상시 녹음 금지** — `voice_room.recording` 은 항상 `false`. 녹음이 필요하면 별도 동의 구조를 먼저 만듭니다.
5. **참가비와 플랫폼 수수료는 분리 표기** — 영수증·정산 모두 분리합니다.
6. **신고자 신원은 피신고자에게 비공개.**
7. **성비 제한은 정원 균형 목적만 허용**, 외모·소득 기반 필터는 만들지 않습니다.

---

## 5. 프론트엔드 교체 지점

`assets/js/data.js` 의 마지막 `return { ... }` 블록이 유일한 접근 지점입니다.
아래처럼 async 로 바꾸고, 각 화면 함수에서 `await` 하도록 수정하면 됩니다.

```js
// 예시 — data.js 를 실제 API 로 교체
window.DB = {
  async posts(board, sort) {
    const r = await fetch(`${API}/posts?board=${board}&sort=${sort}`, { headers: authHeader() });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error.code);
    return j.data;
  },
  // …
};
```

권한 게이트(`UI.gate`)는 이미 `session().grade` 만 보고 판단하므로,
`/me` 응답을 `UI.set({ grade, verifyStep })` 로 넣어주면 그대로 동작합니다.
