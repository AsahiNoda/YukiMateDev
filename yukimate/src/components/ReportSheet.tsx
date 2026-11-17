import { ActionSheet } from '@/components/ui/ActionSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import React from 'react';
import { Alert } from 'react-native';

/** reports.target_type の値（DB の CHECK 制約と同じ） */
export type ReportTargetType = 'user' | 'event' | 'post' | 'comment' | 'spot';

export const REPORT_REASON_KEYS = [
  'resortPage.reasonInappropriate',
  'resortPage.reasonSpam',
  'resortPage.reasonHarassment',
  'resortPage.reasonDangerous',
  'resortPage.reasonOther',
];

/** 通報を送る（reports テーブル。insert は本人名義のみ RLS で許可：20261118000000_feed_interactions_rls.sql） */
export async function submitReport(targetType: ReportTargetType, targetId: string, reporterUserId: string, reason: string) {
  const { error } = await supabase.from('reports').insert({
    target_type: targetType,
    target_id: targetId,
    reporter_user_id: reporterUserId,
    reason,
  });
  if (error) console.warn('[report] failed', error.code, error.message);
  return { success: !error };
}

/**
 * 通報の理由を選んで送るシート（ユーザー・イベント・投稿で共通）。
 * Apple App Store Review Guideline 1.2（ユーザー生成コンテンツ）の通報機能。
 */
export function ReportSheet({
  visible,
  targetType,
  targetId,
  onClose,
  onReported,
}: {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string | null;
  onClose: () => void;
  onReported?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const send = async (reasonKey: string) => {
    onClose();
    if (!user?.id || !targetId) return;
    const result = await submitReport(targetType, targetId, user.id, t(reasonKey));
    if (result.success) {
      Alert.alert(t('resortPage.reportThanks'), t('resortPage.reportThanksMessage'));
      onReported?.();
    } else {
      Alert.alert(t('resortPage.reportFailed'));
    }
  };

  return (
    <ActionSheet
      visible={visible}
      title={t('resortPage.reportTitle')}
      onClose={onClose}
      cancelLabel={t('common.cancel')}
      actions={REPORT_REASON_KEYS.map((key) => ({ label: t(key), onPress: () => send(key) }))}
    />
  );
}

export default ReportSheet;
