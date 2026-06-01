import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Activity } from '../../activities/schemas/activity.schema';
import { User } from '../../users/schemas/user.schema';

export type PrivateActivityMessageDocument = HydratedDocument<PrivateActivityMessage>;

@Schema({ timestamps: true })
export class PrivateActivityMessage {
  @Prop({ type: Types.ObjectId, ref: Activity.name, required: true })
  activity: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  receiver: Types.ObjectId;

  @Prop({ required: true })
  text: string;
}

export const PrivateActivityMessageSchema = SchemaFactory.createForClass(PrivateActivityMessage);

