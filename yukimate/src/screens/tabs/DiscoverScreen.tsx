import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSymbol } from '@components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useDiscoverEvents, applyToEvent, saveEvent } from '@hooks/useDiscoverEvents';
import type { DiscoverEvent } from '@types';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
  if (!event) return null;

  const isApply = type === 'apply';
  const title = isApply ? '参加申請の確認' : '保存の確認';
  const message = isApply
    ? `「${event.title}」への参加申請を送信しますか?`
    : `「${event.title}」を保存しますか?`;
  const confirmText = isApply ? '申請する' : '保存する';
  const confirmColor = isApply ? '#4ADE80' : '#FCD34D';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <BlurView intensity={40} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <IconSymbol
              name={isApply ? 'checkmark.circle.fill' : 'star.fill'}
              size={48}
              color={confirmColor}
            />
            <Text style={styles.modalTitle}>{title}</Text>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalMessage}>{message}</Text>

            {/* Event Preview */}
            <View style={styles.modalEventPreview}>
              {event.photoUrls.length > 0 ? (
                <Image
                  source={{ uri: event.photoUrls[0] }}
                  style={styles.modalEventImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.modalEventImagePlaceholder}>
                  <Text style={styles.modalEventEmoji}>🏔️</Text>
                </View>
              )}
              <View style={styles.modalEventInfo}>
                <Text style={styles.modalEventTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                <Text style={styles.modalEventHost}>by {event.hostName}</Text>
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButtonCancel}
              onPress={onCancel}
              activeOpacity={0.8}>
              <Text style={styles.modalButtonCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButtonConfirm, { backgroundColor: confirmColor }]}
              onPress={onConfirm}
              activeOpacity={0.8}>
              <Text style={styles.modalButtonConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

export default function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
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
    category: 'all',
  });

  // カードの高さを計算（ナビバー + ヘッダー分を除く）
  const CARD_HEIGHT = SCREEN_HEIGHT - insets.bottom - 200; // bottom inset(ナビバー) + ヘッダー分

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
        console.error('申請エラー:', result.error);
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
        console.error('保存エラー:', result.error);
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
        <Text style={styles.loadingText}>イベントを読み込み中...</Text>
      </View>
    );
  }

  if (eventsState.status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>エラーが発生しました</Text>
        <Text style={styles.errorSubText}>{eventsState.error}</Text>
      </View>
    );
  }

  const hasMoreEvents = currentIndex < eventsState.events.length;

  if (!hasMoreEvents) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>すべてのイベントを確認しました</Text>
        <Text style={styles.emptySubText}>新しいイベントをお待ちください</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          />
        ))}
      </View>

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <Text style={styles.headerTitle}>Discover</Text>
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
};

