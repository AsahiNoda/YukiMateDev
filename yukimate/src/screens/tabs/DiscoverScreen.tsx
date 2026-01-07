import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import { applyToEvent, saveEvent, useDiscoverEvents } from '@hooks/useDiscoverEvents';
import { useTranslation } from '@hooks/useTranslation';
import type { DiscoverEvent } from '@types';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// アイコンのインポート
import YenIcon from '../../../assets/images/icons/yen.svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;
const VERTICAL_SWIPE_THRESHOLD = 100;

type ConfirmationModalProps = {
  visible: boolean;
  type: 'apply' | 'save';
  event: DiscoverEvent | null;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmationModal({ visible, type, event, onConfirm, onCancel }: ConfirmationModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  if (!event) return null;

  const isApply = type === 'apply';
  const title = isApply ? t('discover.applyConfirm') : t('discover.saveConfirm');
  const message = isApply
    ? t('discover.applyMessage').replace('${title}', event.title)
    : t('discover.saveMessage').replace('${title}', event.title);
  const confirmText = isApply ? t('discover.apply') : t('discover.save');
  const confirmColor = isApply ? colors.success : colors.accent;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <BlurView intensity={40} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <IconSymbol
              name={isApply ? 'checkmark.circle.fill' : 'star.fill'}
              size={48}
              color={confirmColor}
            />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          </View>

          <View style={styles.modalBody}>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>{message}</Text>

            {/* Event Preview */}
            <View style={[styles.modalEventPreview, { backgroundColor: colors.backgroundSecondary }]}>
              {event.photoUrls.length > 0 ? (
                <Image
                  source={{ uri: event.photoUrls[0] }}
                  style={styles.modalEventImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.modalEventImagePlaceholder, { backgroundColor: colors.backgroundTertiary }]}>
                  <Text style={styles.modalEventEmoji}>🏔️</Text>
                </View>
              )}
              <View style={styles.modalEventInfo}>
                <Text style={[styles.modalEventTitle, { color: colors.text }]} numberOfLines={2}>
                  {event.title}
                </Text>
                <Text style={[styles.modalEventHost, { color: colors.textSecondary }]}>{t('eventDetail.host')}: {event.hostName}</Text>
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButtonCancel, { backgroundColor: colors.backgroundTertiary }]}
              onPress={onCancel}
              activeOpacity={0.8}>
              <Text style={[styles.modalButtonCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButtonConfirm, { backgroundColor: confirmColor }]}
              onPress={onConfirm}
              activeOpacity={0.8}>
              <Text style={[styles.modalButtonConfirmText, { color: colors.text }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

export default function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingSwipe, setPendingSwipe] = useState<{
    direction: 'left' | 'right' | 'up';
    event: DiscoverEvent;
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    type: 'apply' | 'save';
    event: DiscoverEvent | null;
  }>({
    visible: false,
    type: 'apply',
    event: null,
  });

  const eventsState = useDiscoverEvents({
    limit: 20,
  });

  // フルスクリーン表示
  const CARD_HEIGHT = SCREEN_HEIGHT;

  const handleConfirmAction = useCallback(async () => {
    if (!confirmModal.event) return;

    if (confirmModal.type === 'apply') {
      // 参加申請
      const result = await applyToEvent(confirmModal.event.id);
      if (result.success) {
        // 成功時はダイアログを閉じて次へ
        setConfirmModal({ visible: false, type: 'apply', event: null });
        setPendingSwipe(null);
        setCurrentIndex((prev) => prev + 1);
      } else {
        // エラー時はモーダルを閉じてエラー表示
        setConfirmModal({ visible: false, type: 'apply', event: null });
        setPendingSwipe(null);
        console.error(t('discover.applicationError'), result.error);
      }
    } else {
      // 保存
      const result = await saveEvent(confirmModal.event.id);
      if (result.success) {
        // 成功時はダイアログを閉じて次へ
        setConfirmModal({ visible: false, type: 'save', event: null });
        setPendingSwipe(null);
        setCurrentIndex((prev) => prev + 1);
      } else {
        // エラー時はモーダルを閉じてエラー表示
        setConfirmModal({ visible: false, type: 'save', event: null });
        setPendingSwipe(null);
        console.error(t('discover.saveError'), result.error);
      }
    }
  }, [confirmModal]);

  const handleCancelAction = useCallback(() => {
    setConfirmModal({ visible: false, type: 'apply', event: null });
    // キャンセル時はpendingSwipeをクリアしてカードをリセット
    setPendingSwipe(null);
  }, []);

  const handleSwipe = useCallback(
    (direction: 'left' | 'right' | 'up', event: DiscoverEvent) => {
      if (direction === 'right') {
        // 右スワイプ → 申請確認
        setPendingSwipe({ direction, event });
        setConfirmModal({
          visible: true,
          type: 'apply',
          event: event,
        });
      } else if (direction === 'left') {
        // 左スワイプ → 保存確認
        setPendingSwipe({ direction, event });
        setConfirmModal({
          visible: true,
          type: 'save',
          event: event,
        });
      } else {
        // 上スワイプ → スキップ(確認なし)
        setCurrentIndex((prev) => prev + 1);
      }
    },
    []
  );

  if (eventsState.status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('discover.loading')}</Text>
      </View>
    );
  }

  if (eventsState.status === 'error') {
    const isAuthError = eventsState.error.includes('ログイン');

    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <IconSymbol
          name={isAuthError ? 'person.crop.circle.badge.exclamationmark' : 'exclamationmark.triangle.fill'}
          size={60}
          color={colors.error}
          style={{ marginBottom: 16 }}
        />
        <Text style={[styles.errorText, { color: colors.error }]}>{t('discover.errorOccurred')}</Text>
        <Text style={[styles.errorSubText, { color: colors.textSecondary }]}>{eventsState.error}</Text>

        {isAuthError && (
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}>
            <IconSymbol name="person.circle.fill" size={20} color={colors.background} />
            <Text style={[styles.loginButtonText, { color: colors.background }]}>
              {t('auth.goToLogin')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const hasMoreEvents = currentIndex < eventsState.events.length;

  if (!hasMoreEvents) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.text }]}>{t('discover.allEventsChecked')}</Text>
        <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>{t('discover.waitingForNew')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Card Stack - Fullscreen */}
      <View style={styles.cardContainer}>
        {eventsState.events.slice(currentIndex, currentIndex + 2).map((event, index) => (
          <SwipeableCard
            key={event.id}
            event={event}
            index={index}
            onSwipe={handleSwipe}
            isTopCard={index === 0}
            shouldReset={pendingSwipe === null && index === 0}
            onShowDetail={(evt) => router.push({
              pathname: '/event-detail',
              params: { eventId: evt.id }
            })}
            cardHeight={CARD_HEIGHT}
            insets={insets}
          />
        ))}
      </View>

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
      </View>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        type={confirmModal.type}
        event={confirmModal.event}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />
    </View>
  );
}

