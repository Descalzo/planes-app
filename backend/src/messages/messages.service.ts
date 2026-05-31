import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(activityId: string, userId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${activityId} no encontrada`);
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

    return newMessage.save();
  }

  async findByActivity(activityId: string): Promise<Message[]> {
    const activity = await this.activityModel.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${activityId} no encontrada`);
    }

    return this.messageModel
      .find({ activity: new Types.ObjectId(activityId) })
      .populate('author', 'nombre ciudad')
      .exec();
  }
}
