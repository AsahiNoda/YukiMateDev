-- リゾートテーブルのregionカラムを英語の県名に更新するSQL
-- Supabase Dashboard > SQL Editor で実行してください
-- 北から南の地理的順序で並べています

-- 北海道地方
UPDATE resorts SET region = 'Hokkaido' WHERE area = '北海道';

-- 東北地方（北から南）
UPDATE resorts SET region = 'Aomori' WHERE area = '青森県';
UPDATE resorts SET region = 'Iwate' WHERE area = '岩手県';
UPDATE resorts SET region = 'Akita' WHERE area = '秋田県';
UPDATE resorts SET region = 'Miyagi' WHERE area = '宮城県';
UPDATE resorts SET region = 'Yamagata' WHERE area = '山形県';
UPDATE resorts SET region = 'Fukushima' WHERE area = '福島県';

-- 関東地方（北から南）
UPDATE resorts SET region = 'Tochigi' WHERE area = '栃木県';
UPDATE resorts SET region = 'Gunma' WHERE area = '群馬県';
UPDATE resorts SET region = 'Ibaraki' WHERE area = '茨城県';
UPDATE resorts SET region = 'Saitama' WHERE area = '埼玉県';
UPDATE resorts SET region = 'Tokyo' WHERE area = '東京都';
UPDATE resorts SET region = 'Chiba' WHERE area = '千葉県';
UPDATE resorts SET region = 'Kanagawa' WHERE area = '神奈川県';

-- 中部地方（北から南、日本海側から太平洋側）
UPDATE resorts SET region = 'Niigata' WHERE area = '新潟県';
UPDATE resorts SET region = 'Toyama' WHERE area = '富山県';
UPDATE resorts SET region = 'Ishikawa' WHERE area = '石川県';
UPDATE resorts SET region = 'Fukui' WHERE area = '福井県';
UPDATE resorts SET region = 'Nagano' WHERE area = '長野県';
UPDATE resorts SET region = 'Yamanashi' WHERE area = '山梨県';
UPDATE resorts SET region = 'Gifu' WHERE area = '岐阜県';
UPDATE resorts SET region = 'Shizuoka' WHERE area = '静岡県';
UPDATE resorts SET region = 'Aichi' WHERE area = '愛知県';

-- 近畿地方（北から南）
UPDATE resorts SET region = 'Shiga' WHERE area = '滋賀県';
UPDATE resorts SET region = 'Kyoto' WHERE area = '京都府';
UPDATE resorts SET region = 'Hyogo' WHERE area = '兵庫県';
UPDATE resorts SET region = 'Osaka' WHERE area = '大阪府';
UPDATE resorts SET region = 'Nara' WHERE area = '奈良県';
UPDATE resorts SET region = 'Mie' WHERE area = '三重県';
UPDATE resorts SET region = 'Wakayama' WHERE area = '和歌山県';

-- 中国地方（北から南）
UPDATE resorts SET region = 'Tottori' WHERE area = '鳥取県';
UPDATE resorts SET region = 'Shimane' WHERE area = '島根県';
UPDATE resorts SET region = 'Okayama' WHERE area = '岡山県';
UPDATE resorts SET region = 'Hiroshima' WHERE area = '広島県';
UPDATE resorts SET region = 'Yamaguchi' WHERE area = '山口県';

-- 四国地方（北から南）
UPDATE resorts SET region = 'Kagawa' WHERE area = '香川県';
UPDATE resorts SET region = 'Tokushima' WHERE area = '徳島県';
UPDATE resorts SET region = 'Ehime' WHERE area = '愛媛県';
UPDATE resorts SET region = 'Kochi' WHERE area = '高知県';

-- 九州地方（北から南）
UPDATE resorts SET region = 'Fukuoka' WHERE area = '福岡県';
UPDATE resorts SET region = 'Saga' WHERE area = '佐賀県';
UPDATE resorts SET region = 'Nagasaki' WHERE area = '長崎県';
UPDATE resorts SET region = 'Oita' WHERE area = '大分県';
UPDATE resorts SET region = 'Kumamoto' WHERE area = '熊本県';
UPDATE resorts SET region = 'Miyazaki' WHERE area = '宮崎県';
UPDATE resorts SET region = 'Kagoshima' WHERE area = '鹿児島県';

-- 沖縄地方
UPDATE resorts SET region = 'Okinawa' WHERE area = '沖縄県';

-- 更新結果を確認
SELECT area, region, COUNT(*) as count
FROM resorts
GROUP BY area, region
ORDER BY area;
