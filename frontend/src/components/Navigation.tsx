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
    <nav>
      <Link to="/login">Login</Link>
      <Link to="/register">Registro</Link>
      {hasToken && (
        <>
          <Link to="/activities">Actividades</Link>
          <Link to="/activities/new">Crear actividad</Link>
          <button type="button" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </>
      )}
      {!hasToken && location.pathname !== '/login' && location.pathname !== '/register' && (
        <span>Debes iniciar sesion</span>
      )}
    </nav>
  );
}
