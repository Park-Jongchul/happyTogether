/* D10 커뮤니티 게시판 · D11 게시글 상세 · D22 익명게시판 · 글쓰기 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const { esc, num, avatar, postRow, session, isVerified } = UI;

  const CATS = [['all','전체'],['free','일상'],['empathy','공감'],['kids','육아'],
                ['law','법률·재무'],['today','오늘의 이야기'],['anon','익명 고민']];
  const ANON_CATS = ['양육','재혼','법률·재무','감정회복'];

  /* ── D10 커뮤니티 ─────────────────────── */
  S.community = function (q) {
    const cat = q.c || 'all';
    if (cat === 'anon') return S.anon(q);
    const sort = q.sort || 'new';

    let list = DB.posts.filter(p => p.board_id !== 'notice' && p.board_id !== 'meet');
    if (cat !== 'all') list = list.filter(p => p.board_id === cat);
    if (sort === 'hot') list = list.slice().sort((a, b) => (b.likes + b.comments * 3) - (a.likes + a.comments * 3));

    return { bar: { title: '커뮤니티', actions: [{ act:'search', icon:'🔍' }, { act:'drawer', icon:'☰' }] },
      tab: 'community', html:
      '<div class="chips">' + CATS.map(c =>
        '<a class="chip' + (c[0] === cat ? ' on' : '') + '" href="#/community?c=' + c[0] + '" data-nav>' +
        (c[0] === 'anon' && !isVerified() ? '🔒 ' : '') + c[1] + '</a>').join('') + '</div>' +
      '<div class="sortbar">' + [['new','최신'],['hot','인기'],['follow','팔로우']].map(s =>
        '<a class="sortbtn' + (s[0] === sort ? ' on' : '') + '" href="#/community?c=' + cat + '&sort=' + s[0] + '" data-nav>' +
        s[1] + '</a>').join('') + '</div>' +
      (list.length ? '<div class="list">' + list.map(feedCard).join('') + '</div>'
                   : '<div class="empty"><b>📝</b>아직 글이 없습니다.<br>첫 글을 남겨보세요.</div>') +
      '<button class="fab" data-act="write">✏️ 글쓰기</button>' };
  };

  /* 카드형 피드 아이템 */
  function feedCard (p) {
    const u = DB.user(p.author);
    return '<a class="feed" href="#/post/' + p.post_id + '" data-nav>' +
      '<div class="feed-top">' + avatar(u, 'sm') +
        '<div><b>' + esc(u.nickname) + '</b><span>' + esc(u.region) + ' · ' + esc(p.at) + '</span></div>' +
        '<span class="badge gray">' + esc(DB.board(p.board_id).name) + '</span></div>' +
      '<div class="feed-title">' + esc(p.title) + '</div>' +
      '<div class="feed-body">' + esc(p.body.replace(/\n/g, ' ').slice(0, 76)) + '…</div>' +
      '<div class="feed-foot"><span>♡ ' + p.likes + '</span><span>💬 ' + p.comments + '</span>' +
        '<span>조회 ' + num(p.views) + '</span></div></a>';
  }

  /* 게시판 단독 보기 */
  S.board = function (q, id) {
    if (id === 'anon') return S.anon(q);
    const b = DB.board(id);
    const list = DB.posts.filter(p => p.board_id === id);
    const locked = (b.access === 'verified' && !isVerified()) || (b.access === 'member' && !UI.isMember());
    return { bar: { title: b.name, back: true, center: true, actions: [{ act:'search', icon:'🔍' }] },
      tab: false, html: locked
        ? lockView(b.name)
        : (list.length ? '<div class="list" style="margin-top:10px">' + list.map(postRow).join('') + '</div>'
                       : '<div class="empty"><b>📝</b>아직 글이 없습니다.</div>') +
          '<button class="fab" data-act="write">✏️ 글쓰기</button>' };
  };

  function lockView (name) {
    return '<div class="hero-state"><div class="hero-ic">🔒</div>' +
      '<h3>' + esc(name) + '은(는) 정회원 전용입니다</h3>' +
      '<p>돌싱 인증을 마치면 바로 이용할 수 있어요.</p>' +
      '<button class="btn" style="max-width:260px;margin-top:18px" data-act="upgrade">정회원 인증 알아보기</button></div>';
  }

  /* ── D11 게시글 상세 ───────────────────── */
  S.post = function (q, id) {
    const p = DB.post(id);
    if (!p) return S.notfound();
    const anon = !!p.anon_no;
    const u = anon ? null : DB.user(p.author);
    const s = session();
    const liked = s.liked.indexOf(id) > -1;
    const saved = s.saved.indexOf(id) > -1;
    const cmts = DB.comments[id] || [];
    const board = anon ? { name: '익명게시판' } : DB.board(p.board_id);

    if (anon && !isVerified()) return { bar: { title:'익명게시판', back:true, center:true }, tab:false, html: lockView('익명게시판') };

    return { bar: { title: board.name, back: true, center: true,
                    actions: [{ act:'more-post-' + id, icon:'⋯' }] },
      tab: false, html:
      '<article class="post">' +
        (anon
          ? '<div class="post-author"><div class="avatar" style="background:#e3e8ef;color:var(--muted)">?</div>' +
            '<div><b>익명 ' + p.anon_no + '</b><span>' + esc(p.cat) + ' · ' + esc(p.at) + '</span></div></div>'
          : '<a class="post-author" href="#/user/' + u.user_id + '" data-nav>' + avatar(u) +
            '<div><b>' + esc(u.nickname) + (u.grade === 'verified' ? ' <span class="badge">인증회원</span>' : '') +
            '</b><span>' + esc(u.region) + ' · ' + esc(p.at) + ' · 조회 ' + num(p.views) + '</span></div>' +
            '<span class="row-arrow">›</span></a>') +
        '<h2 class="post-title">' + esc(p.title) + '</h2>' +
        '<div class="post-body">' + UI.nl2br(p.body) + '</div>' +
        (p.board_id === 'law'
          ? '<div class="notice warn"><i>⚠️</i><div>금융·법률 관련 글은 개인 경험 공유이며 법적 자문이 아닙니다.</div></div>' : '') +
        '<div class="post-react">' +
          '<button class="react' + (liked ? ' on' : '') + '" data-act="like-' + id + '">♡ 공감 <b>' + (p.likes + (liked ? 1 : 0)) + '</b></button>' +
          '<button class="react" data-act="focus-comment">💬 댓글 <b>' + p.comments + '</b></button>' +
          '<button class="react' + (saved ? ' on' : '') + '" data-act="save-' + id + '">🔖 저장</button>' +
        '</div>' +
      '</article>' +

      '<div class="sec-head"><h3>댓글 ' + p.comments + '</h3></div>' +
      '<div class="cmts">' + (cmts.length ? cmts.map(c => {
        const cu = DB.user(c.user);
        return '<div class="cmt">' + avatar(cu, 'sm') +
          '<div class="cmt-main"><div class="cmt-top"><b>' + esc(cu.nickname) + '</b>' +
          '<span>' + esc(c.at) + '</span></div>' +
          '<div class="cmt-body">' + esc(c.body) + '</div>' +
          '<div class="cmt-act"><button data-act="cmt-reply">답글</button>' +
          '<button data-act="cmt-like">♡ ' + c.likes + '</button>' +
          '<button data-act="report-cmt">신고</button></div></div></div>';
      }).join('') : '<div class="empty" style="padding:34px">첫 댓글을 남겨보세요.</div>') + '</div>' +

      '<div class="cmt-bar"><input class="inp" id="cmt-input" placeholder="댓글 입력…" enterkeyhint="send">' +
        '<button class="btn sm" data-act="send-comment-' + id + '">등록</button></div>' };
  };

  /* ── D22 익명게시판 ───────────────────── */
  S.anon = function (q) {
    if (!isVerified()) {
      return { bar: { title: '익명 공감방', back: true, center: true }, tab: false, html: lockView('익명게시판') };
    }
    const cat = q.ac || '전체';
    const cats = ['전체'].concat(ANON_CATS);
    const list = cat === '전체' ? DB.anonPosts : DB.anonPosts.filter(p => p.cat === cat);

    return { bar: { title: '익명 공감방', back: true, center: true,
                    actions: [{ act:'anon-rule', icon:'📋' }] },
      tab: false, html:
      '<div class="notice"><i>🤫</i><div>글마다 무작위 익명번호가 부여됩니다. ' +
        '실명·연락처·직장·자녀 학교 등 신원을 알 수 있는 정보는 작성할 수 없어요.' +
        '<button class="linkbtn" data-act="anon-rule">운영수칙 보기</button></div></div>' +
      '<div class="chips">' + cats.map(c =>
        '<a class="chip' + (c === cat ? ' on' : '') + '" href="#/anon?ac=' + encodeURIComponent(c) + '" data-nav>' + c + '</a>').join('') +
      '</div>' +
      '<div class="list">' + list.map(p =>
        '<a class="row" href="#/post/' + p.post_id + '" data-nav>' +
        '<div style="flex:0 0 46px;text-align:center">' +
          '<div class="anonno">익명<br>' + p.anon_no + '</div></div>' +
        '<div class="row-main"><div class="row-title wrap">' + esc(p.title) + '</div>' +
        '<div class="row-meta">' + esc(p.cat) + ' · 공감 ' + p.likes + ' · 댓글 ' + p.comments +
        ' · ' + esc(p.at) + '</div></div></a>').join('') + '</div>' +
      '<div class="sec" style="padding-top:16px">' +
        '<a class="btn line" href="#/my?t=anon" data-nav>내 익명글 · 댓글 관리</a></div>' +
      '<button class="fab" data-act="write-anon">✏️ 익명으로 쓰기</button>' };
  };

  /* 글쓰기 */
  S.write = function (q) {
    const anon = q.anon === '1';
    const boards = DB.boards.filter(b => b.board_id !== 'notice' && b.board_id !== 'anon');
    /* 어느 게시판에서 눌렀는지(?b=) 를 기본값으로, 없으면 자유게시판 */
    const cur = boards.some(b => b.board_id === q.b) ? q.b : 'free';
    const acat = ANON_CATS.indexOf(q.ac) > -1 ? q.ac : ANON_CATS[0];
    return { bar: { title: anon ? '익명으로 쓰기' : '글쓰기', back: true, center: true }, tab: false, html:
      (anon ? '<div class="notice"><i>🤫</i><div>이 글에는 새로운 익명번호가 부여됩니다. 이전 글과 연결되지 않아요.</div></div>' +
       '<div class="field"><label>주제</label><div class="opts wrapopts" data-radio="wacat">' +
        ANON_CATS.map(c => '<button class="opt' + (c === acat ? ' on' : '') + '" data-val="' + esc(c) + '">' +
          esc(c) + '</button>').join('') + '</div></div>' :
       '<div class="field"><label>게시판</label><div class="opts wrapopts" data-radio="wboard">' +
        boards.map(b => '<button class="opt' + (b.board_id === cur ? ' on' : '') + '" data-val="' + b.board_id + '">' +
          esc(b.name) + '</button>').join('') +
        '</div></div>') +
      '<div class="field"><label>제목</label><input class="inp" id="w-title" placeholder="제목을 입력하세요"></div>' +
      '<div class="field"><label>내용</label>' +
        '<textarea class="inp" id="w-body" style="min-height:220px" placeholder="어떤 이야기를 나누고 싶으신가요?"></textarea></div>' +
      '<div class="notice gray"><i>🛡️</i><div>전화번호 · SNS 아이디 · 계좌번호는 자동으로 검출되어 등록 전 안내됩니다.</div></div>' +
      '<div class="btn-bar"><button class="btn" data-act="submit-post">등록</button></div>' };
  };

  S.notfound = function () {
    return { bar: { title: '', back: true }, tab: false,
      html: '<div class="empty"><b>🧭</b>요청하신 페이지를 찾을 수 없습니다.<br>' +
            '<a href="#/home" data-nav style="color:var(--brand);font-weight:700">홈으로 이동</a></div>' };
  };

})(window.SCREENS);
