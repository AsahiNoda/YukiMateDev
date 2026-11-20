import { useTabBarHeight } from '@/components/AppTabBar';
import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useSwipedEvents } from '@/hooks/useSwipedEvents';
import { isSoloFriendly, levelLabel, priceLabel, spotsLeftChip } from '@/utils/eventDisplay';
import { formatEventDate } from '@/utils/formatEventDate';
import { IconSymbol } from '@components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';
import { applyToEvent, saveEvent, useDiscoverEvents } from '@hooks/useDiscoverEvents';
import { useTranslation } from '@hooks/useTranslation';
import type { DiscoverEvent } from '@types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** これより横に長い写真は「横長」として全体を見せる（幅÷高さ） */
const LANDSCAPE_ASPECT = 1.1;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY = 800;

type SwipeDirection = 'left' | 'right';

interface DiscoverScreenProps {
  /** 上部に出すヘッダー（「さがす」タイトルとリスト／スワイプの切り替え）。SearchScreen から渡す */
  header?: React.ReactNode;
  /** 「リストで見る」を押したとき */
  onSwitchToList?: () => void;
}

/**
 * 「さがす」のスワイプ表示（旧 Discover タブ）。
 * - 左スワイプ＝スキップ、右スワイプ＝保存（気になる）。どちらも確認なし
 * - 参加申請は中央の「参加申請」ボタンからのみ。確認は申請のときだけ出す
 * - スワイプで見送ったイベントは、この束から外すだけ（リスト表示には常に出る）。
 *   外したことは端末に覚えておき、表示を切り替えたり開き直したりしても同じカードを出さない
 * 見た目の仕様：docs/ui-redesign/mockups/New-Discover.html
 */
