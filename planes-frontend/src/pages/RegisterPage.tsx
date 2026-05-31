import { Link } from 'react-router-dom';
import AuthForm from '../components/AuthForm';

export default function RegisterPage() {
  return (
    <main className="page page--auth">
      <section>
        <h1>Registro</h1>
        <p>Crea tu cuenta para comenzar a participar en actividades.</p>
        <AuthForm type="register" />
        <p>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </section>
    </main>
  );
}
