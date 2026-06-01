import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { Message, MessageSchema } from './schemas/message.schema';
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
