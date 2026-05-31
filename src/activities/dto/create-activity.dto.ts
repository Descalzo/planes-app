export class CreateActivityDto {
  titulo: string;
  descripcion?: string;
  categoria?: string;
  ciudad?: string;
  fecha?: Date;
  plazas?: number;
  creador?: string;
}
