import { Colors } from '@/constants/theme';
import { IconSymbol } from '@components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

interface NotificationSettings {
  pushEnabled: boolean;
  eventApplications: boolean;
  eventReminders: boolean;
  eventCancellations: boolean;
  newParticipants: boolean;
  chatMessages: boolean;
  postEventReminders: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  eventApplications: true,
  eventReminders: true,
  eventCancellations: true,
  newParticipants: true,
  chatMessages: true,
  postEventReminders: true,
};

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('通知設定の読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('通知設定の保存エラー:', error);
      Alert.alert('エラー', '通知設定の保存に失敗しました');
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };

    // プッシュ通知がOFFになった場合、すべての通知をOFFにする
    if (key === 'pushEnabled' && !newSettings.pushEnabled) {
      Alert.alert(
        '通知をオフにしますか？',
        'すべての通知がオフになります。',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: 'オフにする',
            style: 'destructive',
            onPress: () => {
              const allOffSettings = {
                pushEnabled: false,
                eventApplications: false,
                eventReminders: false,
                eventCancellations: false,
                newParticipants: false,
                chatMessages: false,
                postEventReminders: false,
              };
              saveSettings(allOffSettings);
            },
          },
        ]
      );
      return;
    }

    // プッシュ通知がOFFの状態で個別の通知をONにしようとした場合
    if (!settings.pushEnabled && key !== 'pushEnabled') {
      Alert.alert(
        'プッシュ通知がオフです',
        'この通知を有効にするには、まずプッシュ通知を有効にしてください。'
      );
      return;
    }

    saveSettings(newSettings);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>通知設定</Text>
          <View style={styles.placeholder} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>通知設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          受け取りたい通知の種類を選択してください。
        </Text>

        {/* Main Toggle */}
        <View style={styles.section}>
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <IconSymbol name="bell.fill" size={20} color={colors.text} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>プッシュ通知</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  すべての通知のオン/オフ
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushEnabled}
              onValueChange={() => handleToggle('pushEnabled')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Event Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>イベント通知</Text>

          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: settings.pushEnabled ? colors.text : colors.textSecondary }]}>
                  イベント申請の結果
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  申請が承認/却下された時
                </Text>
              </View>
            </View>
            <Switch
              value={settings.eventApplications}
              onValueChange={() => handleToggle('eventApplications')}
              disabled={!settings.pushEnabled}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: settings.pushEnabled ? colors.text : colors.textSecondary }]}>
                  イベント開始リマインダー
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  イベント開始前の通知
                </Text>
              </View>
            </View>
            <Switch
              value={settings.eventReminders}
              onValueChange={() => handleToggle('eventReminders')}
              disabled={!settings.pushEnabled}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: settings.pushEnabled ? colors.text : colors.textSecondary }]}>
                  イベントキャンセル
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  参加予定のイベントが中止された時
                </Text>
              </View>
            </View>
            <Switch
              value={settings.eventCancellations}
              onValueChange={() => handleToggle('eventCancellations')}
              disabled={!settings.pushEnabled}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: settings.pushEnabled ? colors.text : colors.textSecondary }]}>
                  新しい参加者
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  自分が主催するイベントに参加者が増えた時
                </Text>
              </View>
            </View>
            <Switch
              value={settings.newParticipants}
              onValueChange={() => handleToggle('newParticipants')}
              disabled={!settings.pushEnabled}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Chat Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>メッセージ通知</Text>

          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: settings.pushEnabled ? colors.text : colors.textSecondary }]}>
                  チャットメッセージ
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  イベントチャットに新しいメッセージが届いた時
                </Text>
              </View>
            </View>
            <Switch
              value={settings.chatMessages}
              onValueChange={() => handleToggle('chatMessages')}
              disabled={!settings.pushEnabled}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Post Event Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>その他</Text>

          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: settings.pushEnabled ? colors.text : colors.textSecondary }]}>
                  イベント評価のリマインダー
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  イベント終了後の評価依頼
                </Text>
              </View>
            </View>
            <Switch
              value={settings.postEventReminders}
              onValueChange={() => handleToggle('postEventReminders')}
              disabled={!settings.pushEnabled}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={[styles.note, { color: colors.textSecondary }]}>
          ※ 端末の通知設定で通知が許可されている必要があります。{'\n'}
          端末の設定から通知を許可してください。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    textAlign: 'center',
  },
});
