import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * アップロード前に画像を縮小・再圧縮する
 *
 * スマホのカメラ画像は 4000px 級・数MB あり、そのままアップロードすると
 * 表示するたびに大きな画像をダウンロード・デコードすることになり重くなる。
 * 長辺を maxSize 以下に縮小して JPEG で保存し直す。
 */

/** 用途ごとの長辺の最大サイズ（px） */
export const IMAGE_MAX_SIZE = {
  avatar: 512,
  header: 1600,
  post: 1600,
  event: 1600,
} as const;

export type ResizedImage = {
  uri: string;
  width: number;
  height: number;
  /** 常に JPEG で保存する */
  mimeType: 'image/jpeg';
  ext: 'jpg';
};

export async function resizeImageForUpload(
  uri: string,
  maxSize: number,
  options: { width?: number; height?: number; compress?: number } = {}
): Promise<ResizedImage> {
  const { compress = 0.8 } = options;
  let { width, height } = options;

  // 元サイズが不明な場合は一度読み込んでサイズを取得（小さい画像を拡大しないため）
  if (!width || !height) {
    const probe = await ImageManipulator.manipulate(uri).renderAsync();
    width = probe.width;
    height = probe.height;
  }

  const context = ImageManipulator.manipulate(uri);

  // 既に小さい場合は縮小しない（再圧縮のみ）
  if (Math.max(width, height) > maxSize) {
    // 縦横比を維持するため、長辺側だけ指定する
    if (height > width) {
      context.resize({ height: maxSize });
    } else {
      context.resize({ width: maxSize });
    }
  }

  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress, format: SaveFormat.JPEG });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg',
    ext: 'jpg',
  };
}
