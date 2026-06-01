import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { fetchUserPublicProfile, CurrentUser } from '../services/authService';

function getInitials(name?: string) {
  if (!name) return 'U';
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'U';
}

export default function UserPublicProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isPhotoOpen = searchParams.get('photo') === '1';
  const rawActivityId = searchParams.get('activityId');
  const activityId = rawActivityId && rawActivityId !== 'undefined' && rawActivityId !== 'null' ? rawActivityId : undefined;

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setError('Usuario no válido');
      return;
    }

    async function loadProfile() {
      try {
        const profileData = await fetchUserPublicProfile(userId as string, activityId);
        setProfile(profileData);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'No se pudo cargar el perfil';
        setError(errorMsg);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [userId, activityId]);

  function openPhoto() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('photo', '1');
    setSearchParams(nextParams);
  }

  return (
    <main className="page page--profile">
      <header>
        <button 
          className="button button--ghost button--small" 
          onClick={() => navigate(-1)}
        >
          ← Volver
        </button>
        <h1>Perfil del usuario</h1>
      </header>
      <section>
        {isLoading && <p>Cargando perfil...</p>}
        {error && <p role="alert">{error}</p>}
        {profile && (
          <div className="profile-card">
            {profile.fotoPerfilUrl ? (
              <button className="profile-card__photo-button" type="button" onClick={openPhoto}>
                <img src={profile.fotoPerfilUrl} alt={profile.nombre} className="profile-card__photo" />
              </button>
            ) : (
              <div className="profile-card__avatar" aria-hidden="true">
                <span>{getInitials(profile.nombre)}</span>
              </div>
            )}
            <div className="profile-card__info">
              <h2>{profile.nombre}</h2>
              {profile.ciudad && <p><span>Ciudad:</span> {profile.ciudad}</p>}
              {profile.edad && <p><span>Edad:</span> {profile.edad}</p>}
              {profile.genero && <p><span>Género:</span> {profile.genero}</p>}
              {profile.bio && (
                <div className="profile-card__section">
                  <h3>Acerca de</h3>
                  <p>{profile.bio}</p>
                </div>
              )}
              {profile.intereses && profile.intereses.length > 0 && (
                <div className="profile-card__section">
                  <h3>Intereses</h3>
                  <ul className="interests-list">
                    {profile.intereses.map((interest, index) => (
                      <li key={index}>{interest}</li>
                    ))}
                  </ul>
                </div>
              )}
              {profile.instagram && (
                <div className="profile-card__section">
                  <p><span>Instagram:</span> <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer">@{profile.instagram}</a></p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {profile?.fotoPerfilUrl && isPhotoOpen && (
        <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={`Foto de ${profile.nombre}`}>
          <header className="photo-viewer__bar">
            <button className="button button--ghost button--small" type="button" onClick={() => navigate(-1)}>
              Volver
            </button>
          </header>
          <img className="photo-viewer__image" src={profile.fotoPerfilUrl} alt={profile.nombre} />
        </div>
      )}
    </main>
  );
}
