import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private getValidObjectId(value: unknown) {
    const id = value?.toString();
    return id && Types.ObjectId.isValid(id) ? id : null;
  }

  private hydrateUserReferences(
    references: unknown[] | undefined,
    usersById: Map<string, unknown>,
  ) {
    return (references ?? [])
      .map((reference) => {
        const referenceId = this.getValidObjectId(reference);
        return referenceId ? usersById.get(referenceId) ?? referenceId : null;
      })
      .filter(Boolean);
  }

  private async hydrateActivities(activities: ActivityDocument[]) {
    const userIds = new Set<string>();

    activities.forEach((activity) => {
      const creatorId = this.getValidObjectId(activity.creador);
      if (creatorId) {
        userIds.add(creatorId);
      }

      [
        ...(activity.participantes ?? []),
        ...(activity.expulsados ?? []),
        ...(activity.salidas ?? []),
        ...(activity.chatSilenciados ?? []),
      ].forEach((reference) => {
        const referenceId = this.getValidObjectId(reference);
        if (referenceId) {
          userIds.add(referenceId);
        }
      });
    });

    const users = await this.userModel
      .find({ _id: { $in: [...userIds].map((id) => new Types.ObjectId(id)) } })
      .select('nombre email ciudad')
      .lean()
      .exec();
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));

    return activities.map((activity) => {
      const plainActivity = activity.toObject();
      const creatorId = this.getValidObjectId(activity.creador);

      return {
        ...plainActivity,
        creador: creatorId ? usersById.get(creatorId) ?? creatorId : plainActivity.creador,
        participantes: this.hydrateUserReferences(activity.participantes, usersById),
        expulsados: this.hydrateUserReferences(activity.expulsados, usersById),
        salidas: this.hydrateUserReferences(activity.salidas, usersById),
        chatSilenciados: this.hydrateUserReferences(activity.chatSilenciados, usersById),
      };
    });
  }

  async create(createActivityDto: CreateActivityDto, creadorId: string): Promise<Activity> {
    const creadorObjectId = new Types.ObjectId(creadorId);
    const newActivity = new this.activityModel({
      ...createActivityDto,
      creador: creadorObjectId,
      participantes: [creadorObjectId],
      expulsados: [],
      salidas: [],
      chatSilenciados: [],
    });
    return newActivity.save();
  }

  async update(id: string, dto: UpdateActivityDto, userId: string): Promise<any> {
    const activity = await this.activityModel.findById(id).exec();
    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }
    if (activity.creador.toString() !== userId) {
      throw new ForbiddenException('Solo el creador puede editar esta actividad');
    }

    const { titulo, descripcion, categoria, ciudad, fecha, plazas, imagenUrl } = dto;
    if (titulo !== undefined) activity.titulo = titulo;
    if (descripcion !== undefined) activity.descripcion = descripcion;
    if (categoria !== undefined) activity.categoria = categoria;
    if (ciudad !== undefined) activity.ciudad = ciudad;
    if (fecha !== undefined) activity.fecha = new Date(fecha);
    if (plazas !== undefined) activity.plazas = plazas;
    if (imagenUrl !== undefined) activity.imagenUrl = imagenUrl;

    await activity.save();
    const [hydrated] = await this.hydrateActivities([activity]);
    return hydrated;
  }

  async findAll(): Promise<any[]> {
    const activities = await this.activityModel.find().exec();
    return this.hydrateActivities(activities);
  }

  async findById(id: string): Promise<any> {
    const activity = await this.activityModel.findById(id).exec();
    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }
    const [hydratedActivity] = await this.hydrateActivities([activity]);
    return hydratedActivity;
  }

  async joinActivity(id: string, usuarioId: string): Promise<any> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    if ((activity.expulsados ?? []).some((user) => user.toString() === usuarioId)) {
      throw new ForbiddenException('No puedes unirte a esta actividad');
    }

    if ((activity.participantes ?? []).some((participante) => participante.toString() === usuarioId)) {
      throw new BadRequestException('El usuario ya esta apuntado a esta actividad');
    }

    if ((activity.participantes ?? []).length >= activity.plazas) {
      throw new BadRequestException('No hay plazas disponibles en esta actividad');
    }

    activity.participantes = [...(activity.participantes ?? []), new Types.ObjectId(usuarioId)];
    activity.salidas = (activity.salidas ?? []).filter((user) => user.toString() !== usuarioId);
    await activity.save();
    return this.findById(id);
  }

  async leaveActivity(id: string, usuarioId: string): Promise<any> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    if (activity.creador.toString() === usuarioId) {
      throw new BadRequestException('El creador no puede desapuntarse de su propia actividad');
    }

    if (!(activity.participantes ?? []).some((participante) => participante.toString() === usuarioId)) {
      throw new BadRequestException('El usuario no esta apuntado a esta actividad');
    }

    activity.participantes = (activity.participantes ?? []).filter((participante) => participante.toString() !== usuarioId);
    activity.chatSilenciados = (activity.chatSilenciados ?? []).filter((user) => user.toString() !== usuarioId);
    if (!(activity.salidas ?? []).some((user) => user.toString() === usuarioId)) {
      activity.salidas = [...(activity.salidas ?? []), new Types.ObjectId(usuarioId)];
    }
    await activity.save();
    return this.findById(id);
  }

  async removeParticipant(id: string, participantId: string, requesterId: string): Promise<any> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    if (activity.creador.toString() !== requesterId) {
      throw new ForbiddenException('Solo el creador puede quitar participantes');
    }

    if (participantId === requesterId) {
      throw new BadRequestException('El creador no puede quitarse de su propia actividad');
    }

    if (!(activity.participantes ?? []).some((participante) => participante.toString() === participantId)) {
      throw new BadRequestException('El usuario no esta apuntado a esta actividad');
    }

    activity.participantes = (activity.participantes ?? []).filter((participante) => participante.toString() !== participantId);
    activity.chatSilenciados = (activity.chatSilenciados ?? []).filter((user) => user.toString() !== participantId);

    if (!(activity.expulsados ?? []).some((user) => user.toString() === participantId)) {
      activity.expulsados = [...(activity.expulsados ?? []), new Types.ObjectId(participantId)];
    }

    await activity.save();
    return this.findById(id);
  }

  async unbanParticipant(id: string, participantId: string, requesterId: string): Promise<any> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    if (activity.creador.toString() !== requesterId) {
      throw new ForbiddenException('Solo el creador puede desbanear usuarios');
    }

    activity.expulsados = (activity.expulsados ?? []).filter((user) => user.toString() !== participantId);
    await activity.save();
    return this.findById(id);
  }

  async muteParticipant(id: string, participantId: string, requesterId: string): Promise<any> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    if (activity.creador.toString() !== requesterId) {
      throw new ForbiddenException('Solo el creador puede silenciar participantes');
    }

    if (participantId === requesterId) {
      throw new BadRequestException('El creador no puede silenciarse');
    }

    if (!(activity.participantes ?? []).some((participante) => participante.toString() === participantId)) {
      throw new BadRequestException('El usuario no esta apuntado a esta actividad');
    }

    if (!(activity.chatSilenciados ?? []).some((user) => user.toString() === participantId)) {
      activity.chatSilenciados = [...(activity.chatSilenciados ?? []), new Types.ObjectId(participantId)];
    }

    await activity.save();
    return this.findById(id);
  }

  async unmuteParticipant(id: string, participantId: string, requesterId: string): Promise<any> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    if (activity.creador.toString() !== requesterId) {
      throw new ForbiddenException('Solo el creador puede permitir hablar a participantes');
    }

    activity.chatSilenciados = (activity.chatSilenciados ?? []).filter((user) => user.toString() !== participantId);
    await activity.save();
    return this.findById(id);
  }
}
