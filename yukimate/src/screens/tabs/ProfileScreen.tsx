import { OfficialBadge } from '@/components/OfficialBadge';
import { getFlagSource } from '@/constants/countries';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { ReportSheet } from '@/components/ReportSheet';
import { borderRadius } from '@/constants/spacing';
import { levelLabel } from '@/utils/eventDisplay';
import { getResortName } from '@/utils/resort-helpers';
import { Colors } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { getAvatarGradientColors, getBadgeColor } from '@/utils/avatar-utils';
import { useAuth } from '@contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useProfile } from '@hooks/useProfile';
import { useUserRating } from '@hooks/useUserRating';
import { supabase } from '@lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Dimensions,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** プロフィールのアイコンの直径（リングを含む） */
const AVATAR_SIZE = 120;

const { width } = Dimensions.get('window');

const POST_GRID_SIZE = (width - 40 - 8) / 3; // padding 20*2, gaps

// SNSハンドル/URL からタップ時に開くURLを生成
const buildSocialUrl = (platform: string, value: string): string => {
  const v = value.trim();
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  const handle = v.replace(/^@/, '');
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'x':
      return `https://x.com/${handle}`;
    case 'youtube':
      return `https://www.youtube.com/@${handle}`;
    case 'tiktok':
      return `https://tiktok.com/@${handle}`;
    default:
      return v;
  }
};

/** SNS を開く。開けないときは知らせる */
const openSocial = async (platform: string, value: string) => {
  const url = buildSocialUrl(platform, value);
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(url);
  }
};

// Edit icon component
const EditIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7.23611 7C7.71115 6.46924 8 5.76835 8 5C8 3.34315 6.65685 2 5 2C3.34315 2 2 3.34315 2 5C2 6.65685 3.34315 8 5 8C5.8885 8 6.68679 7.61375 7.23611 7ZM7.23611 7L20 18"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7.23611 17C7.71115 17.5308 8 18.2316 8 19C8 20.6569 6.65685 22 5 22C3.34315 22 2 20.6569 2 19C2 17.3431 3.34315 16 5 16C5.8885 16 6.68679 16.3863 7.23611 17ZM7.23611 17L20 6"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);


