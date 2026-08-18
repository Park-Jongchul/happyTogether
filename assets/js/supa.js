/* 실시간 채팅 (Supabase Realtime)
   ────────────────────────────────────────────────────────────
   ▶ 켜는 법: 아래 CONFIG 두 줄만 채우면 됩니다. 자세한 절차는 docs/SUPABASE.md
   ▶ 비워두면 기존처럼 목업 + 내 기기 저장(localStorage)으로만 동작합니다.
   ▶ anon key 는 공개되어도 되는 값입니다. 권한은 DB 의 RLS 정책이 막습니다.
      (docs/chat-realtime.sql 을 반드시 적용해야 합니다)            */
window.SUPA = (function () {

  const CONFIG = {
    url: 'https://jspcebieuxohibapurfu.supabase.co',
    anonKey: 'sb_publishable_WIiVWAdNc-_peY0okqAmTQ_qNyN8htj'
  };

  const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
  const TABLE = 'rt_chat_message';
  const enabled = !!(CONFIG.url && CONFIG.anonKey);

  let client = null, uid = null, booting = null;

  /* SDK 로드 + 익명 로그인. 실패하면 false 를 돌려주고 앱은 로컬 모드로 계속 갑니다. */
  function ready () {
    if (!enabled) return Promise.resolve(false);
    if (booting) return booting;
    booting = (async () => {
      try {
        const { createClient } = await import(SDK);
        client = createClient(CONFIG.url, CONFIG.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        const got = await client.auth.getSession();
        let user = got.data.session && got.data.session.user;
        if (!user) {
          /* 기기마다 계정 하나. Authentication → Providers → Anonymous 를 켜야 합니다 */
          const { data, error } = await client.auth.signInAnonymously();
          if (error) throw error;
          user = data.user;
        }
        uid = user.id;
        return true;
      } catch (e) {
        console.warn('[SUPA] 실시간 채팅을 켤 수 없어 로컬 모드로 동작합니다.', e);
        client = null;
        return false;
      }
    })();
    return booting;
  }

  const me = () => uid;

  /* 서버 행 → 화면이 쓰는 메시지 모양 */
  function toMsg (r) {
    const t = new Date(r.created_at);
    const h = t.getHours();
    return { id: r.message_id, user: r.sender_id === uid ? 'me' : r.sender_id,
             name: r.sender_name, body: r.body, ts: +t,
             at: (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + ':' + ('0' + t.getMinutes()).slice(-2) };
  }

  async function history (roomId, limit) {
    if (!await ready()) return null;
    const { data, error } = await client.from(TABLE)
      .select('*').eq('room_id', roomId)
      .order('created_at', { ascending: false }).limit(limit || 100);
    if (error) { console.warn('[SUPA] history', error); return null; }
    return data.reverse().map(toMsg);
  }

  /* 방마다 마지막 메시지 하나씩 — 대화 목록 미리보기용 */
  async function lastPerRoom (roomIds) {
    if (!await ready()) return null;
    const { data, error } = await client.from(TABLE)
      .select('*').in('room_id', roomIds)
      .order('created_at', { ascending: false }).limit(200);
    if (error) { console.warn('[SUPA] lastPerRoom', error); return null; }
    const out = {};
    data.forEach(r => { if (!out[r.room_id]) out[r.room_id] = toMsg(r); });
    return out;
  }

  async function send (roomId, body, name) {
    if (!await ready()) return null;
    const { data, error } = await client.from(TABLE)
      .insert({ room_id: roomId, sender_id: uid, sender_name: name || '나', body: body })
      .select().single();
    if (error) { console.warn('[SUPA] send', error); return null; }
    return toMsg(data);
  }

  /* 새 메시지 구독. 해제 함수를 돌려줍니다. */
  function subscribe (roomId, onMsg) {
    let ch = null, dead = false;
    ready().then(okv => {
      if (!okv || dead) return;
      ch = client.channel('room:' + roomId)
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: TABLE, filter: 'room_id=eq.' + roomId },
            payload => onMsg(toMsg(payload.new)))
        .subscribe();
    });
    return function () { dead = true; if (ch && client) client.removeChannel(ch); };
  }

  return { enabled, ready, me, history, lastPerRoom, send, subscribe };
})();
