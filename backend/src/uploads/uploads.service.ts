import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface UploadedImageFile {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class UploadsService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async uploadImage(file?: UploadedImageFile) {
    if (!file) {
      throw new BadRequestException('Debes seleccionar una imagen');
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato no valido. Usa JPG, PNG, WEBP o GIF');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('La imagen no puede superar 5 MB');
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new InternalServerErrorException('Cloudinary no esta configurado');
    }

    const result = await this.uploadBuffer(file.buffer);

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  private uploadBuffer(buffer: Buffer) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'planes',
          resource_type: 'image',
          transformation: [
            { width: 1400, height: 1400, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('No se pudo subir la imagen'));
            return;
          }

          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }
}
