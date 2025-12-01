import { supabase } from '@/lib/supabase';
import type { EventApplication } from '@types';
import { useEffect, useState } from 'react';

export interface EventApplicationWithDetails extends EventApplication {
  applicant: {
    id: string;
    profiles: {
      user_id: string;
      display_name: string | null;
      avatar_url: string | null;
      level: import('@types').SkillLevel | null;
      country_code: string | null;
      role: string; // or UserRole if imported
    } | null;
  } | null;
  event: {
    id: string;
    title: string;
    start_at: string;
    resorts: { id: string; name: string } | null;
  } | null;
}

export function useEventApplications() {
  const [applications, setApplications] = useState<EventApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();

    // リアルタイム更新をサブスクライブ
    const channel = supabase
      .channel('event_applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_applications',
        },
        () => {
          // 変更があったら再取得
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  async function fetchApplications() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ログインが必要です');
      }

      // 自分がホストのイベントIDを取得
      const { data: hostEvents, error: hostError } = await supabase
        .from('posts_events')
        .select('id')
        .eq('host_user_id', user.id);

      if (hostError) throw hostError;

      const eventIds = (hostEvents || []).map((e) => e.id);

      if (eventIds.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // pending状態の申請を取得
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('event_applications')
        .select(
          `
          *,
          posts_events!event_applications_event_id_fkey(
            id,
            title,
            start_at,
            resorts(id, name)
          )
        `
        )
        .in('event_id', eventIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // 各申請の申請者プロフィールを別途取得
      const formattedApplications = await Promise.all(
        (applicationsData || []).map(async (app: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url, level, country_code, users!profiles_user_id_fkey(role)')
            .eq('user_id', app.applicant_user_id)
            .single();

          return {
            ...app,
            applicant: {
              id: app.applicant_user_id,
              profiles: profile ? {
                ...profile,
                role: profile.users?.role || 'user',
              } : null,
            },
            event: app.posts_events,
          };
        })
      );

      setApplications(formattedApplications);
    } catch (err: any) {
      console.error('Fetch event applications error:', err);
      setError(err.message || '申請の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function approveApplication(applicationId: string, eventId: string, applicantUserId: string) {
    console.log('🔵 Starting approval process:', { applicationId, eventId, applicantUserId });

    try {
      // 既に参加しているかチェック（.maybeSingle()でレコードがない場合はnull）
      const { data: existingParticipant, error: checkError } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', applicantUserId)
        .is('left_at', null)
        .maybeSingle();

      console.log('🔍 Existing participant check:', { existingParticipant, checkError });

      // エラーが発生した場合（RLSエラーなど）
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Check error:', checkError);
        throw checkError;
      }

      if (existingParticipant) {
        console.log('⚠️ User already participant, updating status only');
        // 既に参加している場合は、申請のstatusだけ更新
        const { error: updateError } = await supabase
          .from('event_applications')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('id', applicationId);

        if (updateError) {
          console.error('❌ Update error (existing):', updateError);
          throw updateError;
        }

        console.log('✅ Status updated (already participant)');
        setApplications((prev) => prev.filter((app) => app.id !== applicationId));
        return { success: true };
      }

      // statusをapprovedに更新
      console.log('📝 Updating application status to approved');
      const { error: updateError } = await supabase
        .from('event_applications')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw updateError;
      }

      console.log('✅ Application status updated');

      // event_participantsに追加
      console.log('👤 Adding user to event_participants');
      const { error: insertError } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          user_id: applicantUserId,
        });

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ User added to participants');

      // 一覧から削除（pending以外は表示しない）
      setApplications((prev) => prev.filter((app) => app.id !== applicationId));

      console.log('✅ Approval process completed successfully');
      return { success: true };
    } catch (err: any) {
      console.error('❌ Approve application error:', err);
      return { success: false, error: err.message };
    }
  }

  async function rejectApplication(applicationId: string) {
    try {
      // statusをrejectedに更新
      const { error } = await supabase
        .from('event_applications')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (error) throw error;

      // 一覧から削除（pending以外は表示しない）
      setApplications((prev) => prev.filter((app) => app.id !== applicationId));

      return { success: true };
    } catch (err: any) {
      console.error('Reject application error:', err);
      return { success: false, error: err.message };
    }
  }

  return {
    applications,
    loading,
    error,
    approveApplication,
    rejectApplication,
    refetch: fetchApplications,
  };
}
