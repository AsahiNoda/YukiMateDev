# Firebase セットアップガイド

このドキュメントでは、YukiMateアプリでAndroidプッシュ通知を有効化するためのFirebase設定手順を説明します。

## 前提条件

- Google アカウント
- Firebase Console へのアクセス権限
- Android Studio インストール済み（オプション、署名キー生成に必要）

## 手順

### 1. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名: `YukiMate` (または任意の名前)
4. Google Analytics の有効化（推奨）
5. プロジェクトを作成

### 2. Android アプリの追加

1. Firebase Console で作成したプロジェクトを開く
2. 「Android アプリを Firebase に追加」をクリック
3. 以下の情報を入力:
   - **Android パッケージ名**: `com.yukimate.app`
   - **アプリのニックネーム**: `YukiMate` (オプション)
   - **デバッグ用の署名証明書 SHA-1**: (後で追加可能)
4. 「アプリを登録」をクリック

### 3. google-services.json のダウンロード

1. Firebase Console から `google-services.json` をダウンロード
2. ファイルを以下の場所に配置:
   ```
   yukimate/android/app/google-services.json
   ```
3. ⚠️ **重要**: `.gitignore` に以下を追加して、このファイルが Git にコミットされないようにする:
   ```
   # Firebase
   google-services.json
   ```

### 4. Firebase SDK の設定（Expo の場合は自動化）

Expo を使用している場合、`google-services.json` を配置するだけで、EAS Build が自動的に Firebase SDK を統合します。

手動で設定する場合は、以下の手順を実行:

#### android/build.gradle

```gradle
buildscript {
    dependencies {
        // Firebase プラグインを追加
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

#### android/app/build.gradle

```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    // Firebase Messaging を追加
    implementation 'com.google.firebase:firebase-messaging:23.1.2'
}
```

### 5. FCM サーバーキーの取得

1. Firebase Console で「プロジェクトの設定」を開く
2. 「クラウド メッセージング」タブをクリック
3. 「サーバーキー」をコピー
4. Supabase の Edge Functions または通知サービスで使用

### 6. Expo アプリでの Firebase 設定

#### app.json または app.config.js に追加

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./android/app/google-services.json"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#5A7D9A",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ]
  }
}
```

### 7. useNotifications.ts の更新

`src/hooks/useNotifications.ts` の Android 設定を有効化:

```typescript
// ❌ 削除: 以下のコメントアウトを解除
// if (Platform.OS === 'android') {
//   // TODO: Firebase設定が完了したら有効化
//   return;
// }

// ✅ 追加: Android でも通知を有効化
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#5A7D9A',
  });
}
```

### 8. テスト

#### ローカルテスト

```bash
# Development ビルドを作成
eas build --profile development --platform android

# デバイスにインストール
adb install path/to/your-app.apk

# 通知をテスト
```

#### Firebase Console からテスト

1. Firebase Console で「Cloud Messaging」を開く
2. 「新しいキャンペーン」→「Firebase Cloud Messaging」
3. 通知のタイトルと本文を入力
4. ターゲット: アプリを選択
5. 「テストメッセージを送信」をクリック
6. デバイスの FCM トークンを入力（アプリ起動時にログから取得）

### 9. プロダクション環境の設定

#### EAS Secrets に FCM サーバーキーを追加

```bash
eas secret:create --scope project --name FIREBASE_SERVER_KEY --value your_server_key_here
```

#### Supabase Edge Function での使用

```typescript
const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY');

const sendNotification = async (fcmToken: string, title: string, body: string) => {
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FIREBASE_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: fcmToken,
      notification: {
        title,
        body,
        sound: 'default',
      },
      data: {
        // カスタムデータ
      },
    }),
  });

  return response.json();
};
```

## トラブルシューティング

### 通知が届かない

1. **FCM トークンが取得できているか確認**
   - アプリ起動時にログを確認: `console.log('FCM Token:', token)`

2. **google-services.json が正しい場所にあるか確認**
   - `android/app/google-services.json`

3. **Firebase Console でアプリが正しく登録されているか確認**
   - パッケージ名が `com.yukimate.app` になっているか

4. **Android 通知チャンネルが設定されているか確認**
   - `useNotifications.ts` の Android 設定を確認

5. **デバイスの通知設定を確認**
   - アプリの通知が有効になっているか
   - 端末の「設定」→「アプリ」→「YukiMate」→「通知」

### ビルドエラー

1. **google-services.json のフォーマットエラー**
   - Firebase Console から再ダウンロード
   - JSON フォーマットが正しいか確認

2. **Gradle 同期エラー**
   - Android Studio で「File」→「Sync Project with Gradle Files」
   - Gradle キャッシュをクリア: `./gradlew clean`

## セキュリティ

- ⚠️ **FCM サーバーキーは絶対に公開しない**
- ⚠️ **google-services.json を Git にコミットしない**
- ⚠️ **EAS Secrets を使用して環境変数を管理**

## 参考リンク

- [Firebase Cloud Messaging (FCM)](https://firebase.google.com/docs/cloud-messaging)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [EAS Build and Google Services](https://docs.expo.dev/build-reference/android-credentials/#google-servicesjson)
- [Firebase Console](https://console.firebase.google.com/)
