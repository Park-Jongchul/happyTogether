/* D17 카페형 메인(전체/인기/공지/프로필) · D27 통합검색 · 알림 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const { esc, num, avatar, postRow, isGuest, session, has, visible } = UI;

  /* ── 커뮤니티 대문 (D17 ②③) ─────────────── */
  function cover () {
    const c = DB.community;
    return '' +
    '<div class="cover">' +
      '<div class="cover-img"><span class="cover-tag">행복하자<br>우리</span>' +
        '<span class="cover-tag-en">HAPPY TOGETHER</span></div>' +
      '<div class="cover-info">' +
        '<div class="cover-logo">행</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="cover-name">' + esc(c.name) + '</div>' +
          '<div class="cover-meta">멤버 ' + num(c.members) + ' · 오늘 새 글 ' + todayPosts() + '</div>' +
        '</div>' +
        (isGuest()
          ? '<a class="btn sm" href="#/login?tab=join" data-nav>가입</a>'
          : '<span class="badge">' + UI.GRADE_LABEL[session().grade] + '</span>') +
      '</div>' +
    '</div>';
  }
  const todayPosts = () => DB.community.todayPosts +
    DB.posts.filter(p => p.mine && DB.sameDay(p.ts)).length;

  /* 메인 상단 탭 (D17 ④) */
  function mainTabs (cur) {
    const tabs = [['all','전체'],['hot','🔥 인기'],['notice','공지'],['profile','프로필']];
    return '<div class="mtabs">' + tabs.map(t =>
      '<a class="mtab' + (t[0] === cur ? ' on' : '') + '" href="#/home?t=' + t[0] + '" data-nav>' +
      t[1] + '</a>').join('') + '</div>';
  }

  /* 기간 필터 — 목록형 화면이 함께 씁니다 */
  const PERIOD = { '오늘': 1, '이번 주': 7, '이번 달': 30 };
  function inPeriod (ts, label) {
    if (!label || !PERIOD[label]) return true;
    if (label === '오늘') return DB.sameDay(ts);
    return ts >= Date.now() - PERIOD[label] * 86400000;
  }

  /* ── D17 메인 ─────────────────────────── */
  S.home = function (q) {
    const t = q.t || 'all';
    let body = '';
    /* 읽을 수 있고, 숨기지 않은 글만 다룹니다 */
    const readable = DB.posts.filter(p => UI.canRead(p.board_id) && visible(p));

    if (t === 'all') {
      const pin = readable.filter(p => p.pin)[0];
      const hot = readable.filter(p => p.hot).slice(0, 5);
      const all = readable.filter(p => !p.pin);
      const sort = q.sort || 'new';
      const sorted = all.slice().sort((a, b) =>
        sort === 'cmt' ? b.comments - a.comments : sort === 'view' ? b.views - a.views : (b.ts || 0) - (a.ts || 0));

      if (pin) {
        body += '<a class="pin" href="#/post/' + pin.post_id + '" data-nav>' +
                '<span>📢</span><b>' + esc(pin.title) + '</b><span class="row-arrow">›</span></a>';
      }

      if (hot.length) {
        body += '<div class="sec-head"><h3>🔥 나 빼고 다 본 인기글</h3>' +
                '<a class="sec-more" href="#/home?t=hot" data-nav>더보기 ›</a></div>' +
                '<div class="hscroll">' + hot.map(p =>
                  '<a class="hotcard" href="#/post/' + p.post_id + '" data-nav>' +
                  '<div class="hotcard-thumb"></div>' +
                  '<div class="hotcard-title">' + esc(p.title) + '</div>' +
                  '<div class="hotcard-meta">공감 ' + (p.likes + (has('liked', p.post_id) ? 1 : 0)) +
                  ' · 댓글 ' + p.comments + '</div></a>').join('') +
                '</div>';
      }

      body += '<div class="sec-head"><h3>전체 게시글</h3>' +
              '<button class="sec-more" data-sheet="sort">' +
              (sort === 'cmt' ? '댓글순' : sort === 'view' ? '조회순' : '최신순') + ' ▾</button></div>' +
              (sorted.length
                ? '<div class="list">' + sorted.map(postRow).join('') + '</div>'
                : '<div class="empty"><b>📝</b>표시할 글이 없습니다.</div>');

    } else if (t === 'hot') {
      const d = PERIOD[q.d] ? q.d : '이번 주';
      const hot = readable.filter(p => !p.pin && inPeriod(p.ts, d))
                    .sort((a, b) => (b.likes + b.comments * 3) - (a.likes + a.comments * 3));
      body += '<div class="chips">' + Object.keys(PERIOD).map(c =>
              '<a class="chip' + (c === d ? ' on' : '') + '" href="#/home?t=hot&d=' + encodeURIComponent(c) + '" data-nav>' +
              c + '</a>').join('') + '</div>';
      body += (hot.length
        ? '<div class="rank">' + hot.slice(0, 5).map((p, i) =>
            '<a class="row" href="#/post/' + p.post_id + '" data-nav>' +
            '<div class="rank-no' + (i < 3 ? ' top' : '') + '">' + (i + 1) + '</div>' +
            '<div class="row-main"><div class="row-title wrap">' + esc(p.title) + '</div>' +
            '<div class="row-meta">' + esc(DB.board(p.board_id).name) + ' · 공감 ' + p.likes +
            ' · 댓글 ' + p.comments + '</div></div></a>').join('') + '</div>'
        : '<div class="empty"><b>🔥</b>' + esc(d) + ' 인기글이 아직 없습니다.</div>');

      const soon = DB.meetings.filter(m => !DB.isPast(m)).sort((a, b) => a.ts - b.ts).slice(0, 3);
      body += '<div class="sec-head"><h3>다가오는 모임</h3>' +
              '<a class="sec-more" href="#/meetings" data-nav>더보기 ›</a></div>' +
              '<div class="list">' + soon.map(m =>
              '<a class="row" href="#/meeting/' + m.meeting_id + '" data-nav>' +
              '<div class="row-main"><div class="row-title">' + esc(m.title) + '</div>' +
              '<div class="row-meta">' + esc(m.date) + ' · ' + esc(m.region) + ' · ' +
              DB.joinedOf(m) + '/' + m.capacity + '명</div></div><span class="row-arrow">›</span></a>').join('') +
              '</div>';

    } else if (t === 'notice') {
      const cats = ['필독','운영정책','이벤트','업데이트'];
      const nc = cats.indexOf(q.nc) > -1 ? q.nc : '';
      let list = DB.posts.filter(p => p.board_id === 'notice');
      if (nc) list = list.filter(p => p.ncat === nc);
      body += '<div class="chips">' + cats.map(c =>
              '<a class="chip' + (c === nc ? ' on' : '') + '" href="#/home?t=notice' +
              (c === nc ? '' : '&nc=' + encodeURIComponent(c)) + '" data-nav>' + c + '</a>').join('') + '</div>';
      body += (list.length
        ? '<div class="list">' + list.map(postRow).join('') + '</div>'
        : '<div class="empty"><b>📢</b>이 분류의 공지가 없습니다.</div>');

    } else {
      body += S.profileTab();
    }

    return {
      bar: { title: DB.community.name, sub: DB.community.slogan, brand: false,
             actions: [{ act:'search', icon:'🔍', label:'검색' }, { act:'drawer', icon:'☰', label:'전체메뉴' }] },
      tab: 'home',
      html: cover() + mainTabs(t) + body
    };
  };

  /* 메인 4번째 탭 — 프로필 (비회원이면 가입 안내) */
  S.profileTab = function () {
    const s = session();
    if (isGuest()) {
      return '<div class="prof-guest">' +
        '<div class="avatar lg" style="margin:0 auto 14px;background:#dfe5ec;color:#9aa6b8">?</div>' +
        '<h3>아직 로그인하지 않았어요</h3>' +
        '<p>가입하면 댓글 · 모임 · 채팅을 이용할 수 있어요.<br>둘러보기는 계속 가능합니다.</p>' +
        '<a class="btn" href="#/login?tab=join" data-nav style="margin-top:18px">회원가입</a>' +
        '<a class="btn line" href="#/login" data-nav style="margin-top:8px">이미 계정이 있어요</a>' +
        '</div>';
    }
    return '<div class="prof-head">' + avatar('u_me', 'lg') +
      '<div><div class="prof-name">' + esc(s.nickname) +
      '<span class="badge" style="margin-left:6px">' + UI.GRADE_LABEL[s.grade] + '</span></div>' +
      '<div class="prof-meta">' + esc(s.region) + ' · ' + esc(s.age) + ' · 매너 ' + s.manner + '</div></div></div>' +
      '<div class="list" style="margin-top:12px">' +
      [['내 모임','#/my-meetings'],['내 글 · 댓글','#/my?t=posts'],['저장한 글','#/my?t=saved'],
       ['프로필 · 공개범위','#/profile-edit'],['마이페이지','#/my']].map(m =>
        '<a class="row" href="' + m[1] + '" data-nav><div class="row-main">' +
        '<div class="row-title">' + m[0] + '</div></div><span class="row-arrow">›</span></a>').join('') +
      '</div>';
  };

  /* ── D27 통합검색 ─────────────────────── */
  S.search = function (q) {
    const kw = (q.q || '').trim();
    let body = '';

    body += '<div class="searchbar"><span>🔍</span>' +
            '<input id="q" class="sinp" placeholder="등산 모임을 검색해보세요" value="' + esc(kw) + '" ' +
            'autocomplete="off" enterkeyhint="search">' +
            (kw ? '<button data-act="qclear" aria-label="지우기">✕</button>' : '') + '</div>';

    if (!kw) {
      const recent = session().recent || DB.searchRecent;
      body += '<div class="sec-head"><h3>최근 검색어</h3><button class="sec-more" data-act="clear-recent">전체 삭제</button></div>' +
              '<div class="chips">' + (recent.length
                ? recent.map(r => '<a class="chip" href="#/search?q=' + encodeURIComponent(r) + '" data-nav>' + esc(r) + '</a>').join('')
                : '<span style="font-size:13px;color:var(--muted)">최근 검색어가 없습니다</span>') + '</div>';
      body += '<div class="sec-head"><h3>인기 검색어</h3></div><div class="list">' +
              DB.searchHot.map((k, i) =>
                '<a class="row" href="#/search?q=' + encodeURIComponent(k) + '" data-nav>' +
                '<div class="rank-no' + (i < 3 ? ' top' : '') + '">' + (i + 1) + '</div>' +
                '<div class="row-main"><div class="row-title">' + esc(k) + '</div></div></a>').join('') +
              '</div>';
      body += '<div class="notice gray"><i>🔒</i><div>읽을 권한이 없는 글은 검색 결과에 제목도 표시되지 않습니다. ' +
              '익명게시판은 정회원에게만 노출됩니다.</div></div>';
    } else {
      const hit = s => String(s || '').toLowerCase().indexOf(kw.toLowerCase()) > -1;
      const boardOf = name => (DB.boards.filter(b => b.name === name)[0] || {}).board_id;
      const wantBoard = q.b ? boardOf(q.b) : '';

      /* 게시글 — 권한·숨김·기간·게시판 조건을 모두 통과한 것만 */
      let ps = DB.posts.filter(p => UI.canRead(p.board_id) && visible(p) && (hit(p.title) || hit(p.body)));
      if (UI.canRead('anon'))
        ps = ps.concat(DB.anonPosts.filter(p => visible(p) && (hit(p.title) || hit(p.body))));
      if (wantBoard) ps = ps.filter(p => (p.anon_no ? 'anon' : p.board_id) === wantBoard);
      if (q.d) ps = ps.filter(p => inPeriod(p.ts, q.d));
      ps.sort((a, b) => q.s === '공감순' ? b.likes - a.likes
                      : q.s === '조회순' ? (b.views || 0) - (a.views || 0)
                      : (b.ts || 0) - (a.ts || 0));

      const ms = DB.meetings.filter(m => hit(m.title) || hit(m.desc) || hit(m.region) || hit(m.cat));
      const us = Object.keys(DB.users).map(k => DB.users[k])
                   .filter(u => u.grade !== 'admin' && !has('blocked', u.user_id) &&
                                (hit(u.nickname) || u.interests.some(hit)));
      const cs = [];
      Object.keys(DB.comments).forEach(pid => DB.comments[pid].forEach(c => {
        const p = DB.post(pid);
        if (!p || !visible(p)) return;
        if (!UI.canRead(p.anon_no ? 'anon' : p.board_id)) return;
        if (hit(c.body)) cs.push({ pid: pid, c: c });
      }));
      const total = ps.length + ms.length + us.length + cs.length;
      const tab = q.t || 'all';

      body += UI.filterBar('search', q);
      body += '<div class="stabs">' + [['all','전체',total],['post','게시글',ps.length],
              ['cmt','댓글',cs.length],['meet','모임',ms.length],['user','회원',us.length]].map(t =>
              '<a class="stab' + (t[0] === tab ? ' on' : '') + '" href="' + UI.withQuery({ t: t[0] }) +
              '" data-nav>' + t[1] + ' <b>' + t[2] + '</b></a>').join('') + '</div>';

      if (!total) {
        body += '<div class="empty"><b>🔍</b>‘' + esc(kw) + '’ 검색 결과가 없습니다.<br>' +
                '다른 키워드로 검색하거나 인기 게시판을 둘러보세요.</div>' +
                '<div class="chips" style="justify-content:center">' +
                DB.searchHot.slice(0, 3).map(k => '<a class="chip" href="#/search?q=' + encodeURIComponent(k) + '" data-nav>' + esc(k) + '</a>').join('') +
                '</div>';
      } else {
        const mark = s => esc(s).replace(new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
        if ((tab === 'all' || tab === 'post') && ps.length) {
          body += '<div class="sec-head"><h3>게시글</h3></div><div class="list">' + ps.map(p =>
            '<a class="row" href="#/post/' + p.post_id + '" data-nav><div class="row-main">' +
            '<div class="badge gray" style="margin-bottom:4px">' +
            esc(p.anon_no ? '익명게시판' : DB.board(p.board_id).name) + '</div>' +
            '<div class="row-title wrap">' + mark(p.title) + '</div>' +
            '<div class="sres-body">' + mark(p.body.slice(0, 62)) + '…</div>' +
            '<div class="row-meta">' + esc(p.anon_no ? '익명 ' + p.anon_no : DB.user(p.author).nickname) +
            ' · ' + esc(p.at) + ' · 조회 ' + num(p.views || 0) + ' · 댓글 ' + p.comments + '</div></div></a>').join('') + '</div>';
        }
        if ((tab === 'all' || tab === 'cmt') && cs.length) {
          body += '<div class="sec-head"><h3>댓글</h3></div><div class="list">' + cs.map(x =>
            '<a class="row" href="#/post/' + x.pid + '" data-nav><div class="row-main">' +
            '<div class="row-title wrap">“' + mark(x.c.body) + '”</div>' +
            '<div class="row-meta">게시글: ' + esc((DB.post(x.pid) || {}).title) + ' · ' +
            esc(DB.user(x.c.user).nickname) + ' · ' + esc(x.c.at) + '</div></div></a>').join('') + '</div>';
        }
        if ((tab === 'all' || tab === 'meet') && ms.length) {
          body += '<div class="sec-head"><h3>모임</h3></div><div class="list">' + ms.map(m =>
            '<a class="row" href="#/meeting/' + m.meeting_id + '" data-nav><div class="row-main">' +
            '<div class="row-title wrap">' + mark(m.title) + '</div>' +
            '<div class="row-meta">' + esc(m.date) + ' · ' + esc(m.region) + ' · ' +
            DB.joinedOf(m) + '/' + m.capacity + '명 · ' + UI.won(m.fee) + '</div></div>' +
            '<span class="row-arrow">›</span></a>').join('') + '</div>';
        }
        if ((tab === 'all' || tab === 'user') && us.length) {
          body += '<div class="sec-head"><h3>회원</h3></div><div class="list">' + us.map(u =>
            '<a class="row" href="#/user/' + u.user_id + '" data-nav>' + avatar(u) +
            '<div class="row-main"><div class="row-title">' + mark(u.nickname) + '</div>' +
            '<div class="row-meta">' + esc(u.region) + ' · ' + esc(u.age) + ' · 관심사 ' +
            esc(u.interests.slice(0, 3).join(', ')) + '</div></div>' +
            '<span class="row-arrow">›</span></a>').join('') + '</div>';
        }
      }
    }
    return { bar: { title: '통합검색', back: true, center: true }, tab: false, html: body,
             after: function () {
               const inp = UI.$('#q');
               if (!inp) return;
               if (!kw) inp.focus();
               inp.addEventListener('keydown', e => {
                 if (e.key === 'Enter') {
                   const v = inp.value.trim();
                   if (!v) return;
                   const r = (session().recent || DB.searchRecent).filter(x => x !== v);
                   r.unshift(v);
                   UI.set({ recent: r.slice(0, 10) });
                   UI.go('#/search?q=' + encodeURIComponent(v));
                 }
               });
             } };
  };

  /* ── 알림 ─────────────────────────────── */
  S.noti = function () {
    const unread = DB.notifications.filter(n => !has('notiRead', n.noti_id));
    return { bar: { title: '알림', back: true, center: true }, tab: false,
      html: '<div class="list" style="margin-top:12px">' + DB.notifications.map(n =>
        '<a class="row" href="' + n.to + '" data-nav' +
        (has('notiRead', n.noti_id) ? '' : ' style="background:#f4fbfb"') + '>' +
        '<div style="font-size:20px;flex:0 0 34px;text-align:center">' + n.icon + '</div>' +
        '<div class="row-main"><div class="row-title wrap">' + esc(n.title) + '</div>' +
        '<div class="row-meta">' + esc(n.at) + '</div></div>' +
        (has('notiRead', n.noti_id) ? '' : '<span class="unread">N</span>') + '</a>').join('') + '</div>' +
        '<div class="notice gray"><i>🔒</i><div>읽을 권한이 없는 글의 제목은 알림 미리보기에도 표시하지 않습니다.</div></div>',
      after: function () {
        /* 목록을 열면 읽음으로 표시합니다 (다시 그리지 않고 다음 진입부터 반영) */
        if (!unread.length) return;
        UI.set({ notiRead: DB.notifications.map(n => n.noti_id) });
      } };
  };

})(window.SCREENS);
