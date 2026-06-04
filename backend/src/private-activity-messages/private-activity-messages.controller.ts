import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreatePrivateActivityMessageDto } from './dto/create-private-activity-message.dto';
import { PrivateActivityMessagesService } from './private-activity-messages.service';

@ApiTags('private-activity-messages')
@Controller('activities/:activityId/private-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class PrivateActivityMessagesController {
  constructor(private readonly privateMessagesService: PrivateActivityMessagesService) {}

  @Get()
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  listConversations(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.privateMessagesService.listConversations(activityId, user.id);
  }

  @Get(':userId')
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  @ApiParam({ name: 'userId', description: 'ID del usuario interesado', type: String })
  findConversation(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.privateMessagesService.findConversation(activityId, userId, user.id);
  }

  @Post()
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  create(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @CurrentUser() user: { id: string },
    @Body() createMessageDto: CreatePrivateActivityMessageDto,
  ) {
    return this.privateMessagesService.create(activityId, user.id, createMessageDto);
  }

  @Patch(':userId/active')
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  @ApiParam({ name: 'userId', description: 'ID del usuario interesado', type: String })
  markActive(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.privateMessagesService.markConversationActive(activityId, userId, user.id);
  }

  @Patch(':userId/inactive')
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  @ApiParam({ name: 'userId', description: 'ID del usuario interesado', type: String })
  markInactive(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.privateMessagesService.markConversationInactive(activityId, userId, user.id);
  }
}
