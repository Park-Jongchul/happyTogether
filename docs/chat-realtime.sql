-- ─────────────────────────────────────────────────────────────
-- 실시간 채팅 최소 구성 (docs/BACKEND.md 8단계의 선행 버전)
--
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다.
--
-- schema.sql 의 chat_message 와 이름을 일부러 다르게 두었습니다.
-- 전체 스키마(회원·모임·권한)를 적용하기 전이라도 채팅만 먼저 켜기 위한 표이고,
-- 8단계에서 chat_room / chat_member 가 생기면 그쪽으로 옮깁니다.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.rt_chat_message (
  message_id  bigint generated always as identity primary key,
  room_id     text not null,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  sender_name text not null check (char_length(sender_name) between 1 and 20),
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create index if not exists rt_chat_message_room_idx
  on public.rt_chat_message (room_id, created_at desc);

alter table public.rt_chat_message enable row level security;

-- 읽기: 로그인한 사용자(익명 로그인 포함) 전체.
--       방별 권한은 chat_member 가 생기는 8단계에서 좁힙니다.
drop policy if exists "rt read signed in" on public.rt_chat_message;
create policy "rt read signed in" on public.rt_chat_message
  for select to authenticated using (true);

-- 쓰기: 남의 이름으로 보내지 못하도록 sender_id 를 본인으로 강제합니다.
drop policy if exists "rt insert own" on public.rt_chat_message;
create policy "rt insert own" on public.rt_chat_message
  for insert to authenticated with check (sender_id = auth.uid());

-- 삭제: 자기 메시지만.
drop policy if exists "rt delete own" on public.rt_chat_message;
create policy "rt delete own" on public.rt_chat_message
  for delete to authenticated using (sender_id = auth.uid());

-- 수정은 아예 열지 않습니다 (보낸 말을 바꿔치기하지 못하게).

-- Realtime 브로드캐스트 대상에 추가 — 이미 들어 있으면 건너뜁니다.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'rt_chat_message'
  ) then
    alter publication supabase_realtime add table public.rt_chat_message;
  end if;
end $$;
