import { OfficialBadge } from '@/components/OfficialBadge';
import { Colors } from '@/constants/theme';
import { getAvatarGradientColors, getBadgeColor } from '@/utils/avatar-utils';
import { useAuth } from '@contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useProfile } from '@hooks/useProfile';
import { supabase } from '@lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

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


function ProfileScreen({ userId }: { userId?: string }) {
  const { user: currentUser } = useAuth();
  const profileState = useProfile(userId);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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
  // const [currentGearIndex, setCurrentGearIndex] = useState(0);

  // Load profile images and gear images
  useEffect(() => {
    const loadImages = async () => {
      if (profileState.status !== 'success') return;

      const profile = profileState.data;

      // Load avatar image
      if (profile.avatarUrl) {
        // avatarUrlがフルパスの場合はそのまま使用、そうでない場合はストレージから取得
        if (profile.avatarUrl.startsWith('http')) {
          setAvatarUrl(profile.avatarUrl);
        } else {
          const { data } = supabase.storage.from('profile_avatar').getPublicUrl(profile.avatarUrl);
          setAvatarUrl(data.publicUrl);
        }
      } else {
        setAvatarUrl(null);
      }

      // Load header image
      if (profile.headerUrl) {
        // headerUrlがフルパスの場合はそのまま使用、そうでない場合はストレージから取得
        if (profile.headerUrl.startsWith('http')) {
          setHeaderUrl(profile.headerUrl);
        } else {
          const { data } = supabase.storage.from('profile_header').getPublicUrl(profile.headerUrl);
          setHeaderUrl(data.publicUrl);
        }
      } else {
        setHeaderUrl(null);
      }

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

  const getFlagEmoji = (countryCode: string | null) => {
    if (!countryCode) return null;
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

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

  // 自分のプロフィールかどうかを判定
  const isOwnProfile = currentUser?.id === profile.userId;

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
            {/* Gradient overlay for blur effect at bottom */}
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
            // 自分のプロフィール - 編集ボタンを表示
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => router.push('/edit-profile')}
            >
              <EditIcon color="#fff" size={24} />
            </TouchableOpacity>
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

        {/* Profile Info Overlay */}
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
            <Text style={[styles.userName, { color: colors.text }]}>{profile.displayName || 'NO NAME'}</Text>

            {/* Country Flag */}
            {profile.countryCode && (
              <View style={styles.flagRow}>
                <Text style={styles.flagEmoji}>{getFlagEmoji(profile.countryCode)}</Text>
              </View>
            )}

            {/* Tags Row */}
            <View style={styles.tagsRow}>
              {profile.homeResortName && (
                <Text style={[styles.tag, { color: colors.textSecondary }]}>#{profile.homeResortName}</Text>
              )}
              {profile.level && (
                <Text style={[styles.tag, { color: colors.textSecondary }]}>#{profile.level.toUpperCase()}</Text>
              )}
              {profile.styles && profile.styles.length > 0 && profile.styles.slice(0, 2).map((style, index) => (
                <Text key={index} style={[styles.tag, { color: colors.textSecondary }]}>#{style.toUpperCase()}</Text>
              ))}
              {profile.languages && profile.languages.length > 0 && profile.languages.map((lang, index) => (
                <Text key={`lang-${index}`} style={[styles.tag, { color: colors.textSecondary }]}>#{lang.toUpperCase()}</Text>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Bio Section */}
      {profile.bio && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>自己紹介</Text>
          <Text style={[styles.bioText, { color: colors.textSecondary }]}>{profile.bio}</Text>
        </View>
      )}

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
  headerImagePlaceholder: {
    width: '100%',
    height: '100%',
    // backgroundColor is set dynamically in the component
  },
  headerGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
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
  profileInfoOverlay: {
    position: 'absolute',
    bottom: -160,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 40,
  },
  avatarOuterContainer: {
    position: 'relative',
    marginRight: 16,
    marginTop: -30,
  },
  avatarGradientRing: {
    width: 120,
    height: 120,
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
  userInfoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  userName: {
    fontSize: 26,
    fontWeight: '900',
    // color is set dynamically in the component
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  flagRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  flagEmoji: {
    fontSize: 22,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    // color is set dynamically in the component
    marginBottom: 12,
    letterSpacing: 1,
    marginTop: 130,
  },
  bioText: {
    // color is set dynamically in the component
    fontSize: 14,
    lineHeight: 20,
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
