import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  create(@Body() createActivityDto: CreateActivityDto, @CurrentUser() user: { id: string }) {
    return this.activitiesService.create(createActivityDto, user.id);
  }

  @Get()
  findAll() {
    return this.activitiesService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  findById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.activitiesService.findById(id);
  }

  @Patch(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  joinActivity(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.activitiesService.joinActivity(id, user.id);
  }
}
