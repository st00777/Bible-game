// LINE login Cloud Function — v2.7
const { setGlobalOptions } = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

setGlobalOptions({ maxInstances: 10 });
admin.initializeApp();

const lineChannelSecret = defineSecret('LINE_CHANNEL_SECRET');
const LINE_CHANNEL_ID = '2009801861';
const ALLOWED_ORIGIN = 'https://st00777.github.io';

exports.lineLogin = onRequest(
  {
    secrets: [lineChannelSecret],
    cors: [ALLOWED_ORIGIN],
    invoker: 'public',
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { code, redirect_uri } = req.body;
    if (!code || !redirect_uri) {
      res.status(400).json({ error: 'Missing code or redirect_uri' });
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
        res.status(400).json({
          error: 'Failed to exchange LINE token',
          status: tokenRes.status,
          detail: lineError,
          redirect_uri_used: redirect_uri,
        });
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
        res.status(400).json({
          error: 'Failed to get LINE profile',
          status: profileRes.status,
          detail: profErrText,
        });
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
