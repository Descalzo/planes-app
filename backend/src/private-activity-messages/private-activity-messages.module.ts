import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PrivateActivityMessagesController } from './private-activity-messages.controller';
import { PrivateActivityMessagesService } from './private-activity-messages.service';
import {
  PrivateActivityMessage,
  PrivateActivityMessageSchema,
} from './schemas/private-activity-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrivateActivityMessage.name, schema: PrivateActivityMessageSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [PrivateActivityMessagesController],
  providers: [PrivateActivityMessagesService],
})
export class PrivateActivityMessagesModule {}