export default function DiscoverScreen({ header, onSwitchToList }: DiscoverScreenProps = {}) {
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { t } = useTranslation();

  const [applyTarget, setApplyTarget] = useState<DiscoverEvent | null>(null);
  const [applying, setApplying] = useState(false);
  const topCardRef = useRef<SwipeableCardHandle>(null);

  // スワイプ済みを端末側で外すので、少し多めに取る
  const eventsState = useDiscoverEvents({ limit: 50 });
  const swiped = useSwipedEvents();

  // カードが飛んでいったあと（スワイプでもボタンでも同じ）
  const handleSwiped = useCallback(
    (direction: SwipeDirection, event: DiscoverEvent) => {
      swiped.markSwiped(event.id, direction === 'right' ? 'save' : 'skip');
      if (direction === 'right') {
        // 保存は裏で行い、テンポを止めない。失敗したときだけ知らせる
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        saveEvent(event.id).then((result) => {
          if (!result.success) {
            Alert.alert(t('search.saveFailed'), result.error);
          }
        });
      }
    },
    [swiped.markSwiped, t]
  );

  const swipeTop = (direction: SwipeDirection, event: DiscoverEvent) => {
    if (topCardRef.current) {
      topCardRef.current.swipe(direction);
    } else {
      handleSwiped(direction, event);
    }
  };

  const handleConfirmApply = async () => {
    if (!applyTarget || applying) return;
    setApplying(true);
    const result = await applyToEvent(applyTarget.id);
    setApplying(false);
    setApplyTarget(null);

    if (result.success) {
      Alert.alert(t('search.applySent'), t('search.applySentMessage'));
      swiped.markSwiped(applyTarget.id, 'apply');
    } else {
      Alert.alert(t('search.applyFailed'), result.error);
    }
  };

  const bottomSpace = tabBarHeight + spacing.sm;
  const headerBlock = <View style={{ paddingTop: Math.max(insets.top, 10) }}>{header}</View>;

  // 読み込み中・エラー・空のときもヘッダー（切り替え）は出す
  if (eventsState.status === 'loading' || !swiped.loaded) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        {headerBlock}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.tintText} />
          <Text style={[styles.stateText, { color: c.chipText }]}>{t('discover.loading')}</Text>
        </View>
      </View>
    );
  }

  if (eventsState.status === 'error') {
    const isAuthError = eventsState.error.includes('ログイン');
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        {headerBlock}
        <View style={styles.centered}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={c.danger} />
          <Text style={[styles.stateTitle, { color: c.text }]}>{t('discover.errorOccurred')}</Text>
          <Text style={[styles.stateText, { color: c.chipText }]}>{eventsState.error}</Text>
          {isAuthError ? (
            <PillButton title={t('auth.goToLogin')} onPress={() => router.push('/(tabs)/profile')} />
          ) : null}
        </View>
      </View>
    );
  }

  // 束に残っているカード（スワイプ済み・申請済みは外す）
  const deck = eventsState.events.filter((e) => swiped.actionOf(e.id) === null);
  const topEvent = deck[0];
  const nextEvent = deck[1];
  const skippedInFeed = eventsState.events.filter((e) => swiped.actionOf(e.id) === 'skip').length;

  if (!topEvent) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        {headerBlock}
        <View style={[styles.centered, { paddingBottom: bottomSpace }]}>
          <Ionicons name="checkmark-done-circle-outline" size={56} color={c.textLabel} />
          <Text style={[styles.stateTitle, { color: c.text }]}>{t('search.allSwiped')}</Text>
          <Text style={[styles.stateText, { color: c.chipText }]}>{t('search.allSwipedSubtitle')}</Text>
          {onSwitchToList ? (
            <PillButton title={t('search.viewInList')} icon="list" onPress={onSwitchToList} />
          ) : null}
          {skippedInFeed > 0 ? (
            <PillButton
              title={t('search.showSkippedAgain', { count: skippedInFeed })}
              variant="secondary"
              icon="refresh"
              onPress={swiped.restoreSkipped}
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {headerBlock}

      {/* カードの束（次のカードを後ろに重ねる） */}
      <View style={styles.deck}>
        {nextEvent ? (
          <SwipeableCard key={nextEvent.id} event={nextEvent} isTopCard={false} onSwiped={handleSwiped} />
        ) : null}
        <SwipeableCard
          key={topEvent.id}
          ref={topCardRef}
          event={topEvent}
          isTopCard
          onSwiped={handleSwiped}
          onPress={() => router.push({ pathname: '/event-detail', params: { eventId: topEvent.id } })}
        />
      </View>

      {/* 操作のヒント */}
      <View style={styles.hintRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[styles.hintText, { color: c.textLabel }]}>{t('search.swipeHintSkip')}</Text>
        <Text style={[styles.hintText, { color: c.textLabel }]}>{t('search.swipeHintSave')}</Text>
      </View>

      {/* スキップ／参加申請／保存 */}
      <View style={[styles.actions, { marginBottom: bottomSpace }]}>
        <RoundAction
          icon="close"
          label={t('actions.skip')}
          onPress={() => swipeTop('left', topEvent)}
          testID="swipe-skip"
        />
        <View style={styles.applyColumn}>
          <PillButton
            title={t('actions.apply')}
            icon="paper-plane"
            onPress={() => setApplyTarget(topEvent)}
            style={styles.applyButton}
            testID="swipe-apply"
          />
          <Text style={[styles.actionLabel, { color: c.text }]}>{t('search.applyHint')}</Text>
        </View>
        <RoundAction
          icon="bookmark-outline"
          label={t('actions.save')}
          onPress={() => swipeTop('right', topEvent)}
          testID="swipe-save"
        />
      </View>

      <ApplyConfirmModal
        event={applyTarget}
        loading={applying}
        onConfirm={handleConfirmApply}
        onCancel={() => setApplyTarget(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------

function RoundAction({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const c = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.roundAction, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.roundIcon, { backgroundColor: c.chipBackground, borderColor: c.divider }]}>
        <Ionicons name={icon} size={26} color={c.text} />
      </View>
      <Text style={[styles.actionLabel, { color: c.chipText }]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

type SwipeableCardHandle = { swipe: (direction: SwipeDirection) => void };

type SwipeableCardProps = {
  event: DiscoverEvent;
  isTopCard: boolean;
  onSwiped: (direction: SwipeDirection, event: DiscoverEvent) => void;
  onPress?: () => void;
};

const SwipeableCard = forwardRef<SwipeableCardHandle, SwipeableCardProps>(function SwipeableCard(
  { event, isTopCard, onSwiped, onPress },
  ref
) {
  const c = useAppColors();
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [imageIndex, setImageIndex] = useState(0);
  // 写真の縦横比（幅÷高さ）。横長なら全体を見せる（後ろにぼかした同じ写真）、縦長・正方形はカードいっぱいに
  const [photoAspect, setPhotoAspect] = useState<Record<number, number>>({});
  const isLandscape = (photoAspect[imageIndex] ?? 0) > LANDSCAPE_ASPECT;
  const photos = event.photoUrls.length > 0 ? event.photoUrls : event.photoUrl ? [event.photoUrl] : [];
  const hasMultiplePhotos = photos.length > 1;

  const flyOut = (direction: SwipeDirection) => {
    'worklet';
    const toX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    translateX.value = withTiming(toX, { duration: 220 }, (finished) => {
      if (finished) runOnJS(onSwiped)(direction, event);
    });
  };

  // ボタンからも同じ動きでカードを飛ばす
  useImperativeHandle(ref, () => ({ swipe: (direction) => flyOut(direction) }), [event, onSwiped]);

  const pan = Gesture.Pan()
    .enabled(isTopCard)
    .activeOffsetX([-12, 12])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.15;
    })
    .onEnd((e) => {
      const goRight = e.translationX > SWIPE_THRESHOLD || e.velocityX > SWIPE_VELOCITY;
      const goLeft = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -SWIPE_VELOCITY;
      translateY.value = withSpring(0);
      if (goRight) {
        flyOut('right');
      } else if (goLeft) {
        flyOut('left');
      } else {
        translateX.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-SCREEN_WIDTH, SCREEN_WIDTH], [-10, 10], Extrapolation.CLAMP)}deg` },
      { scale: isTopCard ? 1 : 0.96 },
    ],
  }));
  const skipLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
  }));
  const saveLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const level = levelLabel(event.levelRequired, t);
  const spots = spotsLeftChip(event.capacityTotal, event.spotsTaken, t);
  const isFree = !event.pricePerPersonJpy;
  const hasStarredParticipant = (event.starredParticipants?.length ?? 0) > 0;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.card, { backgroundColor: c.card }, !isTopCard && styles.cardBehind, cardStyle]}
        pointerEvents={isTopCard ? 'auto' : 'none'}
        accessibilityElementsHidden={!isTopCard}
        importantForAccessibility={isTopCard ? 'auto' : 'no-hide-descendants'}
      >
        {/* 写真（複数枚は左右タップで切り替え） */}
        <View style={styles.photo}>
          {photos.length > 0 ? (
            <>
              {isLandscape ? (
                // 横長：ぼかした同じ写真で余白を埋め、写真そのものは切らずに全体を見せる
                <Image
                  source={{ uri: photos[imageIndex] }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  blurRadius={24}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              ) : null}
              <Image
                source={{ uri: photos[imageIndex] }}
                style={StyleSheet.absoluteFill}
                contentFit={isLandscape ? 'contain' : 'cover'}
                contentPosition="center"
                onLoad={(e) => {
                  const { width, height } = e.source;
                  if (width > 0 && height > 0) {
                    const index = imageIndex;
                    setPhotoAspect((prev) => (prev[index] ? prev : { ...prev, [index]: width / height }));
                  }
                }}
              />
            </>
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder, { backgroundColor: c.chipBackground }]}>
              <IconSymbol name="photo" size={40} color={c.textLabel} />
            </View>
          )}

          {hasMultiplePhotos ? (
            <>
              <Pressable
                style={styles.photoTapLeft}
                onPress={() => setImageIndex((i) => (i - 1 + photos.length) % photos.length)}
                accessibilityLabel={t('common.back')}
              />
              <Pressable
                style={styles.photoTapRight}
                onPress={() => setImageIndex((i) => (i + 1) % photos.length)}
                accessibilityLabel={t('common.next')}
              />
              <View style={styles.indicator} pointerEvents="none">
                {photos.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.indicatorBar, { backgroundColor: i === imageIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }]}
                  />
                ))}
              </View>
            </>
          ) : null}

          {/* ★登録ユーザーが参加しているとき */}
          {hasStarredParticipant ? (
            <View style={styles.starredBadge} pointerEvents="none">
              <Chip label={t('chips.starredJoining')} tone="starred" />
            </View>
          ) : null}

          {/* スワイプ中の表示 */}
          <Animated.View style={[styles.swipeLabel, styles.swipeLabelLeft, { borderColor: c.photoOverlayText, backgroundColor: c.photoOverlayBackground }, skipLabelStyle]} pointerEvents="none">
            <Text style={[styles.swipeLabelText, { color: c.photoOverlayText }]}>{t('actions.skip')}</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeLabel, styles.swipeLabelRight, { borderColor: c.photoOverlayText, backgroundColor: c.photoOverlayBackground }, saveLabelStyle]} pointerEvents="none">
            <Ionicons name="bookmark" size={16} color={c.photoOverlayText} />
            <Text style={[styles.swipeLabelText, { color: c.photoOverlayText }]}>{t('actions.save')}</Text>
          </Animated.View>
        </View>

        {/* 本文（タップで詳細） */}
        <Pressable
          style={styles.body}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityHint={t('actions.details')}
        >
          <Text style={[styles.meta, { color: c.tintText }]} numberOfLines={1}>
            {formatEventDate(event.startAt, t)} ・ {event.resortName}
          </Text>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
            {event.title}
          </Text>
          {/* 説明（3行まで。全文は詳細で） */}
          {event.description ? (
            <Text style={[styles.description, { color: c.chipText }]} numberOfLines={3}>
              {event.description}
            </Text>
          ) : null}
          <View style={styles.chips}>
            {isSoloFriendly(event) ? <Chip label={t('chips.soloOk')} tone="tint" /> : null}
            {level ? <Chip label={level} tone="neutral" /> : null}
            {spots ? <Chip label={spots.label} tone={spots.tone} /> : null}
            {isFree ? <Chip label={t('chips.free')} tone="neutral" /> : null}
          </View>
          <View style={styles.hostRow}>
            {/* ホストを押すとプロフィールへ */}
            <Pressable
              onPress={() => router.push(`/user/${event.hostUserId}` as any)}
              style={styles.hostLink}
              hitSlop={6}
              accessibilityRole="link"
              accessibilityLabel={t('search.host', { name: event.hostName })}
            >
              <RoleBasedAvatar avatarUrl={event.hostAvatar} role={event.hostRole} size={28} showBadge={false} />
              <Text style={[styles.hostText, { color: c.tintText }]} numberOfLines={1}>
                {t('search.host', { name: event.hostName })}
              </Text>
              {event.isHostStarred ? <Ionicons name="star" size={12} color={c.gold} /> : null}
            </Pressable>
            {!isFree ? (
              <Text style={[styles.price, { color: c.gold }]}>
                {priceLabel(event.pricePerPersonJpy, t)}
                <Text style={[styles.perPerson, { color: c.chipText }]}>{t('chips.perPerson')}</Text>
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
});

// ---------------------------------------------------------------------------

function ApplyConfirmModal({
  event,
  loading,
  onConfirm,
  onCancel,
}: {
  event: DiscoverEvent | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const c = useAppColors();
  const { t } = useTranslation();

  return (
    <Modal visible={!!event} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.modalOverlay, { backgroundColor: c.scrim }]}>
        {event ? (
          <View style={[styles.modalContent, { backgroundColor: c.sheetBackground }]}>
            <Text style={[styles.modalTitle, { color: c.text }]} accessibilityRole="header">
              {t('search.applyConfirmTitle')}
            </Text>
            <Text style={[styles.modalMessage, { color: c.chipText }]}>
              {t('search.applyConfirmMessage', { title: event.title })}
            </Text>
            <Text style={[styles.modalMeta, { color: c.tintText }]}>
              {formatEventDate(event.startAt, t)} ・ {event.resortName}
            </Text>
            <View style={styles.modalActions}>
              <PillButton title={t('common.cancel')} variant="secondary" onPress={onCancel} fill disabled={loading} />
              <PillButton title={t('actions.apply')} onPress={onConfirm} fill loading={loading} testID="apply-confirm" />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
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
    paddingHorizontal: spacing.xl,
    gap: spacing.sm + 4,
  },
  stateTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  stateText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  deck: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  card: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.glass,
    overflow: 'hidden',
  },
  cardBehind: {
    top: 10,
    opacity: 0.6,
  },
  // 写真は本文の残りをすべて使う（縦長の写真が基本。上限を付けると余白が出る）
  photo: {
    flex: 1,
    minHeight: 160,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
  },
  photoTapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '35%',
  },
  indicator: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  indicatorBar: {
    width: 40,
    height: 3,
    borderRadius: borderRadius.sm,
  },
  starredBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
  },
  swipeLabel: {
    position: 'absolute',
    top: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  swipeLabelLeft: {
    right: 20,
  },
  swipeLabelRight: {
    left: 20,
  },
  swipeLabelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  body: {
    paddingTop: 14,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  meta: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  title: {
    fontSize: fontSize.xxl,
    lineHeight: 30,
    fontWeight: fontWeight.heavy,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  hostLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hostText: {
    fontSize: fontSize.meta,
    flexShrink: 1,
  },
  price: {
    marginLeft: 'auto',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  perPerson: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginHorizontal: spacing.md + 4,
  },
  hintText: {
    fontSize: fontSize.xxs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 22,
    marginTop: spacing.sm,
  },
  roundAction: {
    alignItems: 'center',
    gap: 6,
    minWidth: touchTarget.min,
  },
  roundIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyColumn: {
    alignItems: 'center',
    gap: 6,
  },
  applyButton: {
    minHeight: 56,
    paddingHorizontal: 26,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: borderRadius.photoCard,
    padding: spacing.lg,
    gap: spacing.sm + 4,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  modalMessage: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  modalMeta: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
    marginTop: spacing.sm,
  },
});
