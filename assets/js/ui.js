/* 공통 UI 유틸 · 상태 · 권한 게이트
   화면설계서 6장(회원 등급과 접근 권한)을 그대로 구현합니다.
   grade: guest(비회원) → member(가입회원) → verified(정회원) */
window.UI = (function () {

  const KEY = 'ht.session.v1';
  const GRADE_LABEL = { guest:'비회원', member:'가입회원', verified:'정회원', admin:'운영자' };

  const defaults = {
    grade: 'guest',
    nickname: '종이비행기',
    region: '서울',
    age: '40대',
    interests: ['산책','여행'],
    kids: '비공개',
    remarry: '비공개',
    bio: '',
    manner: 4.7,
    liked: [],      // 공감한 글
    saved: [],      // 저장한 글
    favMeets: [],   // 찜한 모임
    myMeets: ['m1'],// 신청한 모임
    recent: null,   // 최근 검색어(로컬 저장)
    verifyStep: 0   // 0 미시작 / 1 프로필 / 2 인증제출 / 3 심사중
  };

  let S = load();

  function load () {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? Object.assign({}, defaults, JSON.parse(raw)) : Object.assign({}, defaults);
    } catch (e) { return Object.assign({}, defaults); }
  }
  function save () {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  function session () { return S; }
  function set (patch) { Object.assign(S, patch); save(); }
  function reset () { S = Object.assign({}, defaults); save(); }

  const isGuest    = () => S.grade === 'guest';
  const isMember   = () => S.grade === 'member' || S.grade === 'verified' || S.grade === 'admin';
  const isVerified = () => S.grade === 'verified' || S.grade === 'admin';

  /* ── DOM 헬퍼 ───────────────────────────── */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  function esc (s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  const nl2br = s => esc(s).replace(/\n/g,'<br>');
  const num   = n => Number(n).toLocaleString('ko-KR');
  const won   = n => Number(n) === 0 ? '무료' : num(n) + '원';
  const initial = s => String(s || '?').trim().charAt(0);

  function go (hash) { location.hash = hash; }
  function back () {
    if (history.length > 1) history.back();
    else go('#/home');
  }

  /* 아바타 */
  function avatar (u, cls) {
    const user = typeof u === 'string' ? DB.user(u) : u;
    return '<div class="avatar ' + (cls || '') + ' ' + (user.color || '') + '">' +
           esc(initial(user.nickname)) + '</div>';
  }

  /* ── 토스트 ─────────────────────────────── */
  let toastT;
  function toast (msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('on'), 2100);
  }

  /* ── 바텀시트 ───────────────────────────── */
  function sheet (html) {
    const wrap = $('#sheet');
    $('.sheet-panel', wrap).innerHTML = '<div class="sh-grab"></div>' + html;
    wrap.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet () {
    $('#sheet').hidden = true;
    document.body.style.overflow = '';
  }

  /* ── 전체메뉴 드로어 ─────────────────────── */
  function openDrawer () {
    const wrap = $('#drawer');
    $('.drawer-panel', wrap).innerHTML = drawerHTML();
    wrap.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer () {
    $('#drawer').hidden = true;
    document.body.style.overflow = '';
  }

  /* D23 전체메뉴 */
  function drawerHTML () {
    const pub = [
      ['공지사항','#/board/notice'], ['가입인사','#/board/hello'],
      ['자유게시판','#/board/free'], ['모임 미리보기','#/meetings'],
      ['이용수칙','#/post/p1'], ['통합검색','#/search']
    ];
    const region = ['서울','경기','인천'];
    const hobby  = ['등산','골프','여행','와인','반려동물'];
    const vip = [
      ['익명게시판','#/anon'], ['단체채팅','#/chats'], ['보이스룸','#/voice'],
      ['모임 만들기','#/meeting-new'], ['회원 찾기','#/people'], ['마이페이지','#/my']
    ];
    const u = S;
    let h = '<div class="dw-head"><div><b>전체메뉴</b>' +
            '<div style="font-size:11.5px;opacity:.85;margin-top:2px">' +
            (isGuest() ? '비회원으로 둘러보는 중' : esc(u.nickname) + ' · ' + GRADE_LABEL[u.grade]) +
            '</div></div><button class="ab-btn" data-close-drawer aria-label="닫기">✕</button></div>';

    h += '<div class="dw-group">공개 메뉴</div>';
    pub.forEach(m => { h += '<a class="dw-item" href="' + m[1] + '" data-nav>' + esc(m[0]) + '</a>'; });

    h += '<div class="dw-group">지역 게시판</div>';
    h += '<div style="padding:2px 14px 6px;display:flex;flex-wrap:wrap;gap:6px">' +
         region.map(r => '<a class="chip" href="#/board/free?region=' + encodeURIComponent(r) + '" data-nav>' + r + '</a>').join('') +
         '</div>';
    h += '<div class="dw-group">취미 게시판</div>';
    h += '<div style="padding:2px 14px 6px;display:flex;flex-wrap:wrap;gap:6px">' +
         hobby.map(r => '<a class="chip" href="#/board/today?tag=' + encodeURIComponent(r) + '" data-nav>' + r + '</a>').join('') +
         '</div>';

    h += '<div class="dw-group">정회원 메뉴</div>';
    vip.forEach(m => {
      const locked = !isVerified();
      h += '<button class="dw-item" data-vip="' + m[1] + '">' +
           (locked ? '<span style="opacity:.5">🔒</span> ' : '') + esc(m[0]) +
           (locked ? '<span class="badge lock">정회원</span>' : '') + '</button>';
    });

    h += '<div class="dw-foot">';
    if (isGuest()) {
      h += '<a class="btn line sm" style="flex:1" href="#/login" data-nav>로그인</a>' +
           '<a class="btn sm" style="flex:1" href="#/login?tab=join" data-nav>회원가입</a>';
    } else {
      h += '<a class="btn line sm" style="flex:1" href="#/my" data-nav>마이페이지</a>' +
           '<button class="btn line sm" style="flex:1" data-logout>로그아웃</button>';
    }
    h += '</div>';
    return h;
  }

  /* ── 권한 게이트 ─────────────────────────
     need: 'member' | 'verified'
     통과하면 true, 아니면 안내 시트를 띄우고 false */
  function gate (need, reason) {
    if (need === 'member' && !isMember()) { joinSheet(reason); return false; }
    if (need === 'verified' && !isVerified()) {
      if (isGuest()) joinSheet(reason); else verifySheet(reason);
      return false;
    }
    return true;
  }

  /* D18 가입 유도 화면 (하단 시트) */
  function joinSheet (reason) {
    sheet(
      '<div class="sh-head"><h3>회원 전용 기능</h3>' +
      '<p>' + esc(reason || '이 기능') + '을(를) 이용하려면 회원가입이 필요해요.<br>둘러보기는 계속하실 수 있습니다.</p></div>' +
      '<div class="sh-body">' +
        '<div class="perk"><i>✓</i> 가입인사 작성 및 댓글</div>' +
        '<div class="perk"><i>✓</i> 정회원 인증 신청</div>' +
        '<div class="perk"><i>✓</i> 모임 · 채팅 · 보이스룸 이용</div>' +
      '</div>' +
      '<div class="sh-foot">' +
        '<button class="btn kakao" data-join="kakao">카카오로 시작하기</button>' +
        '<button class="btn line" data-join="phone">휴대폰 번호로 가입</button>' +
        '<button class="btn ghost" data-close-sheet>둘러보기 계속</button>' +
      '</div>'
    );
  }

  /* D19 정회원 전환 안내 */
  function verifySheet (reason) {
    const step = S.verifyStep;
    const li = (n, t, done) =>
      '<div class="perk"><i style="' + (done ? 'background:#e6f5ee;color:#1c8b5e' : '') + '">' +
      (done ? '✓' : n) + '</i> ' + t + '</div>';
    sheet(
      '<div class="sh-head"><h3>정회원 인증</h3>' +
      '<p>안전한 커뮤니티를 위해 인증이 필요해요.<br>' +
      esc(reason || '익명게시판 · 모임 · 단체채팅 · 보이스룸') + '은 정회원 전용입니다.</p></div>' +
      '<div class="sh-body">' +
        '<div class="notice gray" style="margin:0 0 8px"><i>ℹ️</i><div>현재 상태: <b>' +
        GRADE_LABEL[S.grade] + '</b></div></div>' +
        li(1,'기본 프로필 작성', step >= 1) +
        li(2,'돌싱 인증 자료 제출', step >= 2) +
        li(3,'운영자 심사', step >= 3) +
      '</div>' +
      '<div class="sh-foot">' +
        '<button class="btn" data-verify-start>정회원 인증 시작</button>' +
        '<button class="btn ghost" data-close-sheet>나중에 하기</button>' +
      '</div>'
    );
  }

  /* 신고 시트 (D16 간이 진입) */
  function reportSheet (target) {
    sheet(
      '<div class="sh-head"><h3>신고하기</h3><p>신고 대상: <b>' + esc(target) + '</b></p></div>' +
      '<div class="sh-body">' +
        ['불쾌한 언행','성적 괴롭힘','금전 요구','허위 신분','영업·홍보'].map(t =>
          '<button class="row" style="border-bottom:1px solid var(--line2);padding-left:0;padding-right:0" data-report-type="' + esc(t) + '">' +
          '<div class="row-main"><div class="row-title">' + t + '</div></div><span class="row-arrow">›</span></button>').join('') +
      '</div>' +
      '<div class="sh-foot"><a class="btn line" href="#/report" data-nav data-close-on-nav>안심센터 열기</a>' +
      '<button class="btn ghost" data-close-sheet>취소</button></div>'
    );
  }

  /* ── 헤더 / 탭바 렌더 ─────────────────── */
  function appbar (opts) {
    const bar = $('#appbar');
    if (opts === false) { bar.classList.add('hide'); bar.innerHTML = ''; return; }
    const o = opts || {};
    bar.className = 'appbar' + (o.brand ? ' brand' : '');
    let h = '';
    h += o.back
      ? '<button class="ab-btn" data-back aria-label="뒤로">‹</button>'
      : '<div style="width:6px"></div>';
    h += '<div class="ab-title' + (o.center ? ' center' : '') + '">' + esc(o.title || '') +
         (o.sub ? '<span class="ab-sub">' + esc(o.sub) + '</span>' : '') + '</div>';
    (o.actions || []).forEach(a => {
      h += '<button class="ab-btn" style="position:relative" data-act="' + esc(a.act) + '" aria-label="' +
           esc(a.label || a.act) + '">' + a.icon + (a.dot ? '<span class="ab-dot"></span>' : '') + '</button>';
    });
    bar.innerHTML = h;
  }

  const TABS = [
    { key:'home',     icon:'🏠', label:'홈',     hash:'#/home' },
    { key:'meetings', icon:'📅', label:'모임',   hash:'#/meetings' },
    { key:'community',icon:'💬', label:'커뮤니티',hash:'#/community' },
    { key:'chats',    icon:'🗨️', label:'대화',   hash:'#/chats' },
    { key:'my',       icon:'👤', label:'내정보', hash:'#/my' }
  ];
  function tabbar (active) {
    const bar = $('#tabbar');
    if (active === false) { bar.classList.add('hide'); $('#view').classList.add('no-tabbar'); return; }
    bar.classList.remove('hide');
    $('#view').classList.remove('no-tabbar');
    bar.innerHTML = TABS.map(t =>
      '<a class="tab' + (t.key === active ? ' on' : '') + '" href="' + t.hash + '" data-nav>' +
      '<i>' + t.icon + '</i>' + t.label + '</a>').join('');
  }

  /* 게시글 한 줄 (공통) */
  function postRow (p) {
    const b = DB.board(p.board_id);
    const u = DB.user(p.author);
    return '<a class="row" href="#/post/' + p.post_id + '" data-nav>' +
      '<div style="text-align:center;flex:0 0 40px">' +
        '<div style="font-size:15px;font-weight:800;color:var(--brand)">' + p.comments + '</div>' +
        '<div style="font-size:10px;color:var(--muted)">댓글</div></div>' +
      '<div class="row-main"><div class="row-title wrap">' +
        (p.pin ? '<span class="badge coral" style="margin-right:5px">공지</span>' : '') +
        esc(p.title) + '</div>' +
      '<div class="row-meta">' + esc(b.name) + ' · ' + esc(u.nickname) + ' · ' + esc(p.at) +
      ' · 조회 ' + num(p.views) + '</div></div></a>';
  }

  return { session, set, save, reset, GRADE_LABEL,
           isGuest, isMember, isVerified,
           $, $$, esc, nl2br, num, won, initial, go, back, avatar,
           toast, sheet, closeSheet, openDrawer, closeDrawer, drawerHTML,
           gate, joinSheet, verifySheet, reportSheet,
           appbar, tabbar, postRow, TABS };
})();
