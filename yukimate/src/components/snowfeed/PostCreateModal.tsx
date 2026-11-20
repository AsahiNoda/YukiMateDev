import { PhotoRemoveButton } from '@/components/ui/RemovablePhoto';
import { PillButton } from '@/components/ui/PillButton';
import { Colors } from '@/constants/theme';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { supabase, getAuthUser } from '@/lib/supabase';
import { IMAGE_MAX_SIZE, resizeImageForUpload } from '@/lib/imageResize';
import { Chip } from '@/components/ui/Chip';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { getResortName } from '@/utils/resort-helpers';
import { IconSymbol } from '@components/ui/icon-symbol';
import { ResortSearch } from '@components/snowfeed/ResortSearch';
import { useColorScheme } from '@hooks/use-color-scheme';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
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

type ResortOption = { id: string; name: string; isHome?: boolean };

type PostCreateModalProps = {
  visible: boolean;
  /** 投稿先のゲレンデ。ゲレンデページから開くときはそのゲレンデ */
  resortId?: string | null;
  resortName?: string | null;
  /**
   * 投稿先のゲレンデを選べるようにする（「作成」タブなど、ゲレンデページの外から開くとき）。
   * resortId を渡さなければホームゲレンデを初期値にする
   */
  allowResortChange?: boolean;
  onClose: () => void;
  /** 投稿が完了したとき。投稿先のゲレンデを渡す */
  onPostCreated: (resort: { id: string; name: string }) => void;
};

