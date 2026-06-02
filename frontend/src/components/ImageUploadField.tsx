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

  const previewUrl = localPreview;

  return (
    <div className="image-upload-field">
      <span className="image-upload-field__label">{label}</span>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <label
        htmlFor={id}
        className={`image-upload-trigger${isUploading ? ' image-upload-trigger--uploading' : ''}`}
      >
        {isUploading ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        ) : value ? (
          <img className="image-upload-trigger__thumb" src={value} alt="" aria-hidden="true" />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
        <span className="image-upload-trigger__text">
          {isUploading ? 'Subiendo...' : value ? 'Cambiar foto' : 'Seleccionar foto'}
        </span>
        {!isUploading && (
          <span className="image-upload-trigger__hint">JPG, PNG, WEBP · max 5 MB</span>
        )}
      </label>

      {previewUrl && (
        <div className="image-preview">
          <img src={previewUrl} alt={previewAlt} />
        </div>
      )}
    </div>
  );
}
