# ストア申請ガイド

このドキュメントでは、Slope LinkアプリをApp StoreとGoogle Play Storeに申請するために必要な資材と手順を説明します。

## 必要な資材チェックリスト

### 共通資材

- [ ] **アプリアイコン** (1024x1024px, PNG, 角丸なし)
- [ ] **アプリ名**: Slope Link
- [ ] **アプリの説明** (日本語・英語)
- [ ] **キーワード** (App Store用、100文字以内)
- [ ] **カテゴリー**: ソーシャルネットワーキング / ライフスタイル
- [ ] **年齢制限**: 18歳以上推奨
- [ ] **プライバシーポリシーURL**: https://slopelink.app/privacy (要準備)
- [ ] **利用規約URL**: https://slopelink.app/terms (要準備)
- [ ] **サポートURL**: https://slopelink.app/support (要準備)
- [ ] **マーケティングURL**: https://slopelink.app (要準備)

### iOS (App Store)

- [ ] **スクリーンショット** (必須)
  - iPhone 6.7" (1290x2796px): 3-10枚
  - iPhone 6.5" (1284x2778px): 3-10枚
  - iPhone 5.5" (1242x2208px): オプション
  - iPad Pro 12.9" (2048x2732px): オプション

- [ ] **プレビュー動画** (オプション、15-30秒)

- [ ] **Apple Developer Account**
  - Team ID
  - Bundle ID: `com.slopelink.app`
  - App ID

- [ ] **証明書とプロビジョニングプロファイル**
  - Distribution Certificate
  - Production Provisioning Profile

### Android (Google Play Store)

- [ ] **スクリーンショット** (必須)
  - Phone (16:9, 1920x1080px): 2-8枚
  - Tablet (16:9, 2560x1440px): オプション

- [ ] **Feature Graphic** (1024x500px)
  - アプリの代表画像

- [ ] **プロモーション動画** (YouTube URL、オプション)

- [ ] **Google Play Developer Account**
  - デベロッパーアカウント登録 ($25 一回払い)
  - Package name: `com.slopelink.app`

- [ ] **署名キー**
  - Keystore ファイル
  - Key alias, password

---

## 1. アプリアイコン

### 要件

- **サイズ**: 1024x1024px
- **フォーマット**: PNG (透過なし)
- **デザイン**:
  - シンプルで視認性が高い
  - アプリの目的が一目でわかる
  - スキー・スノーボードをイメージさせる
  - 角丸やドロップシャドウは不要（OSが自動的に適用）

### 現在のアイコン

現在のアイコンは `/assets/images/icon.png` にあります。
本番用に正式なデザインを用意することを推奨します。

### 推奨デザイン要素

- 雪の結晶
- 山のシルエット
- スキー/スノーボード
- 「Slope Link」の文字（オプション）
- ブランドカラー: #5A7D9A (青系)

---

## 2. スクリーンショット

### 撮影のポイント

1. **主要機能を網羅**
   - ホーム画面（イベント一覧）
   - イベント詳細
   - イベント作成
   - プロフィール
   - チャット機能
   - スノーフィード（SNS機能）

2. **魅力的な見せ方**
   - 実際のデータを使用（ダミーデータではなく）
   - 明るく鮮やかな画像
   - 読みやすいフォントサイズ
   - テキストオーバーレイで機能を説明（オプション）

3. **撮影方法**
   - Expo/React Native: React Native Devtools のスクリーンショット機能
   - iOS Simulator: `Cmd + S`
   - Android Emulator: 画面右側のカメラアイコン
   - 実機: 通常のスクリーンショット機能

### 推奨スクリーンショット構成（iOS）

1. **ホーム画面** - イベント一覧
2. **イベント詳細** - イベント情報と参加ボタン
3. **イベント作成** - 新規イベント作成フォーム
4. **チャット** - イベントチャット画面
5. **プロフィール** - ユーザープロフィール
6. **スノーフィード** - ソーシャル投稿一覧

### サイズ調整ツール

