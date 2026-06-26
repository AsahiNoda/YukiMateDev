// Supabase Edge Function: send-notification
// 新しいFCM API (HTTP v1) を使用したプッシュ通知送信

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Firebase Admin SDKの代わりに、直接HTTP v1 APIを使用
interface NotificationPayload {
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Google OAuth 2.0アクセストークンを取得
 * サービスアカウントキーを使用してJWTを生成し、アクセストークンと交換
 */
async function getAccessToken(): Promise<string> {
  // サービスアカウントキー（環境変数から取得）
  const serviceAccountKey = JSON.parse(
    Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY') || '{}'
  );

  if (!serviceAccountKey.private_key) {
    throw new Error('Firebase service account key not configured');
  }

  // JWT作成
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Base64エンコード
  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '');
  const payloadBase64 = btoa(JSON.stringify(payload)).replace(/=/g, '');

  // 署名作成（RS256）
  const signatureInput = `${headerBase64}.${payloadBase64}`;

  // SubtleCryptoでRSA署名
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccountKey.private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(signatureInput)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${signatureInput}.${signatureBase64}`;

  // JWTをアクセストークンに交換
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * PEM形式の秘密鍵をArrayBufferに変換
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * FCM HTTP v1 APIを使用してプッシュ通知を送信
 */
async function sendPushNotification(payload: NotificationPayload): Promise<void> {
  const { fcmToken, title, body, data } = payload;

  // アクセストークンを取得
  const accessToken = await getAccessToken();

  // Firebase プロジェクトID（環境変数から取得）
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');

  if (!projectId) {
    throw new Error('Firebase project ID not configured');
  }

  // FCM HTTP v1 API エンドポイント
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  // 通知ペイロード
  const message = {
    message: {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    },
  };

  // FCMに送信
  const response = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`FCM error: ${JSON.stringify(errorData)}`);
  }

  console.log('✅ Push notification sent successfully');
}

/**
 * Edge Function のメインハンドラー
 */
serve(async (req) => {
  try {
    // リクエストボディを取得
    const { fcmToken, title, body, data } = await req.json();

    if (!fcmToken || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // プッシュ通知を送信
    await sendPushNotification({ fcmToken, title, body, data });

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending notification:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
