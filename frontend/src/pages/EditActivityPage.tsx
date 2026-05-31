import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchActivity, updateActivity } from '../services/activityService';
import { CATEGORIES } from '../utils/activityImages';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
    if (response?.status === 401) return 'Debes iniciar sesion';
    if (response?.status === 403) return 'Solo el creador puede editar esta actividad';
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo guardar';
  }
  return 'No se pudo guardar';
}

function toLocalDatetime(isoString?: string) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditActivityPage() {
  const { activityId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [spots, setSpots] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) return;
    fetchActivity(activityId)
      .then((activity) => {
        setTitle(activity.titulo ?? '');
        setDescription(activity.descripcion ?? '');
        setCategory(activity.categoria ?? '');
        setCity(activity.ciudad ?? '');
        setDate(toLocalDatetime(activity.fecha));
        setSpots(activity.plazas ? String(activity.plazas) : '');
        setImagenUrl(activity.imagenUrl ?? '');
      })
      .catch(() => setError('No se pudo cargar la actividad'))
      .finally(() => setIsLoading(false));
  }, [activityId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activityId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await updateActivity(activityId, {
        titulo: title,
        descripcion: description || undefined,
        categoria: category || undefined,
        ciudad: city || undefined,
        fecha: date ? new Date(date).toISOString() : undefined,
        plazas: spots ? Number(spots) : undefined,
        imagenUrl: imagenUrl || undefined,
      });
      navigate(`/activities/${activityId}`);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <main className="page"><p>Cargando...</p></main>;
  }

  return (
    <main className="page page--form">
      <header>
        <h1>Editar actividad</h1>
      </header>
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
          Imagen (URL)
          <input
            type="url"
            value={imagenUrl}
            onChange={(e) => setImagenUrl(e.target.value)}
            placeholder="https://example.com/imagen.jpg"
          />
        </label>
        {imagenUrl && (
          <div className="image-preview">
            <img
              src={imagenUrl}
              alt="Preview"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="form-actions">
          <button
            className="button button--ghost"
            type="button"
            onClick={() => navigate(`/activities/${activityId}`)}
          >
            Cancelar
          </button>
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </main>
  );
}
