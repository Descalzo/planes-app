const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.75;
const MAX_UPLOAD_IMAGE_BYTES = 5 * 1024 * 1024;

export class ImageCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageCompressionError';
  }
}

function getCanvasSize(width: number, height: number) {
  const largestSide = Math.max(width, height);

  if (largestSide <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }

  const ratio = MAX_IMAGE_DIMENSION / largestSide;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function getOutputType() {
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
}

function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ImageCompressionError('No se pudo preparar la imagen para subirla'));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function getCompressedFilename(fileName: string, mimeType: string) {
  const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'imagen';
  return `${baseName}.${extension}`;
}

export function isImageOverUploadLimit(file: File) {
  return file.size > MAX_UPLOAD_IMAGE_BYTES;
}

export async function compressImageForUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new ImageCompressionError('Selecciona un archivo de imagen valido');
  }

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new ImageCompressionError('No se pudo leer la imagen seleccionada'));
      image.src = imageUrl;
    });

    const { width, height } = getCanvasSize(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new ImageCompressionError('No se pudo preparar la imagen para subirla');
    }

    context.drawImage(image, 0, 0, width, height);

    const outputType = getOutputType();
    const blob = await blobFromCanvas(canvas, outputType, IMAGE_QUALITY);
    const compressedFile = new File([blob], getCompressedFilename(file.name, outputType), {
      type: outputType,
      lastModified: Date.now(),
    });

    if (isImageOverUploadLimit(compressedFile)) {
      throw new ImageCompressionError('La imagen sigue superando 5 MB tras comprimirla. Prueba con otra foto.');
    }

    return compressedFile;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
