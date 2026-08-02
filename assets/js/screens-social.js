/* D12 채팅 · D13 회원 프로필 · D14 관심사 친구추천 · D20 단체채팅 · D21 보이스룸 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const { esc, avatar, session, isVerified } = UI;

  function vipGate (title) {
    return '<div class="hero-state"><div class="hero-ic">🔒</div>' +
      '<h3>' + esc(title) + '은(는) 정회원 전용이에요</h3>' +
      '<p>돌싱 인증을 마치면 대화 기능을 모두 이용할 수 있습니다.</p>' +
      '<button class="btn" style="max-width:260px;margin-top:18px" data-act="upgrade">정회원 인증 알아보기</button></div>';
  }

  /* ── 대화 목록 ─────────────────────────── */
  S.chats = function (q) {
    const tab = q.t || 'chat';
    const bar = { title: '대화', actions: [{ act:'search', icon:'🔍' }, { act:'drawer', icon:'☰' }] };
    if (!isVerified()) return { bar, tab: 'chats', html: vipGate('단체채팅과 보이스룸') };

    let body = '<div class="segs">' +
      ['chat','voice'].map(k => '<a class="seg' + (k === tab ? ' on' : '') + '" href="#/chats?t=' + k + '" data-nav>' +
      (k === 'chat' ? '채팅' : '🎙 보이스룸') + '</a>').join('') + '</div>';

    if (tab === 'chat') {
      body += '<div class="list">' + DB.chats.map(c => {
        const icon = c.type === 'dm' ? '👤' : c.type === 'meeting' ? '📅' : '💬';
        return '<a class="row" href="#/chat/' + c.room_id + '" data-nav>' +
          '<div class="roomic">' + icon + '</div>' +
          '<div class="row-main"><div class="row-title">' + esc(c.title) +
          (c.type !== 'dm' ? ' <span class="cnt">' + c.members + '</span>' : '') + '</div>' +
          '<div class="row-meta">' + esc(c.last) + '</div></div>' +
          '<div style="text-align:right;flex:0 0 auto"><div style="font-size:11px;color:var(--muted)">' + esc(c.at) + '</div>' +
          (c.unread ? '<span class="unread">' + c.unread + '</span>' : '') + '</div></a>';
      }).join('') + '</div>' +
      '<div class="notice gray"><i>ℹ️</i><div>모임 종료 7일 후 단체채팅은 읽기 전용으로 전환됩니다. 모임장은 기간을 연장할 수 있어요.</div></div>';
    } else {
      body += '<div class="sec-head"><h3>진행 중인 방</h3></div>' +
        '<div class="vgrid">' + DB.voiceRooms.map(v => {
          const h = DB.user(v.host);
          return '<a class="vcard" href="#/voice/' + v.voice_room_id + '" data-nav>' +
            '<div class="vlive">● LIVE</div>' +
            '<div class="vtitle">' + esc(v.title) + '</div>' +
            '<div class="vtopic">' + esc(v.topic) + '</div>' +
            '<div class="vfoot">' + avatar(h, 'sm') +
            '<span>' + esc(h.nickname) + '</span>' +
            '<span class="vcount">🎙 ' + v.speakers + ' · 👂 ' + v.listeners + '</span></div>' +
            (v.access !== '공개' ? '<span class="badge gray vacc">' + esc(v.access) + '</span>' : '') +
            '</a>';
        }).join('') + '</div>' +
        '<div class="notice"><i>🔇</i><div>보이스룸은 기본적으로 녹음하지 않습니다. 별도 동의 없이 상시 녹음하지 않아요.</div></div>' +
        '<button class="fab" data-act="new-voice">🎙 보이스룸 열기</button>';
    }
    return { bar, tab: 'chats', html: body };
  };

  /* ── D12 / D20 채팅방 ──────────────────── */
  S.chat = function (q, id) {
    const c = DB.chat(id);
    if (!c) return SCREENS.notfound();
    if (!isVerified()) return { bar: { title: c.title, back: true, center: true }, tab: false, html: vipGate('단체채팅') };

    const msgs = c.msgs.map(m => {
      if (m.user === 'me') {
        return '<div class="msg me"><div class="bubble">' + esc(m.body) + '</div>' +
               '<span class="mtime">' + esc(m.at) + '</span></div>';
      }
      const u = DB.user(m.user);
      return '<div class="msg">' +
        '<a href="#/user/' + u.user_id + '" data-nav>' + avatar(u, 'sm') + '</a>' +
        '<div><div class="mname">' + esc(u.nickname) +
        (u.user_id === c.msgs[0].user && c.type !== 'dm' ? ' <span class="badge">모임장</span>' : '') + '</div>' +
        '<div class="bubble">' + esc(m.body) + '</div></div>' +
        '<span class="mtime">' + esc(m.at) + '</span></div>';
    }).join('');

    return { bar: { title: c.title, sub: c.type === 'dm' ? '1:1 대화' : c.members + '명 참여', back: true,
                    actions: [{ act:'chat-menu-' + id, icon:'⋮' }] },
      tab: false, html:
      (c.notice ? '<div class="pinnotice"><b>공지</b> ' + esc(c.notice) + '<span class="row-arrow">›</span></div>' : '') +
      '<div class="safebar">🛡️ 연락처·계좌번호 공유 요청과 불쾌한 메시지는 신고할 수 있습니다.</div>' +
      '<div class="msgs" id="msgs">' + msgs + '</div>' +
      '<div class="chat-bar">' +
        '<button class="cb-ic" data-act="chat-plus">＋</button>' +
        '<input class="inp" id="chat-input" placeholder="메시지 입력" enterkeyhint="send">' +
        (c.type !== 'dm' ? '<button class="cb-ic" data-act="voice-open">🎤</button>' : '') +
        '<button class="cb-send" data-act="send-msg">↑</button>' +
      '</div>',
      after: function () {
        const box = UI.$('#msgs');
        if (box) box.scrollTop = box.scrollHeight;
        const inp = UI.$('#chat-input');
        if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
      } };
  };

  function sendMsg () {
    const inp = UI.$('#chat-input');
    if (!inp || !inp.value.trim()) return;
    const v = inp.value.trim();
    if (/\d{2,3}[- ]?\d{3,4}[- ]?\d{4}|\d{10,}/.test(v)) {
      UI.toast('전화번호·계좌번호로 보이는 내용이 감지되었습니다. 안전을 위해 확인해 주세요.');
    }
    const box = UI.$('#msgs');
    const d = document.createElement('div');
    d.className = 'msg me';
    d.innerHTML = '<div class="bubble">' + UI.esc(v) + '</div><span class="mtime">지금</span>';
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    inp.value = '';
  }
  S.sendMsg = sendMsg;

  /* ── D21 보이스룸 ─────────────────────── */
  S.voiceRoom = function (q, id) {
    const v = DB.voice(id);
    if (!v) return SCREENS.notfound();
    if (!isVerified()) return { bar: { title: v.title, back: true, center: true }, tab: false, html: vipGate('보이스룸') };
    const host = DB.user(v.host);
    const speakers = ['u_bada','u_travel','u_bomnal'].map(u => DB.user(u));
    const listeners = ['u_latte','u_sky'].map(u => DB.user(u));

    const seat = (u, isHost) =>
      '<a class="seat" href="#/user/' + u.user_id + '" data-nav>' +
      '<div class="seat-av' + (isHost ? ' host' : '') + '">' + avatar(u) + '</div>' +
      '<b>' + esc(u.nickname) + '</b>' +
      '<span>' + (isHost ? '진행자' : '발언자') + '</span></a>';

    return { bar: { title: v.title, sub: '진행 중 · ' + (v.speakers + v.listeners) + '명 참여', back: true,
                    actions: [{ act:'voice-menu', icon:'⋮' }] },
      tab: false, html:
      '<div class="vhead"><span class="vlive">● LIVE</span>' +
        '<div class="vtopic2">' + esc(v.topic) + '</div>' +
        '<div class="vmeta">' + esc(v.access) + ' · ' + esc(v.started) + ' 시작</div></div>' +
      '<div class="sec-head"><h3>🎙 발언자 ' + v.speakers + '명</h3></div>' +
      '<div class="seats">' + seat(host, true) + speakers.map(u => seat(u, false)).join('') + '</div>' +
      '<div class="sec-head"><h3>👂 청취자 ' + v.listeners + '명</h3></div>' +
      '<div class="seats sm">' + listeners.map(u =>
        '<a class="seat" href="#/user/' + u.user_id + '" data-nav><div class="seat-av">' + avatar(u, 'sm') + '</div>' +
        '<b>' + esc(u.nickname) + '</b></a>').join('') +
        '<div class="seat"><div class="seat-av"><div class="avatar sm" style="background:#e3e8ef;color:var(--muted)">+' +
        (v.listeners - listeners.length) + '</div></div><b>더보기</b></div></div>' +
      '<div class="notice gray"><i>🔇</i><div>이 방은 녹음되지 않습니다. 차단한 회원과는 서로 음성·프로필이 보이지 않습니다.</div></div>' +
      '<div class="btn-bar">' +
        '<button class="btn line" style="flex:0 0 auto;padding:0 16px" data-act="voice-leave">나가기</button>' +
        '<button class="btn soft" data-act="voice-raise">🙋 발언 요청</button>' +
        '<button class="btn" style="flex:0 0 56px" data-act="voice-mic">🎤</button>' +
      '</div>' };
  };

  /* ── D13 회원 프로필 ───────────────────── */
  S.user = function (q, id) {
    const u = DB.user(id);
    if (!u) return SCREENS.notfound();
    const tags = ['시간 약속을 잘 지켜요','대화가 편안해요','분위기를 잘 살려요'];

    return { bar: { title: '회원 프로필', back: true, center: true,
                    actions: [{ act:'more-user-' + id, icon:'⋯' }] },
      tab: false, html:
      '<div class="uhead">' + avatar(u, 'lg') +
        '<div class="uname">' + esc(u.nickname) + '</div>' +
        '<div class="umeta">' + esc(u.region) + ' · ' + esc(u.age) +
        (u.grade === 'verified' ? ' · <span class="badge">돌싱 인증</span>' : '') + '</div>' +
        (u.bio ? '<p class="ubio">' + esc(u.bio) + '</p>' : '') +
      '</div>' +
      '<div class="ustats">' +
        '<div><b>' + u.manner + '</b><span>매너</span></div>' +
        '<div><b>' + u.meets + '</b><span>모임 참여</span></div>' +
        '<div><b>' + u.noshow + '</b><span>노쇼</span></div>' +
      '</div>' +
      '<div class="sec-head"><h3>받은 매너 태그</h3></div>' +
      '<div class="chips">' + tags.map(t => '<span class="chip sm">' + t + '</span>').join('') + '</div>' +
      '<div class="sec-head"><h3>관심사</h3></div>' +
      '<div class="chips">' + u.interests.map(t => {
          const mine = session().interests.indexOf(t) > -1;
          return '<span class="chip' + (mine ? ' on' : '') + '">' + t + (mine ? ' ✓' : '') + '</span>';
        }).join('') + '</div>' +
      '<div class="sec-head"><h3>공개한 정보</h3></div>' +
      '<div class="list">' +
        '<div class="row"><div class="row-main"><div class="row-title">자녀 정보</div></div><b>' + esc(u.kids) + '</b></div>' +
        '<div class="row"><div class="row-main"><div class="row-title">재혼 의향</div></div><b>' + esc(u.remarry) + '</b></div>' +
      '</div>' +
      '<div class="notice gray"><i>ℹ️</i><div>회원이 직접 공개를 선택한 항목만 표시됩니다. 상세 매너 점수 산식은 악용 방지를 위해 공개하지 않습니다.</div></div>' +
      '<div class="btn-bar">' +
        '<button class="btn line" data-act="follow-' + id + '">＋ 팔로우</button>' +
        '<button class="btn" data-act="dm-' + id + '">메시지 요청</button>' +
      '</div>' };
  };

  /* ── D14 관심사 친구추천 ───────────────── */
  S.people = function (q) {
    const tab = q.t || 'rec';
    const me = session();
    const all = Object.keys(DB.users).map(k => DB.users[k]).filter(u => u.grade !== 'admin');
    const scored = all.map(u => ({
      u, common: u.interests.filter(i => me.interests.indexOf(i) > -1).length
    })).sort((a, b) => b.common - a.common);

    return { bar: { title: '사람 찾기', back: true, center: true, actions: [{ act:'people-pref', icon:'⚙️' }] },
      tab: false, html:
      '<div class="segs">' + [['rec','추천'],['same','같은 모임'],['follow','팔로잉']].map(t =>
        '<a class="seg' + (t[0] === tab ? ' on' : '') + '" href="#/people?t=' + t[0] + '" data-nav>' + t[1] + '</a>').join('') +
      '</div>' +
      '<div class="chips">' + ['관심사 ▾','지역 ▾','연령대 ▾'].map(f =>
        '<button class="chip" data-sheet="filter">' + f + '</button>').join('') + '</div>' +
      '<div class="notice gray"><i>🤝</i><div>연애 매칭이 아니라 <b>함께 활동할 친구</b>를 추천합니다. 외모·소득 필터는 제공하지 않습니다.</div></div>' +
      '<div class="pgrid">' + scored.map(x =>
        '<a class="pcard" href="#/user/' + x.u.user_id + '" data-nav>' + avatar(x.u, 'lg') +
        '<b>' + esc(x.u.nickname) + '</b>' +
        '<span>' + esc(x.u.region) + ' · ' + esc(x.u.age) + '</span>' +
        '<span class="pcommon">' + (x.common ? '공통 관심사 ' + x.common + '개' : '모임 ' + x.u.meets + '회') +
        ' · 매너 ' + x.u.manner + '</span></a>').join('') + '</div>' +
      '<div class="sec" style="padding-top:14px">' +
        '<button class="btn line" data-act="people-pref">추천 기준 설정</button></div>' };
  };

})(window.SCREENS);
