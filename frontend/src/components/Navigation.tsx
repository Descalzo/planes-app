import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken, setAuthToken } from '../services/api';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasToken = Boolean(getAuthToken());

  function handleLogout() {
    setAuthToken(null);
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar">
      <nav className="topbar__inner" aria-label="Navegacion principal">
        <Link className="topbar__brand" to={hasToken ? '/activities' : '/login'}>
          Planes
        </Link>
        <div className="topbar__links">
          {hasToken ? (
            <>
              <Link className="nav-link" to="/activities">Actividades</Link>
              <Link className="nav-link" to="/my-activities">Mis actividades</Link>
              <Link className="nav-link" to="/profile">Mi perfil</Link>
              <Link className="button button--primary button--small" to="/activities/new">Crear actividad</Link>
              <button className="button button--ghost button--small" type="button" onClick={handleLogout}>
                Cerrar sesion
              </button>
            </>
          ) : (
            <>
              <Link className="nav-link" to="/login">Login</Link>
              <Link className="nav-link" to="/register">Registro</Link>
            </>
          )}
          {!hasToken && location.pathname !== '/login' && location.pathname !== '/register' && (
            <span className="topbar__notice">Debes iniciar sesion</span>
          )}
        </div>
      </nav>
    </header>
  );
}
