// Bible-game Cloud Functions
const { setGlobalOptions } = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
// 曠野呼聲狀態機單一正本（issue #5）：lib/ 這份是 scripts/sync-shared.js 從 repo 根 shared/ 複製來的，不要直接改
const { FEEDBACK_EVENTS, autoCloseUpdate } = require('./lib/feedback-schema');

setGlobalOptions({ maxInstances: 10 });
admin.initializeApp();

const lineChannelSecret = defineSecret('LINE_CHANNEL_SECRET');
const googleAiApiKey = defineSecret('GOOGLE_AI_API_KEY');
const LINE_CHANNEL_ID = '2009801861';
const ALLOWED_ORIGINS = [
  'https://st00777.github.io',                        // prod (GitHub Pages)
  'https://bible-game-bcb84--dev-01luz2yz.web.app',   // dev preview (Firebase Hosting channel)
  'https://bible-game-bcb84.web.app',                 // 固定測試站 (hosting:main)
];

// AI 失敗時回給玩家的 fallback 文字。
// 單一正本在 ../content.js 的 AI_FALLBACK_TEXT；functions 部署邊界無法 import，所以這裡留複本。
// 不用靠人腦同步：bash deploy.sh functions 部署前會自動比對兩處，不一致即中止（issue #7）。
const FALLBACK_TEXT = '謝謝你願意把心裡的話帶到神面前。祂看見了。';

exports.lineLogin = onRequest(
  {
    secrets: [lineChannelSecret],
    cors: ALLOWED_ORIGINS,
    invoker: 'public',
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const VALID_REDIRECTS = [
      'https://st00777.github.io/Bible-game/bible-game-v2.html',
      'https://bible-game-bcb84--dev-01luz2yz.web.app/bible-game-v2.html',
      'https://bible-game-bcb84.web.app/bible-game-v2.html',
    ];

    const { code, redirect_uri } = req.body;
    if (!code || !redirect_uri) {
      res.status(400).json({ error: 'Missing code or redirect_uri' });
      return;
    }
    if (!VALID_REDIRECTS.includes(redirect_uri)) {
      res.status(400).json({ error: 'invalid_redirect_uri' });
      return;
    }

    try {
      // Exchange authorization code for LINE access token
      const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
          client_id: LINE_CHANNEL_ID,
          client_secret: lineChannelSecret.value(),
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        let lineError;
        try { lineError = JSON.parse(errText); } catch { lineError = errText; }
        console.error('LINE token error — status:', tokenRes.status, 'body:', errText);
        console.error('LINE token error (parsed):', JSON.stringify(lineError));
        console.error('LINE token error — redirect_uri used:', redirect_uri);
        res.status(400).json({ error: 'login_failed' });
        return;
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Get LINE user profile
      const profileRes = await fetch('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileRes.ok) {
        const profErrText = await profileRes.text();
        console.error('LINE profile fetch error — status:', profileRes.status, 'body:', profErrText);
        res.status(400).json({ error: 'login_failed' });
        return;
      }

      const profile = await profileRes.json();
      const lineUserId = profile.userId;

      // Create Firebase custom token with a LINE-namespaced UID
      const firebaseUid = `line:${lineUserId}`;
      const customToken = await admin.auth().createCustomToken(firebaseUid);

      res.json({
        customToken,
        displayName: profile.displayName || '',
        pictureUrl: profile.pictureUrl || '',
        lineUserId,
      });
    } catch (e) {
      console.error('lineLogin function error:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ── AI Reflection ────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.5-flash';
const GOOGLE_AI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGoogleAI(model, systemPrompt, userText, apiKey, retries = 3) {
  const url = `${GOOGLE_AI_BASE}/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n玩家的默想：${userText}` }] }],
      // thinkingBudget 0：2.5-flash 的思考 token 也算在 maxOutputTokens 內，思考一長就把回答截在句中
      // （2026-08-29 玩家多次看到半句話）。2-3 句溫暖回應不需要打草稿，直接關掉。
      generationConfig: { maxOutputTokens: 1500, temperature: 0.9, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!res.ok) {
    // 503 = Gemini 過載 spike，最多重試 3 次（2026-05-07 從 2 升到 3，
    // 為了把部署後 fallback 率從 14% 壓下來）。等待 1.5±0.5 秒加 jitter，
    // 避免多個玩家同時撞牆又在同一秒重試
    if (res.status === 503 && retries > 0) {
      const waitMs = Math.round(1000 + Math.random() * 1000); // 1000-2000ms
      console.warn(`${model} 503 retry (remaining=${retries}, wait=${waitMs}ms)`);
      await new Promise(r => setTimeout(r, waitMs));
      return callGoogleAI(model, systemPrompt, userText, apiKey, retries - 1);
    }
    const err = await res.text();
    console.error(`${model} error:`, err);
    return null;
  }
  const data = await res.json();
  const cand = data.candidates?.[0];
  const text = cand?.content?.parts?.map(p => p.text || '').join('') || null;
  // 回傳 { text, truncated }：finishReason=MAX_TOKENS 代表話講一半被截，由呼叫端決定重試
  return { text, truncated: cand?.finishReason === 'MAX_TOKENS' };
}

