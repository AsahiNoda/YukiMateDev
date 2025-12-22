/**
 * 日本の県名の日本語 ⇄ 英語マッピング
 */

export const PREFECTURE_JP_TO_EN: Record<string, string> = {
  // 北海道
  '北海道': 'Hokkaido',

  // 東北
  '青森県': 'Aomori',
  '岩手県': 'Iwate',
  '宮城県': 'Miyagi',
  '秋田県': 'Akita',
  '山形県': 'Yamagata',
  '福島県': 'Fukushima',

  // 関東
  '茨城県': 'Ibaraki',
  '栃木県': 'Tochigi',
  '群馬県': 'Gunma',
  '埼玉県': 'Saitama',
  '千葉県': 'Chiba',
  '東京都': 'Tokyo',
  '神奈川県': 'Kanagawa',

  // 中部
  '新潟県': 'Niigata',
  '富山県': 'Toyama',
  '石川県': 'Ishikawa',
  '福井県': 'Fukui',
  '山梨県': 'Yamanashi',
  '長野県': 'Nagano',
  '岐阜県': 'Gifu',
  '静岡県': 'Shizuoka',
  '愛知県': 'Aichi',

  // 近畿
  '三重県': 'Mie',
  '滋賀県': 'Shiga',
  '京都府': 'Kyoto',
  '大阪府': 'Osaka',
  '兵庫県': 'Hyogo',
  '奈良県': 'Nara',
  '和歌山県': 'Wakayama',

  // 中国
  '鳥取県': 'Tottori',
  '島根県': 'Shimane',
  '岡山県': 'Okayama',
  '広島県': 'Hiroshima',
  '山口県': 'Yamaguchi',

  // 四国
  '徳島県': 'Tokushima',
  '香川県': 'Kagawa',
  '愛媛県': 'Ehime',
  '高知県': 'Kochi',

  // 九州・沖縄
  '福岡県': 'Fukuoka',
  '佐賀県': 'Saga',
  '長崎県': 'Nagasaki',
  '熊本県': 'Kumamoto',
  '大分県': 'Oita',
  '宮崎県': 'Miyazaki',
  '鹿児島県': 'Kagoshima',
  '沖縄県': 'Okinawa',
};

export const PREFECTURE_EN_TO_JP: Record<string, string> = Object.fromEntries(
  Object.entries(PREFECTURE_JP_TO_EN).map(([jp, en]) => [en, jp])
);

/**
 * 日本語の県名を英語に変換
 * @param japaneseArea 日本語の県名（例：「長野県」）
 * @returns 英語の県名（例：「Nagano」）、マッピングがない場合は元の文字列
 */
export function getPrefectureInEnglish(japaneseArea: string | null): string {
  if (!japaneseArea) return '';
  return PREFECTURE_JP_TO_EN[japaneseArea] || japaneseArea;
}

/**
 * 英語の県名を日本語に変換
 * @param englishPrefecture 英語の県名（例：「Nagano」）
 * @returns 日本語の県名（例：「長野県」）、マッピングがない場合は元の文字列
 */
export function getPrefectureInJapanese(englishPrefecture: string | null): string {
  if (!englishPrefecture) return '';
  return PREFECTURE_EN_TO_JP[englishPrefecture] || englishPrefecture;
}