function SwipeableCard({ event, index, onSwipe, isTopCard, shouldReset, onShowDetail, cardHeight }: SwipeableCardProps) {
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
      translateX.value = e.translationX;
      translateY.value = e.translationY;

      // スケールエフェクト
      const distance = Math.sqrt(e.translationX ** 2 + e.translationY ** 2);
      scale.value = interpolate(
        distance,
        [0, SCREEN_WIDTH],
        [1, 0.9],
        Extrapolate.CLAMP
      );
    })
    .onEnd((e) => {
      const shouldSwipeHorizontal = Math.abs(e.translationX) > SWIPE_THRESHOLD;
      const shouldSwipeUp = e.translationY < -VERTICAL_SWIPE_THRESHOLD;

      if (shouldSwipeUp) {
        // 上スワイプ - スキップ
        translateY.value = withSpring(-SCREEN_HEIGHT);
        opacity.value = withSpring(0, {}, () => {
          runOnJS(onSwipe)('up', event);
        });
      } else if (shouldSwipeHorizontal) {
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
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-15, 0, 15],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Free';
    return `¥${price.toLocaleString()}`;
  };

  const levelText = event.levelRequired || 'Any';

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, { height: cardHeight }, cardStyle]}>
        {/* Background Image */}
        <View style={styles.cardBackground}>
          {event.photoUrls.length > 0 ? (
            <>
              <Image
                source={{ uri: event.photoUrls[currentImageIndex] }}
                style={styles.cardImage}
                resizeMode="contain"
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
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.cardImageText}>🏔️</Text>
            </View>
          )}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.85)']}
            style={styles.cardGradient}
          />
        </View>

        {/* Overlay for swipe feedback */}
        <Animated.View style={[styles.swipeOverlay, overlayStyle]}>
          <Text style={styles.swipeOverlayText}>
            {translateX.value > 0 ? '申請' : '保存'}
          </Text>
        </Animated.View>

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Date Badge - Top Left */}
          <View style={styles.cardDateBadge}>
            <IconSymbol name="calendar" size={14} color="#FFFFFF" />
            <Text style={styles.cardDate}>{formatDate(event.startAt)}</Text>
          </View>

          {/* Bottom Section - Tappable */}
          <TouchableOpacity
            style={styles.cardBottomSection}
            onPress={() => onShowDetail(event)}
            activeOpacity={0.9}>
            {/* Host Info */}
            <View style={styles.cardHostRow}>
              <View style={styles.cardHostAvatar}>
                {event.hostAvatar ? (
                  <Image
                    source={{ uri: event.hostAvatar }}
                    style={styles.cardHostAvatarImage}
                  />
                ) : (
                  <Text style={styles.cardHostAvatarText}>
                    {event.hostName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.cardHostInfo}>
                <Text style={styles.cardHostName}>{event.hostName}</Text>
                <Text style={styles.cardHostTags}>
                  {event.tags.slice(0, 2).map((tag) => `#${tag}`).join(' ')}
                </Text>
              </View>
            </View>

            {/* Title & Description */}
            <View style={styles.cardTextSection}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {event.title}
              </Text>
              <Text style={styles.cardDescription} numberOfLines={3}>
                {event.description || 'Looking for experienced riders to explore the legendary backcountry... Let\'s chase some fresh tracks!'}
              </Text>
            </View>

            {/* Metadata Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.cardMetadataItem}>
                <IconSymbol name="person.2.fill" size={16} color="#E5E7EB" />
                <Text style={styles.cardMetadataText}>
                  {event.spotsTaken}/{event.capacityTotal} spots
                </Text>
              </View>
              <View style={styles.cardMetadataItem}>
                <IconSymbol name="mountain.2.fill" size={16} color="#E5E7EB" />
                <Text style={styles.cardMetadataText}>Level: {levelText}</Text>
              </View>
              <View style={styles.cardPriceContainer}>
                <Text style={styles.cardPriceAmount}>
                  {formatPrice(event.pricePerPersonJpy)}
                </Text>
                <Text style={styles.cardPriceUnit}> / person</Text>
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
    backgroundColor: '#1B4B73',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B4B73',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    color: '#E5E7EB',
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F87171',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
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
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardContainer: {
    flex: 1,
  },
  card: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 220, // ナビバー(~80px)とヘッダー分を十分に考慮
    position: 'absolute',
    top: 120, // Discoverヘッダーより下に配置
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderRadius: 20,
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
    backgroundColor: '#334155',
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
    top: 20,
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
    padding: 24,
    justifyContent: 'space-between',
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
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardBottomSection: {
    gap: 12,
  },
  cardHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHostAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardHostAvatarImage: {
    width: '100%',
    height: '100%',
  },
  cardHostAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardHostInfo: {
    marginLeft: 12,
    flex: 1,
  },
  cardHostName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardHostTags: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  cardTextSection: {
    gap: 8,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cardDescription: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardMetadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetadataText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E5E7EB',
  },
  cardPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardPriceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FCD34D',
  },
  cardPriceUnit: {
    fontSize: 13,
    color: '#D1D5DB',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  modalEventPreview: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#E5E7EB',
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
    color: '#1F2937',
  },
  modalEventHost: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
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
    color: '#FFFFFF',
  },
});
