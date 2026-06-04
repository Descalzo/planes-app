import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, deleteActivity, fetchActivity, updateActivity } from '../services/activityService';
import { CATEGORIES } from '../utils/activityImages';
import { PROVINCIAS } from '../utils/provincias';
import ImageUploadField from '../components/ImageUploadField';

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
  const [acceptedParticipants, setAcceptedParticipants] = useState(0);
  const [zonaPrincipal, setZonaPrincipal] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) return;
    fetchActivity(activityId)
      .then((activity: Activity) => {
        setTitle(activity.titulo ?? '');
        setDescription(activity.descripcion ?? '');
        setCategory(activity.categoria ?? '');
        setCity(activity.ciudad ?? '');
        setDate(toLocalDatetime(activity.fecha));
        setSpots(activity.plazas ? String(activity.plazas) : '');
        setAcceptedParticipants(activity.plazasOcupadas ?? activity.participantes?.length ?? 0);
        setZonaPrincipal(activity.zonaPrincipal ?? '');
        setImagenUrl(activity.imagenUrl ?? '');
      })
      .catch(() => setError('No se pudo cargar la actividad'))
      .finally(() => setIsLoading(false));
  }, [activityId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activityId) return;
    setError(null);
    if (spots && Number(spots) < acceptedParticipants) {
      setError(`No puedes poner menos de ${acceptedParticipants} plazas porque ya hay ${acceptedParticipants} participantes aceptados`);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateActivity(activityId, {
        titulo: title,
        descripcion: description || undefined,
        categoria: category || undefined,
        ciudad: city || undefined,
        zonaPrincipal: zonaPrincipal || undefined,
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

  async function handleDelete() {
    if (!activityId) return;
    const confirmed = window.confirm(
      '¿Seguro que quieres eliminar esta actividad? Se borraran tambien sus chats y notificaciones. Esta accion no se puede deshacer.',
    );
    if (!confirmed) return;

    setError(null);
    setIsDeleting(true);
    try {
      await deleteActivity(activityId);
      window.dispatchEvent(new Event('planes:messages-changed'));
      window.dispatchEvent(new Event('planes:notifications-changed'));
      navigate('/my-activities');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsDeleting(false);
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
          Provincia / zona
          <select value={zonaPrincipal} onChange={(e) => setZonaPrincipal(e.target.value)}>
            <option value="">Sin especificar</option>
            {PROVINCIAS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>
          Lugar concreto
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej. Dos Hermanas, Triana, Centro..." />
        </label>
        <label>
          Fecha
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Plazas
          <input
            min={Math.max(1, acceptedParticipants)}
            type="number"
            value={spots}
            onChange={(e) => setSpots(e.target.value)}
          />
          {acceptedParticipants > 0 && (
            <span className="field-hint">Minimo {acceptedParticipants}: participantes aceptados actuales.</span>
          )}
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
        <div className="form-actions">
          <button
            className="button button--ghost"
            type="button"
            disabled={isDeleting}
            onClick={() => navigate(`/activities/${activityId}`)}
          >
            Cancelar
          </button>
          <button className="button button--primary" type="submit" disabled={isSubmitting || isImageUploading || isDeleting}>
            {isSubmitting ? 'Guardando...' : isImageUploading ? 'Subiendo imagen...' : 'Guardar cambios'}
          </button>
        </div>
        <section className="danger-zone">
          <div>
            <h2>Eliminar actividad</h2>
            <p>Elimina la actividad, sus chats y las notificaciones asociadas.</p>
          </div>
          <button
            className="button button--danger"
            type="button"
            disabled={isSubmitting || isImageUploading || isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar actividad'}
          </button>
        </section>
      </form>
    </main>
  );
}
