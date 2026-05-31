import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(loginResult: { user: Omit<User, 'password'>; id: string }) {
    const payload = {
      sub: loginResult.id,
      email: loginResult.user.email,
      nombre: loginResult.user.nombre,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: loginResult.user,
    };
  }
}
