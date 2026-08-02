/* D17 카페형 메인(전체/인기/공지/프로필) · D27 통합검색 · 알림 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const { esc, num, avatar, postRow, isGuest, session } = UI;

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
          '<div class="cover-meta">멤버 ' + num(c.members) + ' · 오늘 새 글 ' + c.todayPosts + '</div>' +
        '</div>' +
        (isGuest()
          ? '<a class="btn sm" href="#/login?tab=join" data-nav>가입</a>'
          : '<span class="badge">' + UI.GRADE_LABEL[session().grade] + '</span>') +
      '</div>' +
    '</div>';
  }

  /* 메인 상단 탭 (D17 ④) */
  function mainTabs (cur) {
    const tabs = [['all','전체'],['hot','🔥 인기'],['notice','공지'],['profile','프로필']];
    return '<div class="mtabs">' + tabs.map(t =>
      '<a class="mtab' + (t[0] === cur ? ' on' : '') + '" href="#/home?t=' + t[0] + '" data-nav>' +
      t[1] + '</a>').join('') + '</div>';
  }

  /* ── D17 메인 ─────────────────────────── */
  S.home = function (q) {
    const t = q.t || 'all';
    let body = '';

    if (t === 'all') {
      const pin = DB.posts.find(p => p.pin);
      const hot = DB.posts.filter(p => p.hot).slice(0, 5);
      const all = DB.posts.filter(p => !p.pin);
      const sort = q.sort || 'new';
      const sorted = all.slice().sort((a, b) =>
        sort === 'cmt' ? b.comments - a.comments : sort === 'view' ? b.views - a.views : 0);

      body += '<a class="pin" href="#/post/' + pin.post_id + '" data-nav>' +
              '<span>📢</span><b>' + esc(pin.title) + '</b><span class="row-arrow">›</span></a>';

      body += '<div class="sec-head"><h3>🔥 나 빼고 다 본 인기글</h3>' +
              '<a class="sec-more" href="#/home?t=hot" data-nav>더보기 ›</a></div>' +
              '<div class="hscroll">' + hot.map(p =>
                '<a class="hotcard" href="#/post/' + p.post_id + '" data-nav>' +
                '<div class="hotcard-thumb"></div>' +
                '<div class="hotcard-title">' + esc(p.title) + '</div>' +
                '<div class="hotcard-meta">공감 ' + p.likes + ' · 댓글 ' + p.comments + '</div></a>').join('') +
              '</div>';

      body += '<div class="sec-head"><h3>전체 게시글</h3>' +
              '<button class="sec-more" data-sheet="sort">' +
              (sort === 'cmt' ? '댓글순' : sort === 'view' ? '조회순' : '최신순') + ' ▾</button></div>' +
              '<div class="list">' + sorted.map(postRow).join('') + '</div>';

    } else if (t === 'hot') {
      const hot = DB.posts.slice().sort((a, b) => (b.likes + b.comments * 3) - (a.likes + a.comments * 3));
      body += '<div class="chips">' + ['오늘','이번 주','이번 달'].map((c, i) =>
              '<span class="chip' + (i === 1 ? ' on' : '') + '">' + c + '</span>').join('') + '</div>';
      body += '<div class="rank">' + hot.slice(0, 5).map((p, i) =>
              '<a class="row" href="#/post/' + p.post_id + '" data-nav>' +
              '<div class="rank-no' + (i < 3 ? ' top' : '') + '">' + (i + 1) + '</div>' +
              '<div class="row-main"><div class="row-title wrap">' + esc(p.title) + '</div>' +
              '<div class="row-meta">' + esc(DB.board(p.board_id).name) + ' · 공감 ' + p.likes +
              ' · 댓글 ' + p.comments + '</div></div></a>').join('') + '</div>';
      body += '<div class="sec-head"><h3>인기 모임</h3>' +
              '<a class="sec-more" href="#/meetings" data-nav>더보기 ›</a></div>' +
              '<div class="list">' + DB.meetings.slice(0, 3).map(m =>
              '<a class="row" href="#/meeting/' + m.meeting_id + '" data-nav>' +
              '<div class="row-main"><div class="row-title">' + esc(m.title) + '</div>' +
              '<div class="row-meta">' + esc(m.date) + ' · ' + esc(m.region) + ' · ' +
              m.joined + '/' + m.capacity + '명</div></div><span class="row-arrow">›</span></a>').join('') +
              '</div>';

    } else if (t === 'notice') {
      const list = DB.posts.filter(p => p.board_id === 'notice');
      body += '<div class="chips">' + ['필독','운영정책','이벤트','업데이트'].map((c, i) =>
              '<span class="chip' + (i === 0 ? ' on' : '') + '">' + c + '</span>').join('') + '</div>';
      body += '<div class="list">' + list.map(postRow).join('') +
              '<a class="row" href="#/post/p1" data-nav><div class="row-main">' +
              '<div class="row-title wrap">개인정보 처리방침 및 운영정책 안내</div>' +
              '<div class="row-meta">공지사항 · 운영자 · 1주 전</div></div>' +
              '<span class="row-arrow">›</span></a></div>';

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
    return '<div class="prof-head">' + avatar({ nickname: s.nickname, color: 'c2' }, 'lg') +
      '<div><div class="prof-name">' + esc(s.nickname) +
      '<span class="badge" style="margin-left:6px">' + UI.GRADE_LABEL[s.grade] + '</span></div>' +
      '<div class="prof-meta">' + esc(s.region) + ' · ' + esc(s.age) + ' · 매너 ' + s.manner + '</div></div></div>' +
      '<div class="list" style="margin-top:12px">' +
      [['내 모임','#/my?t=meets'],['내 글 · 댓글','#/my?t=posts'],['저장한 글','#/my?t=saved'],
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
      const hit = s => (s || '').toLowerCase().indexOf(kw.toLowerCase()) > -1;
      const canRead = b => {
        const bd = DB.board(b);
        if (bd.access === 'public') return true;
        if (bd.access === 'member') return UI.isMember();
        return UI.isVerified();
      };
      const ps = DB.posts.filter(p => canRead(p.board_id) && (hit(p.title) || hit(p.body)));
      const ms = DB.meetings.filter(m => hit(m.title) || hit(m.desc) || hit(m.region));
      const us = Object.keys(DB.users).map(k => DB.users[k])
                   .filter(u => u.grade !== 'admin' && (hit(u.nickname) || u.interests.some(hit)));
      const cs = [];
      Object.keys(DB.comments).forEach(pid => DB.comments[pid].forEach(c => {
        if (hit(c.body) && canRead((DB.post(pid) || {}).board_id)) cs.push({ pid, c });
      }));
      const total = ps.length + ms.length + us.length + cs.length;
      const tab = q.t || 'all';

      body += '<div class="chips">' +
              ['전체 기간 ▾','전체 게시판 ▾','최신순 ▾'].map(f => '<button class="chip" data-sheet="filter">' + f + '</button>').join('') +
              '</div>';
      body += '<div class="stabs">' + [['all','전체',total],['post','게시글',ps.length],
              ['cmt','댓글',cs.length],['meet','모임',ms.length],['user','회원',us.length]].map(t =>
              '<a class="stab' + (t[0] === tab ? ' on' : '') + '" href="#/search?q=' + encodeURIComponent(kw) +
              '&t=' + t[0] + '" data-nav>' + t[1] + ' <b>' + t[2] + '</b></a>').join('') + '</div>';

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
            '<div class="badge gray" style="margin-bottom:4px">' + esc(DB.board(p.board_id).name) + '</div>' +
            '<div class="row-title wrap">' + mark(p.title) + '</div>' +
            '<div class="sres-body">' + mark(p.body.slice(0, 62)) + '…</div>' +
            '<div class="row-meta">' + esc(DB.user(p.author).nickname) + ' · ' + esc(p.at) +
            ' · 조회 ' + num(p.views) + ' · 댓글 ' + p.comments + '</div></div></a>').join('') + '</div>';
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
            m.joined + '/' + m.capacity + '명 · ' + UI.won(m.fee) + '</div></div>' +
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

  /* 알림 */
  S.noti = function () {
    return { bar: { title: '알림', back: true, center: true }, tab: false,
      html: '<div class="list" style="margin-top:12px">' + DB.notifications.map(n =>
        '<a class="row" href="' + n.to + '" data-nav>' +
        '<div style="font-size:20px;flex:0 0 34px;text-align:center">' + n.icon + '</div>' +
        '<div class="row-main"><div class="row-title wrap">' + esc(n.title) + '</div>' +
        '<div class="row-meta">' + esc(n.at) + '</div></div></a>').join('') + '</div>' +
        '<div class="notice gray"><i>🔒</i><div>읽을 권한이 없는 글의 제목은 알림 미리보기에도 표시하지 않습니다.</div></div>' };
  };

})(window.SCREENS);
