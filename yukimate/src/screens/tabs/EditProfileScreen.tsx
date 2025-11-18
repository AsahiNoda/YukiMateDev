import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { globalStyles } from '@/theme/styles';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SkillLevel, RidingStyle } from '@/types';
import Button from '@/components/Button';
import Card from '@/components/Card';

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

const RIDING_STYLES: RidingStyle[] = [
  'Freeride',
  'Powder',
  'Carving',
  'Park',
  'Backcountry',
];

export default function EditProfileScreen() {
  const { profile, refreshProfile } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  // フォーム状態
  const [displayName, setDisplayName] = useState('');
  const [ageRange, setAgeRange] = useState('20-25');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [ridingStyle, setRidingStyle] = useState<RidingStyle[]>([]);
  const [board, setBoard] = useState('');
  const [binding, setBinding] = useState('');
  const [boots, setBoots] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setAgeRange(profile.ageRange || '20-25');
      setSkillLevel(profile.skillLevel);
      setRidingStyle(profile.ridingStyle);
      setBoard(profile.gearInfo?.board || '');
      setBinding(profile.gearInfo?.binding || '');
      setBoots(profile.gearInfo?.boots || '');
      setAvatarUri(profile.avatar || null);
    }
  }, [profile]);

  const toggleRidingStyle = (style: RidingStyle) => {
    if (ridingStyle.includes(style)) {
      setRidingStyle(ridingStyle.filter((s) => s !== style));
    } else {
      setRidingStyle([...ridingStyle, style]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('エラー', '写真へのアクセス許可が必要です');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileName = `${profile!.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      Alert.alert('エラー', '表示名を入力してください');
      return;
    }

    if (ridingStyle.length === 0) {
      Alert.alert('エラー', '少なくとも1つのライディングスタイルを選択してください');
      return;
    }

    try {
      setLoading(true);

      let avatarUrl = profile?.avatar;

      // 新しい画像がある場合はアップロード
      if (avatarUri && avatarUri !== profile?.avatar) {
        const uploadedUrl = await uploadAvatar(avatarUri);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      const gearInfo = {
        board: board.trim() || null,
        binding: binding.trim() || null,
        boots: boots.trim() || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          age_range: ageRange,
          skill_level: skillLevel,
          riding_style: ridingStyle,
          gear_info: gearInfo,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile!.id);

      if (error) throw error;

      await refreshProfile();

      Alert.alert('完了', 'プロフィールを更新しました', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('エラー', 'プロフィールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={globalStyles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>プロフィール編集</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* アバター */}
        <Card>
          <Text style={styles.label}>プロフィール画像</Text>
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={48} color={colors.text.secondary} />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={16} color={colors.text.primary} />
              </View>
            </TouchableOpacity>
            <Text style={styles.hint}>タップして変更</Text>
          </View>
        </Card>

        {/* 表示名 */}
        <Card>
          <Text style={styles.label}>表示名</Text>
          <TextInput
            style={styles.input}
            placeholder="例: 野田あさひ"
            placeholderTextColor={colors.text.secondary}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </Card>

        {/* 年齢層 */}
        <Card>
          <Text style={styles.label}>年齢層</Text>
          <View style={styles.buttonGroup}>
            {['18-25', '25-30', '30-35', '35-40', '40+'].map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.optionButton,
                  ageRange === range && styles.optionButtonActive,
                ]}
                onPress={() => setAgeRange(range)}
              >
                <Text
                  style={[
                    styles.optionText,
                    ageRange === range && styles.optionTextActive,
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* スキルレベル */}
        <Card>
          <Text style={styles.label}>スキルレベル</Text>
          <View style={styles.buttonGroup}>
            {SKILL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.skillButton,
                  skillLevel === level && styles.skillButtonActive,
                ]}
                onPress={() => setSkillLevel(level)}
              >
                <Text
                  style={[
                    styles.skillText,
                    skillLevel === level && styles.skillTextActive,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ライディングスタイル */}
        <Card>
          <Text style={styles.label}>ライディングスタイル（複数選択可）</Text>
          <View style={styles.styleGrid}>
            {RIDING_STYLES.map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.styleButton,
                  ridingStyle.includes(style) && styles.styleButtonActive,
                ]}
                onPress={() => toggleRidingStyle(style)}
              >
                <Text
                  style={[
                    styles.styleText,
                    ridingStyle.includes(style) && styles.styleTextActive,
                  ]}
                >
                  {style}
                </Text>
                {ridingStyle.includes(style) && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.text.primary}
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ギア情報 */}
        <Card>
          <Text style={styles.label}>マイギア（任意）</Text>
          
          <View style={styles.gearInput}>
            <Ionicons name="snow-outline" size={20} color={colors.text.secondary} />
            <TextInput
              style={styles.input}
              placeholder="ボード（例: BC Stream RX Ti 164）"
              placeholderTextColor={colors.text.secondary}
              value={board}
              onChangeText={setBoard}
            />
          </View>

          <View style={styles.gearInput}>
            <Ionicons name="link-outline" size={20} color={colors.text.secondary} />
            <TextInput
              style={styles.input}
              placeholder="バインディング（例: Flux XF）"
              placeholderTextColor={colors.text.secondary}
              value={binding}
              onChangeText={setBinding}
            />
          </View>

          <View style={styles.gearInput}>
            <Ionicons name="footsteps-outline" size={20} color={colors.text.secondary} />
            <TextInput
              style={styles.input}
              placeholder="ブーツ（例: Burton Ion）"
              placeholderTextColor={colors.text.secondary}
              value={boots}
              onChangeText={setBoots}
            />
          </View>
        </Card>

        <Button
          title="保存"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
        />

        <View style={{ height: spacing.xxl }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.accent.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background.secondary,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.tertiary,
    color: colors.text.primary,
    fontSize: fontSize.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  optionButtonActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  optionTextActive: {
    color: colors.text.primary,
    fontWeight: fontWeight.semibold,
  },
  skillButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  skillButtonActive: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary,
  },
  skillText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  skillTextActive: {
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  styleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  styleButtonActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  styleText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  styleTextActive: {
    color: colors.text.primary,
    fontWeight: fontWeight.semibold,
  },
  checkIcon: {
    marginLeft: spacing.xs,
  },
  gearInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});