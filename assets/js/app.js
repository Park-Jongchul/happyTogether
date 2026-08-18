/* 라우터 · 이벤트 위임 · 앱 부팅
   해시 라우팅이라 GitHub Pages / file:// / 안드로이드 WebView 모두에서 동일하게 동작합니다.
   WebView의 하드웨어 뒤로가기는 history.back()으로 자연스럽게 연결됩니다. */
(function () {
  const { $, $$, go, session, set, toast, gate, esc } = UI;

  /* 경로 → 화면 매핑 */
  const ROUTES = {
    'home':         () => SCREENS.home,
    'search':       () => SCREENS.search,
    'noti':         () => SCREENS.noti,
    'login':        () => SCREENS.login,
    'verify':       () => SCREENS.verify,
    'review':       () => SCREENS.review,
    'profile':      () => SCREENS.profile,
    'profile-edit': () => SCREENS.profileEdit,
    'upgrade':      () => SCREENS.upgrade,
    'meetings':     () => SCREENS.meetings,
    'meeting':      () => SCREENS.meeting,
    'apply':        () => SCREENS.apply,
    'meeting-new':  () => SCREENS.meetingNew,
    'my-meetings':  () => SCREENS.myMeetings,
    'community':    () => SCREENS.community,
    'board':        () => SCREENS.board,
    'post':         () => SCREENS.post,
    'anon':         () => SCREENS.anon,
    'write':        () => SCREENS.write,
    'chats':        () => SCREENS.chats,
    'chat':         () => SCREENS.chat,
    'voice':        () => SCREENS.voiceRoom,
    'voice-new':    () => SCREENS.voiceNew,
    'user':         () => SCREENS.user,
    'people':       () => SCREENS.people,
    'my':           () => SCREENS.my,
    'report':       () => SCREENS.report,
    'privacy':      () => SCREENS.privacy,
    'settings':     () => SCREENS.settings,
    'payments':     () => SCREENS.payments,
    'about':        () => SCREENS.about
  };

  const parse = UI.parseHash;
  const withQuery = UI.withQuery;

  const scrollMem = {};
  let lastKey = '';

  function render () {
    if (SCREENS.leaveChat) SCREENS.leaveChat();   // 채팅방을 벗어나면 실시간 구독 해제
    /* 여러 단계 폼·작성 중인 글은 화면을 떠나기 전에 입력을 담아 둡니다 */
    (SCREENS.harvesters || []).forEach(fn => fn(lastKey));
    if (lastKey.indexOf('#/write') !== 0) confirmedPost = false;

    const r = parse();
    /* PC·태블릿 웹에서는 보이스룸 URL을 직접 열어도 대화 목록으로 돌려보냅니다. */
    if ((r.name === 'voice' || r.name === 'voice-new') && !UI.isPhone()) return go('#/chats');
    /* 보이스룸 목록은 대화 탭으로 흡수 */
    if (r.name === 'voice' && !r.id) return go('#/chats?t=voice');

    const factory = ROUTES[r.name];
    const fn = factory ? factory() : null;
    const out = fn ? fn(r.q, r.id) : SCREENS.notfound();

    UI.appbar(out.bar);
    UI.tabbar(out.tab === undefined ? false : out.tab);

    const view = $('#view');
    if (lastKey) scrollMem[lastKey] = window.scrollY || 0;
    view.innerHTML = out.html;
    lastKey = location.hash;
    /* 같은 화면을 다시 그릴 때(공감·저장 등) 보고 있던 위치를 지킵니다 */
    window.scrollTo(0, scrollMem[lastKey] || 0);
    if (out.after) out.after();

    UI.closeDrawer();
    UI.closeSheet();
    document.title = (out.bar && out.bar.title ? out.bar.title + ' · ' : '') + '행복하자 우리';
  }

  /* ── 입력값 읽기 ─────────────────────── */
  const val   = sel => { const el = $(sel); return el ? String(el.value == null ? '' : el.value).trim() : ''; };
  const pick  = k => { const g = $('[data-radio="' + k + '"] .opt.on') || $('[data-radio="' + k + '"] .chip.on');
                       return g ? g.dataset.val : ''; };
  const multi = k => $$('[data-multi="' + k + '"] .chip.on').map(b => b.dataset.val);

  /* ── 휴대폰 본인인증 (데모) ───────────────
     서버가 붙으면 sendCode → POST /auth/sms, checkCode → POST /auth/verify 로 바꿉니다.
     재요청 60초 · 5회 실패 시 10분 잠금은 화면 안내와 같은 규칙으로 실제 동작합니다. */
  const auth = { code:'', phone:'', sentAt:0, fails:0, lockUntil:0 };

  function sendCode () {
    const phone = val('#f-phone').replace(/[^0-9]/g, '');
    if (!/^01[016789]\d{7,8}$/.test(phone)) return toast('휴대폰 번호를 확인해 주세요. (예: 01012345678)');
    const wait = Math.ceil((auth.sentAt + 60000 - Date.now()) / 1000);
    if (auth.phone === phone && wait > 0) return toast('인증번호 재요청은 ' + wait + '초 후에 가능합니다.');
    auth.code = String(Math.floor(100000 + Math.random() * 900000));
    auth.phone = phone; auth.sentAt = Date.now(); auth.fails = 0; auth.lockUntil = 0;
    toast('인증번호를 발송했습니다. (데모 인증번호 ' + auth.code + ')');
  }

  function checkCode () {
    if (Date.now() < auth.lockUntil) {
      toast('5회 실패로 잠겼습니다. ' + Math.ceil((auth.lockUntil - Date.now()) / 60000) + '분 후 다시 시도해 주세요.');
      return false;
    }
    if (!auth.code) { toast('먼저 인증번호를 받아주세요.'); return false; }
    const v = val('#f-code');
    if (!/^\d{6}$/.test(v)) { toast('인증번호 6자리를 입력해 주세요.'); return false; }
    if (v !== auth.code) {
      auth.fails++;
      if (auth.fails >= 5) { auth.lockUntil = Date.now() + 600000; toast('인증번호를 5회 틀렸습니다. 10분간 잠깁니다.'); }
      else toast('인증번호가 일치하지 않습니다. (' + auth.fails + '/5)');
      return false;
    }
    set({ phone: auth.phone });
    auth.code = ''; auth.fails = 0;
    return true;
  }

  /* ── 파일 선택 ───────────────────────────
     사진은 프로필 아바타로 바로 반영하고, 증빙은 첨부한 파일명을 남깁니다. */
  function pickFile (el, isPhoto) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = isPhoto ? 'image/*' : 'image/*,.pdf';
    inp.className = 'filepick';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) return toast('8MB 이하 파일만 첨부할 수 있습니다.');
      if (isPhoto) {
        return UI.readFile(f).then(url => {
          set({ photo: url });
          toast('프로필 사진을 등록했습니다.');
          render();
        }).catch(() => toast('사진을 읽지 못했습니다. 다른 파일을 선택해 주세요.'));
      }
      set({ doc: f.name });
      if (el) el.innerHTML = '<b>✓</b>' + esc(f.name);
      toast('첨부했습니다. 주민등록번호·주소는 심사 시 가려집니다.');
    });
    inp.click();
  }

  /* ── 연락처 · 계좌번호 · SNS 아이디 검출 ─── */
  function contactRisk (text) {
    const t = String(text || '');
    if (/01[016789][-. ]?\d{3,4}[-. ]?\d{4}/.test(t))                 return '전화번호';
    if (/\d{2,3}-\d{2,6}-\d{2,6}/.test(t) || /\d{11,}/.test(t))       return '계좌번호';
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(t))             return '이메일 주소';
    if (/(카카오|카톡|kakao|인스타|instagram|텔레그램|telegram|라인|line)\s*(아이디|id)?\s*[:=]?\s*[a-z0-9._-]{3,}/i.test(t))
      return 'SNS 아이디';
    if (/(^|\s)@[a-z0-9._]{3,}/i.test(t))                             return 'SNS 아이디';
    return '';
  }
  let confirmedPost = false;

  /* ── 프로필 저장 ─────────────────────── */
  function saveProfile () {
    const nick = val('#f-nick');
    if (nick.length < 2 || nick.length > 12) { toast('닉네임은 2~12자로 입력해 주세요.'); return false; }
    if (contactRisk(nick) || /\d{4,}/.test(nick)) { toast('닉네임에 연락처·SNS 아이디는 쓸 수 없습니다.'); return false; }
    const bio = val('#f-bio');
    const risk = contactRisk(bio);
    if (risk) { toast('자기소개에 ' + risk + '는 넣을 수 없습니다.'); return false; }

    const patch = { nickname: nick, bio: bio, interests: multi('interests') };
    ['region','age','kids','remarry'].forEach(k => { const v = pick(k); if (v) patch[k] = v; });
    set(patch);
    return true;
  }

  /* ── 액션 핸들러 ─────────────────────── */
  const ACT = {
    search:  () => go('#/search'),
    drawer:  () => UI.openDrawer(),
    noti:    () => go('#/noti'),
    upgrade: () => go('#/upgrade'),

    /* 가입/로그인 */
    'go-join': () => go('#/login?tab=join'),
    sms:      () => sendCode(),
    'join-next': () => {
      const name = val('#f-name');
      if (!name) return toast('이름을 입력해 주세요.');
      if (!checkCode()) return;
      set({ grade: 'member', verifyStep: 0, name: name });
      toast('가입이 완료됐어요. 프로필을 만들어볼까요?'); go('#/profile');
    },
    'do-login':  () => { if (!checkCode()) return;
                         set({ grade: 'member' }); toast('로그인되었습니다.'); go('#/home'); },
    'kakao-login': () => { set({ grade: 'member' }); toast('카카오 계정으로 로그인되었습니다.'); go('#/home'); },
    'done-profile': () => { if (!saveProfile()) return;
                            set({ verifyStep: Math.max(session().verifyStep, 1) });
                            toast('프로필이 저장되었습니다.'); go('#/verify'); },
    'save-profile': () => { if (!saveProfile()) return; toast('저장되었습니다.'); UI.back(); },
    'submit-verify': () => {
      if (!pick('marital')) return toast('현재 혼인 상태를 선택해 주세요.');
      const method = pick('method');
      if (!method) return toast('인증 방법을 선택해 주세요.');
      if (method === '혼인관계증명서' && !session().doc) return toast('증빙 파일을 첨부해 주세요.');
      const a = val('#f-answer');
      if (a.length < 50) return toast('가입 질문 답변을 50자 이상 작성해 주세요. (현재 ' + a.length + '자)');
      const risk = contactRisk(a);
      if (risk) return toast('답변에 ' + risk + '가 들어 있습니다. 지우고 다시 제출해 주세요.');
      set({ verifyStep: 2, marital: pick('marital'), verifyMethod: method, answer: a });
      toast('심사 요청이 접수되었습니다.'); go('#/review');
    },
    'mock-approve': () => { set({ grade: 'verified', verifyStep: 3 }); toast('🎉 정회원으로 승인되었습니다!'); go('#/home'); },
    'verify-start': () => SCREENS.verifyStart(),
    upload:  el => pickFile(el, false),
    photo:   el => pickFile(el, true),

    /* 모임 */
    'new-meeting': () => { if (gate('verified', '모임 개설')) { SCREENS.meetDraft = {}; go('#/meeting-new'); } },
    'submit-meeting': () => {
      const d = SCREENS.meetDraft || {};
      const miss = !d.title ? '모임 제목' : !d.cat ? '카테고리' : !d.mregion ? '지역'
                 : !d.when ? '날짜·시간' : !d.place ? '장소' : !d.capacity ? '정원'
                 : !d.approval ? '승인 방식' : !d.refund ? '환불 규정' : !d.desc ? '상세 설명' : '';
      if (miss) return toast(miss + '을(를) 입력해 주세요. 이전 단계를 확인해 주세요.');
      if (Number(d.fee) > 0 && !d.feeUse) return toast('참가비 사용처를 적어주세요.');
      const m = SCREENS.buildMeeting(d);
      DB.addMeeting(m);
      SCREENS.meetDraft = {};
      toast('검수 요청이 접수되었습니다. 목록에 검수중으로 표시됩니다.');
      go('#/meeting/' + m.meeting_id);
    },

    /* 글쓰기 */
    write: () => {
      if (!gate('member', '글쓰기')) return;
      /* 지금 보고 있는 게시판을 글쓰기 화면의 기본 선택으로 넘깁니다 */
      const r = parse();
      const b = r.name === 'board' && r.id !== 'all' ? r.id : (r.q.c && r.q.c !== 'all' ? r.q.c : '');
      go('#/write' + (b ? '?b=' + encodeURIComponent(b) : ''));
    },
    'write-anon': () => {
      if (!gate('verified', '익명 글쓰기')) return;
      const ac = parse().q.ac;
      go('#/write?anon=1' + (ac && ac !== '전체' ? '&ac=' + encodeURIComponent(ac) : ''));
    },
    'submit-post': () => {
      const title = val('#w-title'), body = val('#w-body');
      if (!title) return toast('제목을 입력해 주세요.');
      if (!body)  return toast('내용을 입력해 주세요.');
      /* 글쓰기 화면이 안내한 대로 연락처·계좌번호·SNS 아이디를 등록 전에 검출합니다 */
      const risk = contactRisk(title + '\n' + body);
      if (risk && !confirmedPost) {
        confirmedPost = true;
        return toast(risk + '가 포함된 것 같습니다. 그대로 등록하시려면 한 번 더 눌러주세요.');
      }
      confirmedPost = false;
      const base = { post_id: DB.newId(), title: title, body: body,
                     likes: 0, comments: 0, at: '방금 전', ts: Date.now(), mine: true };

      if (parse().q.anon === '1') {
        const p = DB.addAnonPost(Object.assign(base, {
          anon_no: 10 + Math.floor(Math.random() * 90), cat: pick('wacat') || '감정회복' }));
        SCREENS.writeDraft = null;
        toast('익명으로 등록되었습니다.');
        return go('#/post/' + p.post_id);
      }
      const p = DB.addPost(Object.assign(base, {
        board_id: pick('wboard') || 'free', author: 'u_me', views: 0 }));
      SCREENS.writeDraft = null;
      toast('글이 등록되었습니다.');
      go('#/board/' + p.board_id);
    },
    'focus-comment': () => { const i = $('#cmt-input'); if (i) { i.focus(); i.scrollIntoView(); } },

    /* 신고 · 안심센터 */
    'submit-report': () => {
      const target = pick('rtarget'), type = pick('rtype'), body = val('#r-body');
      if (!target) return toast('신고 대상을 선택해 주세요.');
      if (!type)   return toast('신고 유형을 선택해 주세요.');
      if (body.length < 10) return toast('무슨 일이 있었는지 10자 이상 적어주세요.');
      const blockNow = $('[data-check="blocknow"]');
      const id = parse().q.id || '';
      const s = session();
      const reports = (s.reports || []).slice();
      reports.unshift({ id: DB.newId(), target: target, type: type, body: body, ref: id,
                        at: Date.now(), state: '접수' });
      const patch = { reports: reports };
      if (blockNow && blockNow.classList.contains('on') && id && DB.hasUser(id)) {
        patch.blocked = (s.blocked || []).concat((s.blocked || []).indexOf(id) > -1 ? [] : [id]);
      }
      set(patch);
      toast('신고가 접수되었습니다. 처리 결과는 알림으로 안내드립니다.');
      go('#/report?t=list');
    },
    'save-safe-contact': () => {
      const v = val('#sc-phone').replace(/[^0-9]/g, '');
      if (!/^0\d{8,10}$/.test(v)) return toast('연락처를 확인해 주세요. (예: 01012345678)');
      set({ safeContact: v });
      UI.closeSheet(); toast('안심 연락처를 저장했습니다.'); render();
    },
    'safe-checkin': () => {
      const s = session();
      if (!s.safeContact) return ACT['safe-contact']();
      toast('안심 연락처(' + s.safeContact.slice(-4) + ')로 도착 알림을 보냈습니다.');
    },
    'safe-contact': () => UI.sheet(
      '<div class="sh-head"><h3>안심 연락처</h3><p>모임 도착·귀가 상태를 이 번호에만 공유합니다.</p></div>' +
      '<div class="sh-body"><div class="field" style="padding:6px 0"><label>연락처</label>' +
      '<input class="inp" id="sc-phone" inputmode="numeric" placeholder="01012345678" value="' +
      esc(session().safeContact || '') + '"></div></div>' +
      '<div class="sh-foot"><button class="btn" data-act="save-safe-contact">저장</button>' +
      '<button class="btn ghost" data-close-sheet>취소</button></div>'),

    /* 대화 */
    'send-msg':   () => SCREENS.sendMsg(),
    'chat-plus':  () => UI.sheet(
      '<div class="sh-head"><h3>공유하기</h3><p>대화방에 간단한 안내를 보냅니다.</p></div>' +
      '<div class="sh-body">' +
      [['📍 장소 공유','장소를 공유했습니다: 여의나루역 2번 출구'],
       ['📅 일정 공유','일정을 공유했습니다: 모임 시작 30분 전 집합'],
       ['🖼 사진 보내기','']].map(o =>
        '<button class="row" style="padding-left:0;padding-right:0" data-act="share-' +
        encodeURIComponent(o[1]) + '"><div class="row-main"><div class="row-title">' + o[0] +
        '</div></div><span class="row-arrow">›</span></button>').join('') +
      '</div><div class="sh-foot"><button class="btn ghost" data-close-sheet>닫기</button></div>'),
    'new-voice':  () => { if (UI.isPhone() && gate('verified', '보이스룸 개설')) go('#/voice-new'); },
    'create-voice': () => {
      if (!UI.isPhone()) return;
      const title = val('#v-title'), topic = val('#v-topic');
      if (!title) return toast('방 제목을 입력해 주세요.');
      const v = DB.addVoice({ voice_room_id: 'v' + DB.newId(), host: 'u_me', title: title,
                              topic: topic || '자유 주제', state: 'live',
                              access: pick('vaccess') || '공개',
                              speakerIds: [], listenerIds: [], extra: 0,
                              started: new Date().getHours() + ':' + ('0' + new Date().getMinutes()).slice(-2),
                              mine: true });
      toast('보이스룸을 열었습니다.');
      go('#/voice/' + v.voice_room_id);
    },
    'voice-raise': () => { SCREENS.voiceHand = !SCREENS.voiceHand;
                          toast(SCREENS.voiceHand ? '🙋 발언을 요청했습니다. 진행자가 승인하면 마이크가 켜집니다.'
                                                  : '발언 요청을 취소했습니다.'); render(); },
    'voice-mic':  () => { SCREENS.voiceMic = !SCREENS.voiceMic;
                          toast(SCREENS.voiceMic ? '🎤 마이크를 켰습니다. (실제 음성 연결은 앱 빌드에서 동작합니다)'
                                                 : '마이크를 껐습니다.'); render(); },
    'voice-leave': () => { SCREENS.voiceHand = false; SCREENS.voiceMic = false;
                           toast('조용히 나왔습니다.'); UI.back(); },

    'anon-rule': () => UI.sheet(
      '<div class="sh-head"><h3>익명 운영수칙</h3></div><div class="sh-body">' +
      ['실명 · 연락처 · 직장명 · 자녀 학교 등 신원을 알 수 있는 정보는 쓸 수 없습니다.',
       '글마다 새로운 익명번호가 부여되어 글 사이의 신상 연결을 줄입니다.',
       '운영자는 신고 처리 목적에 한해서만 계정을 식별할 수 있고, 열람 기록이 남습니다.',
       '비방 · 특정인 저격 · 영업 글은 즉시 삭제됩니다.'].map(t =>
        '<div class="perk" style="align-items:flex-start"><i>·</i><div style="font-weight:500;font-size:13.5px;line-height:1.65">' + t + '</div></div>').join('') +
      '</div><div class="sh-foot"><button class="btn" data-close-sheet>확인</button></div>'),

    /* 사람 */
    'people-pref': () => UI.sheet(
      '<div class="sh-head"><h3>추천 기준 설정</h3><p>어떤 정보를 추천에 사용할지 선택하세요.</p></div>' +
      '<div class="sh-body">' + [['pref-region','활동 지역 범위', true], ['pref-age','연령대', true],
                                 ['pref-interest','관심사', true], ['pref-remarry','재혼 의향 정보 사용', false]].map(o =>
        '<div class="row" style="padding-left:0;padding-right:0"><div class="row-main">' +
        '<div class="row-title">' + o[1] + '</div></div>' +
        '<button class="switch' + (UI.setting(o[0], o[2]) ? ' on' : '') + '" data-switch="' + o[0] + '"></button></div>').join('') +
      '</div><div class="sh-foot"><button class="btn" data-close-sheet>적용</button></div>'),

    /* 필터 · 정렬 */
    'apply-filter': () => {
      const defs = UI.FILTERS[parse().name] || [];
      const patch = {};
      defs.forEach(d => { patch[d.key] = pick('f-' + d.key); });
      UI.closeSheet();
      go(withQuery(patch));
    },
    'clear-filter': () => {
      const defs = UI.FILTERS[parse().name] || [];
      const patch = {};
      defs.forEach(d => { patch[d.key] = ''; });
      UI.closeSheet();
      go(withQuery(patch));
    },

    /* 계정 */
    'reset-demo': () => { UI.reset(); DB.resetMine(); toast('데모 데이터를 초기화했습니다.'); go('#/home'); location.reload(); },
    withdraw: () => confirmSheet('회원 탈퇴', '작성한 글·댓글과 저장 목록이 모두 사라지며 되돌릴 수 없습니다.', 'do-withdraw', '탈퇴'),
    'do-withdraw': () => { UI.closeSheet(); UI.reset(); DB.resetMine();
                           toast('탈퇴 처리되었습니다. 그동안 함께해 주셔서 감사합니다.');
                           go('#/home'); location.reload(); },
    qclear:  () => go('#/search'),
    'clear-recent': () => { set({ recent: [] }); toast('최근 검색어를 모두 삭제했습니다.'); render(); },
    devices: () => {
      const ua = navigator.userAgent || '';
      const kind = /Android/i.test(ua) ? '안드로이드' : /iPhone|iPad/i.test(ua) ? 'iOS' : 'PC 브라우저';
      UI.sheet('<div class="sh-head"><h3>로그인 기기</h3><p>지금 로그인된 기기 목록입니다.</p></div>' +
        '<div class="sh-body">' +
        '<div class="row" style="padding-left:0;padding-right:0"><div class="row-main">' +
        '<div class="row-title">' + esc(kind) + ' <span class="badge ok">현재 기기</span></div>' +
        '<div class="row-meta">마지막 접속 · 방금 전</div></div></div>' +
        '</div><div class="sh-foot"><button class="btn ghost" data-close-sheet>닫기</button></div>');
    },
    'blocked-list': () => {
      const list = (session().blocked || []);
      UI.sheet('<div class="sh-head"><h3>차단 회원</h3><p>차단하면 서로의 글과 메시지가 보이지 않습니다.</p></div>' +
        '<div class="sh-body">' + (list.length ? list.map(id => {
          const u = DB.user(id);
          return '<div class="row" style="padding-left:0;padding-right:0"><div class="row-main">' +
            '<div class="row-title">' + esc(u.nickname) + '</div></div>' +
            '<button class="delbtn" data-act="unblock-' + id + '">차단 해제</button></div>';
        }).join('') : '<div class="empty" style="padding:26px">차단한 회원이 없습니다.</div>') +
        '</div><div class="sh-foot"><button class="btn ghost" data-close-sheet>닫기</button></div>');
    }
  };

  /* 삭제처럼 되돌릴 수 없는 동작 확인.
     확인 버튼에 data-close-sheet 을 달면 클릭이 시트 닫기에서 끝나므로 액션에서 닫습니다. */
  function confirmSheet (title, desc, act, label) {
    UI.sheet('<div class="sh-head"><h3>' + esc(title) + '</h3><p>' + esc(desc) + '</p></div>' +
      '<div class="sh-foot" style="flex-direction:row">' +
        '<button class="btn line" data-close-sheet>취소</button>' +
        '<button class="btn coral" data-act="' + act + '">' + esc(label || '삭제') + '</button></div>');
  }

  /* 시트 목록 — 각 줄에 실제 액션을 답니다 */
  function sheetList (title, items) {
    return '<div class="sh-head"><h3>' + esc(title) + '</h3></div><div class="sh-body">' +
      items.map(it => '<button class="row" style="padding-left:0;padding-right:0" data-act="' + esc(it[1]) + '">' +
        '<div class="row-main"><div class="row-title">' + esc(it[0]) + '</div></div>' +
        '<span class="row-arrow">›</span></button>').join('') +
      '</div><div class="sh-foot"><button class="btn ghost" data-close-sheet>닫기</button></div>';
  }

  /* 필터 시트 — 화면마다 다른 조건을 UI.FILTERS 정의에서 만듭니다 */
  function filterSheet () {
    const r = parse();
    const defs = UI.FILTERS[r.name] || [];
    if (!defs.length) return toast('이 화면에는 필터가 없습니다.');
    UI.sheet('<div class="sh-head"><h3>필터</h3><p>원하는 조건을 선택하세요. 다시 누르면 해제됩니다.</p></div>' +
      '<div class="sh-body">' + defs.map(d =>
        '<div class="field" style="padding:8px 0"><label>' + esc(d.label) + '</label>' +
        '<div class="opts wrapopts" data-radio="f-' + d.key + '">' + d.opts().map(o =>
          '<button class="opt' + (r.q[d.key] === o ? ' on' : '') + '" data-val="' + esc(o) + '">' +
          esc(o) + '</button>').join('') + '</div></div>').join('') +
      '</div><div class="sh-foot"><button class="btn" data-act="apply-filter">적용하기</button>' +
      '<button class="btn ghost" data-act="clear-filter">초기화</button></div>');
  }

  /* ── 접두사 액션 (id 포함) ───────────────── */
  function prefixAct (act) {
    const after = pre => act.slice(pre.length);
    const is = pre => act.indexOf(pre) === 0;

    /* 모임 */
    if (is('fav-')) {
      const id = after('fav-');
      if (!gate('member', '찜하기')) return true;
      toast(UI.toggle('favMeets', id) ? '♥ 찜한 모임에 저장했습니다.' : '찜을 해제했습니다.');
      render(); return true;
    }
    if (is('join-meeting-')) {
      const id = after('join-meeting-');
      if (!gate('verified', '모임 참가 신청')) return true;
      const m = DB.meeting(id);
      if (!m) return true;
      if (DB.isPast(m)) { toast('이미 지난 모임입니다.'); return true; }
      if (DB.isFull(m)) {
        confirmSheet('정원이 찼습니다', '대기 신청을 하면 자리가 생길 때 알림을 보내드립니다.', 'wait-' + id, '대기 신청');
        return true;
      }
      go('#/apply/' + id); return true;
    }
    if (is('wait-')) {
      const id = after('wait-');
      UI.closeSheet();
      toast(UI.toggle('waitMeets', id) ? '대기 신청이 접수되었습니다.' : '대기 신청을 취소했습니다.');
      render(); return true;
    }
    if (is('pay-')) {
      const id = after('pay-');
      const okBox = $('[data-check="refund"]');
      if (okBox && !okBox.classList.contains('on')) { toast('환불 규정 확인에 동의해 주세요.'); return true; }
      const m = DB.meeting(id);
      if (!m) return true;
      const s = session();
      if (m.fee > 0) {
        const method = pick('pay');
        if (!method) { toast('결제수단을 선택해 주세요.'); return true; }
        const amount = m.fee + Math.round(m.fee * 0.05);
        const pays = (s.pays || []).slice();
        pays.unshift({ id: DB.newId(), meeting: id, title: m.title, amount: amount,
                       method: method, at: Date.now(), state: '결제 완료' });
        set({ pays: pays });
      }
      if ((s.myMeets || []).indexOf(id) < 0) UI.toggle('myMeets', id);
      if (UI.has('waitMeets', id)) UI.toggle('waitMeets', id);    // 대기 중이었다면 해제
      toast(m.approval === '승인형' ? '신청이 접수되었습니다. 모임장 승인을 기다려 주세요.' : '🎉 참가가 확정되었습니다!');
      go('#/meeting/' + id); return true;
    }
    if (is('cancel-meet-')) {
      const id = after('cancel-meet-');
      confirmSheet('참가를 취소할까요?', '환불 규정에 따라 처리되며, 반복되는 노쇼는 참가가 제한될 수 있습니다.',
                   'do-cancel-' + id, '참가 취소');
      return true;
    }
    if (is('do-cancel-')) {
      const id = after('do-cancel-');
      UI.closeSheet();
      const s = session();
      if ((s.myMeets || []).indexOf(id) > -1) UI.toggle('myMeets', id);
      toast('참가를 취소했습니다.'); render(); return true;
    }
    if (is('review-meet-')) {
      const id = after('review-meet-');
      const m = DB.meeting(id);
      UI.sheet('<div class="sh-head"><h3>후기 남기기</h3><p>' + esc(m ? m.title : '') + '</p></div>' +
        '<div class="sh-body"><div class="field" style="padding:6px 0"><label>매너 평가</label>' +
        '<div class="opts" data-radio="rv">' + ['좋았어요','보통이에요','아쉬웠어요'].map(o =>
          '<button class="opt" data-val="' + o + '">' + o + '</button>').join('') + '</div></div>' +
        '<div class="field" style="padding:6px 0"><label>한 줄 후기</label>' +
        '<input class="inp" id="rv-body" placeholder="다른 회원에게 도움이 될 한 줄을 남겨주세요"></div></div>' +
        '<div class="sh-foot"><button class="btn" data-act="do-review-' + id + '">후기 등록</button>' +
        '<button class="btn ghost" data-close-sheet>취소</button></div>');
      return true;
    }
    if (is('do-review-')) {
      const id = after('do-review-');
      const grade = pick('rv');
      if (!grade) { toast('매너 평가를 선택해 주세요.'); return true; }
      const reviews = (session().reviews || []).slice();
      reviews.unshift({ meeting: id, grade: grade, body: val('#rv-body'), at: Date.now() });
      set({ reviews: reviews });
      UI.closeSheet(); toast('후기를 등록했습니다. 감사합니다!'); render(); return true;
    }

    /* 결제 · 환불 */
    if (is('refund-')) {
      confirmSheet('환불을 요청할까요?', '모임의 환불 규정에 따라 처리되며, 결과는 알림으로 안내드립니다.',
                   'do-refund-' + after('refund-'), '환불 요청');
      return true;
    }
    if (is('do-refund-')) {
      const id = after('do-refund-');
      UI.closeSheet();
      const pays = (session().pays || []);
      if (pays.some(p => p.id === id)) {
        set({ pays: pays.map(p => p.id === id ? Object.assign({}, p, { state: '환불 요청' }) : p) });
      } else {
        UI.toggle('refundReq', id);        // 예시로 들어 있는 지난 결제 건
      }
      toast('환불 요청이 접수되었습니다.');
      render(); return true;
    }

    /* 글 · 댓글 */
    if (is('like-')) {
      const id = after('like-');
      if (!gate('member', '공감')) return true;
      UI.toggle('liked', id); render(); return true;
    }
    if (is('save-')) {
      const id = after('save-');
      if (!gate('member', '저장')) return true;
      toast(UI.toggle('saved', id) ? '🔖 저장했습니다.' : '저장을 해제했습니다.');
      render(); return true;
    }
    if (is('hide-')) {
      const id = after('hide-');
      UI.closeSheet();
      const on = UI.toggle('hidden', id);
      toast(on ? '이 글을 숨겼습니다.' : '숨김을 해제했습니다.');
      if (on && parse().name === 'post') UI.back();
      else render();
      return true;
    }
    if (is('del-post-')) {
      confirmSheet('이 글을 삭제할까요?', '글에 달린 댓글도 함께 사라지며 되돌릴 수 없습니다.', 'rm-post-' + after('del-post-'));
      return true;
    }
    if (is('rm-post-')) {
      const id = after('rm-post-');
      UI.closeSheet();
      const gone = DB.delPost(id);
      toast(gone ? '글을 삭제했습니다.' : '내가 쓴 글만 삭제할 수 있습니다.');
      if (gone && parse().name === 'post') go('#/community');
      else render();
      return true;
    }
    if (is('del-cmt-')) {
      confirmSheet('이 댓글을 삭제할까요?', '되돌릴 수 없습니다.', 'rm-cmt-' + after('del-cmt-'));
      return true;
    }
    if (is('rm-cmt-')) {
      UI.closeSheet();
      const rest = after('rm-cmt-'), k = rest.lastIndexOf('-');
      toast(DB.delComment(rest.slice(0, k), +rest.slice(k + 1)) ? '댓글을 삭제했습니다.' : '삭제할 수 없는 댓글입니다.');
      render(); return true;
    }
    if (is('send-comment-')) {
      const id = after('send-comment-');
      if (!gate('member', '댓글 작성')) return true;
      const i = $('#cmt-input');
      if (!i || !i.value.trim()) { toast('댓글을 입력해 주세요.'); return true; }
      if (/(씨발|병신|바보|꺼져)/.test(i.value)) { toast('공격적인 표현이 감지되었습니다. 문장을 확인해 주세요.'); return true; }
      const risk = contactRisk(i.value);
      if (risk) { toast('댓글에 ' + risk + '는 남길 수 없습니다.'); return true; }
      DB.addComment(id, { user:'u_me', body: i.value.trim(), at:'방금 전', ts: Date.now(), likes: 0, mine: true });
      i.value = ''; toast('댓글을 등록했습니다.'); render(); return true;
    }
    if (is('cmt-like-')) {
      if (!gate('member', '공감')) return true;
      UI.toggle('cmtLiked', after('cmt-like-')); render(); return true;
    }
    if (is('cmt-reply-')) {
      if (!gate('member', '답글 작성')) return true;
      const nick = decodeURIComponent(after('cmt-reply-'));
      const i = $('#cmt-input');
      if (i) { i.value = '@' + nick + ' '; i.focus(); i.scrollIntoView(); }
      return true;
    }
    if (is('copy-')) {
      const url = location.href.split('#')[0] + decodeURIComponent(after('copy-'));
      UI.closeSheet();
      UI.copy(url).then(() => toast('링크를 복사했습니다.')).catch(() => toast('복사하지 못했습니다: ' + url));
      return true;
    }
    if (is('share-')) {
      const msg = decodeURIComponent(after('share-'));
      UI.closeSheet();
      if (!msg) { toast('사진 전송은 앱 빌드에서 갤러리와 연결됩니다.'); return true; }
      const room = parse().id;
      if (room && DB.addMsg(room, msg)) { render(); toast('공유했습니다.'); }
      return true;
    }

    /* 회원 */
    if (is('follow-')) {
      const id = after('follow-');
      if (!gate('member', '팔로우')) return true;
      toast(UI.toggle('following', id) ? '팔로우했습니다.' : '팔로우를 해제했습니다.');
      render(); return true;
    }
    if (is('dm-')) {
      const id = after('dm-');
      if (!gate('verified', '1:1 메시지')) return true;
      if (!DB.hasUser(id)) return true;
      const room = DB.dmRoom(id);
      toast('대화방을 열었습니다.');
      go('#/chat/' + room.room_id); return true;
    }
    if (is('block-')) {
      const id = after('block-');
      UI.closeSheet();
      const on = UI.toggle('blocked', id);
      toast(on ? '차단했습니다. 서로의 글과 메시지가 보이지 않습니다.' : '차단을 해제했습니다.');
      if (on && parse().name === 'user') UI.back();
      else render();
      return true;
    }
    if (is('unblock-')) {
      const id = after('unblock-');
      UI.toggle('blocked', id);
      toast('차단을 해제했습니다.');
      ACT['blocked-list'](); return true;
    }

    /* 대화방 */
    if (is('mute-')) {
      const id = after('mute-');
      UI.closeSheet();
      toast(UI.toggle('mutedRooms', id) ? '이 대화방의 알림을 껐습니다.' : '알림을 다시 켰습니다.');
      render(); return true;
    }
    if (is('leave-')) {
      confirmSheet('대화방을 나갈까요?', '나가면 목록에서 사라지고 새 메시지를 받지 않습니다.',
                   'do-leave-' + after('leave-'), '나가기');
      return true;
    }
    if (is('do-leave-')) {
      const id = after('do-leave-');
      UI.closeSheet();
      UI.toggle('leftRooms', id);
      toast('대화방을 나왔습니다.');
      go('#/chats'); return true;
    }
    if (is('members-')) {
      const c = DB.chat(after('members-'));
      if (!c) return true;
      const ids = (c.msgs || []).map(m => m.user).filter(u => u && u !== 'me')
                    .filter((v, i, a) => a.indexOf(v) === i);
      UI.sheet('<div class="sh-head"><h3>참여자 ' + c.members + '명</h3>' +
        '<p>공개 동의한 회원만 표시됩니다.</p></div><div class="sh-body">' +
        ids.map(id => { const u = DB.user(id);
          return '<a class="row" style="padding-left:0;padding-right:0" href="#/user/' + id + '" data-nav data-close-sheet>' +
            UI.avatar(u, 'sm') + '<div class="row-main"><div class="row-title">' + esc(u.nickname) + '</div>' +
            '<div class="row-meta">' + esc(u.region) + ' · 매너 ' + u.manner + '</div></div>' +
            '<span class="row-arrow">›</span></a>'; }).join('') +
        (c.members > ids.length ? '<div class="row" style="padding-left:0;padding-right:0"><div class="row-main">' +
          '<div class="row-title">비공개 ' + (c.members - ids.length) + '명</div></div></div>' : '') +
        '</div><div class="sh-foot"><button class="btn ghost" data-close-sheet>닫기</button></div>');
      return true;
    }
    if (is('room-notice-')) {
      const c = DB.chat(after('room-notice-'));
      UI.sheet('<div class="sh-head"><h3>고정 공지</h3></div><div class="sh-body">' +
        '<div class="proseblk" style="margin:0">' + esc((c && c.notice) || '고정된 공지가 없습니다.') + '</div>' +
        '</div><div class="sh-foot"><button class="btn" data-close-sheet>확인</button></div>');
      return true;
    }
    if (is('voice-open-')) {
      if (!UI.isPhone()) return true;
      const c = DB.chat(after('voice-open-'));
      if (!gate('verified', '보이스룸')) return true;
      if (!c) return true;
      const v = c.voice && DB.voice(c.voice);
      if (v) return go('#/voice/' + v.voice_room_id), true;
      const made = DB.addVoice({ voice_room_id: 'v' + DB.newId(), host: 'u_me',
                                 title: c.title + ' 보이스룸', topic: '대화방에서 바로 열었어요',
                                 state: 'live', access: '그룹 전용',
                                 speakerIds: [], listenerIds: [], extra: 0,
                                 started: new Date().getHours() + ':' + ('0' + new Date().getMinutes()).slice(-2),
                                 mine: true });
      c.voice = made.voice_room_id;
      toast('보이스룸을 열었습니다.');
      go('#/voice/' + made.voice_room_id); return true;
    }
    if (is('voice-menu-')) {
      const id = after('voice-menu-');
      UI.sheet(sheetList('보이스룸 메뉴', [
        ['방 정보', 'voice-info-' + id],
        ['발언 요청', 'voice-raise'],
        ['신고하기', 'report-voice-' + id]
      ]));
      return true;
    }
    if (is('voice-info-')) {
      const v = DB.voice(after('voice-info-'));
      if (!v) return true;
      UI.sheet('<div class="sh-head"><h3>' + esc(v.title) + '</h3><p>' + esc(v.topic) + '</p></div>' +
        '<div class="sh-body">' +
        [['진행자', DB.user(v.host).nickname], ['공개 범위', v.access], ['시작 시각', v.started],
         ['참여', '발언 ' + v.speakers + '명 · 청취 ' + v.listeners + '명']].map(r =>
          '<div class="inforow"><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>').join('') +
        '</div><div class="sh-foot"><button class="btn" data-close-sheet>확인</button></div>');
      return true;
    }

    /* 더보기 · 신고 */
    if (is('more-post-')) {
      const id = after('more-post-');
      const p = DB.post(id) || {};
      const items = [['신고하기', 'report-post-' + id]];
      if (p.author && p.author !== 'u_me') items.push(['이 회원 차단하기', 'block-' + p.author]);
      items.push(['이 글 숨기기', 'hide-' + id]);
      items.push(['링크 복사', 'copy-' + encodeURIComponent('#/post/' + id)]);
      if (p.mine) items.push(['글 삭제', 'del-post-' + id]);
      UI.sheet(sheetList('더보기', items)); return true;
    }
    if (is('more-user-')) {
      const id = after('more-user-');
      UI.sheet(sheetList('더보기', [
        ['신고하기', 'report-user-' + id],
        ['차단하기', 'block-' + id],
        ['링크 복사', 'copy-' + encodeURIComponent('#/user/' + id)]
      ]));
      return true;
    }
    if (is('more-meeting-')) {
      const id = after('more-meeting-');
      const m = DB.meeting(id) || {};
      const items = [['모임 신고', 'report-meeting-' + id]];
      if (m.host && m.host !== 'u_me') items.push(['모임장 차단', 'block-' + m.host]);
      items.push(['링크 복사', 'copy-' + encodeURIComponent('#/meeting/' + id)]);
      if ((session().myMeets || []).indexOf(id) > -1) items.push(['참가 취소', 'cancel-meet-' + id]);
      UI.sheet(sheetList('더보기', items)); return true;
    }
    if (is('chat-menu-')) {
      const id = after('chat-menu-');
      const muted = UI.has('mutedRooms', id);
      UI.sheet(sheetList('채팅방 메뉴', [
        ['참여자 목록', 'members-' + id],
        ['고정 공지', 'room-notice-' + id],
        [muted ? '알림 켜기' : '알림 끄기', 'mute-' + id],
        ['신고하기', 'report-room-' + id],
        ['채팅방 나가기', 'leave-' + id]
      ]));
      return true;
    }
    if (is('report-')) {
      const rest = after('report-');
      const k = rest.indexOf('-');
      const kind = k < 0 ? rest : rest.slice(0, k);
      const id = k < 0 ? '' : rest.slice(k + 1);
      const label = { post:'게시글', user:'회원', meeting:'모임', room:'채팅', cmt:'댓글', voice:'보이스룸' }[kind] || '기타';
      UI.closeSheet();
      UI.reportSheet(label, id);
      return true;
    }
    return false;
  }

  /* ── 전역 클릭 위임 ──────────────────── */
  document.addEventListener('click', function (e) {
    const t = e.target;

    const closeS = t.closest('[data-close-sheet]');
    if (closeS) { UI.closeSheet(); if (!closeS.hasAttribute('data-nav') && !closeS.hasAttribute('data-act')) return; }
    const closeD = t.closest('[data-close-drawer]');
    if (closeD) { UI.closeDrawer(); return; }

    const nav = t.closest('a[data-nav]');
    if (nav) { UI.closeDrawer(); UI.closeSheet(); return; }

    if (t.closest('[data-back]')) { e.preventDefault(); UI.back(); return; }
    if (t.closest('[data-logout]')) {
      UI.reset(); UI.closeDrawer(); toast('로그아웃되었습니다.'); go('#/home');
      setTimeout(render, 0); return;
    }

    const vip = t.closest('[data-vip]');
    if (vip) {
      const href = vip.dataset.vip;
      UI.closeDrawer();
      if (gate('verified', vip.textContent.replace(/[🔒정회원\s]/g, ''))) go(href);
      return;
    }

    const join = t.closest('[data-join]');
    if (join) { UI.closeSheet(); go('#/login?tab=join'); return; }
    if (t.closest('[data-verify-start]')) { SCREENS.verifyStart(); return; }

    const chk = t.closest('[data-check]');
    if (chk) {
      chk.classList.toggle('on');
      const nx = $('#btn-next'), all = $('[data-check="agree-all"]');
      if (nx && all) {
        nx.disabled = !all.classList.contains('on');
        /* 필수 약관에 동의하면 '다음' 버튼을 바로 보여줍니다 */
        if (!nx.disabled) {
          try { nx.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
          catch (err) { nx.scrollIntoView(); }
        }
      }
      return;
    }

    /* 스위치 — data-switch 에 키가 있으면 설정으로 저장합니다 */
    const sw = t.closest('[data-switch]');
    if (sw) {
      sw.classList.toggle('on');
      const key = sw.dataset.switch;
      if (key) UI.setSetting(key, sw.classList.contains('on'));
      return;
    }

    const opt = t.closest('[data-radio] .opt, [data-radio] .chip');
    if (opt) {
      const box = opt.closest('[data-radio]');
      /* 필터(f-…)는 같은 값을 다시 누르면 해제됩니다. 폼 항목은 항상 하나가 선택된 상태를 지킵니다. */
      const unset = opt.classList.contains('on') && box.dataset.radio.indexOf('f-') === 0;
      $$('.opt, .chip', box).forEach(b => b.classList.remove('on'));
      if (!unset) opt.classList.add('on');
      return;
    }
    const multiBtn = t.closest('[data-multi] .chip');
    if (multiBtn) { multiBtn.classList.toggle('on'); return; }

    /* 항목별 공개범위 — 고른 값을 그 항목에 저장합니다 */
    const vis = t.closest('[data-vis]');
    if (vis) {
      const key = vis.dataset.vis;
      UI.sheet('<div class="sh-head"><h3>공개범위</h3><p>이 항목을 누구에게 보여줄지 선택하세요.</p></div>' +
        '<div class="sh-body">' + ['전체 공개','정회원에게만','같은 모임 참가자만','비공개'].map(o =>
          '<button class="row" style="padding-left:0;padding-right:0" data-vis-set="' + esc(key) + '|' + esc(o) + '">' +
          '<div class="row-main"><div class="row-title">' + o + '</div></div>' +
          (UI.visOf(key) === o ? '<span class="badge ok">현재</span>' : '') + '</button>').join('') +
        '</div>');
      return;
    }
    const visSet = t.closest('[data-vis-set]');
    if (visSet) {
      const parts = visSet.dataset.visSet.split('|');
      UI.setVis(parts[0], parts[1]);
      UI.closeSheet(); toast('공개범위를 ‘' + parts[1] + '’로 저장했습니다.'); render();
      return;
    }

    const sh = t.closest('[data-sheet]');
    if (sh) {
      if (sh.dataset.sheet === 'sort') {
        const r = parse();
        UI.sheet('<div class="sh-head"><h3>정렬</h3></div><div class="sh-body">' +
          [['new','최신순'],['cmt','댓글순'],['view','조회순']].map(o =>
            '<a class="row" style="padding-left:0;padding-right:0" href="' + withQuery({ sort: o[0] }) + '" data-nav data-close-sheet>' +
            '<div class="row-main"><div class="row-title">' + o[1] + '</div></div>' +
            ((r.q.sort || 'new') === o[0] ? '<span class="badge ok">현재</span>' : '') + '</a>').join('') + '</div>');
      } else {
        filterSheet();
      }
      return;
    }

    const a = t.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      /* 이름이 정해진 액션이 먼저입니다.
         'save-profile' 처럼 접두사 액션('save-<글id>')과 글자가 겹치는 경우가 있습니다. */
      if (ACT[act]) { ACT[act](a, act); return; }
      if (prefixAct(act)) return;
    }
  });

  /* ── 소프트 키보드 대응 ────────────────
     키보드가 떠도 창이 줄지 않는 환경(모바일 브라우저 · edge-to-edge 웹뷰)에서는
     화면 아래쪽 버튼이 키보드에 가려지고 더 내려갈 여백도 없습니다.
     키보드 높이를 --kb 로 넘겨 그만큼 스크롤 여유를 만듭니다.
     창이 실제로 줄어드는 환경에서는 값이 0 이 되므로 여백이 중복되지 않습니다. */
  function trackKeyboard () {
    const vv = window.visualViewport;
    if (!vv) return;
    let cur = 0;
    const apply = () => {
      let kb = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      if (kb < 100) kb = 0;                      // 주소창 높이 변화 등은 무시
      if (Math.abs(kb - cur) < 8) return;
      cur = kb;
      document.documentElement.style.setProperty('--kb', kb + 'px');
    };
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    apply();
  }

  /* 입력칸을 누르면 키보드에 가리지 않도록 화면 가운데로 */
  document.addEventListener('focusin', function (e) {
    const el = e.target;
    if (!el || !el.matches || !el.matches('input, textarea')) return;
    setTimeout(() => {
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      catch (err) { el.scrollIntoView(); }
    }, 320);
  });

  /* ── 부팅 ────────────────────────────── */
  window.addEventListener('hashchange', render);

  function boot () {
    if (!location.hash) location.replace('#/home');
    render();
    $('#app').hidden = false;
    trackKeyboard();
    /* D01: 로딩 완료 후 즉시 메인 ‘전체’ 탭. 가입 화면은 자동 노출하지 않음 */
    setTimeout(() => {
      $('#splash').classList.add('done');
      setTimeout(() => { const s = $('#splash'); if (s) s.remove(); }, 500);
    }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
