import { IconSymbol } from '@/components/ui/icon-symbol';
import { useResorts } from '@/hooks/useResorts';
import { supabase } from '@/lib/supabase';
import type { SkillLevel } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
  { value: 'event', label: 'イベント' },
  // { value: 'rideshare', label: '相乗り' }, // MVP では未実装
  { value: 'filming', label: '撮影' },
  { value: 'lesson', label: 'レッスン' },
  { value: 'group', label: '仲間募集' },
];

const SKILL_LEVELS: { value: SkillLevel | ''; label: string }[] = [
  { value: '', label: '指定なし' },
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '上級' },
];

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const resortsState = useResorts();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('event');
  const [resortId, setResortId] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('15:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [capacity, setCapacity] = useState('6');
  const [level, setLevel] = useState<SkillLevel | ''>('');
  const [price, setPrice] = useState('');
  const [meetingPlace, setMeetingPlace] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showResortPicker, setShowResortPicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);

  // Resort filter states
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  // Group resorts by area
  const resortsByArea = React.useMemo(() => {
    if (resortsState.status !== 'success') return {};

    const grouped: Record<string, typeof resortsState.resorts> = {};
    resortsState.resorts.forEach((resort) => {
      if (!grouped[resort.area]) {
        grouped[resort.area] = [];
      }
      grouped[resort.area].push(resort);
    });

    // Sort areas alphabetically
    const sortedGrouped: Record<string, typeof resortsState.resorts> = {};
    Object.keys(grouped)
      .sort()
      .forEach((area) => {
        sortedGrouped[area] = grouped[area];
      });

    return sortedGrouped;
  }, [resortsState]);

  const pickImage = async () => {
    if (selectedImages.length >= 3) {
      Alert.alert('制限', '画像は最大3枚まで選択できます');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', 'ギャラリーへのアクセス権限が必要です');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Cropを無効化 - アスペクト比を保持
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImages([...selectedImages, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;

    if (tags.length >= 10) {
      Alert.alert('制限', 'タグは最大10個まで追加できます');
      return;
    }

    if (tags.includes(trimmed)) {
      Alert.alert('エラー', 'このタグは既に追加されています');
      return;
    }

    setTags([...tags, trimmed]);
    setTagInput('');
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('event');
    setResortId('');
    setDate(null);
    setStartTime('10:00');
    setEndTime('15:00');
    setCapacity('6');
    setLevel('');
    setPrice('');
    setMeetingPlace('');
    setTagInput('');
    setTags([]);
    setSelectedImages([]);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '日付を選択';
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const uploadImages = async (eventId: string): Promise<string[]> => {
    const uploadedPaths: string[] = [];

    for (let i = 0; i < selectedImages.length; i++) {
      const imageUri = selectedImages[i];
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${eventId}/${Date.now()}-${i}.${fileExt}`;

      // Fetch the image as arraybuffer
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      const { data, error } = await supabase.storage
        .from('event_images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error('Image upload error:', error);
        throw error;
      }

      // ファイルパスを保存（URLではなく）
      // useDiscoverEventsフックが自動的にPublic URLを生成します
      uploadedPaths.push(fileName);
    }

    return uploadedPaths;
  };

  const handleCreate = async () => {
    // Validation
    if (!(title || '').trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    if (!category) {
      Alert.alert('エラー', 'カテゴリを選択してください');
      return;
    }

    if (!resortId) {
      Alert.alert('エラー', 'スキー場を選択してください');
      return;
    }

    if (!date) {
      Alert.alert('エラー', '日付を入力してください');
      return;
    }

    if (!startTime) {
      Alert.alert('エラー', '開始時刻を入力してください');
      return;
    }

    const capacityNum = parseInt(capacity, 10);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      Alert.alert('エラー', '定員は1以上の数値を入力してください');
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('ログインが必要です');
      }

      // Parse datetime
      const dateStr = formatDateForDB(date);
      const startAt = new Date(`${dateStr}T${startTime}:00`).toISOString();
      const endAt = endTime ? new Date(`${dateStr}T${endTime}:00`).toISOString() : null;

      // Parse price
      const trimmedPrice = (price || '').trim();
      const priceNum = trimmedPrice ? parseInt(trimmedPrice, 10) : null;
      if (trimmedPrice && (isNaN(priceNum!) || priceNum! < 0)) {
        Alert.alert('エラー', '価格は0以上の数値を入力してください');
        setLoading(false);
        return;
      }

      // Create event (without photos first to get event ID)
      const { data: newEvent, error: insertError } = await supabase
        .from('posts_events')
        .insert({
          title: (title || '').trim(),
          description: (description || '').trim() || null,
          type: category,
          resort_id: resortId,
          host_user_id: session.user.id,
          start_at: startAt,
          end_at: endAt,
          capacity_total: capacityNum,
          level_required: level || null,
          price_per_person_jpy: priceNum,
          meeting_place: (meetingPlace || '').trim() || null,
          tags: tags.length > 0 ? tags : null,
          photos: [], // Empty array instead of null (matches DB default)
          status: 'open',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (!newEvent) throw new Error('投稿に失敗しました');

      // Upload images if any
      let photoPaths: string[] | null = null;
      if (selectedImages.length > 0) {
        try {
          console.log(`Uploading ${selectedImages.length} images for event ${newEvent.id}...`);
          photoPaths = await uploadImages(newEvent.id);
          console.log('Upload successful. Paths:', photoPaths);

          // Update event with photo paths (not URLs)
          console.log('Updating posts_events.photos field...');
          const { data: updateData, error: updateError } = await supabase
            .from('posts_events')
            .update({ photos: photoPaths })
            .eq('id', newEvent.id)
            .select('id, photos');

          if (updateError) {
            console.error('Update error:', updateError);
            throw updateError;
          }

          console.log('Photos field updated successfully:', updateData);
        } catch (uploadError) {
          console.error('Image upload/update error:', uploadError);
          // Continue even if image upload fails
          Alert.alert(
            '警告',
            '画像のアップロードまたは登録に失敗しましたが、投稿は作成されました。詳細はログを確認してください。'
          );
        }
      }

      Alert.alert('完了', '投稿を作成しました！', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('エラー', '投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryLabel =
    CATEGORIES.find((c) => c.value === category)?.label || 'カテゴリを選択';

  const selectedResortName =
    resortsState.status === 'success'
      ? resortsState.resorts.find((r) => r.id === resortId)?.name || 'スキー場を選択'
      : 'スキー場を選択';

  const selectedLevelLabel =
    SKILL_LEVELS.find((l) => l.value === level)?.label || '指定なし';

  const renderResortModal = () => (
    <Modal
      visible={showResortPicker}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowResortPicker(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* モーダルヘッダー */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>スキー場を選択</Text>
          <TouchableOpacity
            onPress={() => setShowResortPicker(false)}
            style={styles.closeButton}
          >
            <IconSymbol name="xmark" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* スキー場リスト（エリア別トグル） */}
        <ScrollView style={styles.modalContent}>
          {Object.entries(resortsByArea).map(([area, resorts]) => (
            <View key={area} style={styles.areaSection}>
              {/* Area Header (Toggle) */}
              <TouchableOpacity
                style={styles.areaHeader}
                onPress={() => setExpandedArea(expandedArea === area ? null : area)}
              >
                <Text style={styles.areaHeaderText}>
                  {area} ({resorts.length})
                </Text>
                <IconSymbol
                  name={expandedArea === area ? 'chevron.up' : 'chevron.down'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>

              {/* Resort List (Collapsible) */}
              {expandedArea === area && (
                <View style={styles.resortListContainer}>
                  {resorts.map((resort) => (
                    <TouchableOpacity
                      key={resort.id}
                      style={[
                        styles.resortItem,
                        resortId === resort.id && styles.resortItemActive,
                      ]}
                      onPress={() => {
                        setResortId(resort.id);
                        setShowResortPicker(false);
                        setExpandedArea(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.resortItemText,
                          resortId === resort.id && styles.resortItemTextActive,
                        ]}
                      >
                        {resort.name}
                      </Text>
                      {resortId === resort.id && (
                        <IconSymbol name="checkmark" size={16} color="#5A7D9A" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: Math.max(insets.top, 16) }}>
      <View style={styles.content}>
        <Text style={styles.title}>投稿を作成</Text>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>タイトル *</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>説明</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="投稿の詳細を入力してください"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>カテゴリ *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={styles.pickerText}>{selectedCategoryLabel}</Text>
            <IconSymbol name="chevron.down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.pickerOptions}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={styles.pickerOption}
                  onPress={() => {
                    setCategory(cat.value);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      category === cat.value && styles.pickerOptionTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Resort */}
        <View style={styles.section}>
          <Text style={styles.label}>スキー場 *</Text>
          {resortsState.status === 'loading' ? (
            <View style={styles.picker}>
              <ActivityIndicator size="small" color="#9CA3AF" />
            </View>
          ) : resortsState.status === 'error' ? (
            <Text style={styles.errorText}>リゾート読み込みエラー</Text>
          ) : (
            <>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowResortPicker(true)} // モーダルを開く
              >
                <Text style={styles.pickerText}>{selectedResortName}</Text>
                <IconSymbol name="chevron.down" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              {/* ここでモーダルコンポーネントを呼び出す */}
              {renderResortModal()}
            </>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.label}>日付 *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.pickerText, !date && styles.placeholderText]}>
              {formatDisplayDate(date)}
            </Text>
            <IconSymbol name="calendar" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
              textColor="#FFFFFF"
            />
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>開始時刻 *</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM (例: 10:00)"
              placeholderTextColor="#9CA3AF"
              value={startTime}
              onChangeText={setStartTime}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>終了時刻</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM (例: 15:00)"
              placeholderTextColor="#9CA3AF"
              value={endTime}
              onChangeText={setEndTime}
            />
          </View>
        </View>

        {/* Capacity */}
        <View style={styles.section}>
          <Text style={styles.label}>定員 *</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#9CA3AF"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
          />
        </View>

        {/* Level */}
        <View style={styles.section}>
          <Text style={styles.label}>レベル</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowLevelPicker(!showLevelPicker)}
          >
            <Text style={styles.pickerText}>{selectedLevelLabel}</Text>
            <IconSymbol name="chevron.down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          {showLevelPicker && (
            <View style={styles.pickerOptions}>
              {SKILL_LEVELS.map((lv) => (
                <TouchableOpacity
                  key={lv.value}
                  style={styles.pickerOption}
                  onPress={() => {
                    setLevel(lv.value);
                    setShowLevelPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      level === lv.value && styles.pickerOptionTextActive,
                    ]}
                  >
                    {lv.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>価格（円）</Text>
          <TextInput
            style={styles.input}
            placeholder="0 (無料の場合は空欄)"
            placeholderTextColor="#9CA3AF"
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
          />
        </View>

        {/* Meeting Place */}
        <View style={styles.section}>
          <Text style={styles.label}>集合場所</Text>
          <TextInput
            style={styles.input}
            placeholder="ゴンドラ山頂駅前"
            placeholderTextColor="#9CA3AF"
            value={meetingPlace}
            onChangeText={setMeetingPlace}
          />
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.label}>タグ（最大10個）</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.input, styles.tagInput]}
              placeholder="タグを入力"
              placeholderTextColor="#9CA3AF"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
            />
            <TouchableOpacity style={styles.tagAddButton} onPress={addTag}>
              <Text style={styles.tagAddButtonText}>追加</Text>
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsList}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity
                    onPress={() => removeTag(index)}
                    style={styles.tagRemoveButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={styles.tagRemoveIcon}>
                      <IconSymbol name="xmark" size={14} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.label}>画像（最大3枚）</Text>
          <View style={styles.imagesContainer}>
            {selectedImages.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.imageRemoveButton}
                  onPress={() => removeImage(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.imageRemoveButtonInner}>
                    <IconSymbol name="xmark" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
            {selectedImages.length < 3 && (
              <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
                <IconSymbol name="photo" size={32} color="#9CA3AF" />
                <Text style={styles.imagePlaceholderText}>画像を追加</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>投稿する</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#1A202C',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    marginTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2D3748',
    color: '#FFFFFF',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  rowItem: {
    flex: 1,
  },
  picker: {
    backgroundColor: '#2D3748',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  pickerOptions: {
    marginTop: 8,
    backgroundColor: '#2D3748',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: 200,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pickerOptionText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  pickerOptionTextActive: {
    color: '#5A7D9A',
    fontWeight: '600',
  },
  areaSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#2D3748',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  areaHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  resortListContainer: {
    backgroundColor: '#1A202C',
  },
  resortItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  resortItemActive: {
    backgroundColor: '#1E3A8A',
  },
  resortItemText: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  resortItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    marginBottom: 0,
  },
  tagAddButton: {
    backgroundColor: '#5A7D9A',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  tagAddButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  tagRemoveButton: {
    marginLeft: 4,
  },
  tagRemoveIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    zIndex: 10,
  },
  imageRemoveButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#2D3748',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  createButton: {
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: '#5A7D9A',
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
});
