import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateProfileDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
}
