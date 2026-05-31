import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { CreateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(@InjectModel(Activity.name) private activityModel: Model<ActivityDocument>) {}

  async create(createActivityDto: CreateActivityDto, creadorId: string): Promise<Activity> {
    const newActivity = new this.activityModel({
      ...createActivityDto,
      creador: new Types.ObjectId(creadorId),
    });
    return newActivity.save();
  }

  async findAll(): Promise<Activity[]> {
    return this.activityModel.find().exec();
  }

  async findById(id: string): Promise<Activity> {
    const activity = await this.activityModel.findById(id).exec();
    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }
    return activity;
  }

  async joinActivity(id: string, usuarioId: string): Promise<Activity> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    if (activity.participantes.some((participante) => participante.toString() === usuarioId)) {
      throw new BadRequestException('El usuario ya está apuntado a esta actividad');
    }

    if (activity.participantes.length >= activity.plazas) {
      throw new BadRequestException('No hay plazas disponibles en esta actividad');
    }

    activity.participantes.push(new Types.ObjectId(usuarioId));
    return activity.save();
  }
}
