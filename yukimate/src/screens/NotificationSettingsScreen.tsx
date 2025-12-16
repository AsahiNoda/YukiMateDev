import { Colors } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();

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
      console.error(t('notificationSettings.loadError'), error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error(t('notificationSettings.saveError'), error);
      Alert.alert(t('common.error'), t('notificationSettings.saveFailed'));
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };

    // プッシュ通知がOFFになった場合、すべての通知をOFFにする
    if (key === 'pushEnabled' && !newSettings.pushEnabled) {
      Alert.alert(
        t('notificationSettings.turnOffConfirm'),
        t('notificationSettings.turnOffMessage'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('notificationSettings.turnOff'),
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

    // プッシュ通知がOFFの時は他の通知を変更できない
    if (!settings.pushEnabled && key !== 'pushEnabled') {
      Alert.alert(
        t('notificationSettings.pushNotificationsOff'),
        t('notificationSettings.enablePushFirst')
      );
      return;
    }

    saveSettings(newSettings);
  };

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('notificationSettings.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('notificationSettings.selectTypes')}
        </Text>

        {/* Push Notifications Toggle */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                {t('notificationSettings.pushNotifications')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('notificationSettings.allNotificationsToggle')}
              </Text>
            </View>
            <Switch
              value={settings.pushEnabled}
              onValueChange={() => handleToggle('pushEnabled')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={settings.pushEnabled ? colors.background : colors.backgroundSecondary}
            />
          </View>
        </View>

        {/* Event Notifications */}
        <View style={styles.categorySection}>
          <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
            {t('notificationSettings.eventNotifications')}
          </Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.border, opacity: settings.pushEnabled ? 1 : 0.5 }]}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                {t('notificationSettings.applicationResult')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('notificationSettings.applicationResultDesc')}
              </Text>
            </View>
            <Switch
              value={settings.eventApplications}
              onValueChange={() => handleToggle('eventApplications')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={settings.eventApplications ? colors.background : colors.backgroundSecondary}
              disabled={!settings.pushEnabled}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border, opacity: settings.pushEnabled ? 1 : 0.5 }]}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                {t('notificationSettings.eventReminder')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('notificationSettings.eventReminderDesc')}
              </Text>
            </View>
            <Switch
              value={settings.eventReminders}
              onValueChange={() => handleToggle('eventReminders')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={settings.eventReminders ? colors.background : colors.backgroundSecondary}
              disabled={!settings.pushEnabled}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border, opacity: settings.pushEnabled ? 1 : 0.5 }]}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                {t('notificationSettings.eventCancelled')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('notificationSettings.eventCancelledDesc')}
              </Text>
            </View>
            <Switch
              value={settings.eventCancellations}
              onValueChange={() => handleToggle('eventCancellations')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={settings.eventCancellations ? colors.background : colors.backgroundSecondary}
              disabled={!settings.pushEnabled}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border, opacity: settings.pushEnabled ? 1 : 0.5 }]}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                {t('notificationSettings.newParticipants')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('notificationSettings.newParticipantsDesc')}
              </Text>
            </View>
            <Switch
              value={settings.newParticipants}
              onValueChange={() => handleToggle('newParticipants')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={settings.newParticipants ? colors.background : colors.backgroundSecondary}
              disabled={!settings.pushEnabled}
            />
          </View>
        </View>

        {/* Message Notifications */}
        <View style={styles.categorySection}>
          <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
            {t('notificationSettings.messageNotifications')}
          </Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.border, opacity: settings.pushEnabled ? 1 : 0.5 }]}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                {t('notificationSettings.chatMessages')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('notificationSettings.chatMessagesDesc')}
              </Text>
            </View>
            <Switch
              value={settings.chatMessages}
              onValueChange={() => handleToggle('chatMessages')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={settings.chatMessages ? colors.background : colors.backgroundSecondary}
              disabled={!settings.pushEnabled}
            />
          </View>
        </View>

        {/* Other Notifications */}
        <View style={styles.categorySection}>
          <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
            {t('notificationSettings.other')}
          </Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.border, opacity: settings.pushEnabled ? 1 : 0.5 }]}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                {t('notificationSettings.eventRatingReminder')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('notificationSettings.eventRatingReminderDesc')}
              </Text>
            </View>
            <Switch
              value={settings.postEventReminders}
              onValueChange={() => handleToggle('postEventReminders')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={settings.postEventReminders ? colors.background : colors.backgroundSecondary}
              disabled={!settings.pushEnabled}
            />
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteSection}>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            {t('notificationSettings.deviceSettingsNote')}
          </Text>
          <Text style={[styles.noteText, { color: colors.textSecondary, marginTop: 8 }]}>
            {t('notificationSettings.enableInDeviceSettings')}
          </Text>
        </View>
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
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    padding: 16,
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categorySection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
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
  noteSection: {
    padding: 16,
    marginTop: 24,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
