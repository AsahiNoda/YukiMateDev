import { IconSymbol } from '@/components/ui/icon-symbol';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSavedPosts } from '@/hooks/useSavedPosts';
import { router } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SavedPostsScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { posts, loading, error, refetch } = useSavedPosts();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}/${month}/${day} (${weekday}) ${hours}:${minutes}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'upcoming':
                return colors.tint;
            case 'ongoing':
                return colors.success;
            case 'ended':
                return colors.textSecondary;
            default:
                return colors.textSecondary;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'upcoming':
                return '募集中';
            case 'ongoing':
                return '開催中';
            case 'ended':
                return '終了';
            default:
                return '';
        }
    };

    const renderPostItem = ({ item }: { item: any }) => {
        const firstPhoto = item.photos?.[0];

        return (
            <TouchableOpacity
                style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => {
                    router.push({
                        pathname: '/event-detail',
                        params: { eventId: item.id }
                    });
                }}
            >
                {/* イベント画像 */}
                <View style={styles.imageContainer}>
                    {firstPhoto ? (
                        <Image source={{ uri: firstPhoto }} style={styles.postImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                            <IconSymbol name="photo" size={40} color={colors.icon} />
                        </View>
                    )}
                    {/* ステータスバッジ */}
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(item.status) },
                        ]}
                    >
                        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                    </View>
                </View>

                {/* イベント情報 */}
                <View style={styles.postInfo}>
                    {/* タイトル */}
                    <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    {/* 日時 */}
                    <View style={styles.infoRow}>
                        <IconSymbol name="calendar" size={16} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {formatDate(item.startAt)}
                        </Text>
                    </View>

                    {/* リゾート */}
                    <View style={styles.infoRow}>
                        <IconSymbol name="mountain.2.fill" size={16} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.resortName}
                        </Text>
                    </View>

                    {/* 参加者数 */}
                    <View style={styles.infoRow}>
                        <IconSymbol name="person.2.fill" size={16} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            {item.participantsCount}/{item.capacityTotal}人
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={{ height: Math.max(insets.top, 16) }} />
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>保存済み</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>読み込み中...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={{ height: Math.max(insets.top, 16) }} />
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>保存済み</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <IconSymbol name="exclamationmark.triangle" size={48} color={colors.error} />
                    <Text style={[styles.emptyText, { color: colors.error }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.accent }]}
                        onPress={refetch}
                    >
                        <Text style={styles.retryButtonText}>再試行</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Spacer */}
            <View style={{ height: Math.max(insets.top, 16) }} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>保存済み</Text>
                <TouchableOpacity onPress={refetch} style={styles.refreshButton}>
                    <IconSymbol name="arrow.clockwise" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* 投稿リスト */}
            <FlatList
                data={posts}
                renderItem={renderPostItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <IconSymbol name="bookmark" size={64} color={colors.icon} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>保存した投稿がありません</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            気になる投稿を保存してみましょう
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
    },
    refreshButton: {
        padding: spacing.xs,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
    },
    loadingText: {
        fontSize: fontSize.md,
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 120,
        gap: spacing.md,
    },
    postCard: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
    },
    imageContainer: {
        position: 'relative',
    },
    postImage: {
        width: '100%',
        height: 200,
    },
    imagePlaceholder: {
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    statusText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: '#474747ff',
    },
    postInfo: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    postTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        marginBottom: spacing.xs,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    infoText: {
        fontSize: fontSize.sm,
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        gap: spacing.md,
    },
    emptyTitle: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        marginTop: spacing.md,
    },
    emptySubtitle: {
        fontSize: fontSize.md,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: fontSize.md,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.md,
    },
    retryButtonText: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
});
