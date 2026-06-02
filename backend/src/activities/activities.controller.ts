import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
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
  findAll(
    @Query('categoria') categoria?: string,
    @Query('ciudad') ciudad?: string,
    @Query('zonaPrincipal') zonaPrincipal?: string,
    @Query('estado') estado?: string,
    @Query('sort') sort?: string,
  ) {
    return this.activitiesService.findAll({ categoria, ciudad, zonaPrincipal, estado, sort });
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  getSaved(@CurrentUser() user: { id: string }) {
    return this.activitiesService.getSavedActivities(user.id);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  findById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.activitiesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.activitiesService.update(id, updateActivityDto, user.id);
  }

  @Patch(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  saveActivity(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.activitiesService.saveActivity(id, user.id);
  }

  @Patch(':id/unsave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  unsaveActivity(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.activitiesService.unsaveActivity(id, user.id);
  }

  @Patch(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  joinActivity(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.activitiesService.joinActivity(id, user.id);
  }

  @Patch(':id/requests/:userId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  @ApiParam({ name: 'userId', description: 'ID del usuario solicitante', type: String })
  acceptJoinRequest(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.activitiesService.acceptJoinRequest(id, userId, user.id);
  }

  @Patch(':id/requests/:userId/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  @ApiParam({ name: 'userId', description: 'ID del usuario solicitante', type: String })
  rejectJoinRequest(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.activitiesService.rejectJoinRequest(id, userId, user.id);
  }

  @Patch(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  leaveActivity(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.activitiesService.leaveActivity(id, user.id);
  }

  @Patch(':id/participants/:participantId/remove')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: String })
  @ApiParam({ name: 'participantId', description: 'ID del participante', type: String })
  removeParticipant(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('participantId', ParseObjectIdPipe) participantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.activitiesService.removeParticipant(id, participantId, user.id);
  }

  @Patch(':id/participants/:participantId/unban')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  unbanParticipant(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('participantId', ParseObjectIdPipe) participantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.activitiesService.unbanParticipant(id, participantId, user.id);
  }

  @Patch(':id/participants/:participantId/mute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  muteParticipant(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('participantId', ParseObjectIdPipe) participantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.activitiesService.muteParticipant(id, participantId, user.id);
  }

  @Patch(':id/participants/:participantId/unmute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  unmuteParticipant(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('participantId', ParseObjectIdPipe) participantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.activitiesService.unmuteParticipant(id, participantId, user.id);
  }
}