/** マイページ／ほかのユーザーのプロフィール（docs/ui-redesign/mockups/New-Profile.html） */
function ProfileScreen({ userId }: { userId?: string }) {
  const { user: currentUser } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const profileState = useProfile(userId, refreshKey);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t, locale } = useTranslation();

  // 評価・投稿（表示対象ユーザー）
  const targetUserId = userId ?? currentUser?.id;
  const rating = useUserRating(targetUserId);
  // MVP: Gear showcase is disabled
  // const [gearImages, setGearImages] = useState<{ board: string | null; binding: string | null; boots: string | null }>({
  //   board: null,
  //   binding: null,
  //   boots: null,
  // });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [headerUrl, setHeaderUrl] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  // 通報シート（他のユーザーのプロフィールのみ）
  const [reportVisible, setReportVisible] = useState(false);
  // const [currentGearIndex, setCurrentGearIndex] = useState(0);

  // 画面がフォーカスされた時にプロフィールをリフレッシュ
  useFocusEffect(
    useCallback(() => {
      // 自分のプロフィールの場合のみリフレッシュ
      if (!userId || userId === currentUser?.id) {
        setRefreshKey(prev => prev + 1);
      }
    }, [userId, currentUser?.id])
  );

  // Load profile images and gear images
  useEffect(() => {
    const loadImages = async () => {
      if (profileState.status !== 'success') return;

      const profile = profileState.data;

      // 画像URL
      // アップロード時に ?t=<更新時刻> 付きのURLがDBに保存されるため、そのまま使えば
      // 画像更新時だけURLが変わりキャッシュが効く（以前は表示のたびに Date.now() を付けて毎回再ダウンロードしていた）
      const resolveUrl = (value: string | null | undefined, bucket: string) => {
        if (!value) return null;
        if (value.startsWith('http')) return value;
        return supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl;
      };
      setAvatarUrl(resolveUrl(profile.avatarUrl, 'profile_avatar'));
      setHeaderUrl(resolveUrl(profile.headerUrl, 'profile_header'));

      // MVP: Gear images loading is disabled
      // // Load gear images
      // if (!profile.gear) return;

      // const images: any = { board: null, binding: null, boots: null };
      // const gear = profile.gear;

      // // Check 'others' field first for explicit image paths
      // if (gear.others?.board_image) {
      //   const { data } = supabase.storage.from('boards').getPublicUrl(gear.others.board_image);
      //   images.board = data.publicUrl;
      // } else if (gear.board) {
      //   const { data } = supabase.storage.from('boards').getPublicUrl(gear.board);
      //   images.board = data.publicUrl;
      // }

      // if (gear.others?.binding_image) {
      //   const { data } = supabase.storage.from('bindings').getPublicUrl(gear.others.binding_image);
      //   images.binding = data.publicUrl;
      // } else if (gear.binding) {
      //   const { data } = supabase.storage.from('bindings').getPublicUrl(gear.binding);
      //   images.binding = data.publicUrl;
      // }

      // if (gear.others?.boots_image) {
      //   const { data } = supabase.storage.from('boots').getPublicUrl(gear.others.boots_image);
      //   images.boots = data.publicUrl;
      // } else if (gear.boots) {
      //   const { data } = supabase.storage.from('boots').getPublicUrl(gear.boots);
      //   images.boots = data.publicUrl;
      // }

      // setGearImages(images);
    };

    loadImages();
  }, [profileState]);

  // Check if user has starred or blocked this profile
  useEffect(() => {
    const checkStarAndBlockStatus = async () => {
      if (profileState.status !== 'success' || !profileState.data) {
        return;
      }

      const viewedProfile = profileState.data;

      if (!currentUser?.id || !viewedProfile.userId || currentUser.id === viewedProfile.userId) {
        return; // Skip check for own profile
      }

      try {
        // Check if starred
        const { data: starData } = await supabase
          .from('stars')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('target_user_id', viewedProfile.userId)
          .maybeSingle();

        setIsStarred(!!starData);

        // Check if blocked
        const { data: blockData } = await supabase
          .from('blocks')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('blocked_user_id', viewedProfile.userId)
          .maybeSingle();

        setIsBlocked(!!blockData);
      } catch (error) {
        console.error('Error checking star/block status:', error);
      }
    };

    checkStarAndBlockStatus();
  }, [currentUser, profileState]);

  // Handle star toggle
  const handleStarToggle = async () => {
    if (!currentUser?.id || !profile.userId) return;

    try {
      if (isStarred) {
        // Remove star
        const { error } = await supabase
          .from('stars')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('target_user_id', profile.userId);

        if (error) {
          console.error('Error removing star:', error);
          return;
        }

        setIsStarred(false);
      } else {
        // Add star
        const { error } = await supabase
          .from('stars')
          .insert({
            user_id: currentUser.id,
            target_user_id: profile.userId,
          });

        if (error) {
          console.error('Error adding star:', error);
          return;
        }

        setIsStarred(true);
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // Handle block toggle
  const handleBlockToggle = async () => {
    if (!currentUser?.id || !profile.userId) return;

    try {
      if (isBlocked) {
        // Remove block
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('blocked_user_id', profile.userId);

        if (error) {
          console.error('Error removing block:', error);
          return;
        }

        setIsBlocked(false);
      } else {
        // Add block
        const { error } = await supabase
          .from('blocks')
          .insert({
            user_id: currentUser.id,
            blocked_user_id: profile.userId,
          });

        if (error) {
          console.error('Error adding block:', error);
          return;
        }

        setIsBlocked(true);
      }
    } catch (error) {
      console.error('Error toggling block:', error);
    }
  };

  // Flag Emoji logic removed in favor of Image assets
  /*
  const getFlagEmoji = (countryCode: string | null) => {
    if (!countryCode) return null;
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };
  */

  if (profileState.status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (profileState.status === 'error' || !profileState.data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>プロフィールが見つかりません</Text>
      </View>
    );
  }

  const profile = profileState.data;

  // 自分のプロフィールかどうか
  const isSelf = currentUser?.id === profile.userId;
  const isOwnProfile = isSelf;
  const homeResortName = profile.homeResort ? getResortName(profile.homeResort, locale) : null;
  const languageLabel = (lang: string) =>
    lang === 'ja' || lang === 'Japanese' || lang === '日本語'
      ? t('profileSetup.japanese')
      : lang === 'en' || lang === 'English'
        ? t('profileSetup.english')
        : lang;
  const styleLabel = (style: string) => {
    const label = t(`ridingStyles.${style}`);
    return label === `ridingStyles.${style}` ? style : label;
  };

  // MVP: Gear showcase is disabled
  // const gearItems = profile.gear
  //   ? [
  //     { type: 'BOARD', name: profile.gear.board, image: gearImages.board },
  //     { type: 'BINDING', name: profile.gear.binding, image: gearImages.binding },
  //     { type: 'BOOTS', name: profile.gear.boots, image: gearImages.boots },
  //   ].filter(item => item.name || item.image)
  //   : [];

  // const handleNextGear = () => {
  //   if (gearItems.length > 0) {
  //     setCurrentGearIndex((prev) => (prev + 1) % gearItems.length);
  //   }
  // };

  // const handlePrevGear = () => {
  //   if (gearItems.length > 0) {
  //     setCurrentGearIndex((prev) => (prev - 1 + gearItems.length) % gearItems.length);
  //   }
  // };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} bounces={false}>
      {/* Header Image Section */}
      <View style={styles.headerImageContainer}>
        {headerUrl ? (
          <>
            <Image source={{ uri: headerUrl }} style={styles.headerImage} />
            {/* 下端を背景色へぼかす */}
            <LinearGradient
              colors={
                colorScheme === 'dark'
                  ? ['transparent', 'rgba(26, 32, 44, 0.4)', 'rgba(26, 32, 44, 1)']
                  : ['transparent', 'rgba(255, 255, 255, 0.4)', 'rgba(236, 250, 255, 1)']
              }
              style={styles.headerGradientOverlay}
            />
          </>
        ) : (
          <View style={[styles.headerImagePlaceholder, { backgroundColor: colors.backgroundSecondary }]} />
        )}

        {/* Back Button */}
        {userId && (
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Header Actions */}
        <View style={styles.headerActions}>


          {isOwnProfile ? (
            // 自分のプロフィール - 設定（プロフィールの編集はプロフィールの下のボタン）
            <>
              {/* 設定は別画面（スタック遷移）。ホーム右上の歯車はやめた */}
              <TouchableOpacity
                style={[styles.settingsPillButton, { backgroundColor: colors.photoOverlayBackground }]}
                onPress={() => router.push('/settings')}
                hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
                accessibilityRole="button"
                accessibilityLabel={t('actions.settings')}
                testID="profile-settings-button"
              >
                <Ionicons name="settings-outline" size={20} color={colors.photoOverlayText} />
              </TouchableOpacity>
            </>
          ) : (
            // 他のユーザーのプロフィール - 星とブロックボタンを表示
            <>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handleStarToggle}
              >
                <Ionicons
                  name={isStarred ? "star" : "star-outline"}
                  size={24}
                  color={isStarred ? "#eab308" : "#fff"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => setReportVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('resortPage.reportUser')}
                testID="profile-report-button"
              >
                <Ionicons name="flag-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handleBlockToggle}
              >
                <Ionicons
                  name={isBlocked ? "ban" : "ban-outline"}
                  size={24}
                  color={isBlocked ? "#ef4444" : "#fff"}
                />
              </TouchableOpacity>
            </>
          )}
        </View>

      </View>

      {/* アイコンと名前：ヘッダー画像の下端がアイコンを横切り、名前はその下端のすぐ下 */}
      <View style={styles.profileInfoOverlay}>
        {/* Avatar on the left with gradient ring */}
        <View style={styles.avatarOuterContainer}>
          <LinearGradient
            colors={getAvatarGradientColors(profile.role)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradientRing}
          >
            <View style={[styles.avatarInnerContainer, { backgroundColor: colors.background }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name="person" size={40} color={colors.icon} />
                </View>
              )}
            </View>
          </LinearGradient>
          {/* Official Badge for developer and official roles */}
          {(profile.role === 'developer' || profile.role === 'official') && (
            <View style={[styles.badgeContainer, { backgroundColor: colors.background, borderColor: colors.background }]}>
              <OfficialBadge color={getBadgeColor(profile.role)} size={24} />
            </View>
          )}
        </View>

        {/* User Info on the right */}
        <View style={styles.userInfoContainer}>
          {/* Username */}
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={2}>
            {profile.displayName || t('common.unknown')}
          </Text>
          {homeResortName ? (
            <Text style={[styles.homeResortLine, { color: colors.textMuted }]} numberOfLines={1}>
              {t('myPage.homeResortLabel', { resort: homeResortName })}
            </Text>
          ) : null}

          {/* Country Flag */}
          {profile.countryCode && (
            <View style={styles.flagRow}>
              <Image
                source={getFlagSource(profile.countryCode)}
                style={styles.flagImage}
                resizeMode="contain"
              />
            </View>
          )}

        </View>
      </View>

      {/* タグ：レベル・スタイル・言語（生の値の大文字化をやめ、日本語のチップに） */}
      {(profile.level || profile.styles.length > 0 || profile.languages.length > 0) && (
        <View style={styles.profileChips}>
          {levelLabel(profile.level, t) ? <Chip label={levelLabel(profile.level, t)!} tone="neutral" /> : null}
          {profile.styles.map((style) => (
            <Chip key={style} label={styleLabel(style)} tone="neutral" />
          ))}
          {profile.languages.length > 0 ? (
            <Chip label={profile.languages.map(languageLabel).join('・')} tone="neutral" />
          ) : null}
        </View>
      )}

      {/* 自己紹介 */}
      {profile.bio ? <Text style={[styles.bioLead, { color: colors.textSecondary }]}>{profile.bio}</Text> : null}

      {/* プロフィールを編集 */}
      {isOwnProfile ? (
        <View style={styles.ownButtons}>
          <PillButton title={t('actions.editProfile')} variant="secondary" icon="create-outline" onPress={() => router.push('/edit-profile')} fill />
        </View>
      ) : null}

      {/* 実績：参加／主催／「また滑りたい」（高評価%を上で目立たせない） */}
      <View style={[styles.statsRow, { borderColor: colors.divider }]}>
        {[
          { label: t('myPage.statsJoined'), value: String(profile.stats.eventsJoined) },
          { label: t('myPage.statsHosted'), value: String(profile.stats.eventsHosted) },
          // 評価：イベント後の評価タイムで付いた評価の平均と件数（★4.8（12件））
          {
            label: t('myPage.statsRating'),
            value: rating.total > 0 ? rating.avgScore.toFixed(1) : '—',
            count: rating.total > 0 ? t('myPage.ratingCount', { count: rating.total }) : undefined,
            star: rating.total > 0,
          },
        ].map((stat: { label: string; value: string; count?: string; star?: boolean }) => (
          <View
            key={stat.label}
            style={styles.statItem}
            accessible
            accessibilityLabel={`${stat.label} ${stat.value}${stat.count ?? ''}`}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stat.star ? <Text style={{ color: colors.gold }}>★</Text> : null}
              {stat.value}
              {stat.count ? <Text style={[styles.statCount, { color: colors.textLabel }]}>{stat.count}</Text> : null}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textLabel }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* 保存したイベント・主催したイベント（ホームのクイックアクションから移動。未決定事項の決定どおりプロフィールの下に2行） */}
      {isOwnProfile && (
        <View style={[styles.myListRows, { backgroundColor: colors.card }]}>
          {[
            { key: 'saved', icon: 'bookmark-outline' as const, label: t('myPage.savedEvents'), href: '/saved-posts' },
            { key: 'hosted', icon: 'calendar-outline' as const, label: t('myPage.hostedEvents'), href: '/my-posts' },
          ].map((row, i) => (
            <TouchableOpacity
              key={row.key}
              style={[styles.myListRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
              onPress={() => router.push(row.href as any)}
              accessibilityRole="button"
              testID={`profile-row-${row.key}`}
            >
              <Ionicons name={row.icon} size={20} color={colors.tintText} />
              <Text style={[styles.myListRowText, { color: colors.text }]}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textLabel} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ユーザーの評価はイベント終了後の評価タイム（PostEventActionScreen）だけで行う。プロフィールからは付けない */}

      {/* お気に入りスキー場 */}
      {profile.favoriteResorts.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('resortPage.favoriteResorts')}</Text>
          <View style={styles.chipWrap}>
            {profile.favoriteResorts.map((resort) => (
              <View key={resort.id} style={[styles.chip, { backgroundColor: colors.backgroundSecondary }]}>
                <Ionicons name="snow" size={14} color={colors.tint} />
                <Text style={[styles.chipText, { color: colors.text }]}>{resort.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* よく行くゲレンデ Top3 */}
      {profile.topResorts.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('myPage.frequentResorts')}</Text>
          {profile.topResorts.map((resort, index) => (
            <View key={resort.id} style={styles.topResortRow}>
              {/* メダル絵文字をやめて 1・2・3 の数字に */}
              <View style={[styles.rankBadge, { backgroundColor: colors.chipBackground }]}>
                <Text style={[styles.rankText, { color: colors.tintText }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.topResortName, { color: colors.text }]} numberOfLines={1}>{resort.name}</Text>
              <Text style={[styles.topResortCount, { color: colors.textSecondary }]}>{t('myPage.visitCount', { count: resort.count })}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ギア（名前だけ） */}
      {profile.gear && (profile.gear.board || profile.gear.binding || profile.gear.boots) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('myPage.gear')}</Text>
          {([
            ['profileForm.gearBoard', profile.gear.board],
            ['profileForm.gearBinding', profile.gear.binding],
            ['profileForm.gearBoots', profile.gear.boots],
          ] as [string, string | null][])
            .filter(([, name]) => !!name)
            .map(([key, name]) => (
              <View key={key} style={styles.gearRow}>
                <Text style={[styles.gearType, { color: colors.textLabel }]}>{t(key)}</Text>
                <Text style={[styles.gearName, { color: colors.text }]}>{name}</Text>
              </View>
            ))}
        </View>
      )}

      {/* SNSリンク（プロフィールの一番下）。タップでアプリまたはブラウザで開く */}
      {(() => {
        const links = profile.socialLinks;
        const items: { platform: string; icon: keyof typeof Ionicons.glyphMap; value: string }[] = [];
        if (links.instagram) items.push({ platform: 'instagram', icon: 'logo-instagram', value: links.instagram });
        if (links.x) items.push({ platform: 'x', icon: 'logo-twitter', value: links.x });
        if (links.youtube) items.push({ platform: 'youtube', icon: 'logo-youtube', value: links.youtube });
        if (links.tiktok) items.push({ platform: 'tiktok', icon: 'logo-tiktok', value: links.tiktok });
        if (items.length === 0) return null;
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profileForm.social')}</Text>
            {items.map((item) => (
              <TouchableOpacity
                key={item.platform}
                style={[styles.snsLinkRow, { backgroundColor: colors.card }]}
                onPress={() => openSocial(item.platform, item.value)}
                accessibilityRole="link"
                accessibilityLabel={`${item.platform} ${item.value}`}
              >
                <Ionicons name={item.icon} size={22} color={colors.text} />
                <Text style={[styles.snsLinkText, { color: colors.tintText }]} numberOfLines={1}>
                  {item.value.startsWith('http') ? item.value.replace(/^https?:\/\//, '') : `@${item.value.replace(/^@/, '')}`}
                </Text>
                <Ionicons name="open-outline" size={16} color={colors.textLabel} />
              </TouchableOpacity>
            ))}
          </View>
        );
      })()}

      {/* MVP: Gear Showcase is disabled */}
      {/* {gearItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.gearHeaderRow}>
            <Text style={styles.sectionTitle}>ギア紹介</Text>
            <Ionicons name="chevron-up" size={20} color="#fff" />
          </View>

          <View style={styles.gearCard}>
            <View style={styles.gearImageContainer}>
              <TouchableOpacity style={styles.navButton} onPress={handlePrevGear}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>

              {gearItems[currentGearIndex]?.image ? (
                <Image
                  source={{ uri: gearItems[currentGearIndex].image }}
                  style={styles.gearImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.gearImagePlaceholder}>
                  <Ionicons name="image-outline" size={64} color="#64748b" />
                  <Text style={styles.gearPlaceholderText}>画像なし</Text>
                </View>
              )}

              <TouchableOpacity style={styles.navButton} onPress={handleNextGear}>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.gearInfo}>
              <Text style={styles.gearType}>{gearItems[currentGearIndex]?.type}</Text>
              <Text style={styles.gearName}>{gearItems[currentGearIndex]?.name || 'Unknown Model'}</Text>
            </View>
          </View>
        </View>
      )} */}

      <View style={{ height: 100 }} />

      {!isOwnProfile && (
        <ReportSheet
          visible={reportVisible}
          targetType="user"
          targetId={targetUserId ?? null}
          onClose={() => setReportVisible(false)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is set dynamically in the component
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor is set dynamically in the component
  },
  errorText: {
    // color is set dynamically in the component
    fontSize: 16,
  },
  headerImageContainer: {
    height: width * 0.7,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  headerImagePlaceholder: {
    width: '100%',
    height: '100%',
    // backgroundColor is set dynamically in the component
  },
  headerActions: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // 設定は歯車だけの丸ボタン（文字なし。読み上げは accessibilityLabel）
  settingsPillButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // アイコン（120）の上半分をヘッダー画像に重ねる（ヘッダーの下端がアイコンの真ん中を横切る）
  profileInfoOverlay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginTop: -AVATAR_SIZE / 2,
    marginBottom: 16,
  },
  avatarOuterContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarGradientRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 60,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInnerContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: 'hidden',
    // backgroundColor is set dynamically in the component
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    overflow: 'visible',
    marginRight: 16,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -2,
    width: 38,
    height: 38,
    borderRadius: 19,
    // backgroundColor and borderColor are set dynamically in the component
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarPlaceholder: {
    // backgroundColor is set dynamically in the component
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 名前はヘッダーの下端のすぐ下から
  userInfoContainer: {
    flex: 1,
    paddingTop: AVATAR_SIZE / 2 + 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    // color is set dynamically in the component
    marginBottom: 2,
  },
  flagRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  flagEmoji: {
    fontSize: 22,
  },
  flagImage: {
    width: 32,
    height: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    // color is set dynamically in the component
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  homeResortLine: {
    fontSize: 13,
    marginBottom: 4,
  },
  profileChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  bioLead: {
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  ownButtons: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  statCount: {
    fontSize: 12,
    fontWeight: '400',
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  snsLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: borderRadius.card,
    marginBottom: 8,
  },
  snsLinkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  myListRows: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
  },
  myListRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  myListRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    // color is set dynamically in the component
    marginBottom: 12,
    letterSpacing: 1,
  },
  bioText: {
    // color is set dynamically in the component
    fontSize: 14,
    lineHeight: 20,
  },
  // 評価
  ratingCard: {
    borderRadius: 14,
    padding: 16,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  ratingSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  reactionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  reactionEmoji: {
    fontSize: 26,
  },
  // チップ
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // よく行くゲレンデ
  topResortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  topResortMedal: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  topResortName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  topResortCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  // ギア
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  gearType: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    width: 72,
  },
  gearName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  // SNS
  snsIconRow: {
    flexDirection: 'row',
    gap: 12,
  },
  snsCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 投稿グリッド
  postsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addPostButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  postThumbWrap: {
    width: POST_GRID_SIZE,
    height: POST_GRID_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postThumb: {
    width: '100%',
    height: '100%',
  },
  postOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  postOverlayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  // MVP: Gear styles are disabled
  // gearHeaderRow: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   marginBottom: 12,
  // },
  // gearCard: {
  //   backgroundColor: '#1e293b',
  //   borderRadius: 16,
  //   overflow: 'hidden',
  //   borderWidth: 1,
  //   borderColor: '#334155',
  // },
  // gearImageContainer: {
  //   height: 220,
  //   backgroundColor: '#334155',
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  //   paddingHorizontal: 8,
  // },
  // gearImage: {
  //   flex: 1,
  //   height: '90%',
  // },
  // gearImagePlaceholder: {
  //   flex: 1,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  // gearPlaceholderText: {
  //   color: '#64748b',
  //   fontSize: 14,
  //   marginTop: 8,
  // },
  // navButton: {
  //   width: 36,
  //   height: 36,
  //   borderRadius: 18,
  //   backgroundColor: 'rgba(0,0,0,0.5)',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  // gearInfo: {
  //   padding: 16,
  //   alignItems: 'center',
  //   backgroundColor: '#0f172a',
  // },
  // gearType: {
  //   color: '#94a3b8',
  //   fontSize: 11,
  //   fontWeight: 'bold',
  //   marginBottom: 4,
  //   letterSpacing: 1,
  // },
  // gearName: {
  //   color: '#fff',
  //   fontSize: 18,
  //   fontWeight: 'bold',
  //   textTransform: 'uppercase',
  //   letterSpacing: 0.5,
  // },
});

export default ProfileScreen;
