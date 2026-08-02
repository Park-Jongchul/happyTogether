-- 행복하자 우리 (Happy Together) — 데이터베이스 스키마
-- PostgreSQL / Supabase 기준. 화면설계서 9장 데이터 모델과 6장 접근 권한을 그대로 옮겼습니다.
--
-- 적용:  psql "$DATABASE_URL" -f docs/schema.sql
--        (Supabase 는 SQL Editor 에 붙여넣기)

begin;

-- ────────────────────────────────────────────────
-- 열거형
-- ────────────────────────────────────────────────
create type user_grade   as enum ('guest','member','verified','admin');
create type user_status  as enum ('active','suspended','withdrawn');
create type access_level as enum ('public','member','verified','admin');
create type verify_state as enum ('pending','need_more','approved','rejected');
create type verify_type  as enum ('document','staff_review');
create type marital      as enum ('divorced','bereaved','de_facto_ended');
create type visibility   as enum ('public','verified_only','same_meeting','private');
create type post_status  as enum ('published','hidden','deleted');
create type meeting_state as enum ('draft','review','open','closed','canceled','done');
create type approval_type as enum ('instant','manual');
create type member_state  as enum ('applied','approved','rejected','canceled','waitlist');
create type payment_state as enum ('none','paid','refunded','failed');
create type room_type     as enum ('meeting','group','dm');
create type report_state  as enum ('received','protecting','reviewing','decided','appealed','closed');

-- ────────────────────────────────────────────────
-- 회원
-- ────────────────────────────────────────────────
create table app_user (
  user_id       uuid primary key default gen_random_uuid(),
  auth_id       uuid unique,                       -- Supabase auth.users.id
  status        user_status not null default 'active',
  grade         user_grade  not null default 'member',
  nickname      text not null unique check (char_length(nickname) between 2 and 12),
  birth_year    int  check (birth_year between 1930 and 2010),
  gender        text check (gender in ('m','f','none')),
  region        text,
  interests     text[] not null default '{}',
  bio           text,
  avatar_url    text,
  -- 돌싱 특화 정보 + 항목별 공개범위 (기본 비공개)
  kids_status   text,          kids_visibility    visibility not null default 'private',
  remarry_intent text,         remarry_visibility visibility not null default 'private',
  region_visibility visibility not null default 'public',
  -- 활동 신뢰도 (산식은 서버 내부 계산, 상세 비공개)
  manner_score  numeric(2,1) not null default 5.0,
  meeting_count int not null default 0,
  noshow_count  int not null default 0,
  created_at    timestamptz not null default now(),
  last_active_at timestamptz
);
create index on app_user (grade, status);
create index on app_user using gin (interests);

-- 돌싱 인증 / 가입심사 (D03)
create table verification (
  verification_id uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app_user(user_id) on delete cascade,
  type        verify_type not null,
  state       verify_state not null default 'pending',
  marital_status marital,
  join_answer text,                       -- 가입 질문 답변 (최소 50자)
  file_token  text,                       -- 증빙 원본은 별도 비공개 버킷. 토큰만 보관
  reviewer_id uuid references app_user(user_id),
  review_note text,
  reviewed_at timestamptz,
  purge_at    timestamptz not null,       -- 보관기한 경과 시 원본 파기
  created_at  timestamptz not null default now()
);
create index on verification (state, created_at);

