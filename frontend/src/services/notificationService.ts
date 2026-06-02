import { Activity } from './activityService';
import { Message } from './messageService';
import { PrivateActivityConversation } from './privateActivityChatService';

const ACTIVITY_SEEN_PREFIX = 'planes_activity_seen_';
const CHAT_SEEN_PREFIX = 'planes_chat_seen_';
const PRIVATE_CHAT_SEEN_PREFIX = 'planes_private_seen_';

function getScopedKey(prefix: string, activityId: string, userId?: string | null) {
  return `${prefix}${userId ?? 'anonymous'}_${activityId}`;
}

function getStoredTime(key: string) {
  const value = localStorage.getItem(key);
  return value ? Number(value) : 0;
}

function getTime(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

export function markActivitySeen(activityId: string, userId?: string | null) {
  localStorage.setItem(getScopedKey(ACTIVITY_SEEN_PREFIX, activityId, userId), String(Date.now()));
}

export function hasActivityUpdates(activity: Activity, userId?: string | null) {
  return getTime(activity.updatedAt) > getStoredTime(getScopedKey(ACTIVITY_SEEN_PREFIX, activity._id, userId));
}

export function markChatSeen(activityId: string, userId: string | null | undefined, messages: Message[]) {
  const latestMessageTime = Math.max(0, ...messages.map((message) => getTime(message.createdAt ?? message.updatedAt)));
  localStorage.setItem(getScopedKey(CHAT_SEEN_PREFIX, activityId, userId), String(latestMessageTime || Date.now()));
}

export function markChatSeenNow(activityId: string, userId: string | null | undefined) {
  localStorage.setItem(getScopedKey(CHAT_SEEN_PREFIX, activityId, userId), String(Date.now()));
}

export function hasUnreadMessages(activityId: string, messages: Message[], currentUserId?: string | null) {
  const lastSeen = getStoredTime(getScopedKey(CHAT_SEEN_PREFIX, activityId, currentUserId));

  return messages.some((message) => {
    const messageTime = getTime(message.createdAt ?? message.updatedAt);
    const author = message.author;
    const authorId = typeof author === 'object' ? author._id ?? author.id : author;

    return messageTime > lastSeen && authorId !== currentUserId;
  });
}

function getPrivateChatSeenKey(activityId: string, otherUserId: string, currentUserId?: string | null) {
  return `${PRIVATE_CHAT_SEEN_PREFIX}${currentUserId ?? 'anon'}_${activityId}_${otherUserId}`;
}

export function markPrivateChatSeen(activityId: string, otherUserId: string, currentUserId?: string | null) {
  localStorage.setItem(getPrivateChatSeenKey(activityId, otherUserId, currentUserId), String(Date.now()));
}

export function hasUnseenPrivateConversations(
  conversations: PrivateActivityConversation[],
  currentUserId?: string | null,
  activityId?: string,
): boolean {
  if (!activityId) return false;
  return conversations.some((conv) => {
    const sender = conv.lastMessage.sender;
    const senderId = typeof sender === 'object' ? (sender as any)._id ?? (sender as any).id : sender;
    if (senderId === currentUserId) return false; // yo envié el último → no hay pendiente
    const otherUserId = senderId as string;
    const msgTime = getTime((conv.lastMessage as any).createdAt ?? (conv.lastMessage as any).updatedAt);
    const lastSeen = getStoredTime(getPrivateChatSeenKey(activityId, otherUserId, currentUserId));
    return msgTime > lastSeen;
  });
}
