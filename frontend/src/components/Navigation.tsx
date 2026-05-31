import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken, setAuthToken } from '../services/api';

function ExploreIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function MyPlansIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function navItemClass({ isActive }: { isActive: boolean }) {
  return `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`;
}

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasToken = Boolean(getAuthToken());
  const isChatPage = /\/activities\/[^/]+\/chat/.test(location.pathname);

  function handleLogout() {
    setAuthToken(null);
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="topbar">
        <nav className="topbar__inner" aria-label="Navegacion principal">
          <Link className="topbar__brand" to={hasToken ? '/activities' : '/login'}>
            Planes
          </Link>
          <div className="topbar__links">
            {hasToken ? (
              <button
                className="topbar__logout"
                type="button"
                onClick={handleLogout}
                title="Cerrar sesion"
                aria-label="Cerrar sesion"
              >
                <LogoutIcon />
              </button>
            ) : (
              <>
                <Link className="nav-link" to="/login">Entrar</Link>
                <Link className="nav-link" to="/register">Registro</Link>
                {location.pathname !== '/login' && location.pathname !== '/register' && (
                  <span className="topbar__notice">Debes iniciar sesion</span>
                )}
              </>
            )}
          </div>
        </nav>
      </header>

      {hasToken && !isChatPage && (
        <nav className="bottom-nav" aria-label="Navegacion tabs">
          <NavLink className={navItemClass} to="/activities">
            <ExploreIcon />
            <span>Explorar</span>
          </NavLink>
          <NavLink className={navItemClass} to="/my-activities">
            <MyPlansIcon />
            <span>Mis planes</span>
          </NavLink>
          <Link className="bottom-nav__fab" to="/activities/new" aria-label="Crear actividad">
            <PlusIcon />
          </Link>
          <NavLink className={navItemClass} to="/profile">
            <ProfileIcon />
            <span>Perfil</span>
          </NavLink>
        </nav>
      )}
    </>
  );
}
