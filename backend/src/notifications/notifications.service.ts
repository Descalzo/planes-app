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

  async findForUser(userId: string) {
    return this.notificationModel
      .find({ recipient: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate('actor', 'nombre email ciudad')
      .populate('activity', 'titulo ciudad fecha')
      .exec();
  }

  async getUnreadCount(userId: string) {
    return this.notificationModel.countDocuments({
      recipient: new Types.ObjectId(userId),
      readAt: { $exists: false },
    });
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

