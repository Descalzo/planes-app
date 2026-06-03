import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';

interface CreateNotificationInput {
  recipientId: string;
  actorId?: string;
  activityId?: string;
  type: NotificationType;
  message: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = new this.notificationModel({
      recipient: new Types.ObjectId(input.recipientId),
      actor: input.actorId ? new Types.ObjectId(input.actorId) : undefined,
      activity: input.activityId ? new Types.ObjectId(input.activityId) : undefined,
      type: input.type,
      message: input.message,
    });

    return notification.save();
  }

  private getLimit(limit?: string) {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 30;
    }

    return Math.min(Math.floor(parsed), 100);
  }

  async findForUser(userId: string, limit?: string) {
    return this.notificationModel
      .find({ recipient: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(this.getLimit(limit))
      .populate('actor', 'nombre email ciudad')
      .populate('activity', 'titulo ciudad fecha')
      .exec();
  }

  async getUnreadCount(userId: string) {
    return this.notificationModel.countDocuments({
      recipient: new Types.ObjectId(userId),
      readAt: { $exists: false },
      type: { $nin: ['private_activity_message', 'general_chat_message'] },
    });
  }

  async getUnreadMessagesCount(userId: string) {
    return this.notificationModel.countDocuments({
      recipient: new Types.ObjectId(userId),
      readAt: { $exists: false },
      type: { $in: ['private_activity_message', 'general_chat_message'] },
    });
  }

  async getUnreadMessageActivityIds(userId: string) {
    const activityIds = await this.notificationModel.distinct('activity', {
      recipient: new Types.ObjectId(userId),
      readAt: { $exists: false },
      type: 'general_chat_message',
      activity: { $exists: true, $ne: null },
    });

    return activityIds.map((activityId) => activityId.toString());
  }

  async getUnreadStatusActivityIds(userId: string) {
    const activityIds = await this.notificationModel.distinct('activity', {
      recipient: new Types.ObjectId(userId),
      readAt: { $exists: false },
      type: { $nin: ['private_activity_message', 'general_chat_message'] },
      activity: { $exists: true, $ne: null },
    });

    return activityIds.map((activityId) => activityId.toString());
  }

  async getUnreadPrivateMessageActorIds(activityId: string, userId: string) {
    const actorIds = await this.notificationModel.distinct('actor', {
      recipient: new Types.ObjectId(userId),
      activity: new Types.ObjectId(activityId),
      readAt: { $exists: false },
      type: 'private_activity_message',
      actor: { $exists: true, $ne: null },
    });

    return actorIds.map((actorId) => actorId.toString());
  }

  async markMessagesReadByActivity(activityId: string, userId: string) {
    await this.notificationModel.updateMany(
      {
        recipient: new Types.ObjectId(userId),
        activity: new Types.ObjectId(activityId),
        type: { $in: ['private_activity_message', 'general_chat_message'] },
        readAt: { $exists: false },
      },
      { $set: { readAt: new Date() } },
    );
  }

  async markAllStatusRead(userId: string) {
    await this.notificationModel.updateMany(
      {
        recipient: new Types.ObjectId(userId),
        type: { $nin: ['private_activity_message', 'general_chat_message'] },
        readAt: { $exists: false },
      },
      { $set: { readAt: new Date() } },
    );
  }

  async markStatusReadByActivity(activityId: string, userId: string) {
    await this.notificationModel.updateMany(
      {
        recipient: new Types.ObjectId(userId),
        activity: new Types.ObjectId(activityId),
        type: { $nin: ['private_activity_message', 'general_chat_message'] },
        readAt: { $exists: false },
      },
      { $set: { readAt: new Date() } },
    );
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationModel.findById(notificationId).exec();
    if (!notification) {
      throw new NotFoundException(`Notificacion con ID ${notificationId} no encontrada`);
    }

    if (notification.recipient.toString() !== userId) {
      throw new ForbiddenException('No puedes modificar esta notificacion');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }
}
