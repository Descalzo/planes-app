import { ChangeEvent, useEffect, useState } from 'react';
import { uploadImage } from '../services/uploadService';

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
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo subir la imagen';
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
      const uploaded = await uploadImage(file);
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
      <span className="field-hint">JPG, PNG, WEBP o GIF. Maximo 5 MB.</span>

      {previewUrl && (
        <div className="image-preview">
          <img src={previewUrl} alt={previewAlt} />
        </div>
      )}

      {isUploading && <p className="upload-status">Subiendo imagen...</p>}
    </div>
  );
}
