import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { IconSymbol } from '@components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useHomeData } from '@hooks/useHomeData';

export default function HomeScreen() {
  const state = useHomeData();
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;

  if (state.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading today&apos;s conditions...</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load home data.</Text>
        <Text style={styles.errorSubText}>{state.error}</Text>
      </View>
    );
  }

  const { weather, recommendedEvents, suggestedEvents, trendingPosts } = state.data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoIcon}>ac_unit</Text>
          <Text style={styles.title}>YukiMate</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/profile')}>
          <IconSymbol name="person.fill" size={20} color="#E5E7EB" />
        </TouchableOpacity>
      </View>

      {/* Weather card – close to Figma layout */}
      {weather && (
        <View style={styles.weatherCard}>
          <Text style={styles.weatherResort}>{weather.resortName}</Text>

          <View style={styles.weatherTopRow}>
            <Text style={styles.weatherTemp}>{weather.temperatureC}°C</Text>
            <View style={styles.weatherSnowRow}>
              <Text style={styles.weatherSnowIcon}>❄</Text>
              <Text style={styles.weatherBody}>{weather.snowDepthCm}cm</Text>
            </View>
            <Text style={styles.weatherBody}>New Snow: {weather.newSnowCm}cm</Text>
          </View>

          <View style={styles.weatherChipRow}>
            <WeatherChip label="Today" active />
            <WeatherChip label="7-Day Forecast" />
            <WeatherChip label="Historical Data" />
            <WeatherChip label="Depth Chart" />
          </View>

          <View style={styles.weatherBottomRow}>
            <View style={styles.metaColumn}>
              <Text style={styles.metaText}>Wind: {weather.windSpeedMs} m/s</Text>
              <Text style={styles.metaText}>Humidity: 85%</Text>
            </View>
            <View style={styles.metaColumn}>
              <Text style={styles.metaText}>Visibility: Good</Text>
              <Text style={styles.metaText}>Snow Quality: Powder</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick actions – Discover / Chat / Local Info / Post */}
      <View style={styles.quickActionsRow}>
        <QuickAction
          icon="safari"
          label="Discover"
          tint={tint}
          onPress={() => router.push('/(tabs)/discover')}
        />
        <QuickAction
          icon="message.fill"
          label="Chat"
          tint={tint}
          onPress={() => router.push('/(tabs)/chat')}
        />
        <QuickAction
          icon="chevron.right"
          label="Local Info"
          tint={tint}
          onPress={() => router.push('/(tabs)/snowfeed')}
        />
        <QuickAction
          icon="plus.circle"
          label="Post"
          tint={tint}
          onPress={() => router.push('/(tabs)/create')}
        />
      </View>

      {/* Suggested events */}
      {recommendedEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested events</Text>
          {recommendedEvents.map((evt) => (
            <TouchableOpacity
              key={evt.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push('/event-detail')}>
              <Text style={styles.cardTitle}>{evt.title}</Text>
              <Text style={styles.cardBody}>
                {evt.resortName} · {evt.spotsTaken}/{evt.capacityTotal} spots ·{' '}
                {evt.pricePerPersonJpy > 0 ? `¥${evt.pricePerPersonJpy.toLocaleString()}` : 'Free'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Local hub / trend section (Snowfeed) */}
      {trendingPosts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local Hub Spotlight</Text>
          {trendingPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/snowfeed')}>
              <Text style={styles.cardTitle}>
                {post.resortName} · {post.snowTag}
              </Text>
              <Text style={styles.cardBody}>{post.comment}</Text>
              <Text style={styles.cardMeta}>{post.likeCount} likes</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  logoIcon: {
    fontSize: 20,
    color: '#E5E7EB',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#4B5563',
  },
  weatherCard: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff30',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ffffff33',
  },
  weatherResort: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  weatherBody: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  weatherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  weatherSnowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherSnowIcon: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  weatherChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    rowGap: 8,
    columnGap: 8,
  },
  weatherBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaColumn: {
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: '#E5E7EB',
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff20',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff20',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#E5E7EB',
  },
  card: {
    marginTop: 8,
    paddingVertical: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardBody: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  cardMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1628',
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#E5E7EB',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F87171',
    marginBottom: 4,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
  },
});

type QuickActionProps = {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  label: string;
  tint: string;
  onPress: () => void;
};

function QuickAction({ icon, label, tint, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.quickActionCircle}>
        <IconSymbol name={icon} size={24} color={tint} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

type WeatherChipProps = {
  label: string;
  active?: boolean;
};

function WeatherChip({ label, active }: WeatherChipProps) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: active ? '#ffffff40' : '#ffffff20',
      }}>
      <Text style={{ fontSize: 10, color: '#FFFFFF' }}>{label}</Text>
    </View>
  );
}

