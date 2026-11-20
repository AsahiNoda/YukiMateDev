import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  max: number;
  label: string;
  placeholder: string;
}

/** 区切りとして扱う文字（読点・カンマ・空白・全角空白） */
const SEPARATORS = /[,、，\s　]+/;

/** タグの形を整える（前後の空白・先頭の # を外す） */
const normalize = (raw: string) => raw.trim().replace(/^#+/, '').trim();

/**
 * タグの入力。
 *   - Enter・読点・カンマ・空白で確定（「パウダー, 朝イチ」と貼り付けても2つになる）
 *   - よく使うタグは押すだけで追加・解除
 *   - 重複・上限はアラートではなく欄の下で知らせる
 *   - 追加したタグはティントのチップ（× で外す）。赤は使わない（赤は削除の文字だけ）
 */
export function TagInput({ tags, onChange, max, label, placeholder }: TagInputProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const suggestions = t('create.tagSuggestions')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const addMany = (values: string[]) => {
    let next = [...tags];
    let note: string | null = null;
    for (const raw of values) {
      const tag = normalize(raw);
      if (!tag) continue;
      if (next.some((x) => x.toLowerCase() === tag.toLowerCase())) {
        note = t('create.tagAlreadyAdded');
        continue;
      }
      if (next.length >= max) {
        note = t('create.maxTagsLimit');
        break;
      }
      next = [...next, tag];
    }
    if (next.length !== tags.length) onChange(next);
    setMessage(note);
  };

  const commit = () => {
    addMany(text.split(SEPARATORS));
    setText('');
  };

  // 区切り文字が入ったら、その手前までを確定する
  const handleChange = (value: string) => {
    if (SEPARATORS.test(value)) {
      const parts = value.split(SEPARATORS);
      const rest = parts.pop() ?? '';
      addMany(parts);
      setText(rest);
    } else {
      setText(value);
      if (message) setMessage(null);
    }
  };

  const remove = (tag: string) => {
    onChange(tags.filter((x) => x !== tag));
    setMessage(null);
  };

  const toggleSuggestion = (tag: string) => (tags.includes(tag) ? remove(tag) : addMany([tag]));

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: c.text }]}>{label}</Text>
        <Text style={[styles.count, { color: c.textLabel }]}>
          {tags.length}/{max}
        </Text>
      </View>

      <View style={[styles.inputBox, { backgroundColor: c.backgroundSecondary, borderColor: c.glassCardBorder }]}>
        <Text style={[styles.hash, { color: c.textLabel }]}>#</Text>
        <TextInput
          value={text}
          onChangeText={handleChange}
          onSubmitEditing={commit}
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder={placeholder}
          placeholderTextColor={c.textLabel}
          autoCapitalize="none"
          autoCorrect={false}
          editable={tags.length < max}
          style={[styles.input, { color: c.text }]}
          accessibilityLabel={label}
          testID="create-tag-input"
        />
        {text.trim() ? (
          <Pressable onPress={commit} hitSlop={8} style={styles.addButton} accessibilityRole="button" accessibilityLabel={t('create.addTagButton')}>
            <Text style={[styles.addText, { color: c.tintText }]}>{t('create.addTagButton')}</Text>
          </Pressable>
        ) : null}
      </View>
      {message ? <Text style={[styles.message, { color: c.textMuted }]}>{message}</Text> : null}

      {tags.length > 0 ? (
        <View style={styles.chips}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => remove(tag)}
              style={({ pressed }) => [styles.tag, { backgroundColor: c.tintChipBackground }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t('create.removeTagA11y', { tag })}
            >
              <Text style={[styles.tagText, { color: c.tintChipText }]}>#{tag}</Text>
              <Ionicons name="close" size={14} color={c.tintChipText} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {suggestions.length > 0 ? (
        <View style={styles.suggestBlock}>
          <Text style={[styles.suggestLabel, { color: c.textLabel }]}>{t('create.tagSuggestionsLabel')}</Text>
          <View style={styles.chips}>
            {suggestions.map((tag) => {
              const on = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleSuggestion(tag)}
                  disabled={!on && tags.length >= max}
                  style={({ pressed }) => [
                    styles.suggest,
                    on
                      ? { backgroundColor: c.tintChipBackground, borderColor: 'transparent' }
                      : { borderColor: c.secondaryButtonBorder },
                    !on && tags.length >= max && { opacity: 0.4 },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.suggestText, { color: on ? c.tintChipText : c.chipText }]}>#{tag}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  count: { fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.min + 6,
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md - 2,
    gap: 4,
  },
  hash: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  input: { flex: 1, fontSize: fontSize.md, paddingVertical: 12 },
  addButton: { minHeight: touchTarget.min, justifyContent: 'center', paddingLeft: spacing.sm },
  addText: { fontSize: fontSize.meta, fontWeight: fontWeight.bold },
  message: { fontSize: fontSize.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: borderRadius.pill,
  },
  tagText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  suggestBlock: { gap: 6, marginTop: 2 },
  suggestLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  suggest: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  suggestText: { fontSize: fontSize.sm },
});

export default TagInput;
