/* D15 마이페이지 · D16 신고/안심센터 · 설정 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const { esc, num, avatar, session, isGuest, isVerified, has } = UI;

  /* ── D15 마이페이지 ───────────────────── */
  S.my = function (q) {
    /* ?t= 이 붙으면 내 콘텐츠 목록(내 글 · 댓글 · 저장 · 익명) */
    if (q.t && !isGuest()) return myContent(q);

    const bar = { title: '마이', actions: [{ act:'noti', icon:'🔔', dot: unreadNoti() > 0 }, { act:'drawer', icon:'☰' }] };
    if (isGuest()) {
      return { bar, tab: 'my', html:
        '<div class="prof-guest">' +
          '<div class="avatar lg" style="margin:0 auto 14px;background:#dfe5ec;color:#9aa6b8">?</div>' +
          '<h3>로그인하고 내 활동을 관리하세요</h3>' +
          '<p>가입하면 모임 · 채팅 · 저장한 글을<br>한 곳에서 볼 수 있어요.</p>' +
          '<a class="btn" href="#/login?tab=join" data-nav style="margin-top:18px">회원가입</a>' +
          '<a class="btn line" href="#/login" data-nav style="margin-top:8px">로그인</a>' +
        '</div>' +
        '<div class="list" style="margin-top:14px">' +
          menuRow('이용수칙', '#/post/p1') + menuRow('안심센터', '#/report') +
          menuRow('서비스 소개', '#/about') + '</div>' };
    }

    const s = session();
    const upcoming = (s.myMeets || []).map(id => DB.meeting(id))
                       .filter(m => m && !DB.isPast(m)).length;
    const written = DB.myPosts().length + DB.myAnonPosts().length + DB.myComments().length;
    const blocked = (s.blocked || []).length;
    const reports = (s.reports || []).length;

    const group = (title, rows) =>
      '<div class="sec-head"><h3>' + title + '</h3></div><div class="list">' + rows.join('') + '</div>';

    return { bar, tab: 'my', html:
      '<div class="myhead">' +
        '<a class="myprof" href="#/profile-edit" data-nav>' + avatar('u_me', 'lg') +
          '<div><div class="uname">' + esc(s.nickname) +
          ' <span class="badge">' + UI.GRADE_LABEL[s.grade] + '</span></div>' +
          '<div class="umeta">' + esc(s.region) + ' · ' + esc(s.age) + ' · 매너 ' + s.manner + '</div></div>' +
          '<span class="row-arrow">›</span></a>' +
        (isVerified() ? '' :
          '<button class="upgrade-cta" data-act="upgrade">🛡️ 정회원 인증하고 모임·채팅 이용하기 ›</button>') +
      '</div>' +

      '<div class="mystats">' +
        '<a href="#/my-meetings" data-nav><b>' + upcoming + '</b><span>예정 모임</span></a>' +
        '<a href="#/my?t=posts" data-nav><b>' + written + '</b><span>내 글·댓글</span></a>' +
        '<a href="#/my?t=saved" data-nav><b>' + (s.saved || []).length + '</b><span>저장</span></a>' +
      '</div>' +

      group('내 모임', [
        menuRow('신청 대기', '#/my-meetings?t=wait', String((s.waitMeets || []).length)),
        menuRow('예정된 모임', '#/my-meetings?t=up', String(upcoming)),
        menuRow('완료 · 후기 작성', '#/my-meetings?t=done'),
        menuRow('내가 개설한 모임', '#/my-meetings?t=host', String(DB.myMeetingsHosted().length)),
        menuRow('찜한 모임', '#/my-meetings?t=fav', String((s.favMeets || []).length))
      ]) +
      group('내 콘텐츠', [
        menuRow('내가 쓴 글', '#/my?t=posts'), menuRow('내 댓글', '#/my?t=comments'),
        menuRow('저장한 글', '#/my?t=saved'),
        isVerified() ? menuRow('내 익명글 관리', '#/my?t=anon') : ''
      ]) +
      group('프로필 · 인증', [
        menuRow('프로필 편집', '#/profile-edit'),
        menuRow('돌싱 인증 상태', s.verifyStep >= 2 ? '#/review' : '#/upgrade',
                isVerified() ? '인증 완료' : (s.verifyStep >= 2 ? '심사 중' : '미인증')),
        menuRow('항목별 공개범위', '#/privacy')
      ]) +
      group('결제 · 정산', [
        menuRow('결제 내역 · 영수증', '#/payments', String((s.pays || []).length + 3)),
        menuRow('환불 상태', '#/payments'),
        menuRow('모임장 정산', '#/payments')
      ]) +
      group('알림 · 안전', [
        menuRow('알림 설정', '#/settings'),
        actRow('차단 회원 관리', 'blocked-list', blocked ? blocked + '명' : ''),
        menuRow('1:1 메시지 허용 범위', '#/settings'),
        actRow('안심 체크인 연락처', 'safe-contact', s.safeContact ? '등록' : '')
      ]) +
      group('고객센터', [
        menuRow('신고 처리 결과 조회', '#/report?t=list', reports ? reports + '건' : ''),
        menuRow('계정 제재 이의신청', '#/report'),
        menuRow('이용수칙', '#/post/p1'), menuRow('서비스 소개', '#/about')
      ]) +
      '<div class="sec" style="padding:20px 16px 8px">' +
        '<button class="btn ghost" data-logout>로그아웃</button></div>' +
      '<div class="ver">행복하자 우리 · Happy Together v1.0</div>' };
  };

  const unreadNoti = () => DB.notifications.filter(n => !has('notiRead', n.noti_id)).length;

  /* ── 내 콘텐츠 (#/my?t=…) ───────────────
     서버가 붙으면 DB.my* 만 GET /me/posts · /me/comments · /me/saved 로 바꾸면 됩니다. */
  function myContent (q) {
    const posts = DB.myPosts(), anon = DB.myAnonPosts(), cmts = DB.myComments();
    const saved = (session().saved || []).map(id => DB.post(id)).filter(Boolean);

    const tabs = [['posts','내 글', posts.length], ['comments','댓글', cmts.length],
                  ['saved','저장', saved.length]];
    if (isVerified()) tabs.push(['anon','익명글', anon.length]);

    let t = q.t;
    if (!tabs.some(x => x[0] === t)) t = 'posts';

    let body;
    if (t === 'posts') {
      body = posts.length
        ? list(posts.map(p => myRow('#/post/' + p.post_id, p.title,
            esc(DB.board(p.board_id).name) + ' · ' + esc(p.at) + ' · 댓글 ' + p.comments +
            ' · 공감 ' + p.likes + ' · 조회 ' + num(p.views || 0),
            'del-post-' + p.post_id)))
        : empty('📝', '아직 쓴 글이 없습니다.', '#/community', '커뮤니티 둘러보기');
    } else if (t === 'comments') {
      body = cmts.length
        ? list(cmts.map(x => {
            const p = DB.post(x.pid);
            return myRow('#/post/' + x.pid, x.c.body,
              (p ? esc(p.title) : '삭제된 글') + ' · ' + esc(x.c.at),
              'del-cmt-' + x.pid + '-' + x.i);
          }))
        : empty('💬', '아직 남긴 댓글이 없습니다.', '#/community', '커뮤니티 둘러보기');
    } else if (t === 'saved') {
      body = saved.length
        ? list(saved.map(p => myRow('#/post/' + p.post_id, p.title,
            (p.anon_no ? '익명게시판' : esc(DB.board(p.board_id).name)) + ' · ' + esc(p.at) +
            ' · 공감 ' + p.likes, 'save-' + p.post_id, '해제')))
        : empty('🔖', '저장한 글이 없습니다.<br>글 상세에서 🔖 저장을 눌러보세요.', '#/community', '커뮤니티 둘러보기');
    } else {
      body = anon.length
        ? list(anon.map(p => myRow('#/post/' + p.post_id, p.title,
            '익명 ' + p.anon_no + ' · ' + esc(p.cat) + ' · ' + esc(p.at) + ' · 댓글 ' + p.comments,
            'del-post-' + p.post_id)))
        : empty('🤫', '아직 익명으로 쓴 글이 없습니다.', '#/anon', '익명 공감방 가기');
    }

    return { bar: { title: '내 콘텐츠', back: true, center: true }, tab: 'my', html:
      '<div class="chips">' + tabs.map(x =>
        '<a class="chip' + (x[0] === t ? ' on' : '') + '" href="#/my?t=' + x[0] + '" data-nav>' +
        x[1] + ' ' + x[2] + '</a>').join('') + '</div>' +
      body +
      (t === 'comments'
        ? '<div class="notice gray"><i>ℹ️</i><div>댓글을 지워도 원글은 남습니다.</div></div>' : '') };
  }

  const list = rows => '<div class="list">' + rows.join('') + '</div>';

  /* 제목은 글로 이동, 오른쪽 버튼은 삭제 · 저장 해제 (링크 안에 두면 이동으로 먹힙니다) */
  function myRow (href, title, meta, act, label) {
    return '<div class="row">' +
      '<a class="row-main" href="' + href + '" data-nav>' +
        '<div class="row-title wrap">' + esc(title) + '</div>' +
        '<div class="row-meta">' + meta + '</div></a>' +
      '<button class="delbtn" data-act="' + act + '">' + (label || '삭제') + '</button></div>';
  }

  function empty (icon, text, href, cta) {
    return '<div class="empty"><b>' + icon + '</b>' + text +
      '<br><a href="' + href + '" data-nav style="color:var(--brand);font-weight:700">' + cta + '</a></div>';
  }

  function menuRow (label, href, right) {
    if (!label) return '';
    return '<a class="row" href="' + href + '" data-nav><div class="row-main">' +
      '<div class="row-title">' + esc(label) + '</div></div>' +
      (right ? '<span class="badge ' + (right === '인증 완료' ? 'ok' : right === '심사 중' ? 'warn' : 'gray') + '">' +
        esc(right) + '</span>' : '') + '<span class="row-arrow">›</span></a>';
  }

  /* 이동 대신 동작이 일어나는 줄 */
  function actRow (label, act, right) {
    return '<button class="row" style="width:100%" data-act="' + esc(act) + '"><div class="row-main">' +
      '<div class="row-title">' + esc(label) + '</div></div>' +
      (right ? '<span class="badge gray">' + esc(right) + '</span>' : '') +
      '<span class="row-arrow">›</span></button>';
  }

  /* ── D16 신고 / 안심센터 ──────────────── */
  S.report = function (q) {
    if (q.t === 'list') return reportList();

    const targets = ['회원','게시글','채팅','모임','보이스룸','댓글','기타'];
    const types = ['불쾌한 언행','성적 괴롭힘','금전 요구','허위 신분','영업·홍보','기타'];
    const rt = targets.indexOf(q.rt) > -1 ? q.rt : '';
    const ry = types.indexOf(q.ry) > -1 ? q.ry : '';
    const who = q.id && DB.hasUser(q.id) ? DB.user(q.id) : null;

    return { bar: { title: '안심센터', back: true, center: true }, tab: false, html:
      '<div class="hero-state" style="padding-bottom:8px"><div class="hero-ic">🛡️</div>' +
      '<h3>안심하고 활동하실 수 있도록</h3>' +
      '<p>온라인과 오프라인 모두에서 회원을 보호합니다.</p></div>' +

      (who ? '<div class="notice gray"><i>👤</i><div>신고 대상: <b>' + esc(who.nickname) + '</b></div></div>' : '') +

      '<div class="field"><label>신고 대상</label><div class="opts wrapopts" data-radio="rtarget">' +
        targets.map(t => '<button class="opt' + (t === rt ? ' on' : '') + '" data-val="' + t + '">' + t + '</button>').join('') +
      '</div></div>' +
      '<div class="field"><label>신고 유형</label><div class="opts wrapopts" data-radio="rtype">' +
        types.map(t => '<button class="opt' + (t === ry ? ' on' : '') + '" data-val="' + t + '">' + t + '</button>').join('') +
      '</div></div>' +
      '<div class="field"><label>상세 내용</label>' +
        '<textarea class="inp" id="r-body" placeholder="언제, 어디서, 어떤 일이 있었는지 적어주세요. (10자 이상)"></textarea></div>' +
      '<div class="field"><label>증빙 첨부</label>' +
        '<button class="uploader" data-act="upload"><b>＋</b>이미지 · 채팅 캡처 · 결제내역</button></div>' +
      '<button class="check" data-check="blocknow"><i>✓</i><div>신고와 동시에 상대를 차단합니다<br>' +
        '<span style="font-size:12px;color:var(--muted)">상대의 글과 메시지가 즉시 숨겨집니다</span></div></button>' +
      '<div class="sec" style="padding-top:14px"><button class="btn coral" data-act="submit-report">신고 제출</button></div>' +

      '<div class="notice warn"><i>🚨</i><div>협박 · 스토킹 · 범죄가 의심되는 상황이라면 즉시 <b>112</b>에 신고해 주세요. ' +
        '신고자 신원은 상대에게 공개되지 않습니다.</div></div>' +

      '<div class="sec-head"><h3>모임 안심 체크인</h3></div>' +
      '<div class="list">' +
        actRow('안심 연락처 등록', 'safe-contact', session().safeContact ? '등록됨' : '') +
        actRow('도착 · 귀가 알림 보내기', 'safe-checkin') +
        menuRow('신고 처리 결과 조회', '#/report?t=list') +
      '</div>' +
      '<div class="notice gray"><i>ℹ️</i><div>모임 도착·귀가 상태를 본인이 지정한 연락처에만 공유합니다.</div></div>' };
  };

  /* 신고 내역 */
  function reportList () {
    const rs = session().reports || [];
    return { bar: { title: '신고 처리 결과', back: true, center: true }, tab: false, html:
      (rs.length
        ? '<div class="list" style="margin-top:12px">' + rs.map(r =>
            '<div class="row"><div class="row-main">' +
            '<div class="row-title wrap">' + esc(r.target) + ' · ' + esc(r.type) + '</div>' +
            '<div class="row-meta">' + esc(DB.ago(r.at)) + ' · ' + esc(String(r.body).slice(0, 40)) + '</div></div>' +
            '<span class="badge warn">' + esc(r.state) + '</span></div>').join('') + '</div>'
        : '<div class="empty"><b>🛡️</b>접수한 신고가 없습니다.<br>' +
          '<a href="#/report" data-nav style="color:var(--brand);font-weight:700">안심센터 열기</a></div>') +
      '<div class="notice gray"><i>ℹ️</i><div>접수된 신고는 순서대로 검토하며 결과를 알림으로 알려드립니다. ' +
        '처리 자료는 완료 후 6개월간 보관합니다.</div></div>' };
  }

  /* ── 공개범위 설정 ─────────────────────── */
  S.privacy = function () {
    const s = session();
    const items = [['region','활동 지역', s.region], ['age','연령대', s.age], ['kids','자녀 정보', s.kids],
                   ['remarry','재혼 의향', s.remarry], ['interests','관심사', (s.interests || []).join(', ') || '없음'],
                   ['photo','프로필 사진', s.photo ? '등록됨' : '없음']];
    return { bar: { title: '항목별 공개범위', back: true, center: true }, tab: false, html:
      '<div class="notice"><i>🔐</i><div>항목마다 공개 범위를 직접 선택할 수 있어요. 민감한 항목의 기본값은 <b>비공개</b>입니다.</div></div>' +
      '<div class="list" style="margin-top:12px">' + items.map(i =>
        '<div class="row"><div class="row-main"><div class="row-title">' + esc(i[1]) + '</div>' +
        '<div class="row-meta">' + esc(i[2]) + '</div></div>' +
        '<button class="visbtn" data-vis="' + i[0] + '">' +
        esc(UI.visOf(i[0], i[0] === 'kids' || i[0] === 'remarry' ? '비공개' : '전체 공개')) + ' ▾</button></div>').join('') +
      '</div>' +
      '<div class="notice gray"><i>ℹ️</i><div>공개범위는 저장되며, 언제든 다시 바꿀 수 있습니다.</div></div>' };
  };

  /* ── 설정 ─────────────────────────────── */
  S.settings = function () {
    const sw = (key, label, dflt) =>
      '<div class="row"><div class="row-main"><div class="row-title">' + label + '</div></div>' +
      '<button class="switch' + (UI.setting(key, dflt) ? ' on' : '') + '" data-switch="' + key + '"></button></div>';
    const blocked = (session().blocked || []).length;
    return { bar: { title: '설정', back: true, center: true }, tab: false, html:
      '<div class="sec-head"><h3>알림</h3></div><div class="list">' +
        sw('noti-cmt', '댓글 · 답글 알림', true) + sw('noti-meet', '모임 승인 · 변경 알림', true) +
        sw('noti-chat', '단체채팅 알림', true) + (UI.isPhone() ? sw('noti-voice', '보이스룸 시작 알림', false) : '') +
        sw('noti-mkt', '마케팅 정보 수신', false) + '</div>' +
      '<div class="sec-head"><h3>안전</h3></div><div class="list">' +
        sw('safe-dm', '1:1 메시지 받기 (같은 모임 참가자만)', true) +
        sw('safe-search', '프로필 검색 노출', true) +
        actRow('차단 회원 관리', 'blocked-list', blocked ? blocked + '명' : '0명') +
        actRow('안심 연락처', 'safe-contact', session().safeContact ? '등록됨' : '미등록') + '</div>' +
      '<div class="sec-head"><h3>계정</h3></div><div class="list">' +
        actRow('로그인 기기 관리', 'devices') +
        menuRow('개인정보 처리방침', '#/post/n2') +
        actRow('회원 탈퇴', 'withdraw') + '</div>' +
      '<div class="sec" style="padding:20px 16px"><button class="btn line" data-act="reset-demo">데모 데이터 초기화</button></div>' +
      '<div class="ver">Happy Together v1.0 · WebView Ready</div>' };
  };

  /* ── 결제 내역 ─────────────────────────── */
  S.payments = function () {
    const state = (id, dflt) => has('refundReq', id) ? '환불 요청' : dflt;
    const mock = [
      { title:'40대 와인 모임', at:'지난 주', amount:31500, id:'pm1', state: state('pm1', '결제 완료') },
      { title:'주말 브런치 & 수다', at:'2주 전', amount:26250, id:'pm2', state:'환불 완료' },
      { title:'평일 저녁 전시 관람', at:'지난 달', amount:12600, id:'pm3', state: state('pm3', '결제 완료') }
    ].map(r => Object.assign(r, {
      cls: r.state === '결제 완료' ? 'ok' : r.state === '환불 요청' ? 'warn' : 'gray' }));
    const mine = (session().pays || []).map(p => ({
      title: p.title, at: DB.ago(p.at), amount: p.amount, id: p.id,
      state: p.state, cls: p.state === '결제 완료' ? 'ok' : p.state === '환불 요청' ? 'warn' : 'gray'
    }));
    const rows = mine.concat(mock);
    const total = rows.filter(r => r.state === '결제 완료').reduce((a, b) => a + b.amount, 0);

    return { bar: { title: '결제 · 환불', back: true, center: true }, tab: false, html:
      '<div class="summary" style="margin-top:12px">' +
        '<div class="summary-t">결제 합계</div>' +
        '<div class="inforow total"><span>결제 완료 금액</span><b>' + UI.won(total) + '</b></div>' +
      '</div>' +
      '<div class="list">' + rows.map(r =>
        '<div class="row"><div class="row-main"><div class="row-title wrap">' + esc(r.title) + '</div>' +
        '<div class="row-meta">' + esc(r.at) + ' · ' + UI.won(r.amount) + '</div></div>' +
        (r.state === '결제 완료'
          ? '<button class="delbtn" data-act="refund-' + r.id + '">환불 요청</button>'
          : '<span class="badge ' + r.cls + '">' + esc(r.state) + '</span>') + '</div>').join('') + '</div>' +
      '<div class="notice gray"><i>ℹ️</i><div>참가비와 플랫폼 수수료는 영수증에 분리 표기됩니다. ' +
        '환불은 모임의 환불 규정에 따라 처리됩니다.</div></div>' };
  };

  /* ── 서비스 소개 ───────────────────────── */
  S.about = function () {
    const c = DB.community;
    return { bar: { title: '서비스 소개', back: true, center: true }, tab: false, html:
      '<div class="aboutcover"><h2>' + esc(c.slogan) + '</h2><p>행복하자 우리 · Happy Together</p></div>' +
      '<div class="proseblk">‘행복하자 우리’는 돌싱의 일상 · 친목 · 모임 · 대화를 연결하는 커뮤니티입니다. ' +
      '가입을 강요하지 않고 먼저 둘러보게 하며, 신뢰할 수 있는 사람들과 다시 일상을 연결합니다.</div>' +
      '<div class="sec-head"><h3>우리가 지키는 것</h3></div>' +
      '<div class="list">' + [
        ['둘러보기 먼저', '가입 화면을 첫 진입에 강제로 노출하지 않습니다'],
        ['낙인 없는 표현', '이혼 사유·자녀 유무를 강제로 공개하지 않습니다'],
        ['연애만이 목적이 아님', '지역·취미·생활 중심의 실제 만남을 만듭니다'],
        ['안전한 익명', '운영자가 확인할 수 없는 완전 무기명 구조는 두지 않습니다']
      ].map(r => '<div class="row"><div class="row-main"><div class="row-title">' + r[0] + '</div>' +
        '<div class="row-meta" style="white-space:normal">' + r[1] + '</div></div></div>').join('') + '</div>' +
      '<div class="sec-head"><h3>하지 않는 것</h3></div>' +
      '<div class="proseblk warnblk">외모 중심의 무한 스와이프 데이팅 구조 · 가입 전 모든 콘텐츠 차단 · ' +
      '자녀 유무와 이혼 사유의 강제 공개</div>' +
      '<div class="ver">화면설계서 v1.0 기준 · <a href="https://park-jongchul.github.io/happyTogetherDoc/" target="_blank" rel="noopener" style="color:var(--brand)">기획서 보기</a></div>' };
  };

})(window.SCREENS);
