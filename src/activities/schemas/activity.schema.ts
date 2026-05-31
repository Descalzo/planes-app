import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ActivityDocument = HydratedDocument<Activity>;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true })
  titulo: string;

  @Prop()
  descripcion: string;

  @Prop()
  categoria: string;

  @Prop()
  ciudad: string;

  @Prop()
  fecha: Date;

  @Prop({ default: 10 })
  plazas: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: User.name }], default: [] })
  participantes: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  creador: Types.ObjectId;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
