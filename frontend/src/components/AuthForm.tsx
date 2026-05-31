import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticate, registerAndAuthenticate } from '../services/authService';

interface AuthFormProps {
  type: 'login' | 'register';
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'Error de autenticacion';
  }

  return 'Error de autenticacion';
}

export default function AuthForm({ type }: AuthFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (type === 'login') {
        await authenticate({ email, 'contraseña': password });
      } else {
        await registerAndAuthenticate({ email, nombre, 'contraseña': password });
      }

      navigate('/activities');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label>
        Contrasena
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {type === 'register' && (
        <label>
          Nombre
          <input type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} required />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      <button className="button button--primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : type === 'login' ? 'Ingresar' : 'Crear cuenta'}
      </button>
    </form>
  );
}
