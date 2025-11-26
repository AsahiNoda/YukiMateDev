/**
 * Chat and messaging-related type definitions
 */

// Individual message in an event chat
export type EventMessage = {
  id: string;
  chatId: string;
  senderUserId: string;
  senderName: string;
  senderAvatar: string | null;
  contentText: string | null;
  contentImageUrl: string | null;
  createdAt: string;
};

// Participant in an event
export type EventParticipant = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
};

// Event chat thread
export type EventChat = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventResortName: string | null;
  eventStartAt: string;
  eventPhotos: string[];
  messages: EventMessage[];
  participants: EventParticipant[];
};
