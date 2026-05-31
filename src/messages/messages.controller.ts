import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('messages')
@Controller('activities/:activityId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  create(
    @Param('activityId') activityId: string,
    @CurrentUser() user: { id: string },
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagesService.create(activityId, user.id, createMessageDto);
  }

  @Get()
  findByActivity(@Param('activityId') activityId: string) {
    return this.messagesService.findByActivity(activityId);
  }
}
