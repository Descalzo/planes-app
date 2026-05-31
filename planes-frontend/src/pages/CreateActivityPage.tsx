import ActivityForm from '../components/ActivityForm';

export default function CreateActivityPage() {
  return (
    <main className="page page--form">
      <h1>Crear actividad</h1>
      <p>Define los detalles de la actividad y publícala para que otros se unan.</p>
      <ActivityForm />
    </main>
  );
}
