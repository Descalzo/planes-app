import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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

  @Prop({ default: [] })
  participantes: string[];

  @Prop()
  creador: string;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
