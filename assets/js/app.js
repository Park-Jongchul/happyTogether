/* 라우터 · 이벤트 위임 · 앱 부팅
   해시 라우팅이라 GitHub Pages / file:// / 안드로이드 WebView 모두에서 동일하게 동작합니다.
   WebView의 하드웨어 뒤로가기는 history.back()으로 자연스럽게 연결됩니다. */
(function () {
  const { $, $$, go, session, set, toast, gate } = UI;

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
    'user':         () => SCREENS.user,
    'people':       () => SCREENS.people,
    'my':           () => SCREENS.my,
    'report':       () => SCREENS.report,
    'privacy':      () => SCREENS.privacy,
    'settings':     () => SCREENS.settings,
    'payments':     () => SCREENS.payments,
    'about':        () => SCREENS.about
  };

  function parse () {
    const raw = (location.hash || '#/home').replace(/^#\/?/, '');
    const [path, search] = raw.split('?');
    const seg = path.split('/').filter(Boolean);
    const q = {};
    (search || '').split('&').forEach(kv => {
      if (!kv) return;
      const i = kv.indexOf('=');
      const k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i));
      q[k] = decodeURIComponent(i < 0 ? '' : kv.slice(i + 1));
    });
    return { name: seg[0] || 'home', id: seg[1], q };
  }

  const scrollMem = {};
  let lastKey = '';

  function render () {
    const r = parse();
    /* 보이스룸 목록은 대화 탭으로 흡수 */
    if (r.name === 'voice' && !r.id) return go('#/chats?t=voice');

    const factory = ROUTES[r.name];
    const fn = factory ? factory() : null;
    const out = fn ? fn(r.q, r.id) : SCREENS.notfound();

    UI.appbar(out.bar);
    UI.tabbar(out.tab === undefined ? false : out.tab);

    const view = $('#view');
    scrollMem[lastKey] = view.scrollTop || window.scrollY;
    view.innerHTML = out.html;
    lastKey = location.hash;
    window.scrollTo(0, 0);
    if (out.after) out.after();

    UI.closeDrawer();
    UI.closeSheet();
    document.title = (out.bar && out.bar.title ? out.bar.title + ' · ' : '') + '행복하자 우리';
  }

  /* ── 액션 핸들러 ─────────────────────── */
  const ACT = {
    search:  () => go('#/search'),
    drawer:  () => UI.openDrawer(),
    noti:    () => go('#/noti'),
    upgrade: () => go('#/upgrade'),

    /* 가입/로그인 */
    sms:     () => toast('인증번호를 발송했습니다. (데모: 아무 6자리나 입력하세요)'),
    'join-next': () => { set({ grade: 'member', verifyStep: 0 }); toast('가입이 완료됐어요. 프로필을 만들어볼까요?'); go('#/profile'); },
    'do-login':  () => { set({ grade: 'member' }); toast('로그인되었습니다.'); go('#/home'); },
    'done-profile': () => { saveProfile(); set({ verifyStep: Math.max(session().verifyStep, 1) }); toast('프로필이 저장되었습니다.'); go('#/verify'); },
    'save-profile': () => { saveProfile(); toast('저장되었습니다.'); UI.back(); },
    'submit-verify': () => { set({ verifyStep: 2 }); toast('심사 요청이 접수되었습니다.'); go('#/review'); },
    'mock-approve': () => { set({ grade: 'verified', verifyStep: 3 }); toast('🎉 정회원으로 승인되었습니다!'); go('#/home'); },
    'verify-start': () => SCREENS.verifyStart(),
    upload:  () => toast('데모 화면입니다. 실제 앱에서는 파일 선택기가 열립니다.'),
    photo:   () => toast('데모 화면입니다. 실제 앱에서는 사진을 선택합니다.'),

    /* 모임 */
    'new-meeting': () => { if (gate('verified', '모임 개설')) go('#/meeting-new'); },
    'submit-meeting': () => { toast('검수 요청이 접수되었습니다. 승인 후 공개됩니다.'); go('#/meetings'); },

    /* 글쓰기 */
    write:      () => { if (gate('member', '글쓰기')) go('#/write'); },
    'write-anon': () => { if (gate('verified', '익명 글쓰기')) go('#/write?anon=1'); },
    'submit-post': () => {
      const t = $('#w-title');
      if (t && !t.value.trim()) return toast('제목을 입력해 주세요.');
      toast('글이 등록되었습니다.'); UI.back();
    },
    'focus-comment': () => { const i = $('#cmt-input'); if (i) i.focus(); },
    'cmt-reply': () => { if (gate('member', '답글 작성')) { const i = $('#cmt-input'); if (i) i.focus(); } },
    'cmt-like':  () => { if (gate('member', '공감')) toast('공감했습니다.'); },
    'report-cmt': () => UI.reportSheet('댓글'),
    'submit-report': () => { toast('신고가 접수되었습니다. 처리 결과는 알림으로 안내드립니다.'); UI.back(); },

    /* 대화 */
    'send-msg':   () => SCREENS.sendMsg(),
    'chat-plus':  () => toast('사진 · 장소 · 일정 공유는 실제 앱에서 지원됩니다.'),
    'voice-open': () => { if (gate('verified', '보이스룸')) go('#/voice/v1'); },
    'new-voice':  () => toast('보이스룸 개설은 정회원 · 모임장에게 열립니다.'),
    'voice-raise': () => toast('🙋 발언을 요청했습니다. 진행자가 승인하면 마이크가 켜집니다.'),
    'voice-mic':  () => toast('마이크 권한은 최초 사용 시 요청됩니다. (데모)'),
    'voice-leave': () => { toast('조용히 나왔습니다.'); UI.back(); },
    'voice-menu': () => UI.sheet(sheetList('보이스룸 메뉴',
      ['방 정보','공동진행자 지정','사용자 음소거','강퇴','신고하기'])),
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
      '<div class="sh-body">' + ['활동 지역 범위','연령대','관심사','재혼 의향 정보 사용'].map((t, i) =>
        '<div class="row" style="padding-left:0;padding-right:0"><div class="row-main">' +
        '<div class="row-title">' + t + '</div></div>' +
        '<button class="switch' + (i < 3 ? ' on' : '') + '" data-switch></button></div>').join('') +
      '</div><div class="sh-foot"><button class="btn" data-close-sheet>적용</button></div>'),

    'reset-demo': () => { UI.reset(); toast('데모 데이터를 초기화했습니다.'); go('#/home'); location.reload(); },
    qclear:  () => go('#/search'),
    'clear-recent': () => { set({ recent: [] }); toast('최근 검색어를 모두 삭제했습니다.'); render(); }
  };

  function sheetList (title, items) {
    return '<div class="sh-head"><h3>' + UI.esc(title) + '</h3></div><div class="sh-body">' +
      items.map(t => '<button class="row" style="padding-left:0;padding-right:0" data-close-sheet>' +
        '<div class="row-main"><div class="row-title">' + UI.esc(t) + '</div></div>' +
        '<span class="row-arrow">›</span></button>').join('') +
      '</div><div class="sh-foot"><button class="btn ghost" data-close-sheet>닫기</button></div>';
  }

  function saveProfile () {
    const nick = $('#f-nick'), bio = $('#f-bio');
    const patch = {};
    if (nick && nick.value.trim()) patch.nickname = nick.value.trim();
    if (bio) patch.bio = bio.value.trim();
    const pick = k => { const g = $('[data-radio="' + k + '"] .opt.on'); return g ? g.dataset.val : null; };
    ['region','age','kids','remarry'].forEach(k => { const v = pick(k); if (v) patch[k] = v; });
    const multi = $$('[data-multi="interests"] .chip.on').map(b => b.dataset.val);
    if (multi.length) patch.interests = multi;
    set(patch);
  }

  /* 접두사 액션 (id 포함) */
  function prefixAct (act) {
    const [key, id] = [act.replace(/-[^-]*$/, ''), act.split('-').pop()];

    if (act.indexOf('fav-') === 0) {
      const s = session(), i = s.favMeets.indexOf(id);
      if (i > -1) s.favMeets.splice(i, 1); else s.favMeets.push(id);
      UI.save(); toast(i > -1 ? '찜을 해제했습니다.' : '♥ 찜한 모임에 저장했습니다.'); render(); return true;
    }
    if (act.indexOf('join-meeting-') === 0) {
      if (!gate('verified', '모임 참가 신청')) return true;
      go('#/apply/' + id); return true;
    }
    if (act.indexOf('pay-') === 0) {
      const okBox = $('[data-check="refund"]');
      if (okBox && !okBox.classList.contains('on')) { toast('환불 규정 확인에 동의해 주세요.'); return true; }
      const s = session();
      if (s.myMeets.indexOf(id) < 0) s.myMeets.push(id);
      UI.save();
      const m = DB.meeting(id);
      toast(m && m.approval === '승인형' ? '신청이 접수되었습니다. 모임장 승인을 기다려 주세요.' : '🎉 참가가 확정되었습니다!');
      go('#/meeting/' + id); return true;
    }
    if (act.indexOf('like-') === 0) {
      if (!gate('member', '공감')) return true;
      const s = session(), i = s.liked.indexOf(id);
      if (i > -1) s.liked.splice(i, 1); else s.liked.push(id);
      UI.save(); render(); return true;
    }
    if (act.indexOf('save-') === 0) {
      if (!gate('member', '저장')) return true;
      const s = session(), i = s.saved.indexOf(id);
      if (i > -1) s.saved.splice(i, 1); else s.saved.push(id);
      UI.save(); toast(i > -1 ? '저장을 해제했습니다.' : '🔖 저장했습니다.'); render(); return true;
    }
    if (act.indexOf('send-comment-') === 0) {
      if (!gate('member', '댓글 작성')) return true;
      const i = $('#cmt-input');
      if (!i || !i.value.trim()) { toast('댓글을 입력해 주세요.'); return true; }
      if (/(씨발|병신|바보)/.test(i.value)) { toast('공격적인 표현이 감지되었습니다. 문장을 확인해 주세요.'); return true; }
      i.value = ''; toast('댓글을 등록했습니다.'); return true;
    }
    if (act.indexOf('follow-') === 0) { if (gate('member', '팔로우')) toast('팔로우했습니다.'); return true; }
    if (act.indexOf('dm-') === 0) {
      if (!gate('verified', '1:1 메시지')) return true;
      toast('메시지를 요청했습니다. 상대가 수락하면 대화가 열립니다.'); return true;
    }
    if (act.indexOf('more-post-') === 0)   { UI.sheet(sheetList('더보기', ['신고하기','차단하기','이 글 숨기기','링크 복사'])); return true; }
    if (act.indexOf('more-user-') === 0)   { UI.sheet(sheetList('더보기', ['신고하기','차단하기','숨기기'])); return true; }
    if (act.indexOf('more-meeting-') === 0){ UI.sheet(sheetList('더보기', ['모임 신고','모임장 차단','링크 복사','일정 공유'])); return true; }
    if (act.indexOf('chat-menu-') === 0)   { UI.sheet(sheetList('채팅방 메뉴', ['참여자 목록','고정 공지','알림 끄기','신고하기','채팅방 나가기'])); return true; }
    return false;
  }

  /* ── 전역 클릭 위임 ──────────────────── */
  document.addEventListener('click', function (e) {
    const t = e.target;

    const closeS = t.closest('[data-close-sheet]');
    if (closeS) { UI.closeSheet(); if (!closeS.hasAttribute('data-nav')) return; }
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
      const nx = $('#btn-next');
      if (nx) nx.disabled = !$('[data-check="agree-all"]').classList.contains('on');
      return;
    }

    const sw = t.closest('[data-switch]');
    if (sw) { sw.classList.toggle('on'); return; }

    const opt = t.closest('[data-radio] .opt, [data-radio] .chip');
    if (opt) {
      const box = opt.closest('[data-radio]');
      $$('.opt, .chip', box).forEach(b => b.classList.remove('on'));
      opt.classList.add('on');
      return;
    }
    const multi = t.closest('[data-multi] .chip');
    if (multi) { multi.classList.toggle('on'); return; }

    const vis = t.closest('[data-vis]');
    if (vis) {
      UI.sheet('<div class="sh-head"><h3>공개범위</h3><p>이 항목을 누구에게 보여줄지 선택하세요.</p></div>' +
        '<div class="sh-body">' + ['전체 공개','정회원에게만','같은 모임 참가자만','비공개'].map(o =>
          '<button class="row" style="padding-left:0;padding-right:0" data-close-sheet>' +
          '<div class="row-main"><div class="row-title">' + o + '</div></div></button>').join('') +
        '</div>');
      return;
    }

    const sh = t.closest('[data-sheet]');
    if (sh) {
      const kind = sh.dataset.sheet;
      if (kind === 'sort') {
        UI.sheet('<div class="sh-head"><h3>정렬</h3></div><div class="sh-body">' +
          [['new','최신순'],['cmt','댓글순'],['view','조회순']].map(o =>
            '<a class="row" style="padding-left:0;padding-right:0" href="#/home?t=all&sort=' + o[0] + '" data-nav data-close-sheet>' +
            '<div class="row-main"><div class="row-title">' + o[1] + '</div></div></a>').join('') + '</div>');
      } else {
        UI.sheet('<div class="sh-head"><h3>필터</h3><p>원하는 조건을 선택하세요.</p></div>' +
          '<div class="sh-body">' +
          '<div class="field" style="padding:8px 0"><label>지역</label><div class="opts wrapopts" data-radio="fr">' +
            DB.regions.slice(0, 6).map(r => '<button class="opt" data-val="' + r + '">' + r + '</button>').join('') + '</div></div>' +
          '<div class="field" style="padding:8px 0"><label>관심사</label><div class="opts wrapopts" data-multi="fi">' +
            DB.interests.slice(0, 8).map(r => '<button class="chip" data-val="' + r + '">' + r + '</button>').join('') + '</div></div>' +
          '</div><div class="sh-foot"><button class="btn" data-close-sheet>적용하기</button></div>');
      }
      return;
    }

    const rt = t.closest('[data-report-type]');
    if (rt) { UI.closeSheet(); go('#/report'); return; }

    const a = t.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      if (prefixAct(act)) return;
      if (ACT[act]) { ACT[act](); return; }
    }
  });

  /* ── 부팅 ────────────────────────────── */
  window.addEventListener('hashchange', render);

  function boot () {
    if (!location.hash) location.replace('#/home');
    render();
    $('#app').hidden = false;
    /* D01: 로딩 완료 후 즉시 메인 ‘전체’ 탭. 가입 화면은 자동 노출하지 않음 */
    setTimeout(() => {
      $('#splash').classList.add('done');
      setTimeout(() => { const s = $('#splash'); if (s) s.remove(); }, 500);
    }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
