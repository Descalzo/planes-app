import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createActivity } from '../services/activityService';

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
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label>
        Descripcion
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        Categoria
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Sin categoría</option>
          <option>Deporte y aire libre</option>
          <option>Ocio y social</option>
          <option>Conocer gente</option>
          <option>Gastronomía</option>
          <option>Cultura</option>
          <option>Aficiones</option>
          <option>Viajes y escapadas</option>
          <option>Formación</option>
          <option>Familia</option>
          <option>Voluntariado</option>
          <option>Otros</option>
        </select>
      </label>
      <label>
        Ciudad
        <input value={city} onChange={(event) => setCity(event.target.value)} />
      </label>
      <label>
        Fecha
        <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <label>
        Plazas
        <input min="1" type="number" value={spots} onChange={(event) => setSpots(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button className="button button--primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creando...' : 'Crear actividad'}
      </button>
    </form>
  );
}
