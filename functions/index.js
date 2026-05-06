// Bible-game Cloud Functions
const { setGlobalOptions } = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

setGlobalOptions({ maxInstances: 10 });
admin.initializeApp();

const lineChannelSecret = defineSecret('LINE_CHANNEL_SECRET');
const googleAiApiKey = defineSecret('GOOGLE_AI_API_KEY');
const LINE_CHANNEL_ID = '2009801861';
const ALLOWED_ORIGINS = [
  'https://st00777.github.io',                        // prod (GitHub Pages)
  'https://bible-game-bcb84--dev-01luz2yz.web.app',   // dev preview (Firebase Hosting channel)
];

// AI 失敗時回給玩家的 fallback 文字。
// ⚠️ 修改這句要同步：bible-game-v2.html（client-side 備用）+ scripts/analyze-feedback.js（用來辨識 fallback 回應）
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
      generationConfig: { maxOutputTokens: 1500, temperature: 0.9 },
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
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
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

    const { chapter, reflectionTitle, playerText, uid } = req.body;
    if (!playerText) {
      res.status(400).json({ error: 'Missing playerText' });
      return;
    }
    // 紀錄玩家身份（不是必填，訪客 / 未登入時為 'anonymous'），讓 logs 能 cross reference 玩家行為與 bug 回報
    const callerId = uid || 'anonymous';
    console.log(`aiReflection call: uid=${callerId} chapter=${chapter || ''} title=${reflectionTitle || ''} textLen=${playerText.length}`);

    const systemPrompt = `你是一位溫暖的靈修同伴。使用者正在讀${chapter || '聖經'}，默想主題是「${reflectionTitle || '靈修'}」。

規則：
- 用繁體中文
- 只輸出2-3句回應，不要輸出其他任何內容
- 不要輸出思考過程、選項比較、草稿或修改紀錄
- 像朋友同行，溫暖有洞見，不說教
- 不要使用表情符號
- 直接回應，不要加稱呼語（如「親愛的朋友」）`;

    try {
      const apiKey = googleAiApiKey.value();
      const aiResponse = await callGoogleAI(GEMINI_MODEL, systemPrompt, playerText, apiKey);
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
