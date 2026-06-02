import { ChangeEvent, useEffect, useState } from 'react';
import { uploadImage } from '../services/uploadService';
import { compressImageForUpload, ImageCompressionError } from '../utils/imageCompression';

interface ImageUploadFieldProps {
  id: string;
  label: string;
  value: string;
  previewAlt: string;
  onChange: (url: string) => void;
  onError: (message: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

function getUploadErrorMessage(error: unknown) {
  if (error instanceof ImageCompressionError) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    const normalizedMessage = Array.isArray(message) ? message.join(', ') : message;

    if (response?.status === 413 || normalizedMessage?.toLowerCase().includes('too large')) {
      return 'La imagen sigue siendo demasiado grande. Prueba con otra foto.';
    }

    return normalizedMessage ?? 'No se pudo subir la imagen';
  }

  return 'No se pudo subir la imagen';
}

export default function ImageUploadField({
  id,
  label,
  value,
  previewAlt,
  onChange,
  onError,
  onUploadingChange,
}: ImageUploadFieldProps) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLocalPreview((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }
      return previewUrl;
    });

    setIsUploading(true);
    onUploadingChange?.(true);
    try {
      const imageToUpload = await compressImageForUpload(file);
      const compressedPreviewUrl = URL.createObjectURL(imageToUpload);
      setLocalPreview((currentPreview) => {
        if (currentPreview) {
          URL.revokeObjectURL(currentPreview);
        }
        return compressedPreviewUrl;
      });

      const uploaded = await uploadImage(imageToUpload);
      onChange(uploaded.url);
      setLocalPreview((currentPreview) => {
        if (currentPreview) {
          URL.revokeObjectURL(currentPreview);
        }
        return null;
      });
    } catch (caughtError) {
      onError(getUploadErrorMessage(caughtError));
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
      event.target.value = '';
    }
  }

  const previewUrl = localPreview || value;

  return (
    <div className="image-upload-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} />
      <span className="field-hint">JPG, PNG, WEBP o GIF. Se optimiza antes de subir; maximo 5 MB.</span>

      {previewUrl && (
        <div className="image-preview">
          <img src={previewUrl} alt={previewAlt} />
        </div>
      )}

      {isUploading && <p className="upload-status">Subiendo imagen...</p>}
    </div>
  );
}
