/* D06 모임 탐색 · D07 모임 상세 · D08 참가 신청/결제 · D09 모임 개설 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const { esc, won, avatar, session, isVerified } = UI;

  function meetCard (m) {
    const host = DB.user(m.host);
    const full = m.joined >= m.capacity;
    const fav = session().favMeets.indexOf(m.meeting_id) > -1;
    return '<a class="mcard" href="#/meeting/' + m.meeting_id + '" data-nav>' +
      '<div class="mcard-thumb"><span class="mcard-cat">' + esc(m.cat) + '</span>' +
        (full ? '<span class="mcard-full">대기 가능</span>' : '') +
        (fav ? '<span class="mcard-fav">♥</span>' : '') + '</div>' +
      '<div class="mcard-body">' +
        '<div class="mcard-title">' + esc(m.title) + '</div>' +
        '<div class="mcard-meta">' + esc(m.date.replace(/\s\(.\)/, '')) + ' · ' + esc(m.region) + '</div>' +
        '<div class="mcard-foot">' +
          '<span>' + m.joined + '/' + m.capacity + '명 · ' + esc(m.ratio) + '</span>' +
          '<b>' + won(m.fee) + '</b>' +
        '</div>' +
        '<div class="mcard-host">' + avatar(host, 'sm') + '<span>' + esc(host.nickname) +
        ' · 매너 ' + host.manner + '</span>' +
        '<span class="badge ' + (m.approval === '승인형' ? 'warn' : 'ok') + '">' + esc(m.approval) + '</span></div>' +
      '</div></a>';
  }

  /* ── D06 모임 탐색 ─────────────────────── */
  S.meetings = function (q) {
    const quick = q.f || 'rec';
    let list = DB.meetings.slice();
    if (quick === 'today') list = list.filter(m => /8월 8일|8월 9일/.test(m.date));
    if (quick === 'week')  list = list.filter(m => /토|일/.test(m.date));

    return { bar: { title: '모임 찾기', actions: [{ act:'search', icon:'🔍' }, { act:'drawer', icon:'☰' }] },
      tab: 'meetings', html:
      '<div class="chips">' +
        [['rec','추천'],['today','오늘'],['week','주말'],['all','전체']].map(f =>
          '<a class="chip' + (f[0] === quick ? ' on' : '') + '" href="#/meetings?f=' + f[0] + '" data-nav>' + f[1] + '</a>').join('') +
      '</div>' +
      '<div class="chips" style="padding-top:0">' +
        ['지역 ▾','날짜 ▾','관심사 ▾','연령대 ▾','참가비 ▾'].map(f =>
          '<button class="chip" data-sheet="filter">' + f + '</button>').join('') +
      '</div>' +
      (isVerified() ? '' :
        '<div class="notice"><i>🔒</i><div>모임 신청·개설은 정회원 전용입니다. 목록과 상세는 자유롭게 둘러보세요.' +
        '<button class="linkbtn" data-act="upgrade">정회원 인증 알아보기</button></div></div>') +
      '<div class="mgrid">' + (list.length ? list.map(meetCard).join('') :
        '<div class="empty"><b>📅</b>조건에 맞는 모임이 없습니다.</div>') + '</div>' +
      '<button class="fab" data-act="new-meeting">＋ 모임 만들기</button>' };
  };

  /* ── D07 모임 상세 ─────────────────────── */
  S.meeting = function (q, id) {
    const m = DB.meeting(id);
    if (!m) return S.notfound();
    const host = DB.user(m.host);
    const fav = session().favMeets.indexOf(id) > -1;
    const joined = session().myMeets.indexOf(id) > -1;
    const full = m.joined >= m.capacity;
    const attendees = ['u_bada','u_travel','u_bomnal','u_latte'].map(u => DB.user(u));

    const info = [['날짜', m.date], ['장소', m.place], ['정원', m.capacity + '명 (현재 ' + m.joined + '명)'],
                  ['참가비', won(m.fee)], ['성비', m.ratio], ['연령 조건', m.age],
                  ['승인 방식', m.approval], ['음주', m.drink]];

    return { bar: { title: '모임 상세', back: true, center: true,
                    actions: [{ act:'fav-' + id, icon: fav ? '♥' : '♡' }, { act:'more-meeting-' + id, icon:'⋯' }] },
      tab: false, html:
      '<div class="detail-cover"><span class="badge coral">' + esc(m.cat) + '</span></div>' +
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

      '<div class="sec-head"><h3>참가자 ' + m.joined + '명</h3>' +
        '<span class="sec-more">공개 동의한 회원만 표시</span></div>' +
      '<div class="faces">' + attendees.map(u =>
        '<a href="#/user/' + u.user_id + '" data-nav class="face">' + avatar(u) +
        '<span>' + esc(u.nickname) + '</span></a>').join('') +
        (m.joined > attendees.length ? '<div class="face"><div class="avatar" style="background:#e3e8ef;color:var(--muted)">+' +
        (m.joined - attendees.length) + '</div><span>비공개</span></div>' : '') + '</div>' +
      '<div class="notice gray"><i>ℹ️</i><div>정확한 참가자 명단과 상세 장소는 참가가 확정된 회원에게만 공개됩니다.</div></div>' +

      '<div class="btn-bar">' +
        '<button class="btn line" style="flex:0 0 56px" data-act="fav-' + id + '">' + (fav ? '♥' : '♡') + '</button>' +
        (joined
          ? '<a class="btn soft" href="#/chat/r1" data-nav>참가 확정 · 단체채팅 열기</a>'
          : '<button class="btn' + (full ? ' line' : '') + '" data-act="join-meeting-' + id + '">' +
            (full ? '대기 신청하기' : '참가 신청') + '</button>') +
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
      '</div>' +

      '<div class="field"><label>참가 이유를 적어주세요</label>' +
        '<textarea class="inp" id="f-reason" placeholder="어떤 점이 좋아 보였는지, 어떤 이야기를 나누고 싶은지 편하게 적어주세요."></textarea>' +
        '<div class="hint">' + (m.approval === '승인형' ? '모임장이 확인 후 승인합니다. ' : '') +
        '이혼 사유 등 민감한 질문은 모임장이 할 수 없습니다.</div></div>' +

      '<div class="sec-head"><h3>취소 · 환불 규정</h3></div>' +
      '<div class="proseblk warnblk">' + esc(m.refund) + '<br><br>' +
        '· 노쇼가 반복되면 모임 참가가 제한될 수 있습니다.</div>' +
      '<button class="check" data-check="refund"><i>✓</i><div>노쇼 및 환불 규정을 확인했습니다 <b style="color:var(--danger)">(필수)</b></div></button>' +

      (fee ? '<div class="field"><label>결제수단</label><div class="opts wrapopts" data-radio="pay" data-cur="카드">' +
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

  /* ── D09 모임 개설 ─────────────────────── */
  S.meetingNew = function (q) {
    const step = Number(q.s || 1);
    const dot = n => '<b class="' + (n <= step ? 'on' : '') + '"></b>';
    let body = '<div class="steps">' + dot(1) + dot(2) + dot(3) + dot(4) + '</div>' +
               '<div class="steplabel">' + step + '/4 ' +
               ['기본정보','참가조건','비용·규정','미리보기'][step - 1] + '</div>';

    if (step === 1) {
      body +=
      '<div class="field"><label>모임 제목</label>' +
        '<input class="inp" id="m-title" placeholder="예) 초보 환영 북한산 등산">' +
        '<div class="hint warn">외모·재산·직업을 조건으로 내거는 문구는 등록할 수 없습니다.</div></div>' +
      '<div class="field"><label>카테고리</label><div class="opts wrapopts" data-radio="cat">' +
        ['산책','등산','식사','와인','문화','여행','스포츠'].map(c => '<button class="opt" data-val="' + c + '">' + c + '</button>').join('') +
      '</div></div>' +
      '<div class="field"><label>지역</label><div class="opts wrapopts" data-radio="mregion">' +
        DB.regions.slice(0, 6).map(c => '<button class="opt" data-val="' + c + '">' + c + '</button>').join('') +
      '</div></div>' +
      '<div class="field"><label>날짜 · 시간</label><input class="inp" type="datetime-local"></div>' +
      '<div class="field"><label>장소</label><input class="inp" placeholder="대략 위치 (예: 합정역 인근)">' +
        '<div class="hint">공개 전에는 대략 위치만 노출하고, 승인 후 정확한 장소를 공개할 수 있습니다.</div></div>';
    } else if (step === 2) {
      body +=
      '<div class="field"><label>정원</label><input class="inp" type="number" placeholder="8" inputmode="numeric"></div>' +
      '<div class="field"><label>성비 제한</label><div class="opts wrapopts" data-radio="ratio">' +
        ['제한 없음','균형 (5:5)','직접 설정'].map(c => '<button class="opt" data-val="' + c + '">' + c + '</button>').join('') +
      '</div><div class="hint">성비 제한은 정원 균형 목적으로만 허용됩니다.</div></div>' +
      '<div class="field"><label>연령 조건</label><div class="opts wrapopts" data-radio="mage">' +
        ['제한 없음','30~40대','40~50대','50대 이상'].map(c => '<button class="opt" data-val="' + c + '">' + c + '</button>').join('') +
      '</div><div class="hint warn">과도한 나이 제한은 검수 대상입니다.</div></div>' +
      '<div class="field"><label>승인 방식</label><div class="opts" data-radio="approval">' +
        ['즉시승인','승인형'].map(c => '<button class="opt" data-val="' + c + '">' + c + '</button>').join('') +
      '</div></div>';
    } else if (step === 3) {
      body +=
      '<div class="field"><label>참가비</label><input class="inp" type="number" placeholder="0" inputmode="numeric">' +
        '<div class="hint">참가비 사용처를 반드시 적어주세요. (필수)</div></div>' +
      '<div class="field"><label>참가비 사용처</label><input class="inp" placeholder="예) 와인 3병 · 안주 비용"></div>' +
      '<div class="field"><label>환불 규정</label><textarea class="inp" placeholder="언제까지 취소하면 전액 환불인지 명확히 적어주세요."></textarea></div>' +
      '<div class="field"><label>음주 여부</label><div class="opts" data-radio="drink">' +
        ['없음','가볍게','있음'].map(c => '<button class="opt" data-val="' + c + '">' + c + '</button>').join('') +
      '</div><div class="hint">주류 중심 모임은 19세 이상 확인과 귀가 안내가 함께 표시됩니다.</div></div>' +
      '<div class="field"><label>상세 설명</label>' +
        '<textarea class="inp" placeholder="일정, 준비물, 금지행동, 취소 기준을 적어주세요."></textarea></div>';
    } else {
      body +=
      '<div class="notice"><i>👀</i><div>회원에게 보이는 모습입니다. 확인 후 검수를 요청해 주세요.</div></div>' +
      '<div class="mgrid">' + meetCard(DB.meetings[3]) + '</div>' +
      '<div class="sec-head"><h3>검수 항목</h3></div>' +
      '<div class="list">' + ['차별 조건 문구','과도한 음주 유도','불법 영업·금전 모집','숙박·여행 위험 요소'].map(c =>
        '<div class="row"><div class="row-main"><div class="row-title">' + c + '</div></div>' +
        '<span class="badge ok">이상 없음</span></div>').join('') + '</div>';
    }

    body += '<div class="btn-bar">' +
      (step > 1 ? '<a class="btn line" style="flex:0 0 90px" href="#/meeting-new?s=' + (step - 1) + '" data-nav>이전</a>' : '') +
      (step < 4
        ? '<a class="btn" href="#/meeting-new?s=' + (step + 1) + '" data-nav>다음</a>'
        : '<button class="btn" data-act="submit-meeting">검수 요청</button>') + '</div>';

    return { bar: { title: '모임 만들기', back: true, center: true }, tab: false, html: body };
  };

  /* 내 모임 */
  S.myMeetings = function () {
    const mine = session().myMeets.map(id => DB.meeting(id)).filter(Boolean);
    return { bar: { title: '내 모임', back: true, center: true }, tab: false, html:
      '<div class="chips">' + ['예정','신청대기','완료','내가 개설'].map((c, i) =>
        '<span class="chip' + (i === 0 ? ' on' : '') + '">' + c + '</span>').join('') + '</div>' +
      (mine.length ? '<div class="mgrid">' + mine.map(meetCard).join('') + '</div>'
                   : '<div class="empty"><b>📅</b>참여 예정인 모임이 없습니다.<br>관심 있는 모임을 찾아보세요.</div>') };
  };

})(window.SCREENS);
