import { Colors } from '@/constants/theme';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PostCreateModalProps = {
  visible: boolean;
  resortId: string;
  resortName: string;
  onClose: () => void;
  onPostCreated: () => void;
};

export function PostCreateModal({
  visible,
  resortId,
  resortName,
  onClose,
  onPostCreated,
}: PostCreateModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 画像選択
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', '写真ライブラリへのアクセス許可が必要です');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  // 画像削除
  const handleRemoveImage = () => {
    setImageUri(null);
  };

  // 画像をSupabase Storageにアップロード
  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      console.log('🔄 Starting image upload...', uri);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      console.log('✅ User authenticated:', user.id);

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${timestamp}_${random}.${fileExtension}`;
      console.log('📁 Generated filename:', fileName);

      // Determine MIME type
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      console.log('📄 MIME type:', mimeType);

      // For React Native, we need to use FormData to upload the file
      const formData = new FormData();
      formData.append('', {
        uri: uri,
        name: `${timestamp}_${random}.${fileExtension}`,
        type: mimeType,
      } as any);

      // Upload to Supabase Storage using FormData
      console.log('🔄 Uploading to Supabase Storage bucket: feed-post-images');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('feed-post-images')
        .upload(fileName, formData as any, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(
          `Upload failed: ${uploadError.message} (${uploadError.statusCode || 'unknown'})`
        );
      }

      console.log('✅ Upload successful:', uploadData);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('feed-post-images').getPublicUrl(fileName);

      console.log('✅ Public URL generated:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      return null;
    }
  };

  // 投稿送信
  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('画像が必要です', '投稿する画像を選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ログインが必要です');
      }

      // Upload image
      const photoUrl = await uploadImage(imageUri);
      if (!photoUrl) {
        throw new Error('画像のアップロードに失敗しました');
      }

      // Create post
      const { error: postError } = await supabase.from('feed_posts').insert({
        resort_id: resortId,
        user_id: user.id,
        type: 'snow', // デフォルトで'snow'タイプ
        text: comment.trim() || null,
        photos: [photoUrl],
        tags: [],
      });

      if (postError) {
        throw postError;
      }

      // Success
      Alert.alert('投稿完了', '投稿が正常に作成されました！');
      handleClose();
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert(
        '投稿エラー',
        error instanceof Error ? error.message : '投稿の作成に失敗しました'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // モーダルを閉じる
  const handleClose = () => {
    setImageUri(null);
    setComment('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              paddingTop: Math.max(insets.top, 16),
              borderBottomColor: colors.border,
            },
          ]}>
          <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>新規投稿</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !imageUri}
            style={styles.postButton}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text
                style={[
                  styles.postButtonText,
                  {
                    color: imageUri ? colors.accent : colors.textSecondary,
                  },
                ]}>
                投稿
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled">
          {/* Resort Info */}
          <View style={[styles.resortInfo, { backgroundColor: colors.card }]}>
            <IconSymbol name="mountain.2" size={20} color={colors.accent} />
            <Text style={[styles.resortName, { color: colors.text }]}>{resortName}</Text>
          </View>

          {/* Image Picker */}
          {!imageUri ? (
            <TouchableOpacity
              style={[styles.imagePicker, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handlePickImage}
              disabled={isSubmitting}>
              <IconSymbol name="photo" size={48} color={colors.icon} />
              <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>
                画像を選択
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity
                style={[styles.removeImageButton, { backgroundColor: colors.background }]}
                onPress={handleRemoveImage}
                disabled={isSubmitting}>
                <IconSymbol name="xmark.circle.fill" size={32} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}

          {/* Comment Input */}
          <View style={styles.commentSection}>
            <Text style={[styles.label, { color: colors.text }]}>コメント（任意）</Text>
            <TextInput
              style={[
                styles.commentInput,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="今日の雪質やゲレンデの様子を共有しよう..."
              placeholderTextColor={colors.textSecondary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!isSubmitting}
            />
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>
              {comment.length} / 500
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  postButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  postButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  resortInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  resortName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  imagePicker: {
    height: 300,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
  },
  imagePickerText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.lg,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    borderRadius: borderRadius.round,
    padding: 2,
  },
  commentSection: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  commentInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  charCount: {
    fontSize: fontSize.sm,
    textAlign: 'right',
  },
});
