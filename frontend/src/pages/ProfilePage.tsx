import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CurrentUser, fetchCurrentUser, updateCurrentUser } from '../services/authService';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo guardar el perfil';
  }

  return 'No se pudo guardar el perfil';
}

function formatDate(value?: string) {
  if (!value) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ProfilePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [nombre, setNombre] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [bio, setBio] = useState('');
  const [intereses, setIntereses] = useState('');
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState('');
  const [edad, setEdad] = useState('');
  const [genero, setGenero] = useState('');
  const [instagram, setInstagram] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const profile = await fetchCurrentUser();

        if (!isMounted) {
          return;
        }

        setUser(profile);
        setNombre(profile.nombre ?? '');
        setCiudad(profile.ciudad ?? '');
        setBio(profile.bio ?? '');
        setIntereses((profile.intereses ?? []).join(', '));
        setFotoPerfilUrl(profile.fotoPerfilUrl ?? '');
        setEdad(profile.edad ? String(profile.edad) : '');
        setGenero(profile.genero ?? '');
        setInstagram(profile.instagram ?? '');
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const parsedIntereses = useMemo(
    () =>
      intereses
        .split(',')
        .map((interest) => interest.trim())
        .filter(Boolean),
    [intereses],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const updatedUser = await updateCurrentUser({
        nombre: nombre.trim(),
        ciudad: ciudad.trim(),
        bio: bio.trim(),
        intereses: parsedIntereses,
        fotoPerfilUrl: fotoPerfilUrl.trim(),
        edad: edad ? Number(edad) : null,
        genero: genero.trim(),
        instagram: instagram.trim(),
      });

      setUser(updatedUser);
      setSuccess('Perfil guardado');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="page">
        <p>Cargando perfil...</p>
      </main>
    );
  }

  return (
    <main className="page page--profile">
      <header>
        <div>
          <h1>Mi perfil</h1>
          <p>Actualiza tu informacion visible para otros usuarios.</p>
        </div>
      </header>

      <section className="profile-layout">
        <aside className="profile-summary">
          {fotoPerfilUrl ? (
            <img className="profile-avatar" src={fotoPerfilUrl} alt={`Foto de perfil de ${nombre || 'usuario'}`} />
          ) : (
            <div className="profile-avatar profile-avatar--empty" aria-hidden="true">
              {getInitials(nombre || user?.email || 'U') || 'U'}
            </div>
          )}

          <div>
            <h2>{nombre || 'Sin nombre'}</h2>
            <p>{user?.email}</p>
          </div>

          <dl className="profile-facts">
            <div>
              <dt>Ciudad</dt>
              <dd>{ciudad || 'Sin ciudad'}</dd>
            </div>
            <div>
              <dt>Alta</dt>
              <dd>{formatDate(user?.createdAt)}</dd>
            </div>
            <div>
              <dt>Intereses</dt>
              <dd>{parsedIntereses.length ? parsedIntereses.join(', ') : 'Sin intereses'}</dd>
            </div>
          </dl>
        </aside>

        <form className="profile-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input value={user?.email ?? ''} disabled />
          </label>
          <div className="form-grid">
            <label>
              Nombre
              <input value={nombre} onChange={(event) => setNombre(event.target.value)} required />
            </label>
            <label>
              Ciudad
              <input value={ciudad} onChange={(event) => setCiudad(event.target.value)} />
            </label>
          </div>
          <label>
            Bio
            <textarea maxLength={300} value={bio} onChange={(event) => setBio(event.target.value)} />
            <span className="field-hint">{bio.length}/300</span>
          </label>
          <label>
            Intereses
            <input
              value={intereses}
              onChange={(event) => setIntereses(event.target.value)}
              placeholder="senderismo, cine, fotografia"
            />
          </label>
          <label>
            URL de foto
            <input
              type="url"
              value={fotoPerfilUrl}
              onChange={(event) => setFotoPerfilUrl(event.target.value)}
              placeholder="https://example.com/foto.jpg"
            />
          </label>
          <div className="form-grid">
            <label>
              Edad
              <input min="13" max="120" type="number" value={edad} onChange={(event) => setEdad(event.target.value)} />
            </label>
            <label>
              Genero
              <input value={genero} onChange={(event) => setGenero(event.target.value)} />
            </label>
          </div>
          <label>
            Instagram
            <input value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="usuario" />
          </label>

          {error && <p role="alert">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </section>
    </main>
  );
}
