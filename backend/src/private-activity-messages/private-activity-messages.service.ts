import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreatePrivateActivityMessageDto } from './dto/create-private-activity-message.dto';
import {
  PrivateActivityMessage,
  PrivateActivityMessageDocument,
} from './schemas/private-activity-message.schema';

@Injectable()
export class PrivateActivityMessagesService {
  // Key: `${activityId}:${userId}` — quién está viendo activamente, no la conversación
  private activeConversationKeys = new Map<string, number>();

  constructor(
    @InjectModel(PrivateActivityMessage.name)
    private privateMessageModel: Model<PrivateActivityMessageDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
  ) {}

  private async getActivity(activityId: string) {
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${activityId} no encontrada`);
    }
    return activity;
  }

  private isUserActiveInConversation(activityId: string, userId: string) {
    const lastSeen = this.activeConversationKeys.get(`${activityId}:${userId}`);
    return Boolean(lastSeen && Date.now() - lastSeen < 15000);
  }

  private getConversationUserId(activity: ActivityDocument, requesterId: string, userId: string) {
    const creatorId = activity.creador.toString();
    if (requesterId === creatorId) {
      if (userId === creatorId) {
        throw new BadRequestException('Selecciona un usuario interesado');
      }
      return userId;
    }
    // Un participante solo puede ver su propia conversación con el creador,
    // independientemente del userId que llegue en la URL
    return requesterId;
  }

  async listConversations(activityId: string, requesterId: string) {
    const activity = await this.getActivity(activityId);
    const creatorId = activity.creador.toString();
    if (requesterId !== creatorId) {
      throw new ForbiddenException('Solo el creador puede ver las consultas de la actividad');
    }

    const messages = await this.privateMessageModel
      .find({ activity: new Types.ObjectId(activityId) })
      .sort({ createdAt: -1 })
      .populate('sender', 'nombre email ciudad')
      .populate('receiver', 'nombre email ciudad')
      .lean()
      .exec();

    const conversations = new Map<string, any>();
    messages.forEach((message) => {
      const senderId = message.sender?._id?.toString();
      const receiverId = message.receiver?._id?.toString();
      const userId = senderId === creatorId ? receiverId : senderId;
      const user = senderId === creatorId ? message.receiver : message.sender;

      if (userId && !conversations.has(userId)) {
        conversations.set(userId, {
          user,
          lastMessage: message,
        });
      }
    });

    return [...conversations.values()];
  }

  async findConversation(activityId: string, userId: string, requesterId: string) {
    const activity = await this.getActivity(activityId);
    const creatorId = activity.creador.toString();
    const conversationUserId = this.getConversationUserId(activity, requesterId, userId);

    return this.privateMessageModel
      .find({
        activity: new Types.ObjectId(activityId),
        $or: [
          { sender: new Types.ObjectId(conversationUserId), receiver: activity.creador },
          { sender: activity.creador, receiver: new Types.ObjectId(conversationUserId) },
        ],
      })
      .sort({ createdAt: 1 })
      .populate('sender', 'nombre email ciudad')
      .populate('receiver', 'nombre email ciudad')
      .exec();
  }

  async create(activityId: string, requesterId: string, dto: CreatePrivateActivityMessageDto) {
    const activity = await this.getActivity(activityId);
    const creatorId = activity.creador.toString();
    const requester = await this.userModel.findById(requesterId).select('nombre email').lean().exec();
    if (!requester) {
      throw new NotFoundException(`Usuario con ID ${requesterId} no encontrado`);
    }

    const receiverId = requesterId === creatorId ? dto.receiverId : creatorId;
    if (!receiverId) {
      throw new BadRequestException('Debes indicar a que usuario responder');
    }
    if (receiverId === requesterId) {
      throw new BadRequestException('No puedes enviarte mensajes a ti mismo');
    }

    if (requesterId !== creatorId) {
      const receiverIsCreator = receiverId === creatorId;
      if (!receiverIsCreator) {
        throw new ForbiddenException('Solo puedes preguntar al organizador');
      }
    }

    const receiver = await this.userModel.findById(receiverId).select('nombre email').lean().exec();
    if (!receiver) {
      throw new NotFoundException(`Usuario con ID ${receiverId} no encontrado`);
    }

    const message = new this.privateMessageModel({
      activity: new Types.ObjectId(activityId),
      sender: new Types.ObjectId(requesterId),
      receiver: new Types.ObjectId(receiverId),
      text: dto.text,
    });
    const savedMessage = await message.save();

    if (!this.isUserActiveInConversation(activityId, receiverId)) {
      await this.notificationsService.create({
        recipientId: receiverId,
        actorId: requesterId,
        activityId,
        type: 'private_activity_message',
        message: `${requester.nombre ?? requester.email ?? 'Un usuario'} te ha enviado un mensaje privado sobre ${activity.titulo}`,
      });
    }

    return savedMessage.populate([
      { path: 'sender', select: 'nombre email ciudad' },
      { path: 'receiver', select: 'nombre email ciudad' },
    ]);
  }

  async checkPrivateChatAccess(activityId: string, userId: string, otherUserId: string): Promise<boolean> {
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) return false;
    const creatorId = activity.creador.toString();
    const interestedUserIds = [
      ...(activity.participantes ?? []),
      ...(activity.solicitudesPendientes ?? []),
      ...(activity.solicitudesRechazadas ?? []),
    ].map((p) => p.toString());

    if (userId === creatorId) return otherUserId !== creatorId;
    if (otherUserId === creatorId) return userId !== creatorId;
    return false;
  }

  async markConversationActive(activityId: string, userId: string, requesterId: string) {
    await this.getActivity(activityId);
    // Marca al SOLICITANTE (quien está viendo) como activo, no a la conversación entera
    this.activeConversationKeys.set(`${activityId}:${requesterId}`, Date.now());
    return { ok: true };
  }
}
