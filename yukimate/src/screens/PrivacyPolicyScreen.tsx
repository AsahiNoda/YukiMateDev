import { Colors } from '@/constants/theme';
import { IconSymbol } from '@components/ui/icon-symbol';
import { router } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>プライバシーポリシー</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.updateDate, { color: colors.textSecondary }]}>
          最終更新日: 2026年1月5日
        </Text>

        <Text style={[styles.introText, { color: colors.textSecondary }]}>
          [野田あさひ]（以下「運営者」といいます）は、本アプリケーション「Slope Link」（以下「本アプリ」といいます）をご利用のお客様（以下「ユーザー」といいます）の個人情報およびプライバシーの保護を重要視しています。本プライバシーポリシーでは、本アプリにおいて、ユーザーの個人情報をどのように収集、利用、保護するかについて説明します。
        </Text>

        {/* Section 1 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. 収集する情報</Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>1.1 アカウント情報</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリを利用するために、以下の情報を収集します：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • メールアドレス{'\n'}
            • パスワード（暗号化して保存）{'\n'}
            • ユーザーID（自動生成）
          </Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>1.2 プロフィール情報</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            ユーザーが任意で提供する以下の情報を収集します：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • 表示名{'\n'}
            • プロフィール画像（アバター）{'\n'}
            • ヘッダー画像{'\n'}
            • 国コード{'\n'}
            • 使用言語{'\n'}
            • スキルレベル{'\n'}
            • ライディングスタイル{'\n'}
            • 自己紹介文{'\n'}
            • ホームリゾート{'\n'}
            • ギア情報（ボード、バインディング、ブーツ、その他装備）
          </Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>1.3 利用情報</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリの利用に伴い、以下の情報を収集します：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • イベント情報：作成・参加したイベント、イベント申請、参加履歴{'\n'}
            • 投稿・コメント：Snowfeedへの投稿、コメント、いいね{'\n'}
            • チャットメッセージ：イベントチャット内のメッセージおよび画像{'\n'}
            • ソーシャル情報：★登録したユーザー、ブロックしたユーザー{'\n'}
            • 評価・レビュー：リゾート評価、スポットレビュー{'\n'}
            • 報告情報：不適切なコンテンツやユーザーの報告
          </Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>1.4 画像・メディアファイル</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            以下の画像を収集・保存します：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • プロフィール画像（アバター、ヘッダー）{'\n'}
            • イベント写真{'\n'}
            • Snowfeed投稿画像{'\n'}
            • チャットメッセージ内の画像
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            ※ 画像は10MB以下、JPEG/PNG/WebP/GIF形式に制限されます。
          </Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>1.5 位置情報</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリでは、スキーリゾートおよび関連施設（飲食店、温泉など）の位置情報を保存・利用します。ユーザーの現在位置をリアルタイムで収集することはありませんが、リゾートの検出および気象情報の取得のために位置情報を参照します。
          </Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>1.6 デバイス情報</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            以下のデバイス情報を自動的に収集します：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • デバイスの種類（iOS/Android）{'\n'}
            • OSバージョン{'\n'}
            • アプリバージョン{'\n'}
            • デバイスモデル{'\n'}
            • 言語設定{'\n'}
            • プッシュ通知トークン
          </Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>1.7 分析・診断情報</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            アプリの品質向上のため、以下のツールを使用して情報を収集します：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • Sentry：クラッシュレポート、エラー情報、デバッグログ{'\n'}
            • Amplitude：ユーザー行動分析（画面遷移、イベント操作など）{'\n'}
            • Firebase：アプリ分析、パフォーマンス監視
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            ※ これらのツールは、パスワードやトークンなどの機密情報を収集しないよう設定されています。
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. 情報の利用目的</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            収集した情報は、以下の目的で利用します：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            1. サービス提供：アカウント管理、イベント参加、チャット、投稿機能の提供{'\n'}
            2. 機能改善：ユーザー体験の向上、新機能の開発{'\n'}
            3. コミュニケーション：プッシュ通知、重要なお知らせの送信{'\n'}
            4. セキュリティ：不正利用の防止、アカウントの保護{'\n'}
            5. 分析：利用統計の作成、アプリの最適化{'\n'}
            6. カスタマーサポート：お問い合わせ対応、トラブルシューティング{'\n'}
            7. 法令遵守：法的義務の履行
          </Text>
        </View>

        {/* Section 3 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. 情報の共有</Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>3.1 公開情報</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            以下の情報は、他のユーザーに公開されます：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • 表示名、プロフィール画像、自己紹介文{'\n'}
            • スキルレベル、ライディングスタイル、ギア情報{'\n'}
            • 作成したイベント、Snowfeed投稿{'\n'}
            • コメント、いいね{'\n'}
            • リゾート評価、スポットレビュー
          </Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>3.2 第三者サービス</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            以下のサービスプロバイダーと情報を共有することがあります：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • Supabase：データベース、認証、ストレージ管理{'\n'}
            • Sentry：エラー追跡とパフォーマンス監視{'\n'}
            • Amplitude：ユーザー行動分析{'\n'}
            • Firebase/Google：プッシュ通知、アプリ分析
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            これらのサービスは、それぞれのプライバシーポリシーに従って情報を管理します。
          </Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>3.3 法的要請</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            法律、規制、法的手続き、または政府機関からの要請に応じて、ユーザー情報を開示することがあります。
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. データの保存期間</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            ユーザー情報は、以下の期間保存されます：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • アカウント情報：アカウント削除まで{'\n'}
            • 投稿・コメント：削除されるまで、または法的要件に基づく期間{'\n'}
            • チャットメッセージ：削除されるまで{'\n'}
            • 分析データ：最大2年間{'\n'}
            • ログデータ：最大90日間
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>5. データの保護</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            運営者は、ユーザー情報を保護するため、以下のセキュリティ対策を実施しています：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • SSL/TLS暗号化通信{'\n'}
            • パスワードの暗号化保存{'\n'}
            • アクセス制御とアクセス権限管理{'\n'}
            • 定期的なセキュリティ監査{'\n'}
            • データバックアップ
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>6. ユーザーの権利</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            ユーザーは、自身の個人情報に関して以下の権利を有します：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • アクセス権：保存されている個人情報の確認{'\n'}
            • 訂正権：誤った情報の訂正{'\n'}
            • 削除権：個人情報の削除要請（アカウント削除）{'\n'}
            • データポータビリティ：データのエクスポート{'\n'}
            • 異議申し立て：情報処理方法への異議
          </Text>

          <Text style={[styles.subSectionTitle, { color: colors.text }]}>6.1 アカウント削除</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            アカウントを削除すると、以下のデータがすべて削除されます：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • プロフィール情報{'\n'}
            • 投稿・コメント・いいね{'\n'}
            • イベント参加履歴{'\n'}
            • チャットメッセージ{'\n'}
            • ★登録・ブロックリスト{'\n'}
            • 画像・メディアファイル{'\n'}
            • 認証情報
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            アカウント削除方法：アプリ内の設定画面からアカウントを削除できます。
          </Text>
          <Text style={[styles.highlight, { color: colors.text, backgroundColor: '#fff3cd' }]}>
            注意：アカウント削除は取り消せません。削除されたデータは復元できませんので、慎重にご検討ください。
          </Text>
        </View>

        {/* Section 7 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>7. プッシュ通知</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリでは、以下の通知を送信することがあります：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • イベント申請の承認・却下通知{'\n'}
            • イベント開始リマインダー{'\n'}
            • イベントキャンセル通知{'\n'}
            • 新規参加者・申請通知（ホスト向け）{'\n'}
            • ★登録ユーザーのイベント参加通知{'\n'}
            • イベント後評価リマインダー{'\n'}
            • チャットメッセージ通知
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            通知設定は、アプリ内の「設定」→「通知設定」から変更できます。
          </Text>
        </View>

        {/* Section 8 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Cookie・類似技術</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリでは、Cookieの代わりにローカルストレージ（AsyncStorage）を使用して、以下の情報を保存します：
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • セッション情報{'\n'}
            • 通知設定{'\n'}
            • 言語設定{'\n'}
            • オフラインキャッシュ
          </Text>
        </View>

        {/* Section 9 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>9. 子供のプライバシー</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、13歳未満のお子様を対象としていません。13歳未満のお子様の個人情報を故意に収集することはありません。万が一、13歳未満のお子様の情報が収集されていることが判明した場合、速やかに削除します。
          </Text>
        </View>

        {/* Section 10 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>10. 国際データ転送</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、Supabase（米国）およびその他のサービスプロバイダーを利用しており、ユーザー情報が国外に転送される場合があります。これらのサービスは、適切なセキュリティ対策を実施しています。
          </Text>
        </View>

        {/* Section 11 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>11. プライバシーポリシーの変更</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            運営者は、本プライバシーポリシーを随時更新することがあります。重要な変更がある場合は、アプリ内通知またはメールでお知らせします。最新版は常に本ページで確認できます。
          </Text>
        </View>

        {/* Section 12 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>12. お問い合わせ</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            運営者情報
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            運営者：野田あさひ（個人開発者）{'\n'}
            連絡先：slopelinkdev@gmail.com
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本プライバシーポリシーに関するご質問、個人情報の開示・訂正・削除のご要望は、上記メールアドレスまでお問い合わせください。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  updateDate: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 24,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 22,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  highlight: {
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  endText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
});
