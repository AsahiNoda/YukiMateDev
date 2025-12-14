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

export default function TermsOfServiceScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>利用規約</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.updateDate, { color: colors.textSecondary }]}>
          最終更新日: 2025年12月11日
        </Text>

        {/* Section 1 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第1条（適用）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            本規約は、本アプリケーション「YukiMate」（以下「本アプリ」といいます）の利用に関する条件を、本アプリを利用するすべてのユーザー（以下「ユーザー」といいます）と当社との間で定めるものです。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            ユーザーは、本アプリを利用することにより、本規約に同意したものとみなされます。
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第2条（利用登録）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            1. 本アプリの利用を希望する者は、本規約に同意の上、当社所定の方法により利用登録を申請するものとします。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            2. 当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切開示義務を負いません。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            (1) 利用登録の申請に際して虚偽の事項を届け出た場合{'\n'}
            (2) 本規約に違反したことがある者からの申請である場合{'\n'}
            (3) その他、当社が利用登録を適当でないと判断した場合
          </Text>
        </View>

        {/* Section 3 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第3条（アカウント情報の管理）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            1. ユーザーは、自己の責任において、本アプリのアカウント情報を適切に管理するものとします。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            2. ユーザーは、いかなる場合にも、アカウント情報を第三者に譲渡または貸与し、もしくは第三者と共用することはできません。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            3. アカウント情報が盗用され、または第三者に使用されていることが判明した場合、ユーザーは直ちにその旨を当社に通知するものとします。
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第4条（禁止事項）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            ユーザーは、本アプリの利用にあたり、以下の行為をしてはなりません。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            (1) 法令または公序良俗に違反する行為{'\n'}
            (2) 犯罪行為に関連する行為{'\n'}
            (3) 当社、本アプリの他のユーザー、または第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為{'\n'}
            (4) 本アプリのネットワークまたはシステム等に過度な負荷をかける行為{'\n'}
            (5) 本アプリの運営を妨害するおそれのある行為{'\n'}
            (6) 不正アクセスをし、またはこれを試みる行為{'\n'}
            (7) 他のユーザーに関する個人情報等を収集または蓄積する行為{'\n'}
            (8) 不正な目的を持って本アプリを利用する行為{'\n'}
            (9) 本アプリの他のユーザーまたはその他の第三者に不利益、損害、不快感を与える行為{'\n'}
            (10) 他のユーザーに成りすます行為{'\n'}
            (11) 当社が許諾しない本アプリ上での宣伝、広告、勧誘、または営業行為{'\n'}
            (12) その他、当社が不適切と判断する行為
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第5条（本アプリの提供の停止等）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本アプリの全部または一部の提供を停止または中断することができるものとします。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            (1) 本アプリにかかるコンピュータシステムの保守点検または更新を行う場合{'\n'}
            (2) 地震、落雷、火災、停電または天災などの不可抗力により、本アプリの提供が困難となった場合{'\n'}
            (3) コンピュータまたは通信回線等が事故により停止した場合{'\n'}
            (4) その他、当社が本アプリの提供が困難と判断した場合
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第6条（利用制限および登録抹消）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本アプリの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary, marginLeft: 16 }]}>
            (1) 本規約のいずれかの条項に違反した場合{'\n'}
            (2) 登録事項に虚偽の事実があることが判明した場合{'\n'}
            (3) その他、当社が本アプリの利用を適当でないと判断した場合
          </Text>
        </View>

        {/* Section 7 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第7条（免責事項）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            1. 当社は、本アプリに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            2. 当社は、本アプリに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            3. 当社は、本アプリに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
          </Text>
        </View>

        {/* Section 8 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第8条（サービス内容の変更等）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            当社は、ユーザーに通知することなく、本アプリの内容を変更しまたは本アプリの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
          </Text>
        </View>

        {/* Section 9 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第9条（利用規約の変更）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の本規約は、本アプリ内に表示した時点から効力を生じるものとします。
          </Text>
        </View>

        {/* Section 10 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第10条（個人情報の取扱い）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            当社は、本アプリの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。
          </Text>
        </View>

        {/* Section 11 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第11条（通知または連絡）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。
          </Text>
        </View>

        {/* Section 12 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第12条（権利義務の譲渡の禁止）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
          </Text>
        </View>

        {/* Section 13 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第13条（準拠法・裁判管轄）</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            1. 本規約の解釈にあたっては、日本法を準拠法とします。
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            2. 本アプリに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
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
    marginBottom: 24,
    textAlign: 'center',
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