- [Screely](https://www.screely.com/) - スクリーンショットに枠を追加
- [AppLaunchpad](https://theapplaunchpad.com/) - App Store向けスクリーンショット生成
- [Figma](https://www.figma.com/) - カスタムデザイン

---

## 3. アプリ説明文

### 日本語版

#### タイトル（30文字以内）
```
Slope Link - スキー仲間探しアプリ
```

#### サブタイトル（30文字以内、App Store）
```
ゲレンデで新しい仲間と出会おう
```

#### 説明文（4000文字以内）

```
Slope Linkは、スキーやスノーボードを愛する人たちのためのソーシャルアプリです。

【主な機能】

🎿 イベント機能
- スキー・スノーボードイベントを作成・参加
- 近くのゲレンデでイベントを検索
- スキルレベル別にマッチング
- イベントチャットで参加者と交流

❄️ スノーフィード
- 滑走記録や写真をシェア
- 他のユーザーの投稿にいいね・コメント
- リフト券情報や天気情報を共有

👥 プロフィール
- スキルレベル、ライディングスタイルを登録
- 行ったことのあるゲレンデを記録
- 参加イベント履歴を確認

💬 チャット機能
- イベント参加者とリアルタイムでチャット
- 集合場所や時間の調整が簡単

🔔 通知機能
- 新しいイベントの通知
- チャットメッセージの通知
- イベント参加承認の通知

【こんな方におすすめ】

✅ 一人でゲレンデに行くことが多い
✅ 新しいスキー・スノボ仲間が欲しい
✅ 自分と同じレベルの人と滑りたい
✅ ローカルゲレンデの情報を知りたい
✅ スキー・スノボの楽しさをシェアしたい

【安全性とプライバシー】

Slope Linkは、ユーザーの安全とプライバシーを最優先に考えています。
- 18歳以上推奨
- プロフィール情報は自分でコントロール
- 不適切なユーザーの報告機能
- 個人情報は厳重に保護

ウィンタースポーツをもっと楽しく、もっと安全に。
Slope Linkで新しい出会いと冒険を始めましょう！

---
お問い合わせ: support@slopelink.app
```

### 英語版

#### Title (30 characters)
```
Slope Link - Ski Buddy Finder
```

#### Subtitle (30 characters, App Store)
```
Meet new friends on the slopes
```

#### Description (4000 characters)

```
Slope Link is the social app for ski and snowboard enthusiasts to connect, share experiences, and find riding buddies.

【Key Features】

🎿 Events
- Create and join ski/snowboard events
- Find events at nearby resorts
- Match with riders of similar skill levels
- Chat with event participants

❄️ Snow Feed
- Share your rides and photos
- Like and comment on other users' posts
- Share lift ticket info and weather updates

👥 Profile
- Register your skill level and riding style
- Track resorts you've visited
- View your event participation history

💬 Chat
- Real-time chat with event participants
- Easy coordination for meetup times and locations

🔔 Notifications
- New event alerts
- Chat message notifications
- Event participation approvals

【Perfect For】

✅ Solo riders looking for company
✅ Anyone wanting to make new ski/snowboard friends
✅ Riders seeking partners at their skill level
✅ Those interested in local resort information
✅ People who love sharing their winter sports experiences

【Safety and Privacy】

Slope Link prioritizes user safety and privacy.
- Recommended for ages 18+
- Full control over your profile information
- Report inappropriate users
- Personal information strictly protected

Make winter sports more fun and safer.
Start your new adventures with Slope Link!

---
Contact: support@slopelink.app
```

---

## 4. キーワード（App Store、100文字以内）

```
スキー,スノーボード,ゲレンデ,イベント,仲間,マッチング,ウィンタースポーツ,SNS,チャット,雪山
```

英語:
```
ski,snowboard,skiing,snowboarding,resort,event,social,chat,winter,sports,buddy,finder
```

---

## 5. Feature Graphic (Android のみ)

### 要件

- **サイズ**: 1024x500px
- **フォーマット**: PNG または JPEG
- **内容**: アプリの主要機能を視覚的に表現

### 推奨デザイン

- アプリ名 「Slope Link」を大きく表示
- 背景: 雪山やゲレンデの写真
- キャッチコピー:「スキー仲間と出会おう」
- 主要機能のアイコン（イベント、チャット、SNS）

---

## 6. プライバシー関連

### プライバシーポリシーとデータ使用

#### 収集するデータ

- **個人情報**
  - 名前（ニックネーム）
  - メールアドレス
  - プロフィール写真
  - 生年月日
  - 性別
  - 居住地域

- **使用データ**
  - スキルレベル
  - ライディングスタイル
  - 訪問したゲレンデ
  - イベント参加履歴

- **位置情報**
  - ゲレンデ検索のため（オプション）

#### データの使用目的

- サービス提供
- ユーザー間のマッチング
- イベント管理
- 通知送信
- サービス改善

#### 第三者との共有

- イベント参加者間でのプロフィール情報共有
- 法的要件がある場合のみ

---

## 7. 年齢制限

### 推奨: 18歳以上

理由:
- ユーザー間の直接的な交流がある
- 位置情報を使用する
- イベント参加による現実世界での出会い

---

## 8. カテゴリー

### App Store
- **Primary**: ソーシャルネットワーキング
- **Secondary**: ライフスタイル

### Google Play Store
- **Primary**: ソーシャル
- **Secondary**: ライフスタイル

---

## 9. 申請前チェックリスト

### 技術要件

- [ ] アプリが crash せずに動作する
- [ ] すべての主要機能が正常に動作する
- [ ] ローディング状態が適切に表示される
- [ ] エラーハンドリングが実装されている
- [ ] オフラインモードで基本機能が使える
- [ ] プライバシーポリシーと利用規約が表示される
- [ ] アカウント削除機能が実装されている

### デザイン要件

- [ ] App Store / Play Store のガイドラインに準拠
- [ ] すべての画面でダークモード対応
- [ ] アクセシビリティ（文字サイズ、コントラスト）
- [ ] 全画面でローディング・エラー状態を実装

### ドキュメント

- [ ] README.md が最新
- [ ] プライバシーポリシーが公開されている
- [ ] 利用規約が公開されている
- [ ] サポートページが用意されている

### セキュリティ

- [ ] 環境変数がすべて設定されている
- [ ] API キーが安全に管理されている
- [ ] ユーザーデータが暗号化されている
- [ ] HTTPS 通信のみ使用

---

## 10. 申請手順

### iOS (App Store)

1. **Apple Developer アカウント登録**
   - https://developer.apple.com/
   - 年間 $99

2. **App Store Connect でアプリ作成**
   - Bundle ID: `com.slopelink.app`
   - アプリ名: Slope Link
   - 説明文、スクリーンショット、カテゴリー等を入力

3. **EAS Build でビルド作成**
   ```bash
   eas build --profile production --platform ios
   ```

4. **EAS Submit で申請**
   ```bash
   eas submit --platform ios
   ```

5. **審査待ち**
   - 通常 1-3 日
   - 追加情報を求められる場合あり

### Android (Google Play Store)

1. **Google Play Console アカウント登録**
   - https://play.google.com/console
   - 一回払い $25

2. **アプリ作成**
   - Package name: `com.slopelink.app`
   - アプリ名: Slope Link
   - 説明文、スクリーンショット、カテゴリー等を入力

3. **EAS Build でビルド作成**
   ```bash
   eas build --profile production --platform android
   ```

4. **EAS Submit で申請**
   ```bash
   eas submit --platform android
   ```

5. **審査待ち**
   - 通常 数時間〜3日
   - 審査が比較的早い

---

## 11. リジェクト対策

### よくあるリジェクト理由

1. **プライバシーポリシー不足**
   - 解決: プライバシーポリシーを公開URL で提供

2. **アカウント削除機能がない**
   - 解決: 設定画面にアカウント削除機能を追加

3. **クラッシュやバグ**
   - 解決: 十分なテストを実施

4. **スクリーンショットが不適切**
   - 解決: 高品質で魅力的なスクリーンショットを用意

5. **年齢制限が適切でない**
   - 解決: 18歳以上に設定

---

## 12. リリース後

### モニタリング

- [ ] Sentry でエラー監視
- [ ] Amplitude でユーザー行動分析
- [ ] App Store / Play Store のレビュー確認
- [ ] ユーザーフィードバック収集

### アップデート計画

- バグ修正: 即座にリリース
- 新機能: 2-4週間ごと
- メジャーアップデート: 3-6ヶ月ごと

---

## 参考リンク

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Human Interface Guidelines (iOS)](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design (Android)](https://material.io/design)
