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
          最終更新日: 2025年12月11日
        </Text>

        <Text style={[styles.introText, { color: colors.textSecondary }]}>
          本アプリケーション「SlopeLink」（以下「本アプリ」といいます）は、ユーザーの個人情報の保護を重要視し、個人情報の保護に関する法律、その他関係法令を遵守して、以下のプライバシーポリシー（以下「本ポリシー」といいます）に従い、適切に取り扱います。
        </Text>

        {/* Section 1 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. 個人情報の定義</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本ポリシーにおいて「個人情報」とは、個人情報の保護に関する法律に規定される「個人情報」を指し、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、メールアドレス、その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. 個人情報の収集方法</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、ユーザーが利用登録をする際に、以下の個人情報をお尋ねすることがあります。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            • 氏名（ニックネーム）{'\n'}
            • メールアドレス{'\n'}
            • プロフィール写真{'\n'}
            • 生年月日{'\n'}
            • 性別{'\n'}
            • 居住地域{'\n'}
            • スキーまたはスノーボードのレベル{'\n'}
            • 利用スキー場の履歴{'\n'}
            • その他、本アプリの提供に必要な情報
          </Text>
        </View>

        {/* Section 3 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. 個人情報を収集・利用する目的</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリが個人情報を収集・利用する目的は、以下のとおりです。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            (1) 本アプリのサービス提供・運営のため{'\n'}
            (2) ユーザーからのお問い合わせに回答するため{'\n'}
            (3) ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等の案内のメールを送付するため{'\n'}
            (4) メンテナンス、重要なお知らせなど必要に応じたご連絡のため{'\n'}
            (5) 利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため{'\n'}
            (6) ユーザーにご自身の登録情報の閲覧や変更、削除、ご利用状況の閲覧を行っていただくため{'\n'}
            (7) マッチング機能の提供のため{'\n'}
            (8) イベント参加者の管理のため{'\n'}
            (9) サービスの改善、新サービスの開発のため{'\n'}
            (10) 上記の利用目的に付随する目的
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. 利用目的の変更</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、個人情報の利用目的を変更するものとします。利用目的の変更を行った場合には、変更後の目的について、本アプリ所定の方法により、ユーザーに通知し、または本アプリ上に公表するものとします。
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>5. 個人情報の第三者提供</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            (1) 人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき{'\n'}
            (2) 公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき{'\n'}
            (3) 国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき{'\n'}
            (4) 予め次の事項を告知あるいは公表し、かつ本アプリが個人情報保護委員会に届出をしたとき
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>6. 個人情報の開示</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、本人から個人情報の開示を求められたときは、本人に対し、遅滞なくこれを開示します。ただし、開示することにより次のいずれかに該当する場合は、その全部または一部を開示しないこともあり、開示しない決定をした場合には、その旨を遅滞なく通知します。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            (1) 本人または第三者の生命、身体、財産その他の権利利益を害するおそれがある場合{'\n'}
            (2) 本アプリの業務の適正な実施に著しい支障を及ぼすおそれがある場合{'\n'}
            (3) その他法令に違反することとなる場合
          </Text>
        </View>

        {/* Section 7 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>7. 個人情報の訂正および削除</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            1. ユーザーは、本アプリの保有する自己の個人情報が誤った情報である場合には、本アプリが定める手続きにより、本アプリに対して個人情報の訂正、追加または削除（以下「訂正等」といいます）を請求することができます。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            2. 本アプリは、ユーザーから前項の請求を受けてその請求に応じる必要があると判断した場合には、遅滞なく、当該個人情報の訂正等を行うものとします。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            3. 本アプリは、前項の規定に基づき訂正等を行った場合、または訂正等を行わない旨の決定をしたときは遅滞なく、これをユーザーに通知します。
          </Text>
        </View>

        {/* Section 8 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>8. 個人情報の利用停止等</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、本人から、個人情報が、利用目的の範囲を超えて取り扱われているという理由、または不正の手段により取得されたものであるという理由により、その利用の停止または消去（以下「利用停止等」といいます）を求められた場合には、遅滞なく必要な調査を行います。前項の調査結果に基づき、その請求に応じる必要があると判断した場合には、遅滞なく、当該個人情報の利用停止等を行います。
          </Text>
        </View>

        {/* Section 9 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Cookie（クッキー）その他の技術の利用</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、Cookieおよびこれに類する技術を利用することがあります。これらの技術は、本アプリによる本サービスの利用状況等の把握に役立ち、サービス向上に資するものです。Cookieを無効化されたいユーザーは、ウェブブラウザまたはアプリの設定でCookieを無効化することができます。ただし、Cookieを無効化すると、本アプリの一部の機能をご利用いただけなくなる場合があります。
          </Text>
        </View>

        {/* Section 10 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>10. 位置情報の取得</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、サービス提供のために、ユーザーの位置情報を取得する場合があります。位置情報は、スキー場の検索、近くのユーザーとのマッチング、イベント参加者の位置確認などのサービス向上のために利用されます。位置情報の利用を希望されない場合は、端末の設定から位置情報サービスをオフにすることができます。
          </Text>
        </View>

        {/* Section 11 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>11. プッシュ通知</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、イベントの通知、メッセージの受信、その他サービスに関する重要な情報をお知らせするために、プッシュ通知を送信することがあります。プッシュ通知の受信を希望されない場合は、端末の設定またはアプリ内の通知設定から変更することができます。
          </Text>
        </View>

        {/* Section 12 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>12. 個人情報の安全管理</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、個人情報の正確性及び安全性確保のために、セキュリティ対策を講じ、個人情報への不正アクセスや個人情報の紛失、破壊、改ざん及び漏洩などを防止するための合理的な措置を講じます。
          </Text>
        </View>

        {/* Section 13 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>13. 未成年者の個人情報</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本アプリは、18歳未満の方からの個人情報の収集は想定しておりません。18歳未満の方が本アプリを利用する場合は、保護者の同意を得た上でご利用ください。
          </Text>
        </View>

        {/* Section 14 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>14. プライバシーポリシーの変更</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく、変更することができるものとします。変更後のプライバシーポリシーは、本アプリ内に掲載したときから効力を生じるものとします。
          </Text>
        </View>

        {/* Section 15 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>15. お問い合わせ窓口</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本ポリシーに関するお問い合わせは、アプリ内のお問い合わせフォームまたは以下の窓口までお願いいたします。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            アプリ名: SlopeLink{'\n'}
            お問い合わせ: nodasy0855@gmail.com
          </Text>
        </View>

        <Text style={[styles.endText, { color: colors.textSecondary }]}>
          以上
        </Text>
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
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  endText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
});
