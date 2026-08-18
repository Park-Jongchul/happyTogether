/* D10 커뮤니티 게시판 · D11 게시글 상세 · D22 익명게시판 · 글쓰기 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const { esc, num, avatar, postRow, session, isVerified, has, visible } = UI;

  const CATS = [['all','전체'],['free','일상'],['empathy','공감'],['kids','육아'],
                ['law','법률·재무'],['today','오늘의 이야기'],['anon','익명 고민']];
  const ANON_CATS = ['양육','재혼','법률·재무','감정회복'];

  /* ── D10 커뮤니티 ─────────────────────── */
  S.community = function (q) {
    const cat = q.c || 'all';
    if (cat === 'anon') return S.anon(q);
    const sort = q.sort || 'new';
    const s = session();

    let list = DB.posts.filter(p => p.board_id !== 'notice' && p.board_id !== 'meet')
                       .filter(p => UI.canRead(p.board_id) && visible(p));
    if (cat !== 'all') list = list.filter(p => p.board_id === cat);
    if (sort === 'hot') list = list.slice().sort((a, b) => (b.likes + b.comments * 3) - (a.likes + a.comments * 3));
    if (sort === 'follow') list = list.filter(p => (s.following || []).indexOf(p.author) > -1);

    const emptyBox = sort === 'follow'
      ? '<div class="empty"><b>👥</b>팔로우한 회원의 글이 없습니다.<br>' +
        '<a href="#/people" data-nav style="color:var(--brand);font-weight:700">사람 찾아보기</a></div>'
      : '<div class="empty"><b>📝</b>아직 글이 없습니다.<br>첫 글을 남겨보세요.</div>';

    return { bar: { title: '커뮤니티', actions: [{ act:'search', icon:'🔍' }, { act:'drawer', icon:'☰' }] },
      tab: 'community', html:
      '<div class="chips">' + CATS.map(c =>
        '<a class="chip' + (c[0] === cat ? ' on' : '') + '" href="#/community?c=' + c[0] +
        (sort !== 'new' ? '&sort=' + sort : '') + '" data-nav>' +
        (c[0] === 'anon' && !isVerified() ? '🔒 ' : '') + c[1] + '</a>').join('') + '</div>' +
      '<div class="sortbar">' + [['new','최신'],['hot','인기'],['follow','팔로우']].map(x =>
        '<a class="sortbtn' + (x[0] === sort ? ' on' : '') + '" href="#/community?c=' + cat + '&sort=' + x[0] + '" data-nav>' +
        x[1] + '</a>').join('') + '</div>' +
      (list.length ? '<div class="list">' + list.map(feedCard).join('') + '</div>' : emptyBox) +
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
      '<div class="feed-foot"><span>♡ ' + (p.likes + (has('liked', p.post_id) ? 1 : 0)) + '</span>' +
        '<span>💬 ' + p.comments + '</span>' +
        '<span>조회 ' + num(p.views) + '</span></div></a>';
  }

  /* ── 게시판 단독 보기 ─────────────────────
     전체메뉴의 지역·취미 게시판은 같은 게시판에 조건만 얹어서 보여줍니다. */
  S.board = function (q, id) {
    if (id === 'anon') return S.anon(q);
    const b = DB.board(id);
    if (!UI.canRead(id)) {
      return { bar: { title: b.name, back: true, center: true }, tab: false, html: lockView(b.name, b.access) };
    }

    let list = DB.posts.filter(p => p.board_id === id).filter(visible);
    if (q.region) list = list.filter(p => DB.user(p.author).region === q.region);
    if (q.tag) {
      const tag = q.tag;
      list = list.filter(p => (p.title + ' ' + p.body).indexOf(tag) > -1 ||
                              DB.user(p.author).interests.indexOf(tag) > -1);
    }
    const cond = q.region || q.tag;

    return { bar: { title: b.name, back: true, center: true, actions: [{ act:'search', icon:'🔍' }] },
      tab: false, html:
      (cond
        ? '<div class="chips"><span class="chip on">' + esc(q.region ? '지역 · ' + q.region : '취미 · ' + q.tag) +
          '</span><a class="chip" href="#/board/' + id + '" data-nav>조건 해제 ✕</a></div>' : '') +
      (list.length
        ? '<div class="list" style="margin-top:' + (cond ? '2px' : '10px') + '">' + list.map(postRow).join('') + '</div>'
        : '<div class="empty"><b>📝</b>' + (cond ? '조건에 맞는 글이 없습니다.' : '아직 글이 없습니다.') + '</div>') +
      '<button class="fab" data-act="write">✏️ 글쓰기</button>' };
  };

  /* need: 'member' 면 가입 안내, 그 외에는 정회원 인증 안내 */
  function lockView (name, need) {
    const member = need === 'member';
    return '<div class="hero-state"><div class="hero-ic">🔒</div>' +
      '<h3>' + esc(name) + '은(는) ' + (member ? '가입회원' : '정회원') + ' 전용입니다</h3>' +
      '<p>' + (member ? '가입하시면 바로 읽을 수 있어요.' : '돌싱 인증을 마치면 바로 이용할 수 있어요.') + '</p>' +
      '<button class="btn" style="max-width:260px;margin-top:18px" data-act="' +
      (member ? 'go-join' : 'upgrade') + '">' + (member ? '회원가입' : '정회원 인증 알아보기') + '</button></div>';
  }

  /* 한 번 열어본 글의 조회수는 다시 올리지 않습니다 */
  const viewed = {};

  /* ── D11 게시글 상세 ───────────────────── */
  S.post = function (q, id) {
    const p = DB.post(id);
    if (!p) return S.notfound();
    const anon = !!p.anon_no;
    const board = anon ? { name: '익명게시판', access: 'verified' } : DB.board(p.board_id);

    /* 목록에서 가려진 글이라도 URL 로 바로 들어오면 열리는 구멍이 없도록 상세에서도 막습니다 */
    if (anon && !isVerified())
      return { bar: { title:'익명게시판', back:true, center:true }, tab:false, html: lockView('익명게시판', 'verified') };
    if (!anon && !UI.canRead(p.board_id))
      return { bar: { title: board.name, back:true, center:true }, tab:false, html: lockView(board.name, board.access) };
    if (!visible(p))
      return { bar: { title: board.name, back:true, center:true }, tab:false, html:
        '<div class="hero-state"><div class="hero-ic">🙈</div><h3>숨긴 글입니다</h3>' +
        '<p>숨김을 해제하면 다시 볼 수 있어요.</p>' +
        '<button class="btn" style="max-width:260px;margin-top:18px" data-act="hide-' + id + '">숨김 해제</button></div>' };

    if (!viewed[id]) { viewed[id] = 1; p.views = (p.views || 0) + 1; }

    const u = anon ? null : DB.user(p.author);
    const liked = has('liked', id);
    const saved = has('saved', id);
    const cmts = DB.comments[id] || [];
    let mineSeq = -1;

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
        (p.meeting_id && DB.meeting(p.meeting_id)
          ? '<a class="row" style="margin-top:10px;border:1px solid var(--line);border-radius:12px" ' +
            'href="#/meeting/' + p.meeting_id + '" data-nav><div class="row-main">' +
            '<div class="row-title">📅 ' + esc(DB.meeting(p.meeting_id).title) + '</div>' +
            '<div class="row-meta">' + esc(DB.meeting(p.meeting_id).date) + ' · 모임 상세 보기</div></div>' +
            '<span class="row-arrow">›</span></a>' : '') +
        (p.board_id === 'law'
          ? '<div class="notice warn"><i>⚠️</i><div>금융·법률 관련 글은 개인 경험 공유이며 법적 자문이 아닙니다.</div></div>' : '') +
        '<div class="post-react">' +
          '<button class="react' + (liked ? ' on' : '') + '" data-act="like-' + id + '">♡ 공감 <b>' +
            (p.likes + (liked ? 1 : 0)) + '</b></button>' +
          '<button class="react" data-act="focus-comment">💬 댓글 <b>' + p.comments + '</b></button>' +
          '<button class="react' + (saved ? ' on' : '') + '" data-act="save-' + id + '">🔖 ' +
            (saved ? '저장됨' : '저장') + '</button>' +
        '</div>' +
      '</article>' +

      '<div class="sec-head"><h3>댓글 ' + p.comments + '</h3></div>' +
      '<div class="cmts">' + (cmts.length ? cmts.map(c => {
        const cu = DB.user(c.user);
        const cliked = has('cmtLiked', c.cid);
        if (c.mine) mineSeq++;
        return '<div class="cmt">' + avatar(cu, 'sm') +
          '<div class="cmt-main"><div class="cmt-top"><b>' + esc(cu.nickname) + '</b>' +
          '<span>' + esc(c.at) + '</span></div>' +
          '<div class="cmt-body">' + esc(c.body) + '</div>' +
          '<div class="cmt-act">' +
          '<button data-act="cmt-reply-' + encodeURIComponent(cu.nickname) + '">답글</button>' +
          '<button class="' + (cliked ? 'on' : '') + '" data-act="cmt-like-' + c.cid + '">♡ ' +
            ((c.likes || 0) + (cliked ? 1 : 0)) + '</button>' +
          (c.mine
            ? '<button data-act="del-cmt-' + id + '-' + mineSeq + '">삭제</button>'
            : '<button data-act="report-cmt-' + c.cid + '">신고</button>') +
          '</div></div></div>';
      }).join('') : '<div class="empty" style="padding:34px">첫 댓글을 남겨보세요.</div>') + '</div>' +

      '<div class="cmt-bar"><input class="inp" id="cmt-input" placeholder="댓글 입력…" enterkeyhint="send">' +
        '<button class="btn sm" data-act="send-comment-' + id + '">등록</button></div>',
      after: function () {
        const i = UI.$('#cmt-input');
        if (i) i.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            const btn = UI.$('[data-act="send-comment-' + id + '"]');
            if (btn) btn.click();
          }
        });
      } };
  };

  /* ── D22 익명게시판 ───────────────────── */
  S.anon = function (q) {
    if (!isVerified()) {
      return { bar: { title: '익명 공감방', back: true, center: true }, tab: false,
               html: lockView('익명게시판', 'verified') };
    }
    const cat = q.ac || '전체';
    const cats = ['전체'].concat(ANON_CATS);
    const list = (cat === '전체' ? DB.anonPosts : DB.anonPosts.filter(p => p.cat === cat)).filter(visible);

    return { bar: { title: '익명 공감방', back: true, center: true,
                    actions: [{ act:'anon-rule', icon:'📋' }] },
      tab: false, html:
      '<div class="notice"><i>🤫</i><div>글마다 무작위 익명번호가 부여됩니다. ' +
        '실명·연락처·직장·자녀 학교 등 신원을 알 수 있는 정보는 작성할 수 없어요.' +
        '<button class="linkbtn" data-act="anon-rule">운영수칙 보기</button></div></div>' +
      '<div class="chips">' + cats.map(c =>
        '<a class="chip' + (c === cat ? ' on' : '') + '" href="#/anon?ac=' + encodeURIComponent(c) + '" data-nav>' +
        c + '</a>').join('') + '</div>' +
      (list.length
        ? '<div class="list">' + list.map(p =>
            '<a class="row" href="#/post/' + p.post_id + '" data-nav>' +
            '<div style="flex:0 0 46px;text-align:center">' +
              '<div class="anonno">익명<br>' + p.anon_no + '</div></div>' +
            '<div class="row-main"><div class="row-title wrap">' + esc(p.title) + '</div>' +
            '<div class="row-meta">' + esc(p.cat) + ' · 공감 ' + (p.likes + (has('liked', p.post_id) ? 1 : 0)) +
            ' · 댓글 ' + p.comments + ' · ' + esc(p.at) + '</div></div></a>').join('') + '</div>'
        : '<div class="empty"><b>🤫</b>이 주제의 글이 아직 없습니다.</div>') +
      '<div class="sec" style="padding-top:16px">' +
        '<a class="btn line" href="#/my?t=anon" data-nav>내 익명글 · 댓글 관리</a></div>' +
      '<button class="fab" data-act="write-anon">✏️ 익명으로 쓰기</button>' };
  };

  /* ── 글쓰기 ───────────────────────────────
     작성 중 다른 화면으로 나갔다 돌아와도 내용이 남도록 임시 보관합니다. */
  S.writeDraft = S.writeDraft || null;
  SCREENS.harvesters = SCREENS.harvesters || [];
  SCREENS.harvesters.push(function (prevHash) {
    if (String(prevHash || '').indexOf('#/write') !== 0) return;
    const t = UI.$('#w-title'), b = UI.$('#w-body');
    if (!t && !b) return;
    const title = t ? t.value.trim() : '', body = b ? b.value.trim() : '';
    S.writeDraft = (title || body) ? { title: title, body: body, hash: prevHash } : null;
  });

  S.write = function (q) {
    const anon = q.anon === '1';
    /* URL 로 바로 들어온 경우에도 권한을 지킵니다. (시트는 렌더 끝에서 닫히므로 화면으로 안내합니다) */
    const allowed = anon ? isVerified() : UI.isMember();
    if (!allowed) {
      return { bar: { title: anon ? '익명으로 쓰기' : '글쓰기', back: true, center: true }, tab: false,
               html: lockView(anon ? '익명 글쓰기' : '글쓰기', anon ? 'verified' : 'member') };
    }
    const boards = DB.boards.filter(b => b.board_id !== 'notice' && b.board_id !== 'anon');
    /* 어느 게시판에서 눌렀는지(?b=) 를 기본값으로, 없으면 자유게시판 */
    const cur = boards.some(b => b.board_id === q.b) ? q.b : 'free';
    const acat = ANON_CATS.indexOf(q.ac) > -1 ? q.ac : ANON_CATS[0];
    const d = (S.writeDraft && S.writeDraft.hash === location.hash) ? S.writeDraft : null;

    return { bar: { title: anon ? '익명으로 쓰기' : '글쓰기', back: true, center: true }, tab: false, html:
      (anon ? '<div class="notice"><i>🤫</i><div>이 글에는 새로운 익명번호가 부여됩니다. 이전 글과 연결되지 않아요.</div></div>' +
       '<div class="field"><label>주제</label><div class="opts wrapopts" data-radio="wacat">' +
        ANON_CATS.map(c => '<button class="opt' + (c === acat ? ' on' : '') + '" data-val="' + esc(c) + '">' +
          esc(c) + '</button>').join('') + '</div></div>' :
       '<div class="field"><label>게시판</label><div class="opts wrapopts" data-radio="wboard">' +
        boards.map(b => '<button class="opt' + (b.board_id === cur ? ' on' : '') + '" data-val="' + b.board_id + '">' +
          esc(b.name) + '</button>').join('') +
        '</div></div>') +
      '<div class="field"><label>제목</label><input class="inp" id="w-title" placeholder="제목을 입력하세요"' +
        (d && d.title ? ' value="' + esc(d.title) + '"' : '') + '></div>' +
      '<div class="field"><label>내용</label>' +
        '<textarea class="inp" id="w-body" style="min-height:220px" placeholder="어떤 이야기를 나누고 싶으신가요?">' +
        esc(d ? d.body : '') + '</textarea></div>' +
      '<div class="notice gray"><i>🛡️</i><div>전화번호 · SNS 아이디 · 계좌번호는 자동으로 검출되어 등록 전 안내됩니다.</div></div>' +
      '<div class="btn-bar"><button class="btn" data-act="submit-post">등록</button></div>' };
  };

  S.notfound = function () {
    return { bar: { title: '', back: true }, tab: false,
      html: '<div class="empty"><b>🧭</b>요청하신 페이지를 찾을 수 없습니다.<br>' +
            '<a href="#/home" data-nav style="color:var(--brand);font-weight:700">홈으로 이동</a></div>' };
  };

})(window.SCREENS);
