import { IconSymbol } from '@/components/ui/icon-symbol';
import { getAreaOrder } from '@/constants/areas';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResorts } from '@/hooks/useResorts';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import { IMAGE_MAX_SIZE, resizeImageForUpload } from '@/lib/imageResize';
import type { SkillLevel } from '@/types';
import { getResortName, getResortPrefecture } from '@/utils/resort-helpers';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { ResortSearch } from '@/components/snowfeed/ResortSearch';
import { Chip } from '@/components/ui/Chip';
import { ACTIVITY_TYPES, MAX_ACTIVITIES, normalizeActivities, type ActivityType } from '@/constants/activities';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { syncEventReminders } from '@/services/eventNotificationService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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

/**
 * 前の画面に戻る。戻り先がない（タブバーの「作成」から直接開いた）ときはホームへ。
 * router.back() だけだと "The action 'GO_BACK' was not handled" になっていた
 */
const goBackOrHome = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.navigate('/(tabs)/home');
  }
};

// 時刻は "HH:mm" の文字列で持ち、選ぶときは端末の標準の時刻ピッカーを使う
const timeStringToDate = (time: string): Date | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const d = new Date();
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d;
};

const dateToTimeString = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const resortsState = useResorts();
  // presetDate（YYYY-MM-DD）・presetStartTime（HH:mm）・presetResortId：ホームの「朝イチ組を作る」などから入力済みで開く
  const params = useLocalSearchParams<{
    eventId?: string;
    presetDate?: string;
    presetStartTime?: string;
    presetResortId?: string;
    t?: string;
  }>();
  const isEditMode = !!params.eventId;
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('event');
  const [resortId, setResortId] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [capacity, setCapacity] = useState('');
  const [level, setLevel] = useState<SkillLevel | ''>('');
  const [price, setPrice] = useState('');
  // 一人参加OK（posts_events.solo_ok）
  const [soloOk, setSoloOk] = useState(false);
  // アクティビティ（posts_events.activities）
  const [activities, setActivities] = useState<ActivityType[]>([]);

  // 入力済みで開く（新規作成のときだけ）
  React.useEffect(() => {
    if (params.eventId) return;
    if (params.presetDate) {
      const [y, m, d] = params.presetDate.split('-').map(Number);
      if (y && m && d) setDate(new Date(y, m - 1, d));
    }
    if (params.presetStartTime && /^\d{1,2}:\d{2}$/.test(params.presetStartTime)) {
      setStartTime(params.presetStartTime.padStart(5, '0'));
    }
    if (params.presetResortId) setResortId(params.presetResortId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.presetDate, params.presetStartTime, params.presetResortId, params.t]);

  // この画面はタブなので開いたままになり、前回のスクロール位置（作成ボタンのある下の方）が残る。
  // 開くたびに一番上から表示する
  const formScrollRef = React.useRef<ScrollView>(null);
  useFocusEffect(
    React.useCallback(() => {
      formScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [params.eventId])
  );
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
      setSoloOk(!!eventData.solo_ok);
      setActivities(normalizeActivities(eventData.activities));
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
      goBackOrHome();
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
    setStartTime('');
    setEndTime('');
    setCapacity('');
    setLevel('');
    setPrice('');
    setSoloOk(false);
    setActivities([]);
    setMeetingPlace('');
    setTagInput('');
    setTags([]);
    setSelectedImages([]);
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
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

              // 中止する前に参加者に通知を送信
              if (params.eventId && title) {
                try {
                  const { notifyEventCancellation } = await import('@/services/eventNotificationService');
                  await notifyEventCancellation(params.eventId, title);
                  console.log('✅ Sent cancellation notifications to participants');
                } catch (notifyError) {
                  console.error('Failed to send cancellation notifications:', notifyError);
                  // 通知失敗してもイベント削除は続行
                }
              }

              // 物理削除はしない：status を cancelled にして記録は残す
              // （参加・主催の実績、チャット・評価の履歴、通報があったときの確認のため）。
              // 中止したイベントは、さがす・ホーム・ゲレンデページ・チャット・自分の投稿一覧に出ない
              const { data: cancelled, error } = await supabase
                .from('posts_events')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', params.eventId)
                .select('id');

              if (error) throw error;
              // RLS で更新できないとエラーにならず 0 件になる
              if (!cancelled || cancelled.length === 0) throw new Error('event not cancelled');

              queryClient.invalidateQueries({ queryKey: ['resortPage', 'upcomingEvents'] });
              queryClient.invalidateQueries({ queryKey: ['home'] });
              const { data: { session: cancelSession } } = await supabase.auth.getSession();
              if (cancelSession?.user) syncEventReminders(cancelSession.user.id, locale);

              Alert.alert(t('common.complete'), t('create.deletePostSuccess'), [
                {
                  text: t('common.ok'),
                  onPress: () => {
                    resetForm();
                    // After deletion, go back (the event detail will handle the missing event)
                    goBackOrHome();
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
    // 複数枚を並列でアップロード（順番は selectedImages の並びを維持）
    const baseTime = Date.now();
    return Promise.all(
      selectedImages.map(async (imageUri, i) => {
        let uploadUri = imageUri;
        let fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        let contentType = `image/${fileExt}`;

        // 端末内の画像はアップロード前に縮小（長辺 1600px、JPEG）
        if (!imageUri.startsWith('http')) {
          const resized = await resizeImageForUpload(imageUri, IMAGE_MAX_SIZE.event);
          uploadUri = resized.uri;
          fileExt = resized.ext;
          contentType = resized.mimeType;
        }

        const fileName = `${eventId}/${baseTime}-${i}.${fileExt}`;

        // 端末内のファイルは base64 で読んで ArrayBuffer にする（プロフィール画像のアップロードと同じ方法）。
        // 以前の fetch(file://...).arrayBuffer() は Android で失敗することがあり、
        // イベントは作成されるのに画像だけ登録されなかった
        let arrayBuffer: ArrayBuffer;
        if (uploadUri.startsWith('http')) {
          const response = await fetch(uploadUri);
          arrayBuffer = await response.arrayBuffer();
        } else {
          const base64 = await FileSystem.readAsStringAsync(uploadUri, { encoding: 'base64' });
          arrayBuffer = decode(base64);
        }
        if (arrayBuffer.byteLength === 0) {
          throw new Error(`Empty image data: ${uploadUri}`);
        }

        const { error } = await supabase.storage
          .from('event_images')
          .upload(fileName, arrayBuffer, {
            contentType,
            upsert: false,
          });

        if (error) {
          console.error('Image upload error:', error);
          throw error;
        }

        // ファイルパスを保存（URLではなく）
        // useDiscoverEventsフックが自動的にPublic URLを生成します
        return fileName;
      })
    );
  };

  // 作成ボタンの二重送信を防ぐ（loading は次の描画まで反映されないので、連続タップで2件作られていた）
  const submittingRef = React.useRef(false);
  const handleCreate = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await createEvent();
    } finally {
      submittingRef.current = false;
    }
  };

  const createEvent = async () => {
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
        solo_ok: soloOk,
        activities,
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
          const { error: updateError } = await supabase
            .from('posts_events')
            .update({ photos: photoPaths })
            .eq('id', eventId)
            .select('id, photos');

          if (updateError) {
            console.error('Update error:', updateError);
            throw updateError;
          }

          console.log('Photos field updated successfully');
        } catch (uploadError) {
          console.error('Image upload/update error:', uploadError);
          // Continue even if image upload fails
          Alert.alert(
            t('common.warning'),
            isEditMode ? t('create.imageUploadWarningEdit') : t('create.imageUploadWarning')
          );
        }
      }

      // 新規作成の場合、★登録ユーザーに通知
      if (!isEditMode) {
        try {
          const { notifyStarredUsersOfNewEvent } = await import('@/hooks/useEventCreation');
          await notifyStarredUsersOfNewEvent(session.user.id, title, eventId);
        } catch (notifyError) {
          console.error('Failed to notify starred users:', notifyError);
          // 通知失敗してもイベント作成は成功として扱う
        }
      }

      // 主催するイベントの開始リマインダーを揃える（新規作成・日時の変更）
      syncEventReminders(session.user.id, locale);
      // ゲレンデページ・ホームのイベント一覧に、作った（直した）イベントをすぐ出す
      queryClient.invalidateQueries({ queryKey: ['resortPage', 'upcomingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });

      Alert.alert(t('common.complete'), isEditMode ? t('create.postUpdated') : t('create.postCreated'), [
        {
          text: t('common.ok'),
          onPress: () => {
            // Always reset form to prevent leftover data
            resetForm();
            goBackOrHome();
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
      ? (() => {
          const r = resortsState.resorts.find((x) => x.id === resortId);
          return r ? getResortName(r, locale) : t('create.selectResort');
        })()
      : t('create.selectResort');

  const selectedLevelLabel =
    SKILL_LEVELS.find((l) => l.value === level)?.labelKey ? t(SKILL_LEVELS.find((l) => l.value === level)!.labelKey) : t('create.levelNone');

  return (
    <View style={styles.container}>
      {/* Custom header for edit mode */}
      {isEditMode && (
        <View style={[styles.customHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                t('common.confirmBack'),
                t('create.unsavedChangesWarning'),
                [
                  {
                    text: t('common.cancel'),
                    style: 'cancel',
                  },
                  {
                    text: t('common.discard'),
                    style: 'destructive',
                    onPress: () => {
                      resetForm();
                      goBackOrHome();
                    },
                  },
                ],
                { cancelable: true }
              );
            }}
            style={styles.backButton}
          >
            <IconSymbol name="chevron.left" size={28} color={colors.text} />
            <Text style={[styles.backButtonText, { color: colors.text }]}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('create.editTitle')}</Text>
          <View style={styles.backButton} />
        </View>
      )}

      <ScrollView
        ref={formScrollRef}
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingTop: isEditMode ? 0 : Math.max(insets.top, 16) }}
      >
        <View style={styles.content}>
          {!isEditMode && <Text style={styles.title}>{t('create.title')}</Text>}

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

              {/* ゲレンデの一覧（さがす・ゲレンデページと同じ。♡ でお気に入り、ホームとお気に入りが上に並ぶ） */}
              <Modal
                visible={showResortPicker}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowResortPicker(false)}
              >
                <ResortSearch
                  title={t('create.selectResortTitle')}
                  selectedId={resortId || null}
                  onSelectResort={(id) => {
                    setResortId(id);
                    setShowResortPicker(false);
                  }}
                  onClose={() => setShowResortPicker(false)}
                />
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
              onPress={() => setShowStartTimePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('create.startTimeLabel')} ${startTime || t('create.selectTime')}`}
            >
              <Text style={[styles.pickerText, !startTime && styles.placeholderText]}>
                {startTime || t('create.selectTime')}
              </Text>
              <Ionicons name="time-outline" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{t('create.endTimeLabel')}</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowEndTimePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('create.endTimeLabel')} ${endTime || t('create.selectTime')}`}
            >
              <Text style={[styles.pickerText, !endTime && styles.placeholderText]}>
                {endTime || t('create.selectTime')}
              </Text>
              <Ionicons name="time-outline" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 時刻は端末の標準の時刻ピッカー（Android は時計、iOS はドラム） */}
        <DatePickerSheet
          visible={showStartTimePicker}
          mode="time"
          title={t('create.startTimeLabel')}
          value={timeStringToDate(startTime)}
          onConfirm={(value) => {
            setShowStartTimePicker(false);
            setStartTime(dateToTimeString(value));
          }}
          onCancel={() => setShowStartTimePicker(false)}
          confirmLabel={t('common.ok')}
          cancelLabel={t('common.cancel')}
        />
        <DatePickerSheet
          visible={showEndTimePicker}
          mode="time"
          title={t('create.endTimeLabel')}
          value={timeStringToDate(endTime) ?? timeStringToDate(startTime)}
          onConfirm={(value) => {
            setShowEndTimePicker(false);
            setEndTime(dateToTimeString(value));
          }}
          onCancel={() => setShowEndTimePicker(false)}
          confirmLabel={t('common.ok')}
          cancelLabel={t('common.cancel')}
        />

        {/* Capacity */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('create.capacityLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('create.capacityPlaceholder')}
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

        {/* 一人参加OK */}
        <View style={[styles.section, styles.switchRow]}>
          <View style={styles.switchText}>
            <Text style={[styles.label, styles.switchLabel]}>{t('create.soloOkLabel')}</Text>
            <Text style={styles.switchHint}>{t('create.soloOkHint')}</Text>
          </View>
          <Switch
            value={soloOk}
            onValueChange={setSoloOk}
            trackColor={{ false: colors.backgroundTertiary, true: colors.primaryButton }}
            thumbColor={Platform.OS === 'android' ? (soloOk ? colors.primaryButtonText : colors.textLabel) : undefined}
            ios_backgroundColor={colors.backgroundTertiary}
            accessibilityLabel={t('create.soloOkLabel')}
            accessibilityHint={t('create.soloOkHint')}
            testID="create-solo-ok"
          />
        </View>

        {/* アクティビティ（複数選択・{MAX_ACTIVITIES}つまで） */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('activities.label')}</Text>
          <Text style={styles.switchHint}>{t('activities.hint', { max: MAX_ACTIVITIES })}</Text>
          <View style={styles.activityChips}>
            {ACTIVITY_TYPES.map((key) => {
              const on = activities.includes(key);
              return (
                <Chip
                  key={key}
                  label={t(`activities.${key}`)}
                  selected={on}
                  onPress={() => {
                    if (on) {
                      setActivities((prev) => prev.filter((a) => a !== key));
                    } else if (activities.length >= MAX_ACTIVITIES) {
                      Alert.alert(t('activities.tooMany', { max: MAX_ACTIVITIES }));
                    } else {
                      setActivities((prev) => ACTIVITY_TYPES.filter((a) => a === key || prev.includes(a)));
                    }
                  }}
                  testID={`activity-${key}`}
                />
              );
            })}
          </View>
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
    </View>
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
    activityChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: 44,
    },
    switchText: {
      flex: 1,
    },
    switchLabel: {
      marginBottom: 2,
    },
    switchHint: {
      fontSize: 12,
      color: colors.textLabel,
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
      paddingVertical: 14,
      backgroundColor: 'transparent',
      alignItems: 'center',
    },
    deleteButtonText: {
      color: colors.error,
      fontSize: 16,
      fontWeight: '500',
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
    },
    placeholderText: {
      color: colors.textSecondary,
    },
    customHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      minWidth: 80,
    },
    backButtonText: {
      fontSize: 16,
      marginLeft: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
    },
    scrollContainer: {
      flex: 1,
    },
  });
}
