import { supabase, getAuthUser } from '@/lib/supabase';
import type { EventApplication } from '@types';
import { useEffect, useState } from 'react';
import { notifyEventApplicationApproved, notifyEventApplicationRejected } from '@/services/notificationService';

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
          // 変更があったら再取得（ローディング表示は出さずに裏で更新）
          fetchApplications({ silent: true });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  async function fetchApplications(options: { silent?: boolean } = {}) {
    try {
      if (!options.silent) setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await getAuthUser();
      if (!user) {
        throw new Error('ログインが必要です');
      }

      // 自分がホストのイベントへの pending 申請を1クエリで取得
      // - posts_events!inner + host_user_id フィルタで「自分のイベント」に絞る（以前はイベントID取得で1往復）
      // - 申請者プロフィールは埋め込み取得（以前は申請ごとに1クエリ）
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('event_applications')
        .select(
          `
          *,
          posts_events!event_applications_event_id_fkey!inner(
            id,
            title,
            start_at,
            host_user_id,
            resorts(id, name)
          ),
          applicant_user:users!event_applications_applicant_user_id_fkey(
            id,
            role,
            profiles(user_id, display_name, avatar_url, level, country_code)
          )
        `
        )
        .eq('posts_events.host_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      const formattedApplications = (applicationsData || []).map((app: any) => {
        const { applicant_user, ...rest } = app;
        const profile = applicant_user?.profiles;
        const role = applicant_user?.role || 'user';
        return {
          ...rest,
          applicant: {
            id: app.applicant_user_id,
            profiles: profile
              ? {
                  ...profile,
                  users: { role },
                  role,
                }
              : null,
          },
          event: app.posts_events,
        };
      });

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

      // 通知を送信
      const application = applications.find(app => app.id === applicationId);
      if (application?.event?.title) {
        console.log('📤 Sending approval notification...');
        await notifyEventApplicationApproved(
          applicantUserId,
          application.event.title,
          eventId
        );

        // ホストに新規参加者通知を送信
        const { notifyHostOfNewParticipant } = await import('@/services/eventNotificationService');
        await notifyHostOfNewParticipant(eventId, application.event.title, applicantUserId);

        // ★登録ユーザーに参加通知を送信
        const { notifyStarredUsersOfParticipation } = await import('@/hooks/useEventCreation');
        await notifyStarredUsersOfParticipation(applicantUserId, application.event.title, eventId);

        // イベント開始リマインダーは、承認されたユーザー本人の端末が syncEventReminders で予約する
        // （ここ＝ホストの端末で予約すると、ホストに入ってしまうため）
      }

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
      const application = applications.find(app => app.id === applicationId);
      setApplications((prev) => prev.filter((app) => app.id !== applicationId));

      // 通知を送信
      if (application?.event?.title && application?.applicant?.id) {
        console.log('📤 Sending rejection notification...');
        await notifyEventApplicationRejected(
          application.applicant.id,
          application.event.title,
          application.event.id
        );
      }

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
    refetch: () => fetchApplications(),
  };
}
