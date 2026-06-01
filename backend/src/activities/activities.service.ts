import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';

type ActivitiesStatusFilter = 'futuras' | 'pasadas' | 'todas';
type ActivitiesSort = 'fechaAsc' | 'createdDesc' | 'createdAsc';

interface FindAllActivitiesOptions {
  categoria?: string;
  ciudad?: string;
  estado?: string;
  sort?: string;
}

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
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
        ...(activity.solicitudesPendientes ?? []),
        ...(activity.solicitudesRechazadas ?? []),
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
        solicitudesPendientes: this.hydrateUserReferences(activity.solicitudesPendientes, usersById),
        solicitudesRechazadas: this.hydrateUserReferences(activity.solicitudesRechazadas, usersById),
        expulsados: this.hydrateUserReferences(activity.expulsados, usersById),
        salidas: this.hydrateUserReferences(activity.salidas, usersById),
        chatSilenciados: this.hydrateUserReferences(activity.chatSilenciados, usersById),
      };
    });
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getStatusFilter(status?: string): ActivitiesStatusFilter {
    return status === 'pasadas' || status === 'todas' ? status : 'futuras';
  }

  private getSort(sort?: string): ActivitiesSort {
    return sort === 'createdDesc' || sort === 'createdAsc' ? sort : 'fechaAsc';
  }

  private sortActivitiesByDateAsc(activities: ActivityDocument[]) {
    return [...activities].sort((a, b) => {
      const aTime = a.fecha ? new Date(a.fecha).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.fecha ? new Date(b.fecha).getTime() : Number.POSITIVE_INFINITY;

      if (aTime !== bTime) {
        return aTime - bTime;
      }

      const aCreatedAt = a.get('createdAt') ? new Date(a.get('createdAt')).getTime() : 0;
      const bCreatedAt = b.get('createdAt') ? new Date(b.get('createdAt')).getTime() : 0;
      return bCreatedAt - aCreatedAt;
    });
  }

  private hasUser(references: Types.ObjectId[] | undefined, userId: string) {
    return (references ?? []).some((reference) => reference.toString() === userId);
  }

  private removeUser(references: Types.ObjectId[] | undefined, userId: string) {
    return (references ?? []).filter((reference) => reference.toString() !== userId);
  }

  async create(createActivityDto: CreateActivityDto, creadorId: string): Promise<Activity> {
    const creadorObjectId = new Types.ObjectId(creadorId);
    const newActivity = new this.activityModel({
      ...createActivityDto,
      creador: creadorObjectId,
      participantes: [creadorObjectId],
      solicitudesPendientes: [],
      solicitudesRechazadas: [],
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

  async findAll(options: FindAllActivitiesOptions = {}): Promise<any[]> {
    const filter: Record<string, unknown> = {};
    const now = new Date();
    const status = this.getStatusFilter(options.estado);
    const sort = this.getSort(options.sort);
    const categoria = options.categoria?.trim();
    const ciudad = options.ciudad?.trim();

    if (categoria) {
      filter.categoria = categoria;
    }

    if (ciudad) {
      filter.ciudad = { $regex: this.escapeRegex(ciudad), $options: 'i' };
    }

    if (status === 'futuras') {
      filter.$or = [{ fecha: { $gte: now } }, { fecha: { $exists: false } }, { fecha: null }];
    } else if (status === 'pasadas') {
      filter.fecha = { $lt: now };
    }

    let query = this.activityModel.find(filter);
    if (sort === 'createdDesc') {
      query = query.sort({ createdAt: -1 });
    } else if (sort === 'createdAsc') {
      query = query.sort({ createdAt: 1 });
    }

    const activities = await query.exec();
    return this.hydrateActivities(sort === 'fechaAsc' ? this.sortActivitiesByDateAsc(activities) : activities);
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

    if (this.hasUser(activity.participantes, usuarioId)) {
      throw new BadRequestException('Ya participas en esta actividad');
    }

    if (this.hasUser(activity.solicitudesPendientes, usuarioId)) {
      throw new BadRequestException('Ya tienes una solicitud pendiente');
    }

    activity.solicitudesPendientes = [
      ...(activity.solicitudesPendientes ?? []),
      new Types.ObjectId(usuarioId),
    ];
    activity.solicitudesRechazadas = this.removeUser(activity.solicitudesRechazadas, usuarioId);
    await activity.save();

    const requester = await this.userModel.findById(usuarioId).select('nombre email').lean().exec();
    await this.notificationsService.create({
      recipientId: activity.creador.toString(),
      actorId: usuarioId,
      activityId: id,
      type: 'activity_request_created',
      message: `${requester?.nombre ?? requester?.email ?? 'Un usuario'} ha solicitado unirse a tu actividad ${activity.titulo}`,
    });

    return this.findById(id);
  }

  async acceptJoinRequest(id: string, userId: string, requesterId: string): Promise<any> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    if (activity.creador.toString() !== requesterId) {
      throw new ForbiddenException('Solo el creador puede aceptar solicitudes');
    }

    if (!this.hasUser(activity.solicitudesPendientes, userId)) {
      throw new BadRequestException('El usuario no tiene una solicitud pendiente');
    }

    if (this.hasUser(activity.participantes, userId)) {
      throw new BadRequestException('El usuario ya participa en esta actividad');
    }

    if ((activity.participantes ?? []).length >= activity.plazas) {
      throw new BadRequestException('No hay plazas disponibles en esta actividad');
    }

    activity.solicitudesPendientes = this.removeUser(activity.solicitudesPendientes, userId);
    activity.solicitudesRechazadas = this.removeUser(activity.solicitudesRechazadas, userId);
    activity.salidas = this.removeUser(activity.salidas, userId);
    activity.participantes = [...(activity.participantes ?? []), new Types.ObjectId(userId)];
    await activity.save();

    await this.notificationsService.create({
      recipientId: userId,
      actorId: requesterId,
      activityId: id,
      type: 'activity_request_accepted',
      message: `Tu solicitud para ${activity.titulo} ha sido aceptada`,
    });

    return this.findById(id);
  }

  async rejectJoinRequest(id: string, userId: string, requesterId: string): Promise<any> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    if (activity.creador.toString() !== requesterId) {
      throw new ForbiddenException('Solo el creador puede rechazar solicitudes');
    }

    if (!this.hasUser(activity.solicitudesPendientes, userId)) {
      throw new BadRequestException('El usuario no tiene una solicitud pendiente');
    }

    activity.solicitudesPendientes = this.removeUser(activity.solicitudesPendientes, userId);
    if (!this.hasUser(activity.solicitudesRechazadas, userId)) {
      activity.solicitudesRechazadas = [
        ...(activity.solicitudesRechazadas ?? []),
        new Types.ObjectId(userId),
      ];
    }
    await activity.save();

    await this.notificationsService.create({
      recipientId: userId,
      actorId: requesterId,
      activityId: id,
      type: 'activity_request_rejected',
      message: `Tu solicitud para ${activity.titulo} ha sido rechazada`,
    });

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
