import { IconSymbol } from '@/components/ui/icon-symbol';
import { getAreaOrder } from '@/constants/areas';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResorts } from '@/hooks/useResorts';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import type { SkillLevel } from '@/types';
import { getResortName, getResortPrefecture } from '@/utils/resort-helpers';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

// Note: Category and skill level labels are now translated dynamically in the component
const CATEGORIES = [
  { value: 'event', labelKey: 'create.categoryEvent' },
  { value: 'filming', labelKey: 'create.categoryFilming' },
  { value: 'lesson', labelKey: 'create.categoryLesson' },
  { value: 'group', labelKey: 'create.categoryCompanions' },
];

const SKILL_LEVELS: { value: SkillLevel | ''; labelKey: string }[] = [
  { value: '', labelKey: 'create.levelNone' },
  { value: 'beginner', labelKey: 'create.levelBeginner' },
  { value: 'intermediate', labelKey: 'create.levelIntermediate' },
  { value: 'advanced', labelKey: 'create.levelAdvanced' },
];

// 5分刻みの時刻オプションを生成 (00:00 ~ 23:55)
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      options.push(timeStr);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const resortsState = useResorts();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const isEditMode = !!params.eventId;
  const { t, locale } = useTranslation();

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
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Resort filter states
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  // ScrollView refs for time pickers
  const startTimeScrollRef = React.useRef<ScrollView>(null);
  const endTimeScrollRef = React.useRef<ScrollView>(null);

  // スクロール位置を選択中の時刻に合わせる
  const scrollToSelectedTime = (scrollRef: React.RefObject<ScrollView | null>, selectedTime: string) => {
    const index = TIME_OPTIONS.indexOf(selectedTime);
    if (index !== -1) {
      // 各アイテムの高さは約49px（padding 12*2 + borderBottom 1 + fontSize 16 + line-height）
      const itemHeight = 49;
      const scrollToY = Math.max(0, (index * itemHeight) - 75); // 選択中のアイテムを中央付近に表示

      // setTimeoutで確実にレンダリング後にスクロール
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: scrollToY, animated: true });
      }, 50);
    }
  };

  // Load event data for edit mode
  useEffect(() => {
    if (params.eventId) {
      loadEventData(params.eventId);
    }
  }, [params.eventId]);

  const loadEventData = async (eventId: string) => {
    try {
      setLoading(true);
      const { data: eventData, error } = await supabase
        .from('posts_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      if (!eventData) throw new Error(t('create.eventNotFound'));

      // Populate form fields
      setTitle(eventData.title || '');
      setDescription(eventData.description || '');
      setCategory(eventData.type || 'event');
      setResortId(eventData.resort_id || '');

      // Parse date and time
      if (eventData.start_at) {
        const startDate = new Date(eventData.start_at);
        setDate(startDate);
        setStartTime(`${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`);
      }

      if (eventData.end_at) {
        const endDate = new Date(eventData.end_at);
        setEndTime(`${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`);
      }

      setCapacity(String(eventData.capacity_total || 6));
      setLevel(eventData.level_required || '');
      setPrice(eventData.price_per_person_jpy ? String(eventData.price_per_person_jpy) : '');
      setMeetingPlace(eventData.meeting_place || '');
      setTags(eventData.tags || []);

      // Load images
      const photoUrls: string[] = [];
      if (eventData.photos && eventData.photos.length > 0) {
        eventData.photos.forEach((photoPath: string) => {
          if (photoPath.startsWith('http')) {
            photoUrls.push(photoPath);
          } else {
            const { data } = supabase.storage
              .from('event_images')
              .getPublicUrl(photoPath);
            photoUrls.push(data.publicUrl);
          }
        });
      }
      setSelectedImages(photoUrls);
    } catch (error) {
      console.error('Error loading event data:', error);
      Alert.alert(t('common.error'), t('create.loadEventFailed'));
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // エリアの並び順（北から南）
  const AREA_ORDER = getAreaOrder(locale);

  // Group resorts by area
  const resortsByArea = React.useMemo(() => {
    if (resortsState.status !== 'success') return {};

    const grouped: Record<string, typeof resortsState.resorts> = {};
    resortsState.resorts.forEach((resort) => {
      // 英語の場合はregion、日本語の場合はareaを使用
      const areaKey = getResortPrefecture(resort, locale);
      if (!grouped[areaKey]) {
        grouped[areaKey] = [];
      }
      grouped[areaKey].push(resort);
    });

    // Sort areas by AREA_ORDER
    const sortedGrouped: Record<string, typeof resortsState.resorts> = {};
    AREA_ORDER.forEach((area) => {
      if (grouped[area]) {
        sortedGrouped[area] = grouped[area];
      }
    });
    // Add any areas not in AREA_ORDER at the end
    Object.keys(grouped)
      .filter((area) => !AREA_ORDER.includes(area))
      .sort()
      .forEach((area) => {
        sortedGrouped[area] = grouped[area];
      });

    return sortedGrouped;
  }, [resortsState, locale]);

  const pickImage = async () => {
    if (selectedImages.length >= 3) {
      Alert.alert(t('create.limitLabel'), t('create.maxImagesLimit'));
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('create.permissionRequired'), t('create.galleryPermission'));
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
      Alert.alert(t('create.limitLabel'), t('create.maxTagsLimit'));
      return;
    }

    if (tags.includes(trimmed)) {
      Alert.alert(t('common.error'), t('create.tagAlreadyAdded'));
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
    if (!date) return t('date.selectDate');
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

  const handleDelete = async () => {
    if (!params.eventId) return;

    Alert.alert(
      t('create.deletePostConfirm'),
      t('create.deletePostMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('create.deletePostButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // Delete event
              const { error } = await supabase
                .from('posts_events')
                .delete()
                .eq('id', params.eventId);

              if (error) throw error;

              Alert.alert(t('common.complete'), t('create.deletePostSuccess'), [
                {
                  text: t('common.ok'),
                  onPress: () => {
                    router.back();
                  },
                },
              ]);
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert(t('common.error'), t('create.deletePostFailed'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
      Alert.alert(t('common.error'), t('create.enterTitle'));
      return;
    }

    if (!category) {
      Alert.alert(t('common.error'), t('create.enterCategory'));
      return;
    }

    if (!resortId) {
      Alert.alert(t('common.error'), t('create.enterResort'));
      return;
    }

    if (!date) {
      Alert.alert(t('common.error'), t('create.enterDate'));
      return;
    }

    if (!startTime) {
      Alert.alert(t('common.error'), t('create.enterStartTime'));
      return;
    }

    const capacityNum = parseInt(capacity, 10);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      Alert.alert(t('common.error'), t('create.enterCapacity'));
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error(t('create.loginRequired'));
      }

      // Parse datetime
      const dateStr = formatDateForDB(date);
      const startAt = new Date(`${dateStr}T${startTime}:00`).toISOString();
      const endAt = endTime ? new Date(`${dateStr}T${endTime}:00`).toISOString() : null;

      // Parse price
      const trimmedPrice = (price || '').trim();
      const priceNum = trimmedPrice ? parseInt(trimmedPrice, 10) : null;
      if (trimmedPrice && (isNaN(priceNum!) || priceNum! < 0)) {
        Alert.alert(t('common.error'), t('create.enterValidPrice'));
        setLoading(false);
        return;
      }

      const eventPayload = {
        title: (title || '').trim(),
        description: (description || '').trim() || null,
        type: category,
        resort_id: resortId,
        start_at: startAt,
        end_at: endAt,
        capacity_total: capacityNum,
        level_required: level || null,
        price_per_person_jpy: priceNum,
        meeting_place: (meetingPlace || '').trim() || null,
        tags: tags.length > 0 ? tags : null,
      };

      let eventId: string;

      if (isEditMode && params.eventId) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('posts_events')
          .update(eventPayload)
          .eq('id', params.eventId);

        if (updateError) throw updateError;
        eventId = params.eventId;
      } else {
        // Create new event
        const { data: newEvent, error: insertError } = await supabase
          .from('posts_events')
          .insert({
            ...eventPayload,
            host_user_id: session.user.id,
            photos: [],
            status: 'open',
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (!newEvent) throw new Error(t('create.createPostFailed'));
        eventId = newEvent.id;
      }

      // Upload images if any
      let photoPaths: string[] | null = null;
      if (selectedImages.length > 0) {
        try {
          console.log(`Uploading ${selectedImages.length} images for event ${eventId}...`);
          photoPaths = await uploadImages(eventId);
          console.log('Upload successful. Paths:', photoPaths);

          // Update event with photo paths (not URLs)
          console.log('Updating posts_events.photos field...');
          const { data: updateData, error: updateError } = await supabase
            .from('posts_events')
            .update({ photos: photoPaths })
            .eq('id', eventId)
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
            t('common.warning'),
            isEditMode ? t('create.imageUploadWarningEdit') : t('create.imageUploadWarning')
          );
        }
      }

      Alert.alert(t('common.complete'), isEditMode ? t('create.postUpdated') : t('create.postCreated'), [
        {
          text: t('common.ok'),
          onPress: () => {
            if (!isEditMode) {
              resetForm();
            }
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert(t('common.error'), t('create.postFailed'));
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryLabel =
    CATEGORIES.find((c) => c.value === category)?.labelKey ? t(CATEGORIES.find((c) => c.value === category)!.labelKey) : t('create.selectCategory');

  const selectedResortName =
    resortsState.status === 'success'
      ? resortsState.resorts.find((r) => r.id === resortId)?.name || t('create.selectResort')
      : t('create.selectResort');

  const selectedLevelLabel =
    SKILL_LEVELS.find((l) => l.value === level)?.labelKey ? t(SKILL_LEVELS.find((l) => l.value === level)!.labelKey) : t('create.levelNone');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: Math.max(insets.top, 16) }}>
      <View style={styles.content}>
        <Text style={styles.title}>{isEditMode ? t('create.editTitle') : t('create.title')}</Text>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.titleLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.descriptionLabel')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('create.descriptionPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.categoryLabel')}</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={styles.pickerText}>{selectedCategoryLabel}</Text>
            <IconSymbol name="chevron.down" size={20} color={colors.icon} />
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
                    {t(cat.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Resort */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.resortLabel')}</Text>
          {resortsState.status === 'loading' ? (
            <View style={styles.picker}>
              <ActivityIndicator size="small" color={colors.icon} />
            </View>
          ) : resortsState.status === 'error' ? (
            <Text style={styles.errorText}>{t('create.resortLoadError')}</Text>
          ) : (
            <>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowResortPicker(true)}
              >
                <Text style={styles.pickerText}>{selectedResortName}</Text>
                <IconSymbol name="chevron.down" size={20} color={colors.icon} />
              </TouchableOpacity>

              <Modal
                visible={showResortPicker}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowResortPicker(false)}
              >
                <SafeAreaView style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('create.selectResortTitle')}</Text>
                    <TouchableOpacity
                      onPress={() => setShowResortPicker(false)}
                      style={styles.closeButton}
                    >
                      <IconSymbol name="xmark" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalContent}>
                    {Object.entries(resortsByArea).map(([area, resorts]) => (
                      <View key={area} style={styles.areaSection}>
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
                            color={colors.icon}
                          />
                        </TouchableOpacity>

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
                                  {getResortName(resort, locale)}
                                </Text>
                                {resortId === resort.id && (
                                  <IconSymbol name="checkmark" size={16} color={colors.tint} />
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
            </>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.dateLabel')}</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.pickerText, !date && styles.placeholderText]}>
              {formatDisplayDate(date)}
            </Text>
            <IconSymbol name="calendar" size={20} color={colors.icon} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
              textColor={colors.text}
            />
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{t('create.startTimeLabel')}</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowStartTimePicker(!showStartTimePicker)}
            >
              <Text style={styles.pickerText}>{startTime}</Text>
              <IconSymbol name="chevron.down" size={20} color={colors.icon} />
            </TouchableOpacity>
            {showStartTimePicker && (
              <ScrollView
                ref={startTimeScrollRef}
                style={styles.timePickerOptions}
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
                onLayout={() => {
                  scrollToSelectedTime(startTimeScrollRef, startTime);
                }}
              >
                {TIME_OPTIONS.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={styles.timePickerOption}
                    onPress={() => {
                      setStartTime(time);
                      setShowStartTimePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        startTime === time && styles.pickerOptionTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                    {startTime === time && (
                      <IconSymbol name="checkmark" size={16} color={colors.tint} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{t('create.endTimeLabel')}</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowEndTimePicker(!showEndTimePicker)}
            >
              <Text style={styles.pickerText}>{endTime}</Text>
              <IconSymbol name="chevron.down" size={20} color={colors.icon} />
            </TouchableOpacity>
            {showEndTimePicker && (
              <ScrollView
                ref={endTimeScrollRef}
                style={styles.timePickerOptions}
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
                onLayout={() => {
                  scrollToSelectedTime(endTimeScrollRef, endTime);
                }}
              >
                {TIME_OPTIONS.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={styles.timePickerOption}
                    onPress={() => {
                      setEndTime(time);
                      setShowEndTimePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        endTime === time && styles.pickerOptionTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                    {endTime === time && (
                      <IconSymbol name="checkmark" size={16} color={colors.tint} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Capacity */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.capacityLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
          />
        </View>

        {/* Level */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.levelLabel')}</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowLevelPicker(!showLevelPicker)}
          >
            <Text style={styles.pickerText}>{selectedLevelLabel}</Text>
            <IconSymbol name="chevron.down" size={20} color={colors.icon} />
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
                    {t(lv.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.priceLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('create.pricePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
          />
        </View>

        {/* Meeting Place */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.meetingPlaceLabel')}</Text>
          <TextInput
            style={styles.input}
            value={meetingPlace}
            onChangeText={setMeetingPlace}
          />
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.tagsLabel')}</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.input, styles.tagInput]}
              placeholder={t('create.tagsPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
            />
            <TouchableOpacity style={styles.tagAddButton} onPress={addTag}>
              <Text style={styles.tagAddButtonText}>{t('create.addTagButton')}</Text>
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
                      <IconSymbol name="xmark" size={14} color={colors.text} />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.imagesLabel')}</Text>
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
                    <IconSymbol name="xmark" size={16} color={colors.text} />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
            {selectedImages.length < 3 && (
              <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
                <IconSymbol name="photo" size={32} color={colors.icon} />
                <Text style={styles.imagePlaceholderText}>{t('create.addImage')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Create/Edit Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.createButtonText}>
              {isEditMode ? t('create.saveEdit') : t('create.post')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Delete Button (Edit Mode Only) */}
        {isEditMode && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={loading}
          >
            <Text style={styles.deleteButtonText}>{t('create.deletePost')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
  );
}

// スタイルは動的に生成する必要があるため、コンポーネント内に移動
function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
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
      color: colors.text,
      marginBottom: 24,
      marginTop: 16,
    },
    section: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.backgroundSecondary,
      color: colors.text,
      fontSize: 16,
      padding: 12,
      borderRadius: 8,
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
      backgroundColor: colors.backgroundSecondary,
      padding: 12,
      borderRadius: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerText: {
      color: colors.text,
      fontSize: 16,
    },
    pickerOptions: {
      marginTop: 8,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      maxHeight: 200,
    },
    timePickerOptions: {
      marginTop: 8,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      maxHeight: 200,
      // Note: スクロールバーの太さはプラットフォームのデフォルト設定に依存します
      // iOSとAndroidではネイティブのスクロールバーが使用されます
    },
    pickerOption: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    timePickerOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerOptionText: {
      color: colors.textSecondary,
      fontSize: 16,
    },
    pickerOptionTextActive: {
      color: colors.tint,
      fontWeight: '600',
    },
    areaSection: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    areaHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    areaHeaderText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    resortListContainer: {
      backgroundColor: colors.background,
    },
    resortItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    resortItemActive: {
      backgroundColor: colors.tint,
    },
    resortItemText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    resortItemTextActive: {
      color: colors.text,
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
      backgroundColor: colors.tint,
      paddingHorizontal: 16,
      borderRadius: 8,
      justifyContent: 'center',
    },
    tagAddButtonText: {
      color: colors.text,
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
      backgroundColor: colors.tint,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
    },
    tagText: {
      color: colors.text,
      fontSize: 14,
    },
    tagRemoveButton: {
      marginLeft: 4,
    },
    tagRemoveIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.error,
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
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imagePlaceholder: {
      width: 100,
      height: 100,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePlaceholderText: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 4,
    },
    createButton: {
      marginTop: 24,
      paddingVertical: 16,
      backgroundColor: colors.tint,
      borderRadius: 12,
      alignItems: 'center',
    },
    createButtonDisabled: {
      opacity: 0.6,
    },
    createButtonText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    deleteButton: {
      marginTop: 16,
      paddingVertical: 16,
      backgroundColor: 'transparent',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.error,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: colors.error,
      fontSize: 18,
      fontWeight: '600',
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
    },
    placeholderText: {
      color: colors.textSecondary,
    },
  });
}
