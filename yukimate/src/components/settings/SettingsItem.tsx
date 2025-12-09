import { Colors } from '@/constants/theme';
import { IconSymbol } from '@components/ui/icon-symbol';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

interface SettingsItemProps {
  icon?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

export function SettingsItem({
  icon,
  label,
  value,
  onPress,
  destructive = false,
  showChevron = true,
}: SettingsItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.left}>
        {icon && (
          <IconSymbol
            name={icon}
            size={22}
            color={destructive ? colors.error : colors.textSecondary}
          />
        )}
        <Text
          style={[
            styles.label,
            { color: destructive ? colors.error : colors.text },
          ]}
        >
          {label}
        </Text>
      </View>

      <View style={styles.right}>
        {value && <Text style={[styles.value, { color: colors.textSecondary }]}>{value}</Text>}
        {onPress && showChevron && (
          <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  label: {
    fontSize: 16,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 14,
  },
});
