import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createActivity } from '../services/activityService';
import { CATEGORIES } from '../utils/activityImages';
import ImageUploadField from './ImageUploadField';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    if (response?.status === 401) {
      return 'Debes iniciar sesion para crear actividades';
    }
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo crear la actividad';
  }
  return 'No se pudo crear la actividad';
}

export default function ActivityForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [spots, setSpots] = useState('10');
  const [imagenUrl, setImagenUrl] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const activity = await createActivity({
        titulo: title,
        descripcion: description || undefined,
        categoria: category || undefined,
        ciudad: city || undefined,
        fecha: date ? new Date(date).toISOString() : undefined,
        plazas: spots ? Number(spots) : undefined,
        imagenUrl: imagenUrl || undefined,
      });
      navigate(`/activities/${activity._id}`);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="activity-form" onSubmit={handleSubmit}>
      <label>
        Titulo
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Descripcion
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        Categoria
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Sin categoría</option>
          {CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
        </select>
      </label>
      <label>
        Ciudad
        <input value={city} onChange={(e) => setCity(e.target.value)} />
      </label>
      <label>
        Fecha
        <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        Plazas
        <input min="1" type="number" value={spots} onChange={(e) => setSpots(e.target.value)} />
      </label>
      <label>
        Imagen (URL opcional)
        <input
          type="url"
          value={imagenUrl}
          onChange={(e) => setImagenUrl(e.target.value)}
          placeholder="https://example.com/imagen.jpg"
        />
      </label>
      <ImageUploadField
        id="activity-image-upload"
        label="Subir imagen"
        value={imagenUrl}
        previewAlt="Vista previa de la actividad"
        onChange={setImagenUrl}
        onError={setError}
        onUploadingChange={setIsImageUploading}
      />
      {error && <p role="alert">{error}</p>}
      <button className="button button--primary" type="submit" disabled={isSubmitting || isImageUploading}>
        {isSubmitting ? 'Creando...' : isImageUploading ? 'Subiendo imagen...' : 'Crear actividad'}
      </button>
    </form>
  );
}
