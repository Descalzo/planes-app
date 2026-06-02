import { Controller, Post, Get, Body, Param, Patch, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateProfileDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
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

  @Get('me/requested-activities')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener actividades solicitadas pendientes o rechazadas del usuario autenticado' })
  async getRequestedActivities(@CurrentUser() user: { id: string }) {
    return this.usersService.getRequestedActivities(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  @ApiBody({ type: UpdateProfileDto })
  async updateMe(
    @CurrentUser() user: { id: string },
    @Body() updateUserDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateUserDto);
  }

  @Get(':id/public')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  @ApiQuery({ name: 'activityId', description: 'ID de la actividad para validar permisos', type: String, required: false })
  @ApiOperation({ summary: 'Obtener perfil público limitado de un usuario' })
  async getPublicProfile(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Query('activityId') activityId?: string,
    @CurrentUser() user?: { id: string },
  ) {
    const requesterId = user?.id;
    return this.usersService.getPublicProfile(userId, activityId, requesterId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
  findById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.findById(id);
  }
}
