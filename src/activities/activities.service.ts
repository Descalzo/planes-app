import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JoinActivityDto } from './dto/join-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(@InjectModel(Activity.name) private activityModel: Model<ActivityDocument>) {}

  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    const newActivity = new this.activityModel(createActivityDto);
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

  async joinActivity(id: string, joinActivityDto: JoinActivityDto): Promise<Activity> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    // Verificar si el usuario ya está apuntado
    if (activity.participantes.includes(joinActivityDto.usuario)) {
      throw new BadRequestException('El usuario ya está apuntado a esta actividad');
    }

    // Verificar si hay plazas disponibles
    if (activity.participantes.length >= activity.plazas) {
      throw new BadRequestException('No hay plazas disponibles en esta actividad');
    }

    // Añadir el usuario a los participantes
    activity.participantes.push(joinActivityDto.usuario);
    return activity.save();
  }
}
