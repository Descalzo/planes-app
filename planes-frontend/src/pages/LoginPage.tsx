import { Link } from 'react-router-dom';
import AuthForm from '../components/AuthForm';

export default function LoginPage() {
  return (
    <main className="page page--auth">
      <section>
        <h1>Iniciar sesión</h1>
        <p>Accede a tu cuenta para ver actividades y chatear.</p>
        <AuthForm type="login" />
        <p>
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </section>
    </main>
  );
}
