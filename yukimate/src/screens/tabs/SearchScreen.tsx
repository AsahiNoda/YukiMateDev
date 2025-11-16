import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { IconSymbol } from '@components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { spacing, fontSize, borderRadius, fontWeight } from '@/constants/spacing';
import { useColorScheme } from '@hooks/use-color-scheme';

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  type: 'event' | 'resort' | 'user';
};

const mockSearchResults: { title: string; data: SearchResult[] }[] = [
  {
    title: 'Events',
    data: [
      {
        id: '1',
        title: 'Morning Powder Session',
        subtitle: 'Hakuba Happo-One • Today 9:00 AM',
        type: 'event',
      },
      {
        id: '2',
        title: 'Carving Clinic',
        subtitle: 'Hakuba Goryu • Tomorrow 10:00 AM',
        type: 'event',
      },
    ],
  },
  {
    title: 'Resorts',
    data: [
      {
        id: '3',
        title: 'Hakuba Happo-One',
        subtitle: '220cm snow depth • Powder conditions',
        type: 'resort',
      },
      {
        id: '4',
        title: 'Hakuba 47',
        subtitle: '180cm snow depth • Good conditions',
        type: 'resort',
      },
    ],
  },
  {
    title: 'Riders',
    data: [
      {
        id: '5',
        title: 'Yuki Tanaka',
        subtitle: 'Advanced • 🇯🇵 Japan',
        type: 'user',
      },
      {
        id: '6',
        title: 'Alex Smith',
        subtitle: 'Intermediate • 🇺🇸 USA',
        type: 'user',
      },
    ],
  },
];

const recentSearches = [
  'Powder sessions',
  'Hakuba Happo-One',
  'Backcountry events',
];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setIsSearching(text.length > 0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'event':
        return 'calendar';
      case 'resort':
        return 'location.fill';
      case 'user':
        return 'person.fill';
      default:
        return 'magnifyingglass';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <View style={[styles.searchHeader, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search events, resorts, riders..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.icon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        // Search Results
        <SectionList
          sections={mockSearchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.resultItem, { backgroundColor: colors.card }]}>
              <View style={styles.resultIcon}>
                <IconSymbol name={getIcon(item.type)} size={20} color={colors.icon} />
              </View>
              <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            </View>
          )}
          style={styles.resultsList}
          contentContainerStyle={styles.resultsContent}
        />
      ) : (
        // Recent Searches & Suggestions
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</Text>
            {recentSearches.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.recentItem, { backgroundColor: colors.card }]}
                onPress={() => handleSearch(search)}>
                <IconSymbol name="clock" size={18} color={colors.icon} />
                <Text style={[styles.recentText, { color: colors.text }]}>{search}</Text>
                <IconSymbol name="arrow.up.left" size={16} color={colors.icon} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Popular Categories
            </Text>
            <View style={styles.categoryGrid}>
              {['Powder Sessions', 'Backcountry', 'Carving', 'Park', 'Night Ski', 'Beginner'].map(
                (category, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.categoryCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.categoryText, { color: colors.text }]}>{category}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  recentText: {
    flex: 1,
    fontSize: fontSize.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  categoryText: {
    fontSize: fontSize.sm,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: spacing.xl,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  resultSubtitle: {
    fontSize: fontSize.sm,
  },
});
