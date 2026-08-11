# 실시간 채팅 켜기 (Supabase Realtime)

지금 웹앱은 서버 없이 브라우저 안에서만 돕니다. 그래서 채팅도 **내가 보낸 메시지만 내 기기에 쌓일 뿐**,
다른 사람의 메시지가 올 곳이 없습니다. 아래 5단계를 마치면 두 기기가 같은 방에서 실제로 대화합니다.

준비물은 Supabase 계정 하나뿐입니다. 무료 요금제로 충분하고, GitHub Pages 같은 정적 호스팅에서도 동작합니다.

---

## 1. 프로젝트 만들기

1. <https://supabase.com> 가입 → **New project**
2. 이름은 `happy-together`, 리전은 **Northeast Asia (Seoul)** 또는 Tokyo
3. Database Password 는 따로 적어 두세요 (지금 단계에서는 쓰지 않습니다)

## 2. 테이블 만들기

대시보드 왼쪽 **SQL Editor** → **New query** 에 `docs/chat-realtime.sql` 내용을 통째로 붙여넣고 **Run**.

성공하면 Table Editor 에 `rt_chat_message` 가 보입니다.

## 3. 익명 로그인 켜기

**Authentication → Sign In / Providers → Anonymous Sign-ins** 를 **Enable**.

앱은 기기마다 익명 계정을 하나 만들어 그 계정으로 메시지를 씁니다.
이게 있어야 "남의 이름으로 보내기"를 DB 가 막을 수 있습니다.
(휴대폰 본인인증 로그인은 `docs/BACKEND.md` 3단계에서 이 자리를 대체합니다.)

## 4. 키 두 개를 앱에 넣기

**Project Settings → API** 에서 두 값을 복사합니다.

| 대시보드 항목 | 넣을 곳 |
|---|---|
| Project URL | `assets/js/supa.js` 의 `CONFIG.url` |
| `anon` `public` 키 | `assets/js/supa.js` 의 `CONFIG.anonKey` |

```js
const CONFIG = {
  url: 'https://abcdefghijklm.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

> ⚠️ **`service_role` 키는 절대 넣지 마세요.** 그 키는 RLS 를 통째로 무시합니다.
> `anon` 키는 브라우저에 공개되는 것이 정상이고, 권한은 2단계에서 넣은 RLS 정책이 막습니다.

커밋하고 푸시하면 1~2분 뒤 GitHub Pages 에 반영됩니다. 앱은 웹을 불러오므로 **APK 재빌드는 필요 없습니다.**

## 5. 확인

폰과 PC 브라우저에서 같은 방(`대화 → 한강 야간 산책`)을 엽니다.
한쪽에서 메시지를 보내면 다른 쪽에 **새로고침 없이** 나타나야 합니다.

안 되면 브라우저 콘솔을 보세요. `[SUPA]` 로 시작하는 경고가 원인을 알려줍니다.

| 콘솔 메시지 | 원인 |
|---|---|
| `Anonymous sign-ins are disabled` | 3단계를 안 했습니다 |
| `relation "rt_chat_message" does not exist` | 2단계를 안 했습니다 |
| `new row violates row-level security` | 2단계 SQL 이 일부만 실행됐습니다. 다시 Run |
| 아무 경고도 없는데 조용함 | `CONFIG` 두 줄이 비어 있습니다 (로컬 모드) |

---

## 지금 구조의 범위

켜기 전에 무엇이 되고 무엇이 아직 아닌지 분명히 해 둡니다.

**되는 것**

- 같은 방에 있는 모든 기기가 실시간으로 메시지를 주고받음
- 방을 나갔다 들어와도, 앱을 껐다 켜도 대화 유지 (서버에 저장)
- 보낸 사람 이름은 마이페이지 닉네임을 따라감
- 서버에 못 닿으면 경고를 띄우고 기존 목업 화면으로 되돌아감 (앱이 죽지 않음)

**아직 아닌 것 — 이후 단계에서**

| 항목 | 언제 |
|---|---|
| 방별 참여 권한 (아무나 모든 방을 읽음) | `chat_member` 가 생기는 8단계 |
| 안 읽음 개수 · 푸시 알림 | `last_read_at` + FCM |
| 닉네임 도용 방지 (지금은 자기 닉네임을 자유롭게 바꿈) | 회원가입(3단계) 후 프로필 참조로 교체 |
| 신고 · 차단이 채팅에 반영 | 10단계 |
| 사진 · 장소 · 일정 공유 | Storage 연동 후 |
| 보이스룸 | LiveKit (9단계) |

**비용** — 무료 요금제는 DB 500MB, 월 활성 사용자 5만, 동시접속 200 입니다.
초기 시연·베타 규모에서는 요금이 발생하지 않습니다.

---

## 되돌리는 법

`assets/js/supa.js` 의 `CONFIG` 두 줄을 다시 비우면 즉시 로컬 모드로 돌아갑니다.
서버 쪽은 그대로 남아 있으니 언제든 다시 켤 수 있습니다.