export function PostCreateModal({
  visible,
  resortId,
  resortName,
  allowResortChange = false,
  onClose,
  onPostCreated,
}: PostCreateModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const c = useAppColors();
  const { t, locale } = useTranslation();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 投稿先のゲレンデ
  const [resort, setResort] = useState<ResortOption | null>(
    resortId && resortName ? { id: resortId, name: resortName } : null
  );
  const [quickResorts, setQuickResorts] = useState<ResortOption[]>([]);
  const [pickingResort, setPickingResort] = useState(false);

  // 開くたびに、渡されたゲレンデを投稿先にする（渡されていなければ候補の読み込み後にホームゲレンデ）
  useEffect(() => {
    if (!visible) return;
    setResort(resortId && resortName ? { id: resortId, name: resortName } : null);
  }, [visible, resortId, resortName]);

  // 選べるときは、ホームゲレンデを初期値にする（お気に入りスキー場は今は使わない。ほかは検索から選ぶ）
  useEffect(() => {
    if (!visible || !allowResortChange) return;
    let cancelled = false;

    (async () => {
      try {
        const {
          data: { user },
        } = await getAuthUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('home_resort:resorts!profiles_home_resort_id_fkey(id, name, name_en)')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;

        const one = (value: any) => (Array.isArray(value) ? value[0] : value);
        const home = one((profile as any)?.home_resort);
        const options: ResortOption[] = home?.id
          ? [{ id: home.id, name: getResortName(home, locale), isHome: true }]
          : [];
        setQuickResorts(options);
        // 初期値：渡されたゲレンデ → ホームゲレンデ
        setResort((current) => current ?? options[0] ?? null);
      } catch (error) {
        console.error('Error loading resort options:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, allowResortChange, locale]);

  // 画像選択
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('postModal.permissionError'), t('postModal.photoLibraryAccess'));
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
      } = await getAuthUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      console.log('✅ User authenticated:', user.id);

      // アップロード前に縮小（長辺 1600px、JPEG）
      const resized = await resizeImageForUpload(uri, IMAGE_MAX_SIZE.post);

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const fileExtension = resized.ext;
      const fileName = `${user.id}/${timestamp}_${random}.${fileExtension}`;
      console.log('📁 Generated filename:', fileName);

      const mimeType = resized.mimeType;

      // For React Native, we need to use FormData to upload the file
      const formData = new FormData();
      formData.append('', {
        uri: resized.uri,
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
  // 投稿ボタンの二重送信を防ぐ（isSubmitting は次の描画まで反映されない）
  const submittingRef = React.useRef(false);
  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await submitPost();
    } finally {
      submittingRef.current = false;
    }
  };

  const submitPost = async () => {
    if (!resort) {
      Alert.alert(t('postModal.resortRequired'));
      return;
    }
    if (!imageUri) {
      Alert.alert(t('postModal.imageRequired'), t('postModal.selectImagePrompt'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await getAuthUser();
      if (!user) {
        throw new Error(t('create.loginRequired'));
      }

      // Upload image
      const photoUrl = await uploadImage(imageUri);
      if (!photoUrl) {
        throw new Error(t('postModal.uploadFailed'));
      }

      // Create post
      const { error: postError } = await supabase.from('feed_posts').insert({
        resort_id: resort.id,
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
      const postedTo = { id: resort.id, name: resort.name };
      Alert.alert(t('postModal.postComplete'), t('postModal.postCreatedAt', { resort: postedTo.name }));
      handleClose();
      onPostCreated(postedTo);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert(
        t('postModal.postError'),
        error instanceof Error ? error.message : t('postModal.postFailed')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // モーダルを閉じる
  const handleClose = () => {
    setImageUri(null);
    setComment('');
    setPickingResort(false);
    onClose();
  };

  const canSubmit = !!imageUri && !!resort && !isSubmitting;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => (pickingResort ? setPickingResort(false) : handleClose())}>
      {pickingResort ? (
        // ほかのゲレンデを検索して選ぶ（同じモーダルの中で画面を切り替える）
        <ResortSearch
          onSelectResort={(id, name) => {
            setResort({ id, name });
            setPickingResort(false);
          }}
          onClose={() => setPickingResort(false)}
          hasHomeResort
        />
      ) : (
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
          <TouchableOpacity
            onPress={handleClose}
            disabled={isSubmitting}
            style={styles.headerIconButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('postModal.title')}</Text>
          <PillButton
            title={t('postModal.submit')}
            size="sm"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
          />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled">
          {/* 投稿先のゲレンデ */}
          {allowResortChange ? (
            <View style={styles.resortPicker}>
              <Text style={[styles.label, { color: colors.text }]}>{t('postModal.resortLabel')}</Text>
              <TouchableOpacity
                style={[styles.resortInfo, { backgroundColor: colors.card }]}
                onPress={() => setPickingResort(true)}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={`${t('postModal.resortLabel')}: ${resort?.name ?? t('postModal.selectResort')}`}
                accessibilityHint={t('postModal.changeResort')}
                testID="post-resort-picker">
                <IconSymbol name="mountain.2" size={20} color={c.tintText} />
                <Text
                  style={[styles.resortName, styles.resortNameFlex, { color: resort ? colors.text : c.textLabel }]}
                  numberOfLines={1}>
                  {resort?.name ?? t('postModal.selectResort')}
                </Text>
                <Text style={[styles.changeText, { color: c.tintText }]}>{t('postModal.changeResort')}</Text>
                <IconSymbol name="chevron.right" size={16} color={c.tintText} />
              </TouchableOpacity>
              {quickResorts.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickResorts}
                  keyboardShouldPersistTaps="handled">
                  {quickResorts.map((option) => (
                    <Chip
                      key={option.id}
                      label={option.name}
                      icon={option.isHome ? 'home' : undefined}
                      accessibilityLabel={option.isHome ? `${option.name}（${t('chips.home')}）` : option.name}
                      selected={resort?.id === option.id}
                      onPress={() => setResort(option)}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ) : (
            <View style={[styles.resortInfo, { backgroundColor: colors.card }]}>
              <IconSymbol name="mountain.2" size={20} color={c.tintText} />
              <Text style={[styles.resortName, { color: colors.text }]}>{resort?.name ?? resortName}</Text>
            </View>
          )}

          {/* Image Picker */}
          {!imageUri ? (
            <TouchableOpacity
              style={[styles.imagePicker, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handlePickImage}
              disabled={isSubmitting}>
              <IconSymbol name="photo" size={48} color={colors.icon} />
              <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>
                {t('postModal.selectImage')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
              <PhotoRemoveButton
                onPress={handleRemoveImage}
                disabled={isSubmitting}
                size={28}
                accessibilityLabel={t('common.removePhoto')}
              />
            </View>
          )}

          {/* Comment Input */}
          <View style={styles.commentSection}>
            <Text style={[styles.label, { color: colors.text }]}>{t('postModal.commentLabel')}</Text>
            <TextInput
              style={[
                styles.commentInput,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={t('postModal.commentPlaceholder')}
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
      )}
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
  resortNameFlex: {
    flex: 1,
  },
  resortPicker: {
    gap: spacing.sm,
  },
  changeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  quickResorts: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    marginLeft: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.md,
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
