/* D02 로그인·본인인증 · D03 돌싱 인증/가입심사 · D04 프로필 설정 */
window.SCREENS = window.SCREENS || {};
(function (S) {
  const { esc, session, set, toast, go } = UI;

  /* ── D02 로그인 / 회원가입 ─────────────── */
  S.login = function (q) {
    const tab = q.tab === 'join' ? 'join' : 'login';
    const t = (a, b, k) =>
      '<a class="seg' + (tab === k ? ' on' : '') + '" href="#/login?tab=' + k + '" data-nav>' + a + '</a>';

    let f = '<div class="segs">' + t('로그인', '', 'login') + t('회원가입', '', 'join') + '</div>';

    if (tab === 'join') {
      f +=
      '<div class="field"><label>이름</label>' +
        '<input class="inp" id="f-name" placeholder="본인인증 결과와 동일하게 입력" autocomplete="name">' +
        '<div class="hint">외부에 공개되지 않으며 본인확인 용도로만 사용합니다.</div></div>' +
      '<div class="field"><label>휴대폰 번호</label><div class="inp-row">' +
        '<input class="inp" id="f-phone" placeholder="01012345678" inputmode="numeric" autocomplete="tel">' +
        '<button class="btn sm" data-act="sms">인증번호 받기</button></div>' +
        '<div class="hint">중복 계정과 제재 이력을 확인합니다. 재요청은 60초 후 가능합니다.</div></div>' +
      '<div class="field"><label>인증번호</label>' +
        '<input class="inp" id="f-code" placeholder="6자리 숫자" inputmode="numeric" maxlength="6">' +
        '<div class="hint warn">5회 실패 시 10분간 잠깁니다.</div></div>' +
      '<div style="height:8px"></div>' +
      '<button class="check" data-check="agree-all"><i>✓</i><div><b>필수 약관 전체 동의</b><br>' +
        '<span style="font-size:12px;color:var(--muted)">서비스 이용약관 · 개인정보 처리방침 (필수)</span></div></button>' +
      '<button class="check" data-check="agree-mkt"><i>✓</i><div>마케팅 정보 수신 동의 <span class="badge gray">선택</span></div></button>' +
      '<div class="sec" style="padding-top:16px"><button class="btn" id="btn-next" data-act="join-next" disabled>다음</button></div>' +
      '<div class="notice gray"><i>ℹ️</i><div>이 화면은 전체메뉴의 회원가입 버튼이나 회원 전용 기능을 눌렀을 때만 열립니다. ' +
        '앱 실행만으로는 가입 화면이 자동으로 뜨지 않습니다.</div></div>';
    } else {
      f +=
      '<div class="field"><label>휴대폰 번호</label>' +
        '<input class="inp" id="f-phone" placeholder="01012345678" inputmode="numeric" autocomplete="tel"></div>' +
      '<div class="field"><label>인증번호</label><div class="inp-row">' +
        '<input class="inp" id="f-code" placeholder="6자리 숫자" inputmode="numeric" maxlength="6">' +
        '<button class="btn sm line" data-act="sms">받기</button></div></div>' +
      '<div class="sec" style="padding-top:16px"><button class="btn" data-act="do-login">로그인</button></div>' +
      '<div class="or"><span>또는</span></div>' +
      '<div class="sec" style="padding-top:0"><button class="btn kakao" data-act="kakao-login">카카오로 로그인</button></div>';
    }

    return { bar: { title: tab === 'join' ? '가입하기' : '로그인', back: true, center: true },
             tab: false, html: f };
  };

  /* ── D03 돌싱 인증 / 가입심사 ──────────── */
  S.verify = function () {
    const s = session();
    const opt = (key, list) => '<div class="opts" data-radio="' + key + '">' + list.map(o =>
      '<button class="opt' + (s[key === 'method' ? 'verifyMethod' : 'marital'] === o ? ' on' : '') +
      '" data-val="' + o + '">' + o + '</button>').join('') + '</div>';
    const answer = s.answer || '';

    return { bar: { title: '가입 심사', back: true, center: true }, tab: false, html:
      '<div class="steps"><b class="on"></b><b class="on"></b><b></b></div>' +
      '<div class="field"><label>1. 현재 혼인 상태</label>' + opt('marital', ['이혼','사별','사실혼 종료']) +
      '<div class="hint">이용 자격 확인용입니다. 프로필 공개 여부는 직접 선택할 수 있어요.</div></div>' +

      '<div class="field"><label>2. 인증 방법</label>' + opt('method', ['혼인관계증명서','운영자 확인']) +
      '<div class="hint">혼인관계증명서를 고르면 증빙 파일 첨부가 필요합니다.</div></div>' +

      '<div class="field"><label>증빙 파일 첨부</label>' +
        '<button class="uploader" data-act="upload">' +
        (s.doc ? '<b>✓</b>' + esc(s.doc) : '<b>＋</b>파일 선택 또는 사진 촬영') + '</button>' +
        '<div class="hint">주민등록번호·주소는 자동으로 가려집니다. 원본은 심사 후 보관기한에 따라 파기합니다.</div></div>' +

      '<div class="field"><label>3. 가입 질문</label>' +
        '<textarea class="inp" id="f-answer" placeholder="가입 목적과 원하는 활동을 작성해 주세요. (최소 50자)">' +
        esc(answer) + '</textarea>' +
        '<div class="hint"><span id="cnt">' + answer.trim().length +
        '</span>/50자 · 욕설, 연락처, SNS 아이디가 포함되면 보완 요청을 받을 수 있어요.</div></div>' +

      '<div class="sec" style="padding-top:18px"><button class="btn" data-act="submit-verify">심사 요청</button></div>' +
      '<div class="notice"><i>🔒</i><div>증빙 문서는 최소 권한 운영자만 열람하며 열람 기록이 남습니다.</div></div>',
      after: function () {
        const ta = UI.$('#f-answer'), c = UI.$('#cnt');
        if (ta && c) ta.addEventListener('input', () => { c.textContent = ta.value.trim().length; });
      } };
  };

  /* 심사 대기 화면 */
  S.review = function () {
    const s = session();
    const submitted = s.verifyStep >= 2;
    return { bar: { title: '심사 진행 중', back: true, center: true }, tab: false, html:
      '<div class="hero-state"><div class="hero-ic">' + (submitted ? '⏳' : '📄') + '</div>' +
      '<h3>' + (submitted ? '가입 심사가 접수되었습니다' : '아직 심사 요청이 접수되지 않았습니다') + '</h3>' +
      '<p>' + (submitted
        ? '접수 순서대로 운영자가 확인하고 있어요.<br>보완이 필요하면 알림으로 안내드립니다.'
        : '인증 자료를 제출하면 심사가 시작됩니다.') + '</p>' +
      (submitted ? '' : '<a class="btn" style="max-width:260px;margin-top:18px" href="#/verify" data-nav>인증 자료 제출하기</a>') +
      '</div>' +
      (submitted
        ? '<div class="infobox">' +
          [['혼인 상태', s.marital || '-'], ['인증 방법', s.verifyMethod || '-'],
           ['증빙 파일', s.doc || '없음']].map(r =>
            '<div class="inforow"><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>').join('') + '</div>'
        : '') +
      '<div class="list">' +
        [['1. 서류 접수','완료','ok'],['2. 운영자 검토','진행 중','warn'],['3. 정회원 전환','대기','gray']].map(r =>
          '<div class="row"><div class="row-main"><div class="row-title">' + r[0] + '</div></div>' +
          '<span class="badge ' + r[2] + '">' + r[1] + '</span></div>').join('') +
      '</div>' +
      '<div class="notice gray"><i>ℹ️</i><div>예상 처리 시간 대신 접수 순서와 보완 여부만 안내합니다.</div></div>' +
      '<div class="sec" style="padding-top:16px">' +
        '<button class="btn" data-act="mock-approve">(데모) 승인 처리해보기</button>' +
        '<a class="btn ghost" href="#/home" data-nav style="margin-top:8px">홈으로 돌아가기</a></div>' };
  };

  /* ── D04 프로필 설정 ───────────────────── */
  function profileForm (s, isEdit) {
    /* 공개범위는 저장된 값을 그대로 보여줍니다. 민감한 항목의 기본값은 비공개입니다. */
    const vis = k => '<button class="visbtn" data-vis="' + k + '">' + esc(UI.visOf(k, '비공개')) + ' ▾</button>';
    return '' +
    '<div class="sec" style="text-align:center;padding-top:22px">' +
      '<button class="photo' + (s.photo ? ' has' : '') + '" data-act="photo"' +
      (s.photo ? ' style="background-image:url(' + s.photo.replace(/["'()\\]/g, '') + ')"' : '') + '>' +
      (s.photo ? '' : UI.initial(s.nickname)) + '<span>＋</span></button>' +
      '<div class="hint" style="margin-top:8px">얼굴 사진을 권장합니다. 타인 사진·과도한 보정은 신고 대상입니다.</div></div>' +

    '<div class="field"><label>닉네임</label>' +
      '<input class="inp" id="f-nick" value="' + esc(s.nickname) + '" maxlength="12" placeholder="2~12자">' +
      '<div class="hint">실명·연락처·업체명은 사용할 수 없습니다.</div></div>' +

    '<div class="field"><label>활동 지역</label><div class="opts" data-radio="region" data-cur="' + esc(s.region) + '">' +
      DB.regions.slice(0, 6).map(r => '<button class="opt' + (r === s.region ? ' on' : '') + '" data-val="' + r + '">' + r + '</button>').join('') +
    '</div></div>' +

    '<div class="field"><label>연령대</label><div class="opts" data-radio="age" data-cur="' + esc(s.age) + '">' +
      ['30대','40대','50대','60대 이상'].map(r => '<button class="opt' + (r === s.age ? ' on' : '') + '" data-val="' + r + '">' + r + '</button>').join('') +
    '</div></div>' +

    '<div class="field"><label>관심사 <span style="color:var(--muted);font-weight:500">(추천·모임 필터에 사용)</span></label>' +
      '<div class="opts wrapopts" data-multi="interests">' + DB.interests.map(i =>
        '<button class="chip' + (s.interests.indexOf(i) > -1 ? ' on' : '') + '" data-val="' + i + '">' + i + '</button>').join('') +
    '</div></div>' +

    '<div class="field"><label>자녀 유무 / 양육 여부 ' + vis('kids') + '</label>' +
      '<div class="opts" data-radio="kids" data-cur="' + esc(s.kids) + '">' +
      ['없음','있음','비공개'].map(r => '<button class="opt' + (r === s.kids ? ' on' : '') + '" data-val="' + r + '">' + r + '</button>').join('') +
      '</div><div class="hint">기본값은 비공개입니다. 언제든 바꿀 수 있어요.</div></div>' +

    '<div class="field"><label>재혼 의향 ' + vis('remarry') + '</label>' +
      '<div class="opts wrapopts" data-radio="remarry" data-cur="' + esc(s.remarry) + '">' +
      ['생각 있음','생각 없음','열려 있음','비공개'].map(r => '<button class="opt' + (r === s.remarry ? ' on' : '') + '" data-val="' + r + '">' + r + '</button>').join('') +
      '</div></div>' +

    '<div class="field"><label>자기소개</label>' +
      '<textarea class="inp" id="f-bio" placeholder="어떤 활동을 함께하고 싶은지 편하게 적어주세요.">' + esc(s.bio) + '</textarea>' +
      '<div class="hint">외부 연락처·SNS 아이디, 소개팅 목적만 강조하는 문구는 제한됩니다.</div></div>' +

    '<div class="sec" style="padding-top:18px"><button class="btn" data-act="' +
      (isEdit ? 'save-profile' : 'done-profile') + '">' + (isEdit ? '저장' : '완료') + '</button></div>';
  }

  S.profile = function () {
    return { bar: { title: '프로필 만들기', back: true, center: true }, tab: false,
             html: '<div class="steps"><b class="on"></b><b class="on"></b><b class="on"></b></div>' +
                   profileForm(session(), false) };
  };
  S.profileEdit = function () {
    return { bar: { title: '프로필 편집', back: true, center: true }, tab: false,
             html: profileForm(session(), true) };
  };

  /* ── D19 정회원 전환 안내 (전체 화면 버전) ── */
  S.upgrade = function () {
    const s = session();
    const step = s.verifyStep;
    const row = (n, title, desc, done, href) =>
      '<a class="row" href="' + href + '" data-nav><div class="stepno' + (done ? ' on' : '') + '">' +
      (done ? '✓' : n) + '</div><div class="row-main"><div class="row-title">' + title + '</div>' +
      '<div class="row-meta">' + desc + '</div></div><span class="row-arrow">›</span></a>';
    return { bar: { title: '정회원 인증', back: true, center: true }, tab: false, html:
      '<div class="hero-state"><div class="hero-ic">🛡️</div>' +
      '<h3>안전한 커뮤니티를 위해<br>인증이 필요해요</h3>' +
      '<p>익명게시판 · 모임 · 단체채팅 · 보이스룸은<br>정회원 전용 기능입니다.</p>' +
      '<span class="badge" style="margin-top:12px">현재 상태 · ' + UI.GRADE_LABEL[s.grade] + '</span></div>' +
      '<div class="list">' +
        row(1, '기본 프로필 작성', '닉네임·지역·관심사·공개범위', step >= 1, '#/profile') +
        row(2, '돌싱 인증 자료 제출', '혼인관계증명서 또는 운영자 확인', step >= 2, '#/verify') +
        row(3, '운영자 심사', '접수 순서대로 검토합니다', step >= 3, '#/review') +
      '</div>' +
      '<div class="sec" style="padding-top:18px">' +
        '<button class="btn" data-act="verify-start">정회원 인증 시작</button>' +
        '<button class="btn ghost" data-back style="margin-top:6px">나중에 하기</button></div>' };
  };

  /* 인증 흐름의 다음 단계로 보내기 */
  S.verifyStart = function () {
    const s = session();
    UI.closeSheet();
    if (s.grade === 'guest') return go('#/login?tab=join');
    if (s.verifyStep < 1) return go('#/profile');
    if (s.verifyStep < 2) return go('#/verify');
    return go('#/review');
  };

})(window.SCREENS);
