import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { Alert } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { validateFileSize, validateImageFileType } from '@/utils/validation';

export type ImageType = 'avatar' | 'header';

/**
 * 画像を選択してSupabaseストレージにアップロード
 */
export async function pickAndUploadImage(
  userId: string,
  imageType: ImageType
): Promise<string | null> {
  try {
    console.log('📸 Starting image picker...');

    // パーミッションをリクエスト
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('権限が必要です', 'カメラロールへのアクセス権限が必要です。');
      return null;
    }

    console.log('✅ Permission granted');

    // 画像を選択
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: imageType === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (result.canceled) {
      console.log('❌ Image picker canceled');
      return null;
    }

    const imageUri = result.assets[0].uri;
    const mimeType = result.assets[0].mimeType || 'image/jpeg';
    const fileSize = result.assets[0].fileSize || 0;
    console.log('📷 Image selected:', imageUri, 'Type:', mimeType, 'Size:', fileSize);

    // ファイルタイプのバリデーション
    const typeValidation = validateImageFileType(mimeType);
    if (!typeValidation.isValid) {
      Alert.alert('エラー', typeValidation.error);
      return null;
    }

    // ファイルサイズのバリデーション（10MB制限）
    const sizeValidation = validateFileSize(fileSize, 10);
    if (!sizeValidation.isValid) {
      Alert.alert('エラー', sizeValidation.error);
      return null;
    }

    // 画像をアップロード
    console.log('⬆️  Starting upload...');
    const url = await uploadImageToSupabase(userId, imageUri, imageType);
    console.log('✅ Upload complete:', url);
    return url;
  } catch (error) {
    console.error('❌ Error picking/uploading image:', error);
    Alert.alert('エラー', `画像のアップロードに失敗しました: ${error}`);
    return null;
  }
}

/**
 * Supabaseストレージに画像をアップロード
 */
async function uploadImageToSupabase(
  userId: string,
  imageUri: string,
  imageType: ImageType
): Promise<string | null> {
  try {
    console.log('🔧 Preparing upload...');

    // ファイル拡張子を取得
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${imageType}.${ext}`;
    const bucketName = imageType === 'avatar' ? 'profile_avatar' : 'profile_header';
    const filePath = `${userId}/${fileName}`;

    console.log(`📦 Bucket: ${bucketName}, Path: ${filePath}`);

    // ファイルをbase64で読み込み
    console.log('📖 Reading file as base64...');
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });
    console.log(`✅ File read (size: ${base64.length} chars)`);

    // base64をArrayBufferに変換
    console.log('🔄 Converting to ArrayBuffer...');
    const arrayBuffer = decode(base64);
    console.log(`✅ Converted to ArrayBuffer (size: ${arrayBuffer.byteLength} bytes)`);

    // Supabaseストレージにアップロード (upsertで既存ファイルを上書き)
    console.log('⬆️  Uploading to Supabase...');
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw error;
    }

    console.log('✅ Upload successful:', data);

    // パブリックURLを取得して返す（キャッシュバスターを追加）
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // キャッシュバスター（タイムスタンプ）を追加して常に最新の画像を取得
    const publicUrlWithCacheBuster = `${urlData.publicUrl}?t=${Date.now()}`;
    console.log('🔗 Public URL:', publicUrlWithCacheBuster);
    return publicUrlWithCacheBuster;
  } catch (error) {
    console.error('❌ Error uploading to Supabase:', error);
    throw error;
  }
}

/**
 * プロフィール投稿用の写真を選択してアップロード（profile_posts バケット）
 * 投稿ごとにユニークなパスに保存し、キャッシュバスターなしの公開URLを返す。
 */
export async function pickAndUploadProfilePostImage(
  userId: string
): Promise<string | null> {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('権限が必要です', 'カメラロールへのアクセス権限が必要です。');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    const fileSize = asset.fileSize || 0;

    const typeValidation = validateImageFileType(mimeType);
    if (!typeValidation.isValid) {
      Alert.alert('エラー', typeValidation.error);
      return null;
    }
    const sizeValidation = validateFileSize(fileSize, 10);
    if (!sizeValidation.isValid) {
      Alert.alert('エラー', sizeValidation.error);
      return null;
    }

    const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${userId}/${Date.now()}.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
    const arrayBuffer = decode(base64);

    const { error } = await supabase.storage
      .from('profile_posts')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: false,
      });

    if (error) {
      console.error('❌ profile_posts upload error:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage.from('profile_posts').getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (error) {
    console.error('❌ Error uploading profile post image:', error);
    Alert.alert('エラー', `画像のアップロードに失敗しました: ${error}`);
    return null;
  }
}

/**
 * カメラで撮影してアップロード
 */
export async function takePhotoAndUpload(
  userId: string,
  imageType: ImageType
): Promise<string | null> {
  try {
    // カメラのパーミッションをリクエスト
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('権限が必要です', 'カメラへのアクセス権限が必要です。');
      return null;
    }

    // カメラを起動
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: imageType === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const imageUri = result.assets[0].uri;
    const mimeType = result.assets[0].mimeType || 'image/jpeg';
    const fileSize = result.assets[0].fileSize || 0;

    // ファイルタイプのバリデーション
    const typeValidation = validateImageFileType(mimeType);
    if (!typeValidation.isValid) {
      Alert.alert('エラー', typeValidation.error);
      return null;
    }

    // ファイルサイズのバリデーション（10MB制限）
    const sizeValidation = validateFileSize(fileSize, 10);
    if (!sizeValidation.isValid) {
      Alert.alert('エラー', sizeValidation.error);
      return null;
    }

    // 画像をアップロード
    const url = await uploadImageToSupabase(userId, imageUri, imageType);
    return url;
  } catch (error) {
    console.error('Error taking/uploading photo:', error);
    Alert.alert('エラー', '写真のアップロードに失敗しました');
    return null;
  }
}
