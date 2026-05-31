import { Activity } from './activityService';
import { Message } from './messageService';

const ACTIVITY_SEEN_PREFIX = 'planes_activity_seen_';
const CHAT_SEEN_PREFIX = 'planes_chat_seen_';

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

export function hasUnreadMessages(activityId: string, messages: Message[], currentUserId?: string | null) {
  const lastSeen = getStoredTime(getScopedKey(CHAT_SEEN_PREFIX, activityId, currentUserId));

  return messages.some((message) => {
    const messageTime = getTime(message.createdAt ?? message.updatedAt);
    const author = message.author;
    const authorId = typeof author === 'object' ? author._id ?? author.id : author;

    return messageTime > lastSeen && authorId !== currentUserId;
  });
}
