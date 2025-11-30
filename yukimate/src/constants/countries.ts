/**
 * Country list with ISO 3166-1 alpha-2 codes and Japanese names
 * Sorted by popularity for snowboarding
 */

export interface Country {
  code: string;
  nameJa: string;
  nameEn: string;
}

export const COUNTRIES: Country[] = [
  // Major snowboarding countries (top section)
  { code: 'JP', nameJa: '日本', nameEn: 'Japan' },
  { code: 'US', nameJa: 'アメリカ', nameEn: 'United States' },
  { code: 'CA', nameJa: 'カナダ', nameEn: 'Canada' },
  { code: 'AU', nameJa: 'オーストラリア', nameEn: 'Australia' },
  { code: 'NZ', nameJa: 'ニュージーランド', nameEn: 'New Zealand' },
  { code: 'FR', nameJa: 'フランス', nameEn: 'France' },
  { code: 'CH', nameJa: 'スイス', nameEn: 'Switzerland' },
  { code: 'AT', nameJa: 'オーストリア', nameEn: 'Austria' },
  { code: 'IT', nameJa: 'イタリア', nameEn: 'Italy' },
  { code: 'DE', nameJa: 'ドイツ', nameEn: 'Germany' },
  { code: 'NO', nameJa: 'ノルウェー', nameEn: 'Norway' },
  { code: 'SE', nameJa: 'スウェーデン', nameEn: 'Sweden' },
  { code: 'FI', nameJa: 'フィンランド', nameEn: 'Finland' },
  { code: 'KR', nameJa: '韓国', nameEn: 'South Korea' },
  { code: 'CN', nameJa: '中国', nameEn: 'China' },

  // Other countries (alphabetical by English name)
  { code: 'AR', nameJa: 'アルゼンチン', nameEn: 'Argentina' },
  { code: 'BE', nameJa: 'ベルギー', nameEn: 'Belgium' },
  { code: 'BR', nameJa: 'ブラジル', nameEn: 'Brazil' },
  { code: 'BG', nameJa: 'ブルガリア', nameEn: 'Bulgaria' },
  { code: 'CL', nameJa: 'チリ', nameEn: 'Chile' },
  { code: 'CZ', nameJa: 'チェコ', nameEn: 'Czech Republic' },
  { code: 'DK', nameJa: 'デンマーク', nameEn: 'Denmark' },
  { code: 'EE', nameJa: 'エストニア', nameEn: 'Estonia' },
  { code: 'GB', nameJa: 'イギリス', nameEn: 'United Kingdom' },
  { code: 'GR', nameJa: 'ギリシャ', nameEn: 'Greece' },
  { code: 'HK', nameJa: '香港', nameEn: 'Hong Kong' },
  { code: 'HU', nameJa: 'ハンガリー', nameEn: 'Hungary' },
  { code: 'IS', nameJa: 'アイスランド', nameEn: 'Iceland' },
  { code: 'IN', nameJa: 'インド', nameEn: 'India' },
  { code: 'IE', nameJa: 'アイルランド', nameEn: 'Ireland' },
  { code: 'IL', nameJa: 'イスラエル', nameEn: 'Israel' },
  { code: 'LV', nameJa: 'ラトビア', nameEn: 'Latvia' },
  { code: 'LT', nameJa: 'リトアニア', nameEn: 'Lithuania' },
  { code: 'MX', nameJa: 'メキシコ', nameEn: 'Mexico' },
  { code: 'NL', nameJa: 'オランダ', nameEn: 'Netherlands' },
  { code: 'PL', nameJa: 'ポーランド', nameEn: 'Poland' },
  { code: 'PT', nameJa: 'ポルトガル', nameEn: 'Portugal' },
  { code: 'RO', nameJa: 'ルーマニア', nameEn: 'Romania' },
  { code: 'RU', nameJa: 'ロシア', nameEn: 'Russia' },
  { code: 'SG', nameJa: 'シンガポール', nameEn: 'Singapore' },
  { code: 'SK', nameJa: 'スロバキア', nameEn: 'Slovakia' },
  { code: 'SI', nameJa: 'スロベニア', nameEn: 'Slovenia' },
  { code: 'ZA', nameJa: '南アフリカ', nameEn: 'South Africa' },
  { code: 'ES', nameJa: 'スペイン', nameEn: 'Spain' },
  { code: 'TW', nameJa: '台湾', nameEn: 'Taiwan' },
  { code: 'TH', nameJa: 'タイ', nameEn: 'Thailand' },
  { code: 'TR', nameJa: 'トルコ', nameEn: 'Turkey' },
  { code: 'UA', nameJa: 'ウクライナ', nameEn: 'Ukraine' },
];

