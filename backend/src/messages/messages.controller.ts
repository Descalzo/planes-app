import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('messages')
@Controller('activities/:activityId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  create(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @CurrentUser() user: { id: string },
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagesService.create(activityId, user.id, createMessageDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'activityId', description: 'ID de la actividad', type: String })
  findByActivity(
    @Param('activityId', ParseObjectIdPipe) activityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.messagesService.findByActivity(activityId, user.id);
  }
}
