import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { IconSymbol } from '@components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { spacing, fontSize, borderRadius, fontWeight } from '@/constants/spacing';
import { useColorScheme } from '@hooks/use-color-scheme';
import { mockEventChats } from '@data/mockEventChats';
import type { EventChat } from '@types';

export default function ChatScreen() {
  const [selectedChat, setSelectedChat] = useState<EventChat | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // For now using mock data directly - will integrate with useEventChats hook later
  const chats = mockEventChats;

  if (selectedChat) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Chat Header */}
        <View style={[styles.chatHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedChat(null)}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatHeaderTitle, { color: colors.text }]}>
              {selectedChat.eventTitle}
            </Text>
            <Text style={[styles.chatHeaderSubtitle, { color: colors.textSecondary }]}>
              {selectedChat.eventResortName || 'Event Chat'}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerAction}>
            <IconSymbol name="info.circle" size={24} color={colors.icon} />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <FlatList
          data={selectedChat.messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => {
            const isCurrentUser = item.senderUserId === 'user-1'; // Mock current user
            return (
              <View
                style={[
                  styles.messageContainer,
                  isCurrentUser ? styles.messageContainerRight : styles.messageContainerLeft,
                ]}>
                {!isCurrentUser && (
                  <View style={[styles.messageAvatar, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.messageAvatarText, { color: colors.text }]}>
                      {item.senderName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isCurrentUser
                      ? { backgroundColor: colors.accent }
                      : { backgroundColor: colors.card },
                  ]}>
                  {!isCurrentUser && (
                    <Text style={[styles.messageSender, { color: colors.textSecondary }]}>
                      {item.senderName}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      { color: isCurrentUser ? '#FFFFFF' : colors.text },
                    ]}>
                    {item.contentText}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      { color: isCurrentUser ? '#FFFFFF99' : colors.textSecondary },
                    ]}>
                    {new Date(item.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Message Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.inputAction}>
            <IconSymbol name="plus.circle" size={28} color={colors.icon} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.accent }]}>
            <IconSymbol name="arrow.up" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Chat List View
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Chats</Text>
        <TouchableOpacity>
          <IconSymbol name="square.and.pencil" size={24} color={colors.icon} />
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatList}
        renderItem={({ item }) => {
          const lastMessage = item.messages[item.messages.length - 1];
          const messagePreview = lastMessage?.contentText || 'No messages yet';
          const timeAgo = lastMessage
            ? new Date(lastMessage.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : '';

          return (
            <TouchableOpacity
              style={[styles.chatItem, { backgroundColor: colors.card }]}
              onPress={() => setSelectedChat(item)}>
              <View style={[styles.chatIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <IconSymbol name="person.2.fill" size={24} color={colors.icon} />
              </View>
              <View style={styles.chatInfo}>
                <View style={styles.chatTopRow}>
                  <Text style={[styles.chatTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.eventTitle}
                  </Text>
                  <Text style={[styles.chatTime, { color: colors.textSecondary }]}>{timeAgo}</Text>
                </View>
                <Text style={[styles.chatResort, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.eventResortName || 'Event Chat'}
                </Text>
                <Text style={[styles.chatPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                  {lastMessage ? `${lastMessage.senderName}: ${messagePreview}` : messagePreview}
                </Text>
              </View>
              <View style={styles.chatBadge}>
                {item.messages.length > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
                      {item.messages.length}
                    </Text>
                  </View>
                )}
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="message" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No event chats yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Join an event to start chatting with other participants
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  chatList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  chatIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  chatTime: {
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
  },
  chatResort: {
    fontSize: fontSize.xs,
  },
  chatPreview: {
    fontSize: fontSize.sm,
  },
  chatBadge: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  // Chat View Styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  chatHeaderSubtitle: {
    fontSize: fontSize.xs,
  },
  headerAction: {
    padding: spacing.xs,
  },
  messagesList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  messageContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: '80%',
  },
  messageContainerLeft: {
    alignSelf: 'flex-start',
  },
  messageContainerRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  messageSender: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: fontSize.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  inputAction: {
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    fontSize: fontSize.md,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
