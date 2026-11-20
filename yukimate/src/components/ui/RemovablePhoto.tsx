import { borderRadius } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

/**
 * 写真の右上の内側に置く「外す」ボタン（暗い丸に白い×）。
 * 写真の角に合わせて内側に置くので、はみ出さない。写真のコンテナは position: 'relative' にしておく。
 */
export function PhotoRemoveButton({
  onPress,
  accessibilityLabel,
  disabled,
  size = 22,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  size?: number;
}) {
  const c = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.remove,
        { width: size, height: size, backgroundColor: c.photoOverlayBackground },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name="close" size={Math.round(size * 0.64)} color={c.photoOverlayText} />
    </Pressable>
  );
}

/**
 * アップロード前の写真のサムネイル（四角・角は小さく丸める）＋右上の「外す」ボタン。
 * チャンネル・イベントのチャット・投稿の作成で同じ見た目にする。
 */
export function RemovablePhoto({
  uri,
  size = 64,
  onRemove,
  removeLabel,
  disabled,
  style,
}: {
  uri: string;
  size?: number;
  onRemove: () => void;
  removeLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useAppColors();
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={{ uri }}
        style={[styles.photo, { width: size, height: size, backgroundColor: c.chipBackground }]}
        contentFit="cover"
      />
      <PhotoRemoveButton onPress={onRemove} accessibilityLabel={removeLabel} disabled={disabled} size={size >= 96 ? 26 : 22} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    borderRadius: borderRadius.md,
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RemovablePhoto;
