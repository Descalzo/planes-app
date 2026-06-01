import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export type NotificationType =
  | 'activity_request_created'
  | 'activity_request_accepted'
  | 'activity_request_rejected'
  | 'activity_participant_left'
  | 'activity_participant_removed'
  | 'activity_participant_unbanned'
  | 'private_activity_message'
  | 'general_chat_message';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  actor?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Activity' })
  activity?: Types.ObjectId;

  @Prop({ required: true })
  type: NotificationType;

  @Prop({ required: true })
  message: string;

  @Prop()
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
