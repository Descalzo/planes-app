import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findForCurrentUser(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findForUser(user.id, limit, category, unreadOnly);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getUnreadCount(user.id).then((count) => ({ count }));
  }

  @Get('unread-messages-count')
  getUnreadMessagesCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getUnreadMessagesCount(user.id).then((count) => ({ count }));
  }

  @Get('unread-message-activity-ids')
  getUnreadMessageActivityIds(@CurrentUser() user: { id: string }) {
    return this.notificationsService
      .getUnreadMessageActivityIds(user.id)
      .then((activityIds) => ({ activityIds }));
  }

  @Get('unread-private-message-activity-ids')
  getUnreadPrivateMessageActivityIds(@CurrentUser() user: { id: string }) {
    return this.notificationsService
      .getUnreadPrivateMessageActivityIds(user.id)
      .then((activityIds) => ({ activityIds }));
  }

  @Get('unread-status-activity-ids')
  getUnreadStatusActivityIds(@CurrentUser() user: { id: string }) {
    return this.notificationsService
      .getUnreadStatusActivityIds(user.id)
      .then((activityIds) => ({ activityIds }));
  }

  @Get('unread-private-message-actor-ids/:activityId')
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  getUnreadPrivateMessageActorIds(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService
      .getUnreadPrivateMessageActorIds(activityId, user.id)
      .then((actorIds) => ({ actorIds }));
  }

  @Patch('status/mark-all-read')
  markAllStatusRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllStatusRead(user.id).then(() => ({ ok: true }));
  }

  @Patch('status/read-by-activity/:activityId')
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  markStatusReadByActivity(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.markStatusReadByActivity(activityId, user.id).then(() => ({ ok: true }));
  }

  @Patch('messages/read-by-activity/:activityId')
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  markMessagesReadByActivity(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @CurrentUser() user: { id: string },
    @Query('type') type?: 'general' | 'private',
    @Query('actorId') actorId?: string,
  ) {
    if (type === 'general') {
      return this.notificationsService
        .markGeneralMessagesReadByActivity(activityId, user.id)
        .then(() => ({ ok: true }));
    }

    if (type === 'private' && actorId) {
      return this.notificationsService
        .markPrivateMessagesReadByActivityAndActor(activityId, user.id, actorId)
        .then(() => ({ ok: true }));
    }

    return this.notificationsService.markMessagesReadByActivity(activityId, user.id).then(() => ({ ok: true }));
  }

  @Patch('messages/mark-all-read')
  markAllMessagesRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllMessagesRead(user.id).then(() => ({ ok: true }));
  }

  @Patch('messages/general/read-by-activity/:activityId')
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  markGeneralMessagesReadByActivity(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService
      .markGeneralMessagesReadByActivity(activityId, user.id)
      .then(() => ({ ok: true }));
  }

  @Patch('messages/private/read-by-activity/:activityId/actor/:actorId')
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  @ApiParam({ name: 'actorId', description: 'ID del emisor de los mensajes privados', type: String })
  markPrivateMessagesReadByActivityAndActor(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @Param('actorId', ParseObjectIdPipe) actorId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService
      .markPrivateMessagesReadByActivityAndActor(activityId, user.id, actorId)
      .then(() => ({ ok: true }));
  }

  @Patch(':id/read')
  @ApiParam({ name: 'id', description: 'ID de la notificacion', type: String })
  markAsRead(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