// 被截斷時的重試：同一份 prompt 加上「濃縮」指令，不砍句、不改語意（James 2026-08-29 定案）
const CONDENSE_HINT = `
- 這次請把回應濃縮：只保留最核心的一個洞見，2 句以內、每句不超過 40 字，務必把話說完`;

async function generateReflection(systemPrompt, userText, apiKey, logTag) {
  const first = await callGoogleAI(GEMINI_MODEL, systemPrompt, userText, apiKey);
  if (!first) return null;
  if (!first.truncated) return first.text;
  console.warn(`aiReflection truncated (MAX_TOKENS), retry condensed: ${logTag}`);
  const second = await callGoogleAI(GEMINI_MODEL, systemPrompt + CONDENSE_HINT, userText, apiKey);
  if (second && !second.truncated && second.text) return second.text;
  console.warn(`aiReflection truncated twice, fallback: ${logTag}`);
  return null; // 兩次都截斷 → 不讓半句話出去，退 fallback
}

exports.aiReflection = onRequest(
  {
    secrets: [googleAiApiKey],
    cors: ALLOWED_ORIGINS,
    invoker: 'public',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { chapter, reflectionTitle, playerText, uid, mood, equipment } = req.body;
    if (!playerText) {
      res.status(400).json({ error: 'Missing playerText' });
      return;
    }
    // 紀錄玩家身份（不是必填，訪客 / 未登入時為 'anonymous'），讓 logs 能 cross reference 玩家行為與 bug 回報
    const callerId = uid || 'anonymous';
    console.log(`aiReflection call: uid=${callerId} chapter=${chapter || ''} title=${reflectionTitle || ''} textLen=${playerText.length}`);

    // 情緒2.0：玩家當次選的心情當「帶來的起點」餵 prompt（冷框架承接，不診斷/不評判）。
    // 🔴 design-principles 紅線3/4/1：起點≠現狀、不當開場主角、即時餵不另存；mood 空（先不說）整段不出現、prompt 逐字同舊版。
    const moodBlock = mood ? `
玩家這次進來時，從幾個選項裡挑了「${mood}」當作今天帶來的起點。
請把它當成「他帶進來的脈絡」輕輕承接——這是他進門時的起點，不是他此刻的狀態；
他現在的狀態，請你從他寫的默想本文去讀，不要用這個起點去推測或診斷他現在怎麼了。
- 先回應他寫的默想本文，再順帶把這個起點輕輕帶進來，不要用心情當開場第一句；也不要整段圍著它打轉——它是順帶的背景，不是主角。
- 用承認、留空間的語氣，例如「你今天帶著『${mood}』來到神面前」。
- 不要評判、不要診斷、不要替他總結情緒、不要問「你還好嗎？」這類關心句。
` : '';

    // AI 看裝備（2026-08-27 PR ①，ADR 0001 9b①）：只收玩家身上四件裝備的 desc 經文（不含名稱／emoji），
    // 規則「至多引一句、不合則不提」。陣列以外／空陣列 → 整段不出現，prompt 與舊版逐字相同。
    const verses = Array.isArray(equipment)
      ? equipment.filter(v => typeof v === 'string').map(v => v.trim().slice(0, 120)).filter(Boolean).slice(0, 4)
      : [];
    const equipmentBlock = verses.length ? `
玩家這段日子隨身帶著幾句經文（來自他收集到的裝備）：
${verses.map(v => `- ${v}`).join('\n')}
- 只有在其中一句「真的」貼合他這次寫的默想時，才順帶引用那一句，最多引一句、原文照引、不要說明它來自裝備。
- 沒有貼合的就完全不提，不要硬套、不要列舉、不要為了引用而引用。
` : '';

    const systemPrompt = `你是一位溫暖的靈修同伴。使用者正在讀${chapter || '聖經'}，默想主題是「${reflectionTitle || '靈修'}」。
${moodBlock}${equipmentBlock}
規則：
- 用繁體中文
- 只輸出2-3句回應，不要輸出其他任何內容
- 不要輸出思考過程、選項比較、草稿或修改紀錄
- 像朋友同行，溫暖有洞見，不說教
- 不要使用表情符號
- 直接回應，不要加稱呼語（如「親愛的朋友」）`;

    try {
      const apiKey = googleAiApiKey.value();
      const aiResponse = await generateReflection(systemPrompt, playerText, apiKey, `uid=${callerId} chapter=${chapter || ''}`);
      const isFallback = !aiResponse;
      console.log(`aiReflection result: uid=${callerId} chapter=${chapter || ''} fallback=${isFallback}`);
      res.json({
        aiResponse: aiResponse || FALLBACK_TEXT,
        isFallback,
      });
    } catch (e) {
      console.error(`aiReflection error: uid=${callerId} chapter=${chapter || ''}`, e);
      res.status(500).json({ error: 'AI response failed' });
    }
  }
);

