import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResorts } from '@/hooks/useResorts';
import { createProfilePost } from '@/hooks/useProfilePosts';
import { pickAndUploadProfilePostImage } from '@/lib/imageUpload';
import { useAuth } from '@contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

/**
 * プロフィール投稿（インスタ風グリッド用）の作成モーダル。
 * 写真1枚 + 任意キャプション + 任意リゾート。
 */
export function ProfilePostCreateModal({ visible, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const resortsState = useResorts();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [resortId, setResortId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResortPicker, setShowResortPicker] = useState(false);

  const reset = () => {
    setImageUrl(null);
    setCaption('');
    setResortId(null);
  };

  const handlePickImage = async () => {
    if (!user?.id) return;
    setUploading(true);
    const url = await pickAndUploadProfilePostImage(user.id);
    if (url) setImageUrl(url);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!imageUrl) {
      Alert.alert('エラー', '写真を選択してください');
      return;
    }
    setSubmitting(true);
    const result = await createProfilePost({
      photos: [imageUrl],
      caption: caption.trim() || null,
      resortId,
    });
    setSubmitting(false);
    if (result.success) {
      reset();
      onCreated();
      onClose();
    } else {
      Alert.alert('エラー', result.error || '投稿に失敗しました');
    }
  };

  const selectedResortName =
    resortsState.status === 'success' && resortId
      ? resortsState.resorts.find((r) => r.id === resortId)?.name
      : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>新規投稿</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={submitting || !imageUrl}>
              <Text style={[styles.postButton, { color: imageUrl ? colors.tint : colors.icon }]}>
                {submitting ? '投稿中…' : '投稿'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* 画像 */}
            <TouchableOpacity
              style={[styles.imagePicker, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={handlePickImage}
              disabled={uploading}
            >
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.image} />
              ) : uploading ? (
                <ActivityIndicator color={colors.tint} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={40} color={colors.icon} />
                  <Text style={[styles.imageHint, { color: colors.textSecondary }]}>写真を選択</Text>
                </>
              )}
            </TouchableOpacity>

            {/* キャプション */}
            <TextInput
              style={[styles.caption, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              value={caption}
              onChangeText={setCaption}
              placeholder="キャプションを入力（任意）"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={300}
            />

            {/* リゾート選択（任意） */}
            <TouchableOpacity
              style={[styles.resortSelector, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={() => setShowResortPicker(true)}
            >
              <Ionicons name="snow-outline" size={20} color={colors.icon} />
              <Text style={[styles.resortText, { color: selectedResortName ? colors.text : colors.textSecondary }]}>
                {selectedResortName || 'スキー場をタグ付け（任意）'}
              </Text>
              {resortId && (
                <TouchableOpacity onPress={() => setResortId(null)}>
                  <Ionicons name="close-circle" size={18} color={colors.icon} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </ScrollView>

          {/* Resort Picker */}
          <Modal visible={showResortPicker} transparent animationType="slide" onRequestClose={() => setShowResortPicker(false)}>
            <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowResortPicker(false)}>
              <View style={[styles.pickerModal, { backgroundColor: colors.backgroundSecondary, paddingBottom: insets.bottom }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>スキー場を選択</Text>
                  <TouchableOpacity onPress={() => setShowResortPicker(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                {resortsState.status === 'success' ? (
                  <FlatList
                    data={resortsState.resorts}
                    style={{ flex: 1 }}
                    keyExtractor={(item) => item.id}
                    initialNumToRender={20}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setResortId(item.id);
                          setShowResortPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, { color: resortId === item.id ? colors.text : colors.textSecondary }]}>
                          {item.name}
                        </Text>
                        {resortId === item.id && <Ionicons name="checkmark" size={20} color={colors.tint} />}
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  container: { flex: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  postButton: { fontSize: 16, fontWeight: '700' },
  content: { padding: 16, gap: 16 },
  imagePicker: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imageHint: { fontSize: 14 },
  caption: {
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  resortSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  resortText: { flex: 1, fontSize: 15 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: 500 },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerItemText: { fontSize: 16 },
});
