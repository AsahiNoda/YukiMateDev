import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
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
import { IconSymbol } from '@components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useDiscoverEvents, applyToEvent } from '@hooks/useDiscoverEvents';
import type { DiscoverEvent } from '@types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;
const SWIPE_THRESHOLD = 120;

const CATEGORIES = [
  { value: 'all', label: 'すべて' },
  { value: 'event', label: 'イベント' },
  { value: 'rideshare', label: '相乗り' },
  { value: 'filming', label: '追い撮り' },
  { value: 'lesson', label: 'レッスン' },
  { value: 'group', label: '仲間募集' },
];

export default function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);

  const eventsState = useDiscoverEvents({
    limit: 20,
    category: selectedCategory,
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentIndex(0); // Reset to first card when category changes
  };

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right', eventId: string) => {
      if (direction === 'right') {
        // 参加申請
        const result = await applyToEvent(eventId);
        if (result.success) {
          Alert.alert('申請完了', 'イベントへの参加申請を送信しました。');
        } else {
          Alert.alert('エラー', result.error || '申請に失敗しました。');
        }
      }
      setCurrentIndex((prev) => prev + 1);
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

  const currentEvent = eventsState.events[currentIndex];
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryTab,
              selectedCategory === cat.value && styles.categoryTabActive,
            ]}
            onPress={() => handleCategoryChange(cat.value)}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === cat.value && styles.categoryTabTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {eventsState.events.slice(currentIndex, currentIndex + 2).map((event, index) => (
          <SwipeableCard
            key={event.id}
            event={event}
            index={index}
            onSwipe={handleSwipe}
            isTopCard={index === 0}
          />
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <ActionButton
          icon="star.fill"
          label="Star"
          onPress={() => {
            if (currentEvent) handleSwipe('left', currentEvent.id);
          }}
          colorScheme={colorScheme}
        />
        <ActionButton
          icon="hand.thumbsup.fill"
          label="Like"
          onPress={() => {
            if (currentEvent) handleSwipe('right', currentEvent.id);
          }}
          colorScheme={colorScheme}
          primary
        />
      </View>
    </View>
  );
}

type SwipeableCardProps = {
  event: DiscoverEvent;
  index: number;
  onSwipe: (direction: 'left' | 'right', eventId: string) => void;
  isTopCard: boolean;
};

function SwipeableCard({ event, index, onSwipe, isTopCard }: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .enabled(isTopCard)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.1;
      const rotation = interpolate(
        e.translationX,
        [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        [-15, 0, 15],
        Extrapolate.CLAMP
      );
      scale.value = interpolate(
        Math.abs(e.translationX),
        [0, SCREEN_WIDTH],
        [1, 0.95],
        Extrapolate.CLAMP
      );
    })
    .onEnd((e) => {
      const shouldSwipe = Math.abs(e.translationX) > SWIPE_THRESHOLD;
      if (shouldSwipe) {
        const direction = e.translationX > 0 ? 'right' : 'left';
        translateX.value = withSpring(direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH);
        translateY.value = withSpring(0);
        opacity.value = withSpring(0, {}, () => {
          runOnJS(onSwipe)(direction, event.id);
        });
      } else {
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
    const overlayOpacity = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [0, 0.8],
      Extrapolate.CLAMP
    );
    const overlayColor = translateX.value > 0 ? '#4ADE80' : '#F87171';

    return {
      opacity: overlayOpacity,
      backgroundColor: overlayColor,
    };
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Free';
    return `¥${price.toLocaleString()}`;
  };

  const levelText = event.levelRequired || 'Any';

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Background Image */}
        <View style={styles.cardBackground}>
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardImageText}>🏔️</Text>
          </View>
          <View style={styles.cardGradient} />
        </View>

        {/* Overlay for swipe feedback */}
        <Animated.View style={[styles.swipeOverlay, overlayStyle]}>
          <Text style={styles.swipeOverlayText}>
            {translateX.value > 0 ? '参加申請' : 'スキップ'}
          </Text>
        </Animated.View>

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Date */}
          <View style={styles.cardDateRow}>
            <IconSymbol name="calendar" size={16} color="#E5E7EB" />
            <Text style={styles.cardDate}>{formatDate(event.startAt)}</Text>
          </View>

          {/* Host Info */}
          <View style={styles.cardHostRow}>
            <View style={styles.cardHostAvatar}>
              <Text style={styles.cardHostAvatarText}>
                {event.hostName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardHostInfo}>
              <Text style={styles.cardHostName}>{event.hostName}</Text>
              <Text style={styles.cardHostTags}>
                {event.tags.map((tag) => `#${tag}`).join(' ')}
              </Text>
            </View>
          </View>

          {/* Title & Description */}
          <View style={styles.cardTextSection}>
            <Text style={styles.cardTitle}>{event.title}</Text>
            <Text style={styles.cardDescription}>
              {event.description || 'No description available.'}
            </Text>
          </View>

          {/* Metadata Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.cardMetadata}>
              <View style={styles.cardMetadataItem}>
                <IconSymbol name="person.2.fill" size={14} color="#E5E7EB" />
                <Text style={styles.cardMetadataText}>
                  {event.spotsTaken}/{event.capacityTotal} spots
                </Text>
              </View>
              <View style={styles.cardMetadataItem}>
                <IconSymbol name="mountain.2.fill" size={14} color="#E5E7EB" />
                <Text style={styles.cardMetadataText}>Level: {levelText}</Text>
              </View>
            </View>
            <View style={styles.cardPrice}>
              <Text style={styles.cardPriceAmount}>
              {formatPrice(event.pricePerPersonJpy)}
            </Text>
              <Text style={styles.cardPriceUnit}>/ person</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

type ActionButtonProps = {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  label: string;
  onPress: () => void;
  colorScheme: 'light' | 'dark' | null | undefined;
  primary?: boolean;
};

function ActionButton({ icon, label, onPress, colorScheme, primary }: ActionButtonProps) {
  const tint = Colors[colorScheme ?? 'light'].tint;

  return (
    <TouchableOpacity
      style={[styles.actionButton, primary && styles.actionButtonPrimary]}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={[styles.actionButtonCircle, primary && { backgroundColor: tint }]}>
        <IconSymbol
          name={icon}
          size={24}
          color={primary ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>
      <Text style={styles.actionButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1628',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    color: '#E5E7EB',
    fontSize: 16,
  },
  categoryScroll: {
    maxHeight: 50,
    marginBottom: 8,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryTabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  swipeOverlayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardDate: {
    marginLeft: 8,
    fontSize: 12,
    color: '#E5E7EB',
  },
  cardHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    flex: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 16,
    color: '#D1D5DB',
    lineHeight: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardMetadata: {
    flex: 1,
  },
  cardMetadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardMetadataText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#E5E7EB',
  },
  cardPrice: {
    alignItems: 'flex-end',
  },
  cardPriceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FCD34D',
  },
  cardPriceUnit: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 40,
    gap: 40,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonPrimary: {
    // スタイル追加可能
  },
  actionButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonLabel: {
    fontSize: 12,
    color: '#E5E7EB',
  },
});
