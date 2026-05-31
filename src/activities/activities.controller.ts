import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  create(@Body() createActivityDto: CreateActivityDto, @CurrentUser() user: { nombre: string }) {
    return this.activitiesService.create(createActivityDto, user.nombre);
  }

  @Get()
  findAll() {
    return this.activitiesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.activitiesService.findById(id);
  }

  @Patch(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  joinActivity(@Param('id') id: string, @CurrentUser() user: { nombre: string }) {
    return this.activitiesService.joinActivity(id, user.nombre);
  }
}
