/* D12 채팅 · D13 회원 프로필 · D14 관심사 친구추천 · D20 단체채팅 · D21 보이스룸 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const { esc, avatar, session, isVerified, isPhone, has } = UI;

  function vipGate (title) {
    return '<div class="hero-state"><div class="hero-ic">🔒</div>' +
      '<h3>' + esc(title) + '은(는) 정회원 전용이에요</h3>' +
      '<p>돌싱 인증을 마치면 대화 기능을 모두 이용할 수 있습니다.</p>' +
      '<button class="btn" style="max-width:260px;margin-top:18px" data-act="upgrade">정회원 인증 알아보기</button></div>';
  }

  /* ── 대화: 전체채팅 / 보이스룸 ─────────── */
  S.chats = function (q) {
    const tab = q.t === 'voice' && isPhone() ? 'voice' : 'chat';
    const bar = { title: '대화', actions: [{ act:'search', icon:'🔍' }, { act:'drawer', icon:'☰' }] };
    if (!isVerified()) return { bar, tab: 'chats', html: vipGate(isPhone() ? '단체채팅과 보이스룸' : '단체채팅') };

    const segs = '<div class="segs">' +
      (isPhone() ? ['chat','voice'] : ['chat']).map(k => '<a class="seg' + (k === tab ? ' on' : '') + '" href="#/chats?t=' + k + '" data-nav>' +
      (k === 'chat' ? '채팅' : '🎙 보이스룸') + '</a>').join('') + '</div>';

    if (tab === 'chat') {
      const out = S.chat(q, 'global');
      out.bar = bar;
      out.tab = 'chats';
      out.html = segs + out.html;
      return out;
    }

    const body = segs + '<div class="sec-head"><h3>진행 중인 방</h3></div>' +
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
    return { bar, tab: 'chats', html: body };
  };

  /* ── D12 / D20 채팅방 ──────────────────── */
  S.chat = function (q, id) {
    const c = DB.chat(id);
    if (!c) return SCREENS.notfound();
    if (!isVerified()) return { bar: { title: c.title, back: true, center: true }, tab: false, html: vipGate('단체채팅') };
    DB.readRoom(id);                       // 방에 들어오면 안 읽음 배지를 지웁니다

    if (has('leftRooms', id)) {
      return { bar: { title: c.title, back: true, center: true }, tab: false, html:
        '<div class="hero-state"><div class="hero-ic">🚪</div><h3>나간 대화방입니다</h3>' +
        '<p>다시 참여하면 이전 대화를 이어볼 수 있어요.</p>' +
        '<button class="btn" style="max-width:260px;margin-top:18px" data-act="do-leave-' + id + '">다시 참여하기</button></div>' };
    }
    if (c.peer && has('blocked', c.peer)) {
      return { bar: { title: c.title, back: true, center: true }, tab: false, html:
        '<div class="hero-state"><div class="hero-ic">🚫</div><h3>차단한 회원입니다</h3>' +
        '<p>차단을 해제하면 대화를 이어갈 수 있어요.</p>' +
        '<button class="btn line" style="max-width:260px;margin-top:18px" data-act="unblock-' + c.peer + '">차단 해제</button></div>' };
    }

    const global = id === 'global';
    /* 서버가 켜져 있으면 실제 대화만 보여줍니다. 목업 대화와 섞으면 무엇이 진짜인지 알 수 없습니다. */
    const msgs = SUPA.enabled ? '' : c.msgs.map(m => bubble(m, c)).join('');
    const serverNotice = global && !SUPA.enabled
      ? '<div class="notice warn"><i>⚠️</i><div><b>실시간 채팅 서버가 연결되지 않았습니다.</b><br>' +
        '현재 메시지는 이 기기에만 저장됩니다. 운영 전 Supabase 설정이 필요합니다.</div></div>'
      : '';

    return { bar: { title: c.title, sub: global ? '모든 정회원이 함께 대화 중' : (c.type === 'dm' ? '1:1 대화' : c.members + '명 참여'),
                    back: !global, actions: global ? [] : [{ act:'chat-menu-' + id, icon:'⋮' }] },
      tab: false, html:
      serverNotice +
      (c.notice
        ? '<button class="pinnotice" data-act="room-notice-' + id + '"><b>공지</b> ' + esc(c.notice) +
          '<span class="row-arrow">›</span></button>' : '') +
      (has('mutedRooms', id) ? '<div class="safebar">🔕 이 대화방의 알림을 껐습니다.</div>' : '') +
      '<div class="safebar">🛡️ 연락처·계좌번호 공유 요청과 불쾌한 메시지는 신고할 수 있습니다.</div>' +
      '<div class="msgs" id="msgs">' + (SUPA.enabled ? loading() : (msgs ||
        '<div class="empty" style="padding:44px"><b>💬</b>아직 대화가 없습니다.<br>먼저 인사를 건네보세요.</div>')) + '</div>' +
      '<div class="chat-bar">' +
        '<button class="cb-ic" data-act="chat-plus">＋</button>' +
        '<input class="inp" id="chat-input" placeholder="메시지 입력" enterkeyhint="send">' +
        (isPhone() && !global && c.type !== 'dm' ? '<button class="cb-ic" data-act="voice-open-' + id + '">🎤</button>' : '') +
        '<button class="cb-send" data-act="send-msg">↑</button>' +
      '</div>',
      after: function () {
        const box = UI.$('#msgs');
        if (box) box.scrollTop = box.scrollHeight;
        const inp = UI.$('#chat-input');
        if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
        if (SUPA.enabled) live(id, c);
      } };
  };

  const loading = () => '<div class="empty" style="padding:44px">대화를 불러오는 중…</div>';

  /* 말풍선 하나. 서버 메시지는 name 이 실려 오고, 목업 메시지는 user 로 회원을 찾습니다. */
  function bubble (m, c) {
    if (m.user === 'me') {
      return '<div class="msg me"><div class="bubble">' + esc(m.body) + '</div>' +
             '<span class="mtime">' + esc(m.at) + '</span></div>';
    }
    if (m.name) {
      const nick = m.name;
      return '<div class="msg">' + avatar({ nickname: nick, color: 'c4' }, 'sm') +
        '<div><div class="mname">' + esc(nick) + '</div>' +
        '<div class="bubble">' + esc(m.body) + '</div></div>' +
        '<span class="mtime">' + esc(m.at) + '</span></div>';
    }
    const u = DB.user(m.user);
    const first = c && c.msgs && c.msgs.length ? c.msgs[0].user : null;
    return '<div class="msg">' +
      '<a href="#/user/' + u.user_id + '" data-nav>' + avatar(u, 'sm') + '</a>' +
      '<div><div class="mname">' + esc(u.nickname) +
      (u.user_id === first && c.type !== 'dm' ? ' <span class="badge">모임장</span>' : '') + '</div>' +
      '<div class="bubble">' + esc(m.body) + '</div></div>' +
      '<span class="mtime">' + esc(m.at) + '</span></div>';
  }

  /* ── 실시간 연결 ───────────────────────
     방을 벗어나면 반드시 구독을 끊습니다 (app.js 의 render 가 leaveChat 을 부릅니다). */
  let unsub = null, liveRoom = null;
  S.leaveChat = function () { if (unsub) { unsub(); unsub = null; liveRoom = null; } };

  function live (id, c) {
    S.leaveChat();
    liveRoom = id;
    const paint = html => { const box = UI.$('#msgs');
                            if (box && liveRoom === id) { box.innerHTML = html; box.scrollTop = box.scrollHeight; } };

    SUPA.history(id).then(list => {
      if (liveRoom !== id) return;
      if (!list) {                                   // 서버에 못 닿음 — 목업으로 되돌립니다
        paint('<div class="notice warn" style="margin:10px 12px"><i>⚠️</i><div>' +
              '실시간 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.</div></div>' +
              c.msgs.map(m => bubble(m, c)).join(''));
        return;
      }
      paint(list.length ? list.map(m => bubble(m, c)).join('')
                        : '<div class="empty" style="padding:44px"><b>💬</b>아직 대화가 없습니다.<br>먼저 인사를 건네보세요.</div>');
      unsub = SUPA.subscribe(id, m => {
        if (liveRoom !== id || m.user === 'me') return;   // 내 메시지는 보낼 때 이미 붙였습니다
        append(bubble(m, c));
      });
    });
  }

  function append (html) {
    const box = UI.$('#msgs');
    if (!box) return;
    const empty = box.querySelector('.empty');
    if (empty) box.innerHTML = '';
    box.insertAdjacentHTML('beforeend', html);
    box.scrollTop = box.scrollHeight;
  }

  function sendMsg () {
    const inp = UI.$('#chat-input');
    if (!inp || !inp.value.trim()) return;
    const v = inp.value.trim();
    if (/\d{2,3}[- ]?\d{3,4}[- ]?\d{4}|\d{10,}/.test(v)) {
      UI.toast('전화번호·계좌번호로 보이는 내용이 감지되었습니다. 안전을 위해 확인해 주세요.');
    }
    const route = UI.parseHash();
    const id = route.name === 'chat' ? route.id : (route.name === 'chats' ? 'global' : null);
    if (!id) return;
    inp.value = '';

    if (SUPA.enabled) {
      SUPA.send(id, v, session().nickname).then(m => {
        if (!m) {
          inp.value = v;
          UI.toast('메시지를 보내지 못했습니다. 연결을 확인해 주세요.');
          return;
        }
        append(bubble(m, DB.chat(id)));
      });
      return;
    }
    /* 로컬 모드 — 화면에만 붙이면 방을 나갔다 오는 순간 사라지므로 먼저 저장합니다 */
    const m = DB.addMsg(id, v);
    if (m) append(bubble(m, DB.chat(id)));
  }
  S.sendMsg = sendMsg;

  /* ── D21 보이스룸 ─────────────────────── */
  S.voiceHand = false;
  S.voiceMic = false;

  S.voiceRoom = function (q, id) {
    const v = DB.voice(id);
    if (!v) return SCREENS.notfound();
    if (!isVerified()) return { bar: { title: v.title, back: true, center: true }, tab: false, html: vipGate('보이스룸') };
    const host = DB.user(v.host);
    const speakers = (v.speakerIds || []).map(u => DB.user(u));
    const listeners = (v.listenerIds || []).map(u => DB.user(u));
    const mine = v.host === 'u_me';

    const seat = (u, role) =>
      '<a class="seat" href="#/user/' + u.user_id + '" data-nav>' +
      '<div class="seat-av' + (role === '진행자' ? ' host' : '') + '">' + avatar(u) + '</div>' +
      '<b>' + esc(u.nickname) + '</b>' +
      '<span>' + role + '</span></a>';

    /* 마이크를 켜면 내 자리가 발언자 줄에 함께 보입니다 */
    const meSeat = S.voiceMic ? seat(DB.user('u_me'), '나 · 발언 중') : '';
    const hidden = Math.max(0, v.listeners - listeners.length);

    return { bar: { title: v.title, sub: '진행 중 · ' + (v.speakers + v.listeners) + '명 참여', back: true,
                    actions: [{ act:'voice-menu-' + id, icon:'⋮' }] },
      tab: false, html:
      '<div class="vhead"><span class="vlive">● LIVE</span>' +
        '<div class="vtopic2">' + esc(v.topic) + '</div>' +
        '<div class="vmeta">' + esc(v.access) + ' · ' + esc(v.started) + ' 시작' +
        (mine ? ' · 내가 개설' : '') + '</div></div>' +
      (S.voiceHand ? '<div class="notice"><i>🙋</i><div>발언을 요청했습니다. 진행자가 승인하면 마이크가 켜집니다.</div></div>' : '') +
      '<div class="sec-head"><h3>🎙 발언자 ' + (v.speakers + (S.voiceMic ? 1 : 0)) + '명</h3></div>' +
      '<div class="seats">' + seat(host, '진행자') +
        speakers.map(u => seat(u, '발언자')).join('') + meSeat + '</div>' +
      '<div class="sec-head"><h3>👂 청취자 ' + v.listeners + '명</h3></div>' +
      '<div class="seats sm">' + (listeners.length || hidden
        ? listeners.map(u =>
            '<a class="seat" href="#/user/' + u.user_id + '" data-nav><div class="seat-av">' + avatar(u, 'sm') + '</div>' +
            '<b>' + esc(u.nickname) + '</b></a>').join('') +
          (hidden ? '<div class="seat"><div class="seat-av"><div class="avatar sm" style="background:#e3e8ef;color:var(--muted)">+' +
            hidden + '</div></div><b>비공개</b></div>' : '')
        : '<div class="empty" style="padding:20px">아직 청취자가 없습니다.</div>') + '</div>' +
      '<div class="notice gray"><i>🔇</i><div>이 방은 녹음되지 않습니다. 차단한 회원과는 서로 음성·프로필이 보이지 않습니다.</div></div>' +
      '<div class="btn-bar">' +
        '<button class="btn line" style="flex:0 0 auto;padding:0 16px" data-act="voice-leave">나가기</button>' +
        '<button class="btn ' + (S.voiceHand ? '' : 'soft') + '" data-act="voice-raise">' +
          (S.voiceHand ? '🙋 요청 취소' : '🙋 발언 요청') + '</button>' +
        '<button class="btn' + (S.voiceMic ? '' : ' line') + '" style="flex:0 0 56px" data-act="voice-mic">' +
          (S.voiceMic ? '🎤' : '🔇') + '</button>' +
      '</div>' };
  };

  /* 보이스룸 개설 */
  S.voiceNew = function () {
    if (!isVerified()) return { bar: { title: '보이스룸 열기', back: true, center: true }, tab: false,
                                html: vipGate('보이스룸 개설') };
    return { bar: { title: '보이스룸 열기', back: true, center: true }, tab: false, html:
      '<div class="notice"><i>🎙</i><div>목소리로 편하게 이야기하는 방을 엽니다. 녹음은 하지 않습니다.</div></div>' +
      '<div class="field"><label>방 제목</label>' +
        '<input class="inp" id="v-title" placeholder="예) 밤 산책 수다방" maxlength="30"></div>' +
      '<div class="field"><label>주제</label>' +
        '<input class="inp" id="v-topic" placeholder="예) 퇴근 후 아무 이야기" maxlength="40"></div>' +
      '<div class="field"><label>공개 범위</label><div class="opts wrapopts" data-radio="vaccess">' +
        ['공개','그룹 전용'].map((o, i) => '<button class="opt' + (i === 0 ? ' on' : '') + '" data-val="' + o + '">' +
          o + '</button>').join('') + '</div></div>' +
      '<div class="btn-bar"><button class="btn" data-act="create-voice">방 열기</button></div>' };
  };

  /* ── D13 회원 프로필 ───────────────────── */
  S.user = function (q, id) {
    if (!DB.hasUser(id)) return SCREENS.notfound();
    const u = DB.user(id);
    const me = u.user_id === 'u_me';
    const blocked = has('blocked', id);
    const following = has('following', id);
    const tags = ['시간 약속을 잘 지켜요','대화가 편안해요','분위기를 잘 살려요'];

    if (blocked) {
      return { bar: { title: '회원 프로필', back: true, center: true }, tab: false, html:
        '<div class="hero-state"><div class="hero-ic">🚫</div><h3>차단한 회원입니다</h3>' +
        '<p>차단을 해제하면 다시 프로필을 볼 수 있어요.</p>' +
        '<button class="btn line" style="max-width:260px;margin-top:18px" data-act="unblock-' + id + '">차단 해제</button></div>' };
    }

    return { bar: { title: '회원 프로필', back: true, center: true,
                    actions: me ? [] : [{ act:'more-user-' + id, icon:'⋯' }] },
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
      '<div class="chips">' + (u.interests.length ? u.interests.map(t => {
          const same = session().interests.indexOf(t) > -1;
          return '<span class="chip' + (same ? ' on' : '') + '">' + esc(t) + (same ? ' ✓' : '') + '</span>';
        }).join('') : '<span style="font-size:13px;color:var(--muted)">등록한 관심사가 없습니다</span>') + '</div>' +
      '<div class="sec-head"><h3>공개한 정보</h3></div>' +
      '<div class="list">' +
        '<div class="row"><div class="row-main"><div class="row-title">자녀 정보</div></div><b>' + esc(u.kids) + '</b></div>' +
        '<div class="row"><div class="row-main"><div class="row-title">재혼 의향</div></div><b>' + esc(u.remarry) + '</b></div>' +
      '</div>' +
      '<div class="notice gray"><i>ℹ️</i><div>회원이 직접 공개를 선택한 항목만 표시됩니다. 상세 매너 점수 산식은 악용 방지를 위해 공개하지 않습니다.</div></div>' +
      '<div class="btn-bar">' + (me
        ? '<a class="btn" href="#/profile-edit" data-nav>내 프로필 편집</a>'
        : '<button class="btn' + (following ? '' : ' line') + '" data-act="follow-' + id + '">' +
          (following ? '✓ 팔로잉' : '＋ 팔로우') + '</button>' +
          '<button class="btn" data-act="dm-' + id + '">메시지 보내기</button>') +
      '</div>' };
  };

  /* ── D14 관심사 친구추천 ───────────────── */
  S.people = function (q) {
    const tab = q.t || 'rec';
    const me = session();
    const all = Object.keys(DB.users).map(k => DB.users[k])
                  .filter(u => u.grade !== 'admin' && !has('blocked', u.user_id));

    /* 같은 모임 = 내가 신청한 모임의 참가자·모임장 */
    const sameIds = {};
    (me.myMeets || []).forEach(id => {
      const m = DB.meeting(id);
      if (!m) return;
      (m.attendees || []).forEach(u => { sameIds[u] = 1; });
      if (m.host !== 'u_me') sameIds[m.host] = 1;
    });

    let list = all;
    if (tab === 'same')   list = all.filter(u => sameIds[u.user_id]);
    if (tab === 'follow') list = all.filter(u => has('following', u.user_id));
    if (q.i) list = list.filter(u => u.interests.indexOf(q.i) > -1);
    if (q.r) list = list.filter(u => u.region === q.r);
    if (q.a) list = list.filter(u => u.age === q.a);

    const scored = list.map(u => ({
      u: u, common: u.interests.filter(i => me.interests.indexOf(i) > -1).length
    })).sort((a, b) => (b.common - a.common) || (b.u.manner - a.u.manner));

    const emptyText = tab === 'same' ? '같은 모임에서 만난 회원이 아직 없습니다.'
                    : tab === 'follow' ? '팔로우한 회원이 없습니다.'
                    : '조건에 맞는 회원이 없습니다.';

    return { bar: { title: '사람 찾기', back: true, center: true, actions: [{ act:'people-pref', icon:'⚙️' }] },
      tab: false, html:
      '<div class="segs">' + [['rec','추천'],['same','같은 모임'],['follow','팔로잉']].map(t =>
        '<a class="seg' + (t[0] === tab ? ' on' : '') + '" href="#/people?t=' + t[0] + '" data-nav>' + t[1] + '</a>').join('') +
      '</div>' +
      UI.filterBar('people', q) +
      '<div class="notice gray"><i>🤝</i><div>연애 매칭이 아니라 <b>함께 활동할 친구</b>를 추천합니다. 외모·소득 필터는 제공하지 않습니다.</div></div>' +
      (scored.length
        ? '<div class="pgrid">' + scored.map(x =>
            '<a class="pcard" href="#/user/' + x.u.user_id + '" data-nav>' + avatar(x.u, 'lg') +
            '<b>' + esc(x.u.nickname) + (has('following', x.u.user_id) ? ' ✓' : '') + '</b>' +
            '<span>' + esc(x.u.region) + ' · ' + esc(x.u.age) + '</span>' +
            '<span class="pcommon">' + (x.common ? '공통 관심사 ' + x.common + '개' : '모임 ' + x.u.meets + '회') +
            ' · 매너 ' + x.u.manner + '</span></a>').join('') + '</div>'
        : '<div class="empty"><b>🔍</b>' + emptyText + '</div>') +
      '<div class="sec" style="padding-top:14px">' +
        '<button class="btn line" data-act="people-pref">추천 기준 설정</button></div>' };
  };

})(window.SCREENS);
