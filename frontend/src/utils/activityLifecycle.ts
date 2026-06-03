import { Activity } from '../services/activityService';

export const POST_EVENT_GRACE_MS = 24 * 60 * 60 * 1000;

export function getActivityTime(activity: Pick<Activity, 'fecha'>) {
  return activity.fecha ? new Date(activity.fecha).getTime() : Number.POSITIVE_INFINITY;
}

export function hasActivityStarted(activity: Pick<Activity, 'fecha'>, now = Date.now()) {
  return Boolean(activity.fecha) && getActivityTime(activity) < now;
}

export function isActivityArchived(activity: Pick<Activity, 'fecha'>, now = Date.now()) {
  if (!activity.fecha) return false;
  return now >= getActivityTime(activity) + POST_EVENT_GRACE_MS;
}

export function isActivityInPostEventGrace(activity: Pick<Activity, 'fecha'>, now = Date.now()) {
  return hasActivityStarted(activity, now) && !isActivityArchived(activity, now);
}
