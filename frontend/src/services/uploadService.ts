import { api } from './api';

export interface UploadImageResponse {
  url: string;
  publicId?: string;
}

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<UploadImageResponse>('/uploads/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
