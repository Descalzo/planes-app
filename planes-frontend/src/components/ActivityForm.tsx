import { useState } from 'react';

export default function ActivityForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  return (
    <form className="activity-form" onSubmit={(event) => event.preventDefault()}>
      <label>
        Título
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Descripción
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        Categoría
        <input value={category} onChange={(event) => setCategory(event.target.value)} />
      </label>
      <label>
        Ciudad
        <input value={city} onChange={(event) => setCity(event.target.value)} />
      </label>
      <button type="submit">Crear actividad</button>
    </form>
  );
}
