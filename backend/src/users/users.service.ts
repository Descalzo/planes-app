import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateProfileDto } from './dto/update-user.dto';

type PublicProfileStats = {
  actividadesCreadas: number;
  actividadesParticipadas: number;
  miembroDesde?: Date;
  perfilCompleto: boolean;
  logros: string[];
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel('Activity') private activityModel: Model<any>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    // Verificar si el email ya existe
    const existingUser = await this.userModel.findOne({ email: createUserDto.email });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(createUserDto.contraseña, 10);

    // Crear usuario
    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    // Retornar sin la contraseña
    const { password, ...userWithoutPassword } = savedUser.toObject();
    return userWithoutPassword;
  }

  async findById(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user.toObject();
  }

  async updateProfile(id: string, updateUserDto: UpdateProfileDto): Promise<Omit<User, 'password'>> {
    const allowedUpdates = {
      nombre: updateUserDto.nombre,
      ciudad: updateUserDto.ciudad,
      bio: updateUserDto.bio,
      intereses: updateUserDto.intereses,
      fotoPerfilUrl: updateUserDto.fotoPerfilUrl,
      edad: updateUserDto.edad,
      genero: updateUserDto.genero,
      instagram: updateUserDto.instagram,
    };

    const profileUpdates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([, value]) => value !== undefined),
    );

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, profileUpdates, { new: true, runValidators: true })
      .select('-password')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return updatedUser.toObject();
  }

  async getRequestedActivities(userId: string): Promise<any[]> {
    const userObjectId = new Types.ObjectId(userId);
    const activities = await this.activityModel
      .find({
        $or: [
          { solicitudesPendientes: userObjectId },
          { solicitudesRechazadas: userObjectId },
        ],
        participantes: { $ne: userObjectId },
      })
      .exec();

    return this.hydrateActivities(this.sortActivitiesByDateAsc(activities));
  }

  async login(loginUserDto: LoginUserDto): Promise<{ user: Omit<User, 'password'>; id: string }> {
    const user = await this.userModel.findOne({ email: loginUserDto.email });

    if (!user) {
      throw new BadRequestException('Email o contraseña incorrectos');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(loginUserDto.contraseña, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Email o contraseña incorrectos');
    }

    const { password, ...userWithoutPassword } = user.toObject();
    return { user: userWithoutPassword, id: user._id.toString() };
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  private isProfileComplete(user: UserDocument) {
    const interests = user.intereses ?? [];
    return Boolean(
      user.nombre?.trim() &&
      user.ciudad?.trim() &&
      user.bio?.trim() &&
      user.fotoPerfilUrl?.trim() &&
      user.edad &&
      user.genero?.trim() &&
      interests.length > 0,
    );
  }

  private async getPublicProfileStats(user: UserDocument): Promise<PublicProfileStats> {
    const userObjectId = user._id;
    const [actividadesCreadas, actividadesParticipadas] = await Promise.all([
      this.activityModel.countDocuments({ creador: userObjectId }).exec(),
      this.activityModel.countDocuments({ participantes: userObjectId }).exec(),
    ]);
    const perfilCompleto = this.isProfileComplete(user);
    const logros: string[] = [];

    if (perfilCompleto) {
      logros.push('perfil_completo');
    }

    if (actividadesCreadas >= 3) {
      logros.push('organizador_activo');
    }

    if (actividadesParticipadas >= 5) {
      logros.push('participante_activo');
    }

    return {
      actividadesCreadas,
      actividadesParticipadas,
      miembroDesde: user.get('createdAt') as Date | undefined,
      perfilCompleto,
      logros,
    };
  }

  private sortActivitiesByDateAsc(activities: any[]) {
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

  private getPlazasTotales(activity: any) {
    return typeof activity.plazas === 'number' && activity.plazas > 0 ? activity.plazas : 10;
  }

  private getPlazasOcupadas(activity: any) {
    return new Set((activity.participantes ?? []).map((participant: Types.ObjectId) => participant.toString())).size;
  }

  private async hydrateActivities(activities: any[]) {
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
      .select('nombre email ciudad fotoPerfilUrl')
      .lean()
      .exec();
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));

    return activities.map((activity) => {
      const plainActivity = activity.toObject();
      const creatorId = this.getValidObjectId(activity.creador);

      return {
        ...plainActivity,
        plazas: this.getPlazasTotales(activity),
        plazasOcupadas: this.getPlazasOcupadas(activity),
        plazasDisponibles: Math.max(this.getPlazasTotales(activity) - this.getPlazasOcupadas(activity), 0),
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

  private async buildPublicProfileResponse(user: UserDocument) {
    const stats = await this.getPublicProfileStats(user);
    return {
      ...user.toObject(),
      stats,
    };
  }

  async getPublicProfile(
    userId: string,
    activityId?: string,
    requesterId?: string,
  ): Promise<Omit<User, 'password' | 'email' | 'telefono'> & { stats: PublicProfileStats }> {
    const user = await this.userModel.findById(userId).select('-password -email -telefono').exec();
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Si no hay activityId (o llega el string literal "undefined"/"null"), tratar como ausente
    const validActivityId =
      activityId && activityId !== 'undefined' && activityId !== 'null' && Types.ObjectId.isValid(activityId)
        ? activityId
        : null;

    if (!validActivityId) {
      if (requesterId && requesterId === userId) {
        return this.buildPublicProfileResponse(user);
      }
      throw new ForbiddenException('Acceso denegado al perfil público');
    }

    // Validar que la actividad existe
    const activity = await this.activityModel.findById(validActivityId).exec();
    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${activityId} no encontrada`);
    }

    const userIdObj = new Types.ObjectId(userId);
    const requestIdObj = requesterId ? new Types.ObjectId(requesterId) : null;
    const isCreator = activity.creador.toString() === userId;
    const isParticipant = (activity.participantes ?? []).some((p: Types.ObjectId) => p.toString() === userId);
    const isFormerParticipant = (activity.salidas ?? []).some((p: Types.ObjectId) => p.toString() === userId);
    const isPendingRequest = (activity.solicitudesPendientes ?? []).some(
      (p: Types.ObjectId) => p.toString() === userId,
    );

    // Caso 1: Si el usuario solicitado es creador, cualquiera puede verlo desde la actividad
    if (isCreator) {
      return this.buildPublicProfileResponse(user);
    }

    // Caso 2: Si el usuario solicitado es participante
    if (isParticipant || isFormerParticipant) {
      // Si no hay requesterId, no puede ver (debe estar autenticado)
      if (!requestIdObj) {
        throw new ForbiddenException('Acceso denegado al perfil público');
      }

      const requesterIdStr = requestIdObj.toString();
      const requesterIsCreator = activity.creador.toString() === requesterIdStr;
      const requesterIsParticipant = (activity.participantes ?? []).some(
        (p: Types.ObjectId) => p.toString() === requesterIdStr,
      );

      // Solo el creador u otros participantes pueden ver a los participantes
      if (requesterIsCreator || requesterIsParticipant) {
        return this.buildPublicProfileResponse(user);
      }

      throw new ForbiddenException('Acceso denegado al perfil público');
    }

    if (isPendingRequest && requestIdObj && activity.creador.toString() === requestIdObj.toString()) {
      return this.buildPublicProfileResponse(user);
    }

    // Si el usuario no es ni creador ni participante, acceso denegado
    throw new ForbiddenException('Acceso denegado al perfil público');
  }
}
