import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  private activeGeneralChatKeys = new Map<string, number>();

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
  ) {}

  private canAccessChat(activity: ActivityDocument, userId: string) {
    return (
      activity.creador.toString() === userId ||
      (activity.participantes ?? []).some((participant) => participant.toString() === userId)
    );
  }

  private isUserActiveInGeneralChat(activityId: string, userId: string) {
    const lastSeen = this.activeGeneralChatKeys.get(`${activityId}:${userId}`);
    return Boolean(lastSeen && Date.now() - lastSeen < 15000);
  }

  async markUserActiveInGeneralChat(activityId: string, userId: string) {
    this.activeGeneralChatKeys.set(`${activityId}:${userId}`, Date.now());
    return { ok: true };
  }

  async create(activityId: string, userId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${activityId} no encontrada`);
    }

    if (!this.canAccessChat(activity, userId)) {
      throw new ForbiddenException('Solo los participantes aceptados pueden acceder a este chat');
    }

    const isMuted = (activity.chatSilenciados ?? []).some((user) => user.toString() === userId);

    if (isMuted) {
      throw new ForbiddenException('No tienes permiso para escribir en este chat');
    }

    const author = await this.userModel.findById(userId).exec();
    if (!author) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const newMessage = new this.messageModel({
      activity: new Types.ObjectId(activityId),
      author: new Types.ObjectId(userId),
      ...createMessageDto,
    });

    const savedMessage = await newMessage.save();

    const allParticipants = [
      activity.creador.toString(),
      ...(activity.participantes ?? []).map((p) => p.toString()),
    ];
    const recipients = allParticipants.filter((id) => id !== userId);

    const senderName = (author as any).nombre ?? (author as any).email ?? 'Un usuario';

    for (const recipientId of recipients) {
      if (!this.isUserActiveInGeneralChat(activityId, recipientId)) {
        await this.notificationsService.create({
          recipientId,
          actorId: userId,
          activityId,
          type: 'general_chat_message',
          message: `${senderName} ha enviado un mensaje en ${activity.titulo}`,
        });
      }
    }

    return savedMessage;
  }

  async findByActivity(activityId: string, userId: string): Promise<Message[]> {
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${activityId} no encontrada`);
    }

    if (!this.canAccessChat(activity, userId)) {
      throw new ForbiddenException('Solo los participantes aceptados pueden acceder a este chat');
    }

    return this.messageModel
      .find({ activity: new Types.ObjectId(activityId) })
      .populate('author', 'nombre ciudad')
      .exec();
  }
}
