import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'contraseña'>> {
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
      contraseña: hashedPassword,
    });

    const savedUser = await newUser.save();

    // Retornar sin la contraseña
    const { contraseña, ...userWithoutPassword } = savedUser.toObject();
    return userWithoutPassword;
  }

  async findById(id: string): Promise<Omit<User, 'contraseña'>> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const { contraseña, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
  }

  async login(loginUserDto: LoginUserDto): Promise<{ user: Omit<User, 'contraseña'>; id: string }> {
    const user = await this.userModel.findOne({ email: loginUserDto.email });

    if (!user) {
      throw new BadRequestException('Email o contraseña incorrectos');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(loginUserDto.contraseña, user.contraseña);
    if (!isPasswordValid) {
      throw new BadRequestException('Email o contraseña incorrectos');
    }

    const { contraseña, ...userWithoutPassword } = user.toObject();
    return { user: userWithoutPassword, id: user._id.toString() };
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }
}
