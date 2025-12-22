# リゾートの県名（日本語・英語）取得ガイド

## 概要

リゾートテーブルでは：
- `area`：日本語の県名（例：「長野県」「新潟県」）
- `region`：現在は地方名（例：「中部」「関東」）だが、英語の県名に変更予定

このガイドでは、英語の県名を取得する方法を説明します。

## 方法1：ヘルパー関数を使用（推奨）

### 基本的な使い方

```typescript
import { getResortPrefectureEN, getResortPrefectureJP } from '@/utils/resort-helpers';

// リゾートオブジェクトから英語の県名を取得
const resort = {
  id: '123',
  name: '白馬八方尾根',
  area: '長野県',
  region: '中部'
};

const prefectureEN = getResortPrefectureEN(resort);  // "Nagano"
const prefectureJP = getResortPrefectureJP(resort);  // "長野県"
```

### コンポーネントでの使用例

```typescript
import { getResortPrefectureEN } from '@/utils/resort-helpers';
import { useResorts } from '@/hooks/useResorts';

function ResortList() {
  const resortsState = useResorts();

  if (resortsState.status !== 'success') {
    return <LoadingState />;
  }

  return (
    <View>
      {resortsState.resorts.map(resort => (
        <View key={resort.id}>
          <Text>{resort.name}</Text>
          <Text>Prefecture: {getResortPrefectureEN(resort)}</Text>
          <Text>エリア: {resort.area}</Text>
        </View>
      ))}
    </View>
  );
}
```

### Supabaseクエリでの使用

```typescript
import { supabase } from '@/lib/supabase';
import { getResortPrefectureEN } from '@/utils/resort-helpers';

async function getResortsInNagano() {
  const { data, error } = await supabase
    .from('resorts')
    .select('*')
    .eq('area', '長野県');

  if (data) {
    data.forEach(resort => {
      console.log(`${resort.name} - ${getResortPrefectureEN(resort)}`);
      // 例: "白馬八方尾根 - Nagano"
    });
  }
}
```

## 方法2：データベースを更新（恒久的な解決策）

### 手順

1. Supabaseダッシュボードにログイン
2. SQL Editorを開く
3. `yukimate/scripts/update-resort-regions.sql` の内容を実行
4. `region`カラムが英語の県名に更新される

### 更新後の使用方法

```typescript
// 更新後は、regionカラムを直接使用できます
const { data } = await supabase
  .from('resorts')
  .select('id, name, area, region')
  .eq('region', 'Nagano');  // 英語の県名で検索可能

data?.forEach(resort => {
  console.log(`${resort.name} - ${resort.region}`);
  // 例: "白馬八方尾根 - Nagano"
});
```

### データベース更新のメリット

- クエリで英語の県名を直接使用可能
- ヘルパー関数が不要になる
- パフォーマンスが向上（計算不要）

### 注意点

- 既存のコードで`region`を地方名として使用している箇所がある場合、修正が必要
- 移行期間中は、両方の方法をサポートすることを推奨

## 県名マッピング一覧

マッピングの全リストは [prefecture-mapping.ts](../src/utils/prefecture-mapping.ts) を参照してください。

主要な県：

| 日本語 | 英語 |
|--------|------|
| 北海道 | Hokkaido |
| 長野県 | Nagano |
| 新潟県 | Niigata |
| 群馬県 | Gunma |
| 岐阜県 | Gifu |
| 富山県 | Toyama |
| 山形県 | Yamagata |
| 福島県 | Fukushima |

## トラブルシューティング

### Q: マッピングにない県名がある場合は？

A: `getPrefectureInEnglish()` は、マッピングがない場合は元の文字列をそのまま返します。新しい県を追加する場合は、`PREFECTURE_JP_TO_EN` に追加してください。

### Q: どちらの方法を使うべき？

A:
- **短期的**：方法1（ヘルパー関数）を使用。データベース変更なしで即座に対応可能
- **長期的**：方法2（データベース更新）を実施。より効率的で保守しやすい

## 関連ファイル

- [prefecture-mapping.ts](../src/utils/prefecture-mapping.ts) - 県名マッピング定義
- [resort-helpers.ts](../src/utils/resort-helpers.ts) - リゾートヘルパー関数
- [update-resort-regions.sql](../scripts/update-resort-regions.sql) - データベース更新SQL
- [database.types.ts](../src/lib/database.types.ts) - Resortインターフェース定義