/**
 * Flag image mappings
 * React Native requires static paths for require()
 */
const FLAG_IMAGES: Record<string, any> = {
  jp: require('../../assets/images/flags/jp.png'),
  us: require('../../assets/images/flags/us.png'),
  ca: require('../../assets/images/flags/ca.png'),
  au: require('../../assets/images/flags/au.png'),
  nz: require('../../assets/images/flags/nz.png'),
  fr: require('../../assets/images/flags/fr.png'),
  ch: require('../../assets/images/flags/ch.png'),
  at: require('../../assets/images/flags/at.png'),
  it: require('../../assets/images/flags/it.png'),
  de: require('../../assets/images/flags/de.png'),
  no: require('../../assets/images/flags/no.png'),
  se: require('../../assets/images/flags/se.png'),
  fi: require('../../assets/images/flags/fi.png'),
  kr: require('../../assets/images/flags/kr.png'),
  cn: require('../../assets/images/flags/cn.png'),
  ar: require('../../assets/images/flags/ar.png'),
  be: require('../../assets/images/flags/be.png'),
  br: require('../../assets/images/flags/br.png'),
  bg: require('../../assets/images/flags/bg.png'),
  cl: require('../../assets/images/flags/cl.png'),
  cz: require('../../assets/images/flags/cz.png'),
  dk: require('../../assets/images/flags/dk.png'),
  ee: require('../../assets/images/flags/ee.png'),
  gb: require('../../assets/images/flags/gb.png'),
  gr: require('../../assets/images/flags/gr.png'),
  hk: require('../../assets/images/flags/hk.png'),
  hu: require('../../assets/images/flags/hu.png'),
  is: require('../../assets/images/flags/is.png'),
  in: require('../../assets/images/flags/in.png'),
  ie: require('../../assets/images/flags/ie.png'),
  il: require('../../assets/images/flags/il.png'),
  lv: require('../../assets/images/flags/lv.png'),
  lt: require('../../assets/images/flags/lt.png'),
  mx: require('../../assets/images/flags/mx.png'),
  nl: require('../../assets/images/flags/nl.png'),
  pl: require('../../assets/images/flags/pl.png'),
  pt: require('../../assets/images/flags/pt.png'),
  ro: require('../../assets/images/flags/ro.png'),
  ru: require('../../assets/images/flags/ru.png'),
  sg: require('../../assets/images/flags/sg.png'),
  sk: require('../../assets/images/flags/sk.png'),
  si: require('../../assets/images/flags/si.png'),
  za: require('../../assets/images/flags/za.png'),
  es: require('../../assets/images/flags/es.png'),
  tw: require('../../assets/images/flags/tw.png'),
  th: require('../../assets/images/flags/th.png'),
  tr: require('../../assets/images/flags/tr.png'),
  ua: require('../../assets/images/flags/ua.png'),
};

/**
 * Get country flag image from country code
 */
export const getFlagSource = (countryCode: string) => {
  const code = countryCode.toLowerCase();
  return FLAG_IMAGES[code] || FLAG_IMAGES.jp;
};
