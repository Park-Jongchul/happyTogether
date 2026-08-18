/* D06 모임 탐색 · D07 모임 상세 · D08 참가 신청/결제 · D09 모임 개설 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const { esc, won, avatar, session, isVerified, isGuest, has } = UI;

  /* ── 카드 ─────────────────────────────── */
  function meetCard (m) {
    const host = DB.user(m.host);
    const joined = DB.joinedOf(m);
    const badge = m.state === '검수중' ? '검수중'
                : DB.isPast(m)        ? '종료'
                : DB.isFull(m)        ? '대기 가능' : '';
    return '<a class="mcard" href="#/meeting/' + m.meeting_id + '" data-nav>' +
      '<div class="mcard-thumb"><span class="mcard-cat">' + esc(m.cat) + '</span>' +
        (badge ? '<span class="mcard-full">' + badge + '</span>' : '') +
        (has('favMeets', m.meeting_id) ? '<span class="mcard-fav">♥</span>' : '') + '</div>' +
      '<div class="mcard-body">' +
        '<div class="mcard-title">' + esc(m.title) + '</div>' +
        '<div class="mcard-meta">' + esc(m.date.replace(/\s\(.\)/, '')) + ' · ' + esc(m.region) + '</div>' +
        '<div class="mcard-foot">' +
          '<span>' + joined + '/' + m.capacity + '명 · ' + esc(m.ratio) + '</span>' +
          '<b>' + won(m.fee) + '</b>' +
        '</div>' +
        '<div class="mcard-host">' + avatar(host, 'sm') + '<span>' + esc(host.nickname) +
        ' · 매너 ' + host.manner + '</span>' +
        '<span class="badge ' + (m.approval === '승인형' ? 'warn' : 'ok') + '">' + esc(m.approval) + '</span></div>' +
      '</div></a>';
  }

  /* ── 필터 ─────────────────────────────── */
  const isWeekend = ts => [0, 6].indexOf(new Date(ts).getDay()) > -1;

  /* '30~50대' · '40대' · '제한 없음' 안에 원하는 연령대가 들어가는지 */
  function ageFit (range, want) {
    if (!range || range === '제한 없음') return true;
    const ns = String(range).match(/\d+/g);
    if (!ns) return true;
    const lo = +ns[0], hi = +ns[ns.length - 1];
    const w = +(String(want).match(/\d+/) || [0])[0];
    return w >= lo && w <= hi;
  }

  function filterMeetings (q) {
    const quick = q.f || 'rec';
    const now = Date.now();
    let list = DB.meetings.slice();

    /* '오늘' 은 시작 시간이 지났어도 오늘 일정이면 보여줍니다. 지난 모임은 '전체' 에서만. */
    if (quick === 'today')     list = list.filter(m => DB.sameDay(m.ts));
    else if (quick === 'week') list = list.filter(m => m.ts >= now && isWeekend(m.ts));
    else if (quick !== 'all')  list = list.filter(m => m.ts >= now);

    if (q.r)   list = list.filter(m => m.region.indexOf(q.r) > -1);
    if (q.c)   list = list.filter(m => m.cat === q.c);
    if (q.a)   list = list.filter(m => ageFit(m.age, q.a));
    if (q.fee) list = list.filter(m => (q.fee === '무료' ? !m.fee : m.fee > 0));

    if (quick === 'rec') {
      /* 추천 = 내 관심사·지역이 겹치는 순, 같으면 가까운 날짜 순 */
      const me = session();
      const score = m => (me.interests.indexOf(m.cat) > -1 ? 2 : 0) +
                         (m.region.indexOf(me.region) > -1 ? 1 : 0);
      list.sort((a, b) => (score(b) - score(a)) || (a.ts - b.ts));
    } else {
      list.sort((a, b) => a.ts - b.ts);
    }
    return list;
  }

  /* ── D06 모임 탐색 ─────────────────────── */
  S.meetings = function (q) {
    const quick = q.f || 'rec';
    const list = filterMeetings(q);

    return { bar: { title: '모임 찾기', actions: [{ act:'search', icon:'🔍' }, { act:'drawer', icon:'☰' }] },
      tab: 'meetings', html:
      '<div class="chips">' +
        [['rec','추천'],['today','오늘'],['week','주말'],['all','전체']].map(f =>
          '<a class="chip' + (f[0] === quick ? ' on' : '') + '" href="' + UI.withQuery({ f: f[0] }) + '" data-nav>' +
          f[1] + '</a>').join('') +
      '</div>' +
      UI.filterBar('meetings', q) +
      (isVerified() ? '' :
        '<div class="notice"><i>🔒</i><div>모임 신청·개설은 정회원 전용입니다. 목록과 상세는 자유롭게 둘러보세요.' +
        '<button class="linkbtn" data-act="upgrade">정회원 인증 알아보기</button></div></div>') +
      '<div class="mgrid">' + (list.length ? list.map(meetCard).join('') :
        '<div class="empty"><b>📅</b>조건에 맞는 모임이 없습니다.<br>' +
        '<button class="linkbtn" data-act="clear-filter">필터 초기화</button></div>') + '</div>' +
      '<button class="fab" data-act="new-meeting">＋ 모임 만들기</button>' };
  };

  /* ── D07 모임 상세 ─────────────────────── */
  S.meeting = function (q, id) {
    const m = DB.meeting(id);
    if (!m) return S.notfound();
    const host = DB.user(m.host);
    const fav = has('favMeets', id);
    const joined = has('myMeets', id);
    const waiting = has('waitMeets', id);
    const full = DB.isFull(m);
    const past = DB.isPast(m);
    const count = DB.joinedOf(m);
    const attendees = (m.attendees || []).map(u => DB.user(u));
    const room = DB.roomOf(m);

    const info = [['날짜', m.date], ['장소', m.place], ['정원', m.capacity + '명 (현재 ' + count + '명)'],
                  ['참가비', won(m.fee)], ['성비', m.ratio], ['연령 조건', m.age],
                  ['승인 방식', m.approval], ['음주', m.drink]];
    if (m.feeUse) info.push(['참가비 사용처', m.feeUse]);

    /* 하단 버튼 — 상태에 따라 하나만 보여줍니다 */
    let action;
    if (DB.isMine(m)) {
      action = '<a class="btn soft" href="#/my-meetings?t=host" data-nav>내가 개설한 모임 관리</a>';
    } else if (past) {
      action = joined
        ? '<button class="btn" data-act="review-meet-' + id + '">후기 남기기</button>'
        : '<button class="btn line" disabled>종료된 모임입니다</button>';
    } else if (joined) {
      action = room
        ? '<a class="btn soft" href="#/chat/' + room + '" data-nav>참가 확정 · 단체채팅 열기</a>'
        : '<span class="btn soft" style="opacity:.85">참가 확정</span>';
    } else if (waiting) {
      action = '<button class="btn line" data-act="wait-' + id + '">대기 신청 취소</button>';
    } else {
      action = '<button class="btn' + (full ? ' line' : '') + '" data-act="join-meeting-' + id + '">' +
               (full ? '대기 신청하기' : '참가 신청') + '</button>';
    }

    return { bar: { title: '모임 상세', back: true, center: true,
                    actions: [{ act:'fav-' + id, icon: fav ? '♥' : '♡' }, { act:'more-meeting-' + id, icon:'⋯' }] },
      tab: false, html:
      '<div class="detail-cover"><span class="badge coral">' + esc(m.cat) + '</span></div>' +
      (m.state === '검수중'
        ? '<div class="notice warn"><i>🕒</i><div>검수 중인 모임입니다. 승인되면 목록에 공개됩니다.</div></div>' : '') +
      '<div class="sec" style="padding-top:14px">' +
        '<h2 class="d-title">' + esc(m.title) + '</h2>' +
        '<div class="d-sub">' + esc(m.date) + ' · ' + esc(m.region) + '</div>' +
      '</div>' +

      '<a class="hostbox" href="#/user/' + host.user_id + '" data-nav>' + avatar(host) +
        '<div class="row-main"><div class="row-title">모임장 ' + esc(host.nickname) +
        ' <span class="badge">인증회원</span></div>' +
        '<div class="row-meta">모임 ' + host.meets + '회 · 매너 ' + host.manner + ' · 노쇼 ' + host.noshow + '회</div></div>' +
        '<span class="row-arrow">›</span></a>' +

      '<div class="infobox">' + info.map(r =>
        '<div class="inforow"><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>').join('') + '</div>' +

      '<div class="sec-head"><h3>소개</h3></div>' +
      '<div class="proseblk">' + UI.nl2br(m.desc) + '</div>' +
      '<div class="sec-head"><h3>일정</h3></div><div class="proseblk">' + esc(m.plan) + '</div>' +
      '<div class="sec-head"><h3>준비물</h3></div><div class="proseblk">' + esc(m.items) + '</div>' +
      '<div class="sec-head"><h3>환불 규정</h3></div>' +
      '<div class="proseblk warnblk">' + esc(m.refund) + '</div>' +

      '<div class="sec-head"><h3>참가자 ' + count + '명</h3>' +
        '<span class="sec-more">공개 동의한 회원만 표시</span></div>' +
      (attendees.length || count
        ? '<div class="faces">' + attendees.map(u =>
            '<a href="#/user/' + u.user_id + '" data-nav class="face">' + avatar(u) +
            '<span>' + esc(u.nickname) + '</span></a>').join('') +
            (joined ? '<a href="#/user/u_me" data-nav class="face">' + avatar('u_me') + '<span>나</span></a>' : '') +
            (count > attendees.length + (joined ? 1 : 0)
              ? '<div class="face"><div class="avatar" style="background:#e3e8ef;color:var(--muted)">+' +
                (count - attendees.length - (joined ? 1 : 0)) + '</div><span>비공개</span></div>' : '') +
          '</div>'
        : '<div class="empty" style="padding:26px">아직 참가자가 없습니다.</div>') +
      '<div class="notice gray"><i>ℹ️</i><div>정확한 참가자 명단과 상세 장소는 참가가 확정된 회원에게만 공개됩니다.</div></div>' +

      '<div class="btn-bar">' +
        '<button class="btn line" style="flex:0 0 56px" data-act="fav-' + id + '">' + (fav ? '♥' : '♡') + '</button>' +
        action +
      '</div>' };
  };

  /* ── D08 참가 신청 / 결제 ──────────────── */
  S.apply = function (q, id) {
    const m = DB.meeting(id);
    if (!m) return S.notfound();
    const fee = m.fee, commission = fee ? Math.round(fee * 0.05) : 0;

    return { bar: { title: '참가 신청', back: true, center: true }, tab: false, html:
      '<div class="summary">' +
        '<div class="summary-t">' + esc(m.title) + '</div>' +
        '<div class="inforow"><span>날짜</span><b>' + esc(m.date) + '</b></div>' +
        '<div class="inforow"><span>장소</span><b>' + esc(m.place) + '</b></div>' +
        '<div class="inforow"><span>참가비</span><b>' + won(fee) + '</b></div>' +
        '<div class="inforow"><span>남은 자리</span><b>' +
          Math.max(0, m.capacity - DB.joinedOf(m)) + '자리</b></div>' +
      '</div>' +

      '<div class="field"><label>참가 이유를 적어주세요</label>' +
        '<textarea class="inp" id="f-reason" placeholder="어떤 점이 좋아 보였는지, 어떤 이야기를 나누고 싶은지 편하게 적어주세요."></textarea>' +
        '<div class="hint">' + (m.approval === '승인형' ? '모임장이 확인 후 승인합니다. ' : '') +
        '이혼 사유 등 민감한 질문은 모임장이 할 수 없습니다.</div></div>' +

      '<div class="sec-head"><h3>취소 · 환불 규정</h3></div>' +
      '<div class="proseblk warnblk">' + esc(m.refund) + '<br><br>' +
        '· 노쇼가 반복되면 모임 참가가 제한될 수 있습니다.</div>' +
      '<button class="check" data-check="refund"><i>✓</i><div>노쇼 및 환불 규정을 확인했습니다 <b style="color:var(--danger)">(필수)</b></div></button>' +

      (fee ? '<div class="field"><label>결제수단</label><div class="opts wrapopts" data-radio="pay">' +
        ['카드','간편결제','계좌이체'].map(p => '<button class="opt' + (p === '카드' ? ' on' : '') + '" data-val="' + p + '">' + p + '</button>').join('') +
        '</div></div>' +
        '<div class="paybox">' +
          '<div class="inforow"><span>참가비</span><b>' + won(fee) + '</b></div>' +
          '<div class="inforow"><span>플랫폼 수수료</span><b>' + won(commission) + '</b></div>' +
          '<div class="inforow total"><span>총 결제금액</span><b>' + won(fee + commission) + '</b></div>' +
        '</div>' : '<div class="notice ok-notice"><i>🎈</i><div>무료 모임입니다. 결제 없이 신청할 수 있어요.</div></div>') +

      '<div class="btn-bar"><button class="btn" data-act="pay-' + id + '">' +
        (fee ? '신청 및 결제 · ' + won(fee + commission) : '참가 신청하기') + '</button></div>' };
  };

  /* ── D09 모임 개설 ─────────────────────────
     4단계로 나뉜 폼이라 단계를 옮길 때마다 입력을 draft 에 담아 둡니다.
     서버가 붙으면 draft 를 그대로 POST /meetings 로 보내면 됩니다. */
  S.meetDraft = S.meetDraft || {};

  /* 화면을 떠날 때 지금 그려져 있는 입력을 draft 에 담습니다 */
  SCREENS.harvesters = SCREENS.harvesters || [];
  SCREENS.harvesters.push(function (prevHash) {
    if (String(prevHash || '').indexOf('#/meeting-new') !== 0) return;
    const d = S.meetDraft = S.meetDraft || {};
    const v = sel => { const el = UI.$(sel); return el ? String(el.value || '').trim() : null; };
    const pick = k => { const g = UI.$('[data-radio="' + k + '"] .opt.on'); return g ? g.dataset.val : null; };
    const put = (key, value) => { if (value !== null && value !== '') d[key] = value; };
    put('title', v('#m-title'));   put('cat', pick('cat'));       put('mregion', pick('mregion'));
    put('when', v('#m-when'));     put('place', v('#m-place'));
    put('capacity', v('#m-capacity')); put('ratio', pick('ratio')); put('mage', pick('mage'));
    put('approval', pick('approval'));
    put('fee', v('#m-fee'));       put('feeUse', v('#m-feeuse'));  put('refund', v('#m-refund'));
    put('drink', pick('drink'));   put('desc', v('#m-desc'));
  });

  /* draft → 실제 모임 객체 */
  S.buildMeeting = function (d) {
    const when = new Date(d.when);
    const ts = isNaN(+when) ? Date.now() + 86400000 : +when;
    const cap = Math.max(2, Number(d.capacity) || 2);
    return { meeting_id: 'm' + DB.newId(), host: 'u_me', title: d.title, cat: d.cat,
             ts: ts, date: DB.dateLabel(ts), region: d.mregion, place: d.place,
             capacity: cap, joined: 1, ratio: d.ratio || '제한 없음',
             fee: Number(d.fee) || 0, feeUse: d.feeUse || '',
             approval: d.approval, drink: d.drink || '없음', age: d.mage || '제한 없음',
             desc: d.desc, plan: d.plan || d.desc, items: d.items || '없음',
             refund: d.refund, state: '검수중', mine: true, attendees: [] };
  };

  S.meetingNew = function (q) {
    if (!isVerified()) return { bar: { title: '모임 만들기', back: true, center: true }, tab: false,
      html: '<div class="hero-state"><div class="hero-ic">🔒</div><h3>모임 개설은 정회원 전용입니다</h3>' +
            '<p>돌싱 인증을 마치면 모임을 열 수 있어요.</p>' +
            '<button class="btn" style="max-width:260px;margin-top:18px" data-act="upgrade">정회원 인증 알아보기</button></div>' };

    const step = Math.min(4, Math.max(1, Number(q.s || 1)));
    const d = S.meetDraft = S.meetDraft || {};
    const dot = n => '<b class="' + (n <= step ? 'on' : '') + '"></b>';
    const opts = (key, list, cur) => '<div class="opts wrapopts" data-radio="' + key + '">' +
      list.map(c => '<button class="opt' + (c === cur ? ' on' : '') + '" data-val="' + esc(c) + '">' +
        esc(c) + '</button>').join('') + '</div>';
    const value = v => v ? ' value="' + esc(v) + '"' : '';

    let body = '<div class="steps">' + dot(1) + dot(2) + dot(3) + dot(4) + '</div>' +
               '<div class="steplabel">' + step + '/4 ' +
               ['기본정보','참가조건','비용·규정','미리보기'][step - 1] + '</div>';

    if (step === 1) {
      body +=
      '<div class="field"><label>모임 제목</label>' +
        '<input class="inp" id="m-title" placeholder="예) 초보 환영 북한산 등산"' + value(d.title) + '>' +
        '<div class="hint warn">외모·재산·직업을 조건으로 내거는 문구는 등록할 수 없습니다.</div></div>' +
      '<div class="field"><label>카테고리</label>' +
        opts('cat', ['산책','등산','식사','와인','문화','여행','스포츠'], d.cat) + '</div>' +
      '<div class="field"><label>지역</label>' +
        opts('mregion', DB.regions.slice(0, 6), d.mregion) + '</div>' +
      '<div class="field"><label>날짜 · 시간</label>' +
        '<input class="inp" id="m-when" type="datetime-local"' + value(d.when) + '></div>' +
      '<div class="field"><label>장소</label>' +
        '<input class="inp" id="m-place" placeholder="대략 위치 (예: 합정역 인근)"' + value(d.place) + '>' +
        '<div class="hint">공개 전에는 대략 위치만 노출하고, 승인 후 정확한 장소를 공개할 수 있습니다.</div></div>';
    } else if (step === 2) {
      body +=
      '<div class="field"><label>정원</label>' +
        '<input class="inp" id="m-capacity" type="number" min="2" max="50" placeholder="8" inputmode="numeric"' +
        value(d.capacity) + '><div class="hint">2명 이상 50명 이하로 정해주세요.</div></div>' +
      '<div class="field"><label>성비 제한</label>' +
        opts('ratio', ['제한 없음','균형 (5:5)','직접 설정'], d.ratio) +
        '<div class="hint">성비 제한은 정원 균형 목적으로만 허용됩니다.</div></div>' +
      '<div class="field"><label>연령 조건</label>' +
        opts('mage', ['제한 없음','30~40대','40~50대','50대 이상'], d.mage) +
        '<div class="hint warn">과도한 나이 제한은 검수 대상입니다.</div></div>' +
      '<div class="field"><label>승인 방식</label>' +
        '<div class="opts" data-radio="approval">' + ['즉시승인','승인형'].map(c =>
          '<button class="opt' + (c === d.approval ? ' on' : '') + '" data-val="' + c + '">' + c + '</button>').join('') +
        '</div></div>';
    } else if (step === 3) {
      body +=
      '<div class="field"><label>참가비</label>' +
        '<input class="inp" id="m-fee" type="number" min="0" placeholder="0" inputmode="numeric"' + value(d.fee) + '>' +
        '<div class="hint">참가비를 받으면 사용처를 반드시 적어주세요.</div></div>' +
      '<div class="field"><label>참가비 사용처</label>' +
        '<input class="inp" id="m-feeuse" placeholder="예) 와인 3병 · 안주 비용"' + value(d.feeUse) + '></div>' +
      '<div class="field"><label>환불 규정</label>' +
        '<textarea class="inp" id="m-refund" placeholder="언제까지 취소하면 전액 환불인지 명확히 적어주세요.">' +
        esc(d.refund || '') + '</textarea></div>' +
      '<div class="field"><label>음주 여부</label>' +
        '<div class="opts" data-radio="drink">' + ['없음','가볍게','있음'].map(c =>
          '<button class="opt' + (c === d.drink ? ' on' : '') + '" data-val="' + c + '">' + c + '</button>').join('') +
        '</div><div class="hint">주류 중심 모임은 19세 이상 확인과 귀가 안내가 함께 표시됩니다.</div></div>' +
      '<div class="field"><label>상세 설명</label>' +
        '<textarea class="inp" id="m-desc" placeholder="일정, 준비물, 금지행동, 취소 기준을 적어주세요.">' +
        esc(d.desc || '') + '</textarea></div>';
    } else {
      const missing = ['title','cat','mregion','when','place','capacity','approval','refund','desc']
        .filter(k => !d[k]);
      const label = { title:'모임 제목', cat:'카테고리', mregion:'지역', when:'날짜·시간', place:'장소',
                      capacity:'정원', approval:'승인 방식', refund:'환불 규정', desc:'상세 설명' };
      body +=
      '<div class="notice"><i>👀</i><div>회원에게 보이는 모습입니다. 확인 후 검수를 요청해 주세요.</div></div>' +
      (missing.length
        ? '<div class="notice warn"><i>⚠️</i><div>아직 비어 있는 항목: <b>' +
          missing.map(k => label[k]).join(' · ') + '</b><br>이전 단계에서 채워주세요.</div></div>'
        : '') +
      '<div class="mgrid">' + meetCard(S.buildMeeting(Object.assign({
        title:'(제목 없음)', cat:'산책', mregion:'서울', place:'(장소 미정)', capacity:8,
        approval:'즉시승인', desc:'(설명 없음)', refund:'(규정 없음)' }, d))) + '</div>' +
      '<div class="sec-head"><h3>검수 항목</h3></div>' +
      '<div class="list">' + [
        ['차별 조건 문구', !/외모|재산|연봉|직업|학벌/.test(String(d.title) + String(d.desc))],
        ['과도한 음주 유도', d.drink !== '있음' || /귀가|대중교통|무리/.test(String(d.desc))],
        ['불법 영업·금전 모집', !(Number(d.fee) > 0 && !d.feeUse)],
        ['환불 규정 명시', !!d.refund]
      ].map(c =>
        '<div class="row"><div class="row-main"><div class="row-title">' + c[0] + '</div></div>' +
        '<span class="badge ' + (c[1] ? 'ok">이상 없음' : 'warn">확인 필요') + '</span></div>').join('') + '</div>';
    }

    body += '<div class="btn-bar">' +
      (step > 1 ? '<a class="btn line" style="flex:0 0 90px" href="' + UI.withQuery({ s: String(step - 1) }) + '" data-nav>이전</a>' : '') +
      (step < 4
        ? '<a class="btn" href="' + UI.withQuery({ s: String(step + 1) }) + '" data-nav>다음</a>'
        : '<button class="btn" data-act="submit-meeting">검수 요청</button>') + '</div>';

    return { bar: { title: '모임 만들기', back: true, center: true }, tab: false, html: body };
  };

  /* ── 내 모임 ─────────────────────────── */
  S.myMeetings = function (q) {
    if (isGuest()) {
      return { bar: { title: '내 모임', back: true, center: true }, tab: false,
        html: '<div class="hero-state"><div class="hero-ic">📅</div><h3>로그인하면 내 모임이 보입니다</h3>' +
              '<p>신청한 모임과 대기 신청을 한 곳에서 관리할 수 있어요.</p>' +
              '<a class="btn" style="max-width:260px;margin-top:18px" href="#/login?tab=join" data-nav>회원가입</a></div>' };
    }
    const s = session();
    const pick = ids => (ids || []).map(id => DB.meeting(id)).filter(Boolean);
    const joined = pick(s.myMeets);
    const lists = {
      up:   joined.filter(m => !DB.isPast(m)).sort((a, b) => a.ts - b.ts),
      wait: pick(s.waitMeets),
      done: joined.filter(m => DB.isPast(m)).sort((a, b) => b.ts - a.ts),
      host: DB.myMeetingsHosted(),
      fav:  pick(s.favMeets)
    };
    const tabs = [['up','예정'],['wait','신청대기'],['done','완료 · 후기'],['host','내가 개설'],['fav','찜']];
    const t = lists[q.t] ? q.t : 'up';
    const list = lists[t];

    const emptyText = { up:'참여 예정인 모임이 없습니다.', wait:'대기 신청한 모임이 없습니다.',
                        done:'완료된 모임이 없습니다.', host:'개설한 모임이 없습니다.',
                        fav:'찜한 모임이 없습니다.' }[t];

    return { bar: { title: '내 모임', back: true, center: true }, tab: false, html:
      '<div class="chips">' + tabs.map(x =>
        '<a class="chip' + (x[0] === t ? ' on' : '') + '" href="#/my-meetings?t=' + x[0] + '" data-nav>' +
        x[1] + ' ' + lists[x[0]].length + '</a>').join('') + '</div>' +
      (list.length
        ? '<div class="mgrid">' + list.map(meetCard).join('') + '</div>' +
          (t === 'done'
            ? '<div class="list">' + list.map(m =>
                '<div class="row"><div class="row-main"><div class="row-title wrap">' + esc(m.title) + '</div>' +
                '<div class="row-meta">' + esc(m.date) + '</div></div>' +
                '<button class="delbtn" data-act="review-meet-' + m.meeting_id + '">후기</button></div>').join('') +
              '</div>'
            : '') +
          (t === 'host'
            ? '<div class="sec" style="padding-top:14px">' +
              '<button class="btn line" data-act="new-meeting">＋ 새 모임 만들기</button></div>'
            : '')
        : '<div class="empty"><b>📅</b>' + emptyText + '<br>' +
          '<a href="#/meetings" data-nav style="color:var(--brand);font-weight:700">모임 찾아보기</a></div>') };
  };

})(window.SCREENS);