// ── 曠野呼聲 30 天 auto-close (Phase 3D) ───────────────────
// 每天台灣 04:00 跑一次，把 admin 已回覆但玩家 30 天沒回應的 thread 自動標記 closed。
// 只收 status='awaiting_player'（admin 已盡責；玩家用沉默表達「夠了」）。
// 不動 awaiting_admin / new（這是 admin 未處理，不該由系統替 admin 自動消音玩家）。
// 設計選擇：只動 status flag、不刪 message 子集合與主文件，玩家在「我的留言」仍能滾回頭看歷史。
// Admin SDK 寫入繞過 firestore.rules，無需修改規則。
exports.autoCloseInactiveThreads = onSchedule(
  {
    schedule: '0 4 * * *',           // 每天台灣時間 04:00
    timeZone: 'Asia/Taipei',
    region: 'us-central1',           // 與既有 functions 一致
  },
  async () => {
    const db = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    // 複合 query 需要索引（status ASC + lastMessageAt ASC）
    // 首次部署後手動 trigger，console 會回索引建立連結
    const snap = await db.collection('feedback')
      .where('status', '==', FEEDBACK_EVENTS.auto_close_30d.from[0])  // 'awaiting_player'
      .where('lastMessageAt', '<=', cutoff)
      .get();

    if (snap.empty) {
      console.log('autoCloseInactiveThreads: no threads to close');
      return;
    }

    // batch update（單次 batch 上限 500，預期遠低於上限）
    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, autoCloseUpdate({ serverTimestamp: now }));  // status closed / closedBy 'system:auto_30d'
    });
    await batch.commit();

    console.log(`autoCloseInactiveThreads: closed ${snap.size} threads`);
  }
);
