import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken, setAuthToken } from '../services/api';
import { fetchUnreadNotificationsCount, fetchUnreadMessagesCount } from '../services/internalNotificationService';

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

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
  const isChatPage = /\/activities\/[^/]+\/(private-chat|chat)/.test(location.pathname);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    if (!hasToken) {
      setUnreadNotificationsCount(0);
      return;
    }

    let isMounted = true;

    async function loadUnreadCount() {
      try {
        const count = await fetchUnreadNotificationsCount();
        if (isMounted) {
          setUnreadNotificationsCount(count);
        }
      } catch {
        if (isMounted) {
          setUnreadNotificationsCount(0);
        }
      }
    }

    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 5000);
    window.addEventListener('planes:notifications-changed', loadUnreadCount);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('planes:notifications-changed', loadUnreadCount);
    };
  }, [hasToken, location.pathname]);

  useEffect(() => {
    if (!hasToken) {
      setUnreadMessagesCount(0);
      return;
    }

    let isMounted = true;

    async function loadUnreadMessagesCount() {
      try {
        const count = await fetchUnreadMessagesCount();
        if (isMounted) {
          setUnreadMessagesCount(count);
        }
      } catch {
        if (isMounted) {
          setUnreadMessagesCount(0);
        }
      }
    }

    loadUnreadMessagesCount();
    const intervalId = window.setInterval(loadUnreadMessagesCount, 5000);
    window.addEventListener('planes:messages-changed', loadUnreadMessagesCount);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('planes:messages-changed', loadUnreadMessagesCount);
    };
  }, [hasToken, location.pathname]);

  function handleLogout() {
    setAuthToken(null);
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="topbar">
        <nav className="topbar__inner" aria-label="Navegacion principal">
          <Link className="topbar__brand" to={hasToken ? '/activities' : '/login'}>
            <img className="topbar__brand-icon" src="/logo-app.png" alt="" aria-hidden="true" />
            <span>Planes</span>
          </Link>
          {hasToken && (
            <Link className="topbar__fab" to="/activities/new" aria-label="Crear actividad">
              <span className="topbar__fab-label">Crear actividad</span>
              <span className="topbar__fab-circle"><PlusIcon /></span>
            </Link>
          )}
          <div className="topbar__links">
            {hasToken ? (
              <>
                <Link
                  className="topbar__icon-link"
                  to="/messages"
                  title="Mensajes"
                  aria-label={`Mensajes${unreadMessagesCount > 0 ? ` (${unreadMessagesCount} sin leer)` : ''}`}
                >
                  <ChatIcon />
                  {unreadMessagesCount > 0 && (
                    <span className="topbar__badge">{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</span>
                  )}
                </Link>
                <Link
                  className="topbar__icon-link"
                  to="/notifications"
                  title="Notificaciones"
                  aria-label={`Notificaciones${unreadNotificationsCount > 0 ? ` (${unreadNotificationsCount} sin leer)` : ''}`}
                >
                  <BellIcon />
                  {unreadNotificationsCount > 0 && (
                    <span className="topbar__badge">{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</span>
                  )}
                </Link>
                <Link
                  className="topbar__icon-link"
                  to="/settings"
                  title="Ajustes"
                  aria-label="Ajustes"
                >
                  <SettingsIcon />
                </Link>
                <button
                  className="topbar__logout"
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar sesion"
                  aria-label="Cerrar sesion"
                >
                  <LogoutIcon />
                </button>
              </>
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
          <NavLink className={navItemClass} to="/my-activities">
            <span className="bottom-nav__item-icon"><MyPlansIcon /></span>
            <span>Mis planes</span>
          </NavLink>
          <NavLink className={navItemClass} to="/activities">
            <span className="bottom-nav__item-icon"><ExploreIcon /></span>
            <span>Explorar</span>
          </NavLink>
          <NavLink className={navItemClass} to="/profile">
            <span className="bottom-nav__item-icon"><ProfileIcon /></span>
            <span>Perfil</span>
          </NavLink>
        </nav>
      )}
    </>
  );
}