type SwipeableCardProps = {
  event: DiscoverEvent;
  index: number;
  onSwipe: (direction: 'left' | 'right' | 'up', event: DiscoverEvent) => void;
  isTopCard: boolean;
  shouldReset: boolean;
  onShowDetail: (event: DiscoverEvent) => void;
  cardHeight: number;
  insets: { top: number; bottom: number; left: number; right: number };
};

function SwipeableCard({ event, index, onSwipe, isTopCard, shouldReset, onShowDetail, cardHeight, insets }: SwipeableCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // 画像インデックス管理（複数画像切り替え用）
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = event.photoUrls.length > 1;

  // 次の画像へ
  const nextImage = useCallback(() => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev + 1) % event.photoUrls.length);
    }
  }, [hasMultipleImages, event.photoUrls.length]);

  // 前の画像へ
  const prevImage = useCallback(() => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev - 1 + event.photoUrls.length) % event.photoUrls.length);
    }
  }, [hasMultipleImages, event.photoUrls.length]);

  // shouldResetがtrueになったらカードをリセット
  React.useEffect(() => {
    if (shouldReset) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      setCurrentImageIndex(0); // 画像インデックスもリセット
    }
  }, [shouldReset, translateX, translateY, scale, opacity]);

  const panGesture = Gesture.Pan()
    .enabled(isTopCard)
    .onUpdate((e) => {
      // 横または縦のどちらが優勢かを判定
      const absX = Math.abs(e.translationX);
      const absY = Math.abs(e.translationY);

      if (absX > absY) {
        // 横スワイプが優勢 - 横のみ許可
        translateX.value = e.translationX;
        translateY.value = 0;
      } else {
        // 縦スワイプが優勢 - 縦のみ許可
        translateX.value = 0;
        translateY.value = e.translationY;
      }

      // スケールエフェクト
      const distance = Math.max(absX, absY);
      scale.value = interpolate(
        distance,
        [0, SCREEN_WIDTH],
        [1, 0.95],
        Extrapolate.CLAMP
      );
    })
    .onEnd((e) => {
      const absX = Math.abs(e.translationX);
      const absY = Math.abs(e.translationY);
      const shouldSwipeHorizontal = absX > SWIPE_THRESHOLD;
      const shouldSwipeUp = e.translationY < -VERTICAL_SWIPE_THRESHOLD;

      if (shouldSwipeUp && absY > absX) {
        // 上スワイプ - スキップ（縦が優勢の場合のみ）
        translateX.value = withSpring(0);
        translateY.value = withSpring(-SCREEN_HEIGHT);
        opacity.value = withSpring(0, {}, () => {
          runOnJS(onSwipe)('up', event);
        });
      } else if (shouldSwipeHorizontal && absX > absY) {
        // 横スワイプ（横が優勢の場合のみ）
        const direction = e.translationX > 0 ? 'right' : 'left';
        // 確認ダイアログを表示するためにカードを中途半端な位置で止める
        const targetX = direction === 'right' ? SCREEN_WIDTH * 0.7 : -SCREEN_WIDTH * 0.7;
        translateX.value = withSpring(targetX);
        translateY.value = withSpring(0);
        // onSwipeを呼んで確認ダイアログを表示
        runOnJS(onSwipe)(direction, event);
      } else {
        // 元に戻す
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
      zIndex: isTopCard ? 10 : 5 - index,
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: 0,
    };
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return t('common.free');
    return `¥${price.toLocaleString()}`;
  };

  const levelText = event.levelRequired || t('common.notSpecified');

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, { height: cardHeight, backgroundColor: colors.backgroundSecondary }, cardStyle]}>
        {/* Background Image */}
        <View style={styles.cardBackground}>
          {event.photoUrls.length > 0 ? (
            <>
              <Image
                source={{ uri: event.photoUrls[currentImageIndex] }}
                style={styles.cardImage}
                resizeMode="cover"
              />

              {/* 画像切り替えエリア（左右端タップ） */}
              {hasMultipleImages && (
                <>
                  <TouchableOpacity
                    style={styles.imageTapAreaLeft}
                    onPress={prevImage}
                    activeOpacity={1}
                  />
                  <TouchableOpacity
                    style={styles.imageTapAreaRight}
                    onPress={nextImage}
                    activeOpacity={1}
                  />

                  {/* 画像インジケーター */}
                  <View style={styles.imageIndicatorContainer}>
                    {event.photoUrls.map((_, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.imageIndicatorDot,
                          idx === currentImageIndex && styles.imageIndicatorDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.backgroundTertiary }]}>
              <Text style={styles.cardImageText}>🏔️</Text>
            </View>
          )}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.9)']}
            locations={[0, 0.5, 0.75, 1]}
            style={styles.cardGradient}
          />
        </View>

        {/* Overlay for swipe feedback */}
        <Animated.View style={[styles.swipeOverlay, overlayStyle]}>
          <Text style={styles.swipeOverlayText}>
            {translateX.value > 0 ? t('discover.applyOverlay') : t('discover.saveOverlay')}
          </Text>
        </Animated.View>

        {/* ★登録ユーザー参加中バッジ（画像の上、中央上部） */}
        {event.starredParticipants && event.starredParticipants.length > 0 && (
          <View style={styles.starredParticipantBadge}>
            <IconSymbol name="star.fill" size={14} color="#FFFFFF" />
            <Text style={styles.starredParticipantText}>{t('discover.usersParticipating')}</Text>
          </View>
        )}

        {/* Content */}
        <View style={[styles.cardContent, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 24 }]}>
          {/* Top spacer */}
          <View />

          {/* Bottom Section - Tappable */}
          <TouchableOpacity
            style={styles.cardBottomSection}
            onPress={() => onShowDetail(event)}
            activeOpacity={0.9}>
            {/* Date Badge */}
            <View style={styles.cardDateBadge}>
              <IconSymbol name="calendar" size={14} color="#FFFFFF" />
              <Text style={styles.cardDate}>{formatDate(event.startAt)}</Text>
            </View>

            {/* Host Info */}
            <View style={styles.cardHostRow}>
              <View>
                <RoleBasedAvatar
                  avatarUrl={event.hostAvatar}
                  role={event.hostRole}
                  size={48}
                  showBadge={true}
                />
              </View>
              <View style={styles.cardHostInfo}>
                <View style={styles.cardHostNameRow}>
                  <Text style={styles.cardHostName}>{event.hostName}</Text>
                  {event.isHostStarred && (
                    <IconSymbol name="star.fill" size={16} color={colors.accent} style={styles.cardHostStar} />
                  )}
                </View>
                <Text style={[styles.cardHostTags, { color: colors.textSecondary }]}>
                  {event.tags.slice(0, 2).map((tag) => `#${tag}`).join(' ')}
                </Text>
              </View>
            </View>

            {/* Title & Description */}
            <View style={styles.cardTextSection}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {event.title}
              </Text>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={3}>
                {event.description || t('discover.defaultDescription')}
              </Text>
            </View>

            {/* Metadata Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.cardMetadataItem}>
                <IconSymbol name="person.2.fill" size={16} color={colors.textSecondary} />
                <Text style={[styles.cardMetadataText, { color: colors.textSecondary }]}>
                  {event.spotsTaken}/{event.capacityTotal} {t('discover.peopleUnit')}
                </Text>
              </View>
              <View style={styles.cardMetadataItem}>
                <IconSymbol name="mountain.2.fill" size={16} color={colors.textSecondary} />
                <Text style={[styles.cardMetadataText, { color: colors.textSecondary }]}>{t('discover.levelLabel')} {levelText}</Text>
              </View>
              <View style={styles.cardPriceContainer}>
                <YenIcon width={18} height={18} color={colors.accent} />
                <Text style={[styles.cardPriceAmount, { color: colors.accent }]}>
                  {event.pricePerPersonJpy === null || event.pricePerPersonJpy === 0 ? t('common.free') : event.pricePerPersonJpy.toLocaleString()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Buttons - Right Side
        <View style={styles.cardActionButtons}>
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={() => onSwipe('right', event.id)}
            activeOpacity={0.8}>
            <IconSymbol name="hand.thumbsup.fill" size={28} color="#FFFFFF" />
            <Text style={styles.cardActionLabel}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={() => onSwipe('left', event.id)}
            activeOpacity={0.8}>
            <IconSymbol name="star.fill" size={28} color="#FFFFFF" />
            <Text style={styles.cardActionLabel}>Star</Text>
          </TouchableOpacity>
        </View> */}
      </Animated.View>
    </GestureDetector>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 100,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardContainer: {
    flex: 1,
  },
  card: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageText: {
    fontSize: 80,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  // 画像切り替えタップエリア
  imageTapAreaLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 100,
    zIndex: 5,
  },
  imageTapAreaRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    zIndex: 5,
  },
  // 画像インジケーター
  imageIndicatorContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 6,
  },
  imageIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  imageIndicatorDotActive: {
    backgroundColor: '#FFFFFF',
    width: 20,
  },
  starredParticipantBadge: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    zIndex: 7,
  },
  starredParticipantText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeOverlayText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
  },
  cardDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardBottomSection: {
    gap: 16,
    marginBottom: 70,
  },
  cardHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  cardHostAvatarImage: {
    width: '100%',
    height: '100%',
  },
  cardHostAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardHostInfo: {
    marginLeft: 12,
    flex: 1,
  },
  cardHostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardHostName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardHostStar: {
    marginBottom: 2,
  },
  cardHostTags: {
    fontSize: 13,
  },
  cardTextSection: {
    gap: 10,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    lineHeight: 38,
  },
  cardDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 4,
  },
  cardMetadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetadataText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardPriceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardPriceUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardActionButtons: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    gap: 20,
    zIndex: 5,
  },
  cardActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 64,
    height: 64,
    borderRadius: 32,
    backdropFilter: 'blur(10px)',
  },
  cardActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  modalEventPreview: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  modalEventImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  modalEventImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEventEmoji: {
    fontSize: 32,
  },
  modalEventInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  modalEventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalEventHost: {
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
