import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    const loginResult = await this.usersService.login(loginUserDto);
    return this.authService.login(loginResult);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  async getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  findById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.findById(id);
  }
}
