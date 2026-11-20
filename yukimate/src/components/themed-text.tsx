import { fontSize, fontWeight } from '@/constants/spacing';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = useThemeColor({}, 'tint');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [styles.link, { color: linkColor }] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.semibold,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  link: {
    lineHeight: 30,
    fontSize: fontSize.md,
  },
});