-- 증빙 열람 감사로그 (최소 권한 운영자만, 열람 기록 필수)
create table verification_access_log (
  log_id      bigserial primary key,
  verification_id uuid not null references verification(verification_id) on delete cascade,
  viewer_id   uuid not null references app_user(user_id),
  purpose     text not null,
  viewed_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────
-- 게시판 · 게시글 · 댓글
-- ────────────────────────────────────────────────
create table board (
  board_id     text primary key,          -- 'notice','hello','free','anon' …
  name         text not null,
  access       access_level not null default 'public',   -- 열람 권한
  write_access access_level not null default 'member',   -- 쓰기 권한
  is_anonymous boolean not null default false,
  sort_order   int not null default 0,
  visible_in_tab boolean not null default true
);

create table post (
  post_id     uuid primary key default gen_random_uuid(),
  board_id    text not null references board(board_id),
  author_id   uuid references app_user(user_id) on delete set null,
  anon_no     int,                        -- 익명게시판: 글마다 새 번호 (글 간 연결 차단)
  title       text not null,
  body        text not null,
  media       jsonb not null default '[]',
  status      post_status not null default 'published',
  is_pinned   boolean not null default false,
  view_count  int not null default 0,
  like_count  int not null default 0,
  comment_count int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on post (board_id, created_at desc);
create index on post (status, created_at desc);
-- 통합검색(D27): 제목·본문 전문검색
create index post_fts on post using gin (to_tsvector('simple', title || ' ' || body));

create table comment (
  comment_id  uuid primary key default gen_random_uuid(),
  post_id     uuid not null references post(post_id) on delete cascade,
  parent_id   uuid references comment(comment_id) on delete cascade,
  author_id   uuid references app_user(user_id) on delete set null,
  anonymous_key text,                     -- 익명글 내에서만 유효한 식별자
  body        text not null,
  like_count  int not null default 0,
  status      post_status not null default 'published',
  created_at  timestamptz not null default now()
);
create index on comment (post_id, created_at);

create table post_reaction (
  post_id uuid not null references post(post_id) on delete cascade,
  user_id uuid not null references app_user(user_id) on delete cascade,
  kind    text not null check (kind in ('like','save')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

-- ────────────────────────────────────────────────
-- 모임 (D06~D09)
-- ────────────────────────────────────────────────
create table meeting (
  meeting_id   uuid primary key default gen_random_uuid(),
  host_id      uuid not null references app_user(user_id),
  title        text not null,
  category     text not null,
  description  text,
  plan         text,
  items        text,
  region       text not null,
  place_rough  text not null,             -- 공개 전: 대략 위치
  place_exact  text,                      -- 승인 후에만 공개
  starts_at    timestamptz not null,
  capacity     int not null check (capacity between 2 and 200),
  joined_count int not null default 0,
  fee          int not null default 0,
  fee_usage    text,                      -- 참가비 사용처 (유료 모임 필수)
  refund_policy text not null,
  approval     approval_type not null default 'instant',
  gender_ratio text,                      -- 정원 균형 목적만 허용
  age_range    text,
  has_alcohol  boolean not null default false,
  state        meeting_state not null default 'review',
  checkin_policy text,
  review_note  text,                      -- 운영 검수 메모 (A03)
  created_at   timestamptz not null default now()
);
create index on meeting (state, starts_at);
create index on meeting (region, starts_at);

create table meeting_member (
  meeting_id  uuid not null references meeting(meeting_id) on delete cascade,
  user_id     uuid not null references app_user(user_id) on delete cascade,
  state       member_state not null default 'applied',
  apply_answer text,
  payment_state payment_state not null default 'none',
  paid_amount int not null default 0,
  commission  int not null default 0,
  checkin_at  timestamptz,
  attendance  boolean,
  review_state text,
  created_at  timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

-- ────────────────────────────────────────────────
-- 대화 (D12 · D20 · D21)
-- ────────────────────────────────────────────────
create table chat_room (
  room_id      uuid primary key default gen_random_uuid(),
  type         room_type not null,
  access       access_level not null default 'verified',
  owner_id     uuid references app_user(user_id),
  linked_meeting_id uuid references meeting(meeting_id) on delete set null,
  title        text not null,
  notice       text,
  member_count int not null default 0,
  read_only_at timestamptz,               -- 모임 종료 7일 후 읽기 전용
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table chat_member (
  room_id uuid not null references chat_room(room_id) on delete cascade,
  user_id uuid not null references app_user(user_id) on delete cascade,
  role    text not null default 'member' check (role in ('owner','manager','member')),
  muted   boolean not null default false,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table chat_message (
  message_id uuid primary key default gen_random_uuid(),
  room_id    uuid not null references chat_room(room_id) on delete cascade,
  sender_id  uuid references app_user(user_id) on delete set null,
  type       text not null default 'text' check (type in ('text','image','place','schedule','system')),
  body       text,
  payload    jsonb,
  reply_to   uuid references chat_message(message_id) on delete set null,
  status     post_status not null default 'published',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on chat_message (room_id, created_at desc);

create table voice_room (
  voice_room_id uuid primary key default gen_random_uuid(),
  host_id     uuid not null references app_user(user_id),
  linked_room_id uuid references chat_room(room_id) on delete set null,
  title       text not null,
  topic       text,
  access      access_level not null default 'verified',
  state       text not null default 'live' check (state in ('scheduled','live','ended')),
  max_speakers int not null default 8,
  started_at  timestamptz,
  ended_at    timestamptz,
  recording   boolean not null default false   -- 상시 녹음 금지. 정책상 항상 false
);

create table voice_participant (
  voice_room_id uuid not null references voice_room(voice_room_id) on delete cascade,
  user_id  uuid not null references app_user(user_id) on delete cascade,
  role     text not null default 'listener' check (role in ('host','cohost','speaker','listener')),
  hand_raised boolean not null default false,
  muted    boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (voice_room_id, user_id)
);

-- ────────────────────────────────────────────────
-- 안전 · 운영 (D16 · A01~A04)
-- ────────────────────────────────────────────────
create table report (
  report_id    uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references app_user(user_id),
  target_type  text not null check (target_type in ('user','post','comment','chat','meeting')),
  target_id    uuid not null,
  category     text not null,
  detail       text,
  evidence     jsonb not null default '[]',
  block_now    boolean not null default false,
  state        report_state not null default 'received',
  severity     int not null default 1,          -- 위험도별 운영 우선순위
  handler_id   uuid references app_user(user_id),
  decision     text,
  created_at   timestamptz not null default now(),
  closed_at    timestamptz
);
create index on report (state, severity desc, created_at);

create table user_block (
  user_id    uuid not null references app_user(user_id) on delete cascade,
  blocked_id uuid not null references app_user(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);

create table sanction (
  sanction_id uuid primary key default gen_random_uuid(),
  user_id  uuid not null references app_user(user_id) on delete cascade,
  level    int not null,                   -- 1 경고 → 2 기능제한 → 3 정지 → 4 영구정지
  reason   text not null,
  report_id uuid references report(report_id),
  starts_at timestamptz not null default now(),
  ends_at  timestamptz,
  appealed boolean not null default false
);

create table safety_contact (
  user_id uuid primary key references app_user(user_id) on delete cascade,
  name    text not null,
  phone   text not null,
  updated_at timestamptz not null default now()
);

create table notification (
  notification_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(user_id) on delete cascade,
  kind    text not null,
  title   text not null,
  link    text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notification (user_id, created_at desc);

create table search_log (
  log_id  bigserial primary key,
  user_id uuid references app_user(user_id) on delete set null,
  keyword text not null,
  hits    int not null default 0,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────
-- 기본 게시판 (화면설계서 5장 IA)
-- ────────────────────────────────────────────────
insert into board (board_id, name, access, write_access, is_anonymous, sort_order) values
  ('notice',  '공지사항',     'public',   'admin',    false, 1),
  ('hello',   '가입인사',     'public',   'member',   false, 2),
  ('free',    '자유게시판',   'public',   'member',   false, 3),
  ('today',   '오늘의 이야기','public',   'member',   false, 4),
  ('empathy', '공감',         'public',   'member',   false, 5),
  ('kids',    '육아',         'public',   'member',   false, 6),
  ('law',     '법률·재무',    'member',   'member',   false, 7),
  ('anon',    '익명게시판',   'verified', 'verified', true,  8),
  ('meet',    '모임',         'public',   'verified', false, 9);

-- ────────────────────────────────────────────────
-- 접근 제어 (화면설계서 6장)
--   원칙: 읽을 권한이 없는 글은 검색 결과 · 알림 미리보기 · 공유 링크 메타에도
--         제목을 노출하지 않는다 → 목록 조회 단계에서 아예 제외한다.
-- ────────────────────────────────────────────────
create or replace function current_grade() returns user_grade
language sql stable as $$
  select coalesce(
    (select grade from app_user where auth_id = auth.uid() and status = 'active'),
    'guest'::user_grade)
$$;

create or replace function grade_rank(g user_grade) returns int
language sql immutable as $$
  select case g when 'guest' then 0 when 'member' then 1
                when 'verified' then 2 when 'admin' then 3 end
$$;

create or replace function access_rank(a access_level) returns int
language sql immutable as $$
  select case a when 'public' then 0 when 'member' then 1
                when 'verified' then 2 when 'admin' then 3 end
$$;

alter table post    enable row level security;
alter table comment enable row level security;
alter table chat_message enable row level security;
alter table verification enable row level security;

-- 게시글: 내 등급이 게시판 열람 등급 이상일 때만 보인다
create policy post_read on post for select using (
  status = 'published'
  and exists (
    select 1 from board b
    where b.board_id = post.board_id
      and grade_rank(current_grade()) >= access_rank(b.access)
  )
  -- 차단한 회원의 글은 숨김
  and not exists (
    select 1 from user_block ub
    join app_user me on me.auth_id = auth.uid()
    where ub.user_id = me.user_id and ub.blocked_id = post.author_id
  )
);

create policy post_write on post for insert with check (
  exists (
    select 1 from board b
    where b.board_id = post.board_id
      and grade_rank(current_grade()) >= access_rank(b.write_access)
  )
);

create policy post_update_own on post for update using (
  author_id = (select user_id from app_user where auth_id = auth.uid())
  or current_grade() = 'admin'
);

create policy comment_read on comment for select using (
  status = 'published'
  and exists (select 1 from post p where p.post_id = comment.post_id)
);

create policy comment_write on comment for insert with check (
  grade_rank(current_grade()) >= 1
);

-- 채팅 메시지: 방 멤버만
create policy chat_read on chat_message for select using (
  exists (
    select 1 from chat_member cm
    join app_user me on me.auth_id = auth.uid()
    where cm.room_id = chat_message.room_id and cm.user_id = me.user_id
  )
);

-- 인증 서류: 본인 또는 운영자만
create policy verification_read on verification for select using (
  user_id = (select user_id from app_user where auth_id = auth.uid())
  or current_grade() = 'admin'
);

commit;
