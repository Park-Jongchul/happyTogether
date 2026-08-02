/* 행복하자 우리 — 목업 데이터 (백엔드 연동 전 프로토타입용)
   화면설계서 9장 데이터 모델의 필드명을 최대한 그대로 사용했습니다. */
window.DB = (function () {

  const community = {
    name: '두 번째 봄 · 돌싱라운지',
    slogan: '두 번째 시작, 함께라서 더 편안하게',
    desc: '서울·경기 돌싱 친목 커뮤니티',
    members: 12480,
    todayPosts: 86
  };

  /* 게시판 access_level: public(비회원 열람) / member(가입회원) / verified(정회원) */
  const boards = [
    { board_id: 'notice',   name: '공지사항',   access: 'public',   write: 'admin' },
    { board_id: 'hello',    name: '가입인사',   access: 'public',   write: 'member' },
    { board_id: 'free',     name: '자유게시판', access: 'public',   write: 'member' },
    { board_id: 'today',    name: '오늘의 이야기', access: 'public', write: 'member' },
    { board_id: 'empathy',  name: '공감',       access: 'public',   write: 'member' },
    { board_id: 'kids',     name: '육아',       access: 'public',   write: 'member' },
    { board_id: 'law',      name: '법률·재무',  access: 'member',   write: 'member' },
    { board_id: 'anon',     name: '익명게시판', access: 'verified', write: 'verified' },
    { board_id: 'meet',     name: '모임',       access: 'public',   write: 'verified' }
  ];

  const users = {
    u_bada:   { user_id:'u_bada',   nickname:'바다',       region:'서울', age:'40대', grade:'verified', manner:4.9, meets:18, noshow:0, interests:['와인','여행','러닝'], kids:'비공개', remarry:'열려 있음', color:'c2', bio:'주말마다 걷고 마시고 이야기 나누는 걸 좋아합니다.' },
    u_bomnal: { user_id:'u_bomnal', nickname:'봄날',       region:'서울', age:'40대', grade:'verified', manner:4.8, meets:12, noshow:0, interests:['여행','사진','카페'], kids:'있음(비공개)', remarry:'생각 없음', color:'c1', bio:'혼자 여행을 시작하고 나서 세상이 조금 넓어졌어요.' },
    u_walk:   { user_id:'u_walk',   nickname:'산책러',     region:'경기', age:'30대', grade:'verified', manner:4.7, meets:12, noshow:1, interests:['산책','등산','러닝','반려동물'], kids:'없음', remarry:'열려 있음', color:'c3', bio:'매일 저녁 한 시간씩 걷습니다.' },
    u_travel: { user_id:'u_travel', nickname:'여행가',     region:'서울', age:'40대', grade:'verified', manner:4.9, meets:21, noshow:0, interests:['여행','와인','전시'], kids:'비공개', remarry:'비공개', color:'c4', bio:'1년에 네 번은 어딘가로 떠납니다.' },
    u_latte:  { user_id:'u_latte',  nickname:'따뜻한라떼', region:'인천', age:'30대', grade:'member',   manner:4.6, meets:3,  noshow:0, interests:['카페','독서'], kids:'없음', remarry:'비공개', color:'c5', bio:'조용한 대화를 좋아합니다.' },
    u_sky:    { user_id:'u_sky',    nickname:'하늘',       region:'서울', age:'40대', grade:'member',   manner:4.5, meets:1,  noshow:0, interests:['등산','골프'], kids:'있음', remarry:'열려 있음', color:'c2', bio:'새로 가입했습니다. 잘 부탁드려요.' },
    u_admin:  { user_id:'u_admin',  nickname:'운영자',     region:'-',   age:'-',    grade:'admin',    manner:5.0, meets:0,  noshow:0, interests:[], kids:'-', remarry:'-', color:'c3', bio:'행복하자 우리 운영팀입니다.' }
  };

  const posts = [
    { post_id:'p1', board_id:'notice', author:'u_admin', title:'신규회원 가입 안내와 커뮤니티 이용수칙', body:'행복하자 우리는 돌싱 회원 여러분이 부담 없이 일상을 나누는 공간입니다.\n\n1. 서로의 이혼 사유를 묻지 않습니다.\n2. 연애·소개 목적만을 강요하지 않습니다.\n3. 영업·홍보·다단계 게시물은 즉시 제재합니다.\n4. 연락처·계좌번호는 공개 게시판에 남기지 않습니다.\n\n따뜻한 커뮤니티를 함께 만들어 주세요.', pin:true, views:2480, likes:120, comments:14, at:'2일 전' },
    { post_id:'p2', board_id:'hello', author:'u_sky', title:'새로 가입했습니다. 잘 부탁드려요', body:'서울 강서구에 살고 있는 40대입니다.\n혼자 지낸 지 2년 됐는데, 비슷한 시간을 보내고 계신 분들과 편하게 이야기 나누고 싶어 가입했습니다.\n산책이나 가벼운 등산 좋아합니다. 잘 부탁드려요!', views:7, likes:5, comments:3, at:'방금 전' },
    { post_id:'p3', board_id:'meet', author:'u_walk', title:'이번 토요일 한강 산책 모임', body:'여의나루역에서 만나 한강을 따라 두 시간 정도 걷습니다.\n걷고 나서 근처에서 가볍게 저녁 식사도 함께해요. 초면이어도 전혀 어색하지 않습니다.', meeting_id:'m1', views:31, likes:12, comments:8, at:'10분 전' },
    { post_id:'p4', board_id:'empathy', author:'u_bomnal', title:'이혼 후 혼자 보내는 주말, 어떻게 지내세요?', body:'금요일 밤부터 일요일까지가 제일 길게 느껴집니다.\n처음엔 그 시간이 무서웠는데 요즘은 조금씩 제 취향을 찾아가는 중이에요.\n다들 주말을 어떻게 보내시는지 궁금합니다.', views:94, likes:38, comments:12, at:'18분 전' },
    { post_id:'p5', board_id:'empathy', author:'u_bomnal', title:'이혼 후 혼자 여행을 다녀왔어요', body:'처음에는 두려웠지만 오히려 나를 돌아보는 시간이 됐습니다.\n\n혼자 밥 먹는 것도, 혼자 사진 찍는 것도 어색했는데 사흘쯤 지나니 편해지더군요.\n돌아오는 기차에서 오랜만에 마음이 조용했습니다. 망설이는 분이 계시다면 가까운 곳이라도 다녀오시길 권해요.', views:912, likes:91, comments:28, at:'1시간 전', hot:true },
    { post_id:'p6', board_id:'free', author:'u_walk', title:'등산을 시작하고 달라진 주말', body:'혼자 있는 시간이 길었는데 커뮤니티 모임을 통해 새로운 사람들을 만나게 됐어요.\n무릎 걱정에 미뤘었는데 천천히 걸으니 괜찮더라고요.', views:96, likes:24, comments:12, at:'32분 전' },
    { post_id:'p7', board_id:'kids', author:'u_latte', title:'아이에게 재혼 이야기를 언제 해야 할까요?', body:'초등학교 4학년 아이가 있습니다. 아직 구체적인 계획은 없지만 언젠가는 이야기를 꺼내야 할 텐데 시기를 모르겠어요.\n경험 있으신 분들의 조언 부탁드립니다.', views:420, likes:42, comments:17, at:'2시간 전', hot:true },
    { post_id:'p8', board_id:'free', author:'u_travel', title:'우리 동네에서 친구해요', body:'합정·상수 근처에 사시는 분들 계신가요? 퇴근하고 가볍게 산책하거나 커피 한 잔 하실 분 찾습니다.', views:530, likes:47, comments:21, at:'3시간 전', hot:true },
    { post_id:'p9', board_id:'free', author:'u_bada', title:'주말 브런치 모임 후기', body:'지난 주말 합정 브런치 모임 후기 남깁니다. 여덟 분이 오셨고 두 시간이 정말 금방 지나갔어요.', views:388, likes:36, comments:15, at:'5시간 전', hot:true },
    { post_id:'p10', board_id:'today', author:'u_latte', title:'혼자 여행하기 좋은 곳 추천받아요', body:'2박 3일 정도로 혼자 다녀오기 좋은 국내 여행지 있을까요?', views:301, likes:28, comments:19, at:'6시간 전', hot:true },
    { post_id:'p11', board_id:'law', author:'u_bada', title:'양육비 조정 신청 절차 정리해봤습니다', body:'제가 겪은 절차를 순서대로 정리했습니다. 개인 경험이라 참고만 해주세요.', views:210, likes:31, comments:9, at:'8시간 전' },
    { post_id:'p12', board_id:'today', author:'u_walk', title:'40대가 시작하기 좋은 취미 추천해주세요', body:'몸도 마음도 챙길 수 있는 취미를 찾고 있습니다.', views:264, likes:22, comments:24, at:'10시간 전' }
  ];

  const anonPosts = [
    { post_id:'a1', anon_no:47, cat:'양육', title:'아이에게 새 사람을 언제 소개해야 할까요?', body:'만난 지 1년이 되어갑니다. 아이는 초등학생이고요. 서두르고 싶지 않은데 상대는 조금씩 이야기를 꺼냅니다.', comments:23, likes:41, at:'40분 전' },
    { post_id:'a2', anon_no:12, cat:'감정회복', title:'명절이 다가오니 마음이 복잡하네요', body:'작년까지는 정신없이 지나갔는데 올해는 유난히 조용할 것 같아 벌써 마음이 무겁습니다.', comments:31, likes:58, at:'2시간 전' },
    { post_id:'a3', anon_no:88, cat:'재혼', title:'재혼을 생각하지 않는다고 하면 이상한가요?', body:'혼자가 편해졌습니다. 그런데 주변에서는 계속 물어보네요.', comments:19, likes:64, at:'5시간 전' },
    { post_id:'a4', anon_no:33, cat:'법률·재무', title:'혼자 살면서 노후 준비 어떻게 하고 계세요?', body:'40대 중반인데 이제야 현실적으로 계산해보고 있습니다.', comments:14, likes:27, at:'1일 전' }
  ];

  const comments = {
    p5: [
      { user:'u_bada',  body:'저도 지난달에 혼자 강릉 다녀왔어요. 글 보니 그때 생각나네요.', at:'42분 전', likes:8 },
      { user:'u_walk',  body:'용기 내신 게 대단합니다. 다음엔 어디로 가실 계획이세요?', at:'30분 전', likes:3 },
      { user:'u_latte', body:'혼자 밥 먹는 게 제일 어렵던데… 저도 도전해볼게요.', at:'12분 전', likes:5 }
    ],
    p12: [
      { user:'u_latte', body:'저도 초보 등산 모임에 참여하고 싶어요.', at:'1시간 전', likes:4 },
      { user:'u_bada',  body:'수영 추천합니다. 무릎에 부담이 적어요.', at:'40분 전', likes:6 }
    ]
  };

  const meetings = [
    { meeting_id:'m1', host:'u_walk', title:'한강 야간 산책', cat:'산책', date:'8월 8일 (금) 19:30', region:'서울 영등포', place:'여의나루역 2번 출구', capacity:8, joined:6, ratio:'남 3 · 여 3', fee:0, approval:'즉시승인', drink:'없음', age:'30~50대',
      desc:'여의나루역에서 만나 한강을 따라 약 두 시간 걷습니다. 중간에 편의점에서 잠깐 쉬어가요.',
      plan:'19:30 집합 → 20:00 산책 시작 → 21:00 휴식 → 21:40 마무리',
      items:'편한 운동화, 가벼운 겉옷',
      refund:'모임 24시간 전까지 전액 환불 / 이후 취소는 환불 불가 (무료 모임은 노쇼 기록만 남습니다)' },
    { meeting_id:'m2', host:'u_travel', title:'40대 와인 모임', cat:'와인', date:'8월 9일 (토) 18:00', region:'서울 마포', place:'합정역 인근 (승인 후 공개)', capacity:10, joined:7, ratio:'남 4 · 여 3', fee:30000, approval:'승인형', drink:'있음', age:'40대',
      desc:'와인 세 종류를 함께 맛보며 편하게 이야기 나누는 모임입니다. 와인을 처음 접하는 분도 환영합니다.',
      plan:'18:00 인사 → 18:30 테이스팅 → 20:00 자유 대화 → 21:00 마무리',
      items:'없음 (잔과 안주는 준비되어 있습니다)',
      refund:'모임 3일 전까지 전액 환불 / 2일 전 50% / 당일 환불 불가. 참가비는 와인·안주 비용으로만 사용합니다.' },
    { meeting_id:'m3', host:'u_bada', title:'주말 브런치 & 수다', cat:'식사', date:'8월 10일 (일) 11:00', region:'서울 마포', place:'합정 브런치 카페', capacity:8, joined:8, ratio:'남 4 · 여 4', fee:25000, approval:'승인형', drink:'없음', age:'30~50대',
      desc:'일요일 늦은 아침, 브런치를 먹으며 편하게 이야기 나눕니다.',
      plan:'11:00 집합 → 13:00 마무리 (원하시면 근처 산책)',
      items:'없음', refund:'모임 2일 전까지 전액 환불 / 이후 환불 불가' },
    { meeting_id:'m4', host:'u_walk', title:'초보 환영 북한산 등산', cat:'등산', date:'8월 16일 (토) 08:00', region:'서울 은평', place:'북한산성 입구', capacity:12, joined:4, ratio:'남 2 · 여 2', fee:0, approval:'즉시승인', drink:'없음', age:'30~60대',
      desc:'천천히 오르는 초보 코스입니다. 정상까지 가지 않고 중턱에서 돌아옵니다. 하산 후 점심 식사 함께해요.',
      plan:'08:00 집합 → 11:30 하산 → 12:00 점심', items:'등산화, 물 1L, 간식',
      refund:'무료 모임 / 참석이 어려우면 하루 전까지 취소해 주세요' },
    { meeting_id:'m5', host:'u_travel', title:'평일 저녁 전시 관람', cat:'문화', date:'8월 13일 (수) 19:00', region:'서울 종로', place:'국립현대미술관 서울', capacity:6, joined:3, ratio:'남 1 · 여 2', fee:12000, approval:'즉시승인', drink:'없음', age:'30~50대',
      desc:'퇴근 후 함께 전시를 보고 짧게 커피 한 잔 합니다.',
      plan:'19:00 집합 → 20:30 관람 종료 → 21:00 마무리', items:'없음',
      refund:'관람 전일까지 전액 환불 / 당일 환불 불가' }
  ];

  const chats = [
    { room_id:'r1', type:'meeting', title:'한강 야간 산책', members:6, linked:'m1', last:'7시 20분까지 2번 출구에서 만나요.', at:'5분 전', unread:2,
      notice:'토요일 19:30 여의나루역 2번 출구 집합',
      msgs:[
        { user:'u_walk', body:'안녕하세요! 토요일 모임 단체방입니다 👋', at:'오후 2:10' },
        { user:'u_walk', body:'7시 20분까지 2번 출구에서 만나요.', at:'오후 2:11' },
        { user:'u_bada', body:'네, 확인했습니다.', at:'오후 2:14' },
        { user:'me',     body:'저도 시간 맞춰 가겠습니다!', at:'오후 2:20' }
      ] },
    { room_id:'r2', type:'group', title:'한강 산책방', members:18, last:'저도 참석합니다', at:'12분 전', unread:0,
      notice:'토요일 3시 여의나루역',
      msgs:[
        { user:'u_walk',   body:'안녕하세요! 👋', at:'오후 1:02' },
        { user:'u_travel', body:'저도 참석합니다', at:'오후 1:08' },
        { user:'u_bomnal', body:'이번 주는 날씨가 좋다네요', at:'오후 1:20' }
      ] },
    { room_id:'r3', type:'dm', title:'바다', members:2, last:'다음 모임에서 뵐게요 :)', at:'1시간 전', unread:0,
      msgs:[
        { user:'u_bada', body:'지난번 모임 반가웠습니다.', at:'오전 11:30' },
        { user:'me',     body:'저도요! 다음에 또 뵈어요.', at:'오전 11:45' },
        { user:'u_bada', body:'다음 모임에서 뵐게요 :)', at:'오전 11:47' }
      ] }
  ];

  const voiceRooms = [
    { voice_room_id:'v1', host:'u_walk', title:'밤 산책 수다방', topic:'퇴근 후 아무 이야기', state:'live', access:'공개', speakers:4, listeners:8, started:'21:10' },
    { voice_room_id:'v2', host:'u_bomnal', title:'혼자 사는 주말 이야기', topic:'주말을 보내는 법', state:'live', access:'공개', speakers:3, listeners:14, started:'20:40' },
    { voice_room_id:'v3', host:'u_travel', title:'와인 모임 사전 미팅', topic:'토요일 모임 안내', state:'live', access:'그룹 전용', speakers:2, listeners:5, started:'21:30' }
  ];

  const notifications = [
    { icon:'💬', title:'봄날님이 회원님의 댓글에 답글을 남겼습니다', at:'8분 전', to:'#/post/p5' },
    { icon:'🎉', title:'한강 야간 산책 모임 참가가 승인되었습니다', at:'1시간 전', to:'#/meeting/m1' },
    { icon:'📢', title:'신규회원 가입 안내와 커뮤니티 이용수칙', at:'2일 전', to:'#/post/p1' }
  ];

  const searchRecent = ['합정 모임','등산','여행','40대 대화방'];
  const searchHot = ['서울 모임','캠핑','재혼','골프','가입인사'];

  const interests = ['산책','등산','골프','여행','와인','반려동물','러닝','카페','독서','사진','요리','전시','캠핑','자전거'];
  const regions = ['서울','경기','인천','강원','대전','대구','부산','광주','제주'];

  return { community, boards, users, posts, anonPosts, comments, meetings, chats,
           voiceRooms, notifications, searchRecent, searchHot, interests, regions,
           user(id){ return this.users[id] || this.users.u_admin; },
           board(id){ return this.boards.find(b=>b.board_id===id) || {name:'게시판',access:'public'}; },
           post(id){ return this.posts.find(p=>p.post_id===id) || this.anonPosts.find(p=>p.post_id===id); },
           meeting(id){ return this.meetings.find(m=>m.meeting_id===id); },
           chat(id){ return this.chats.find(c=>c.room_id===id); },
           voice(id){ return this.voiceRooms.find(v=>v.voice_room_id===id); } };
})();
