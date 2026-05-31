import { useState } from 'react';

interface AuthFormProps {
  type: 'login' | 'register';
}

export default function AuthForm({ type }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Contraseña
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {type === 'register' && (
        <label>
          Nombre
          <input type="text" placeholder="Tu nombre" />
        </label>
      )}
      <button type="submit">{type === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
    </form>
  );
}
