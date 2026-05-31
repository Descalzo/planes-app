interface MessageListProps {
  activityId: string;
}

export default function MessageList({ activityId }: MessageListProps) {
  return (
    <section className="message-list">
      <h2>Mensajes</h2>
      <p>Mensajes para la actividad {activityId}.</p>
      <div className="message-card">
        <strong>Usuario ejemplo</strong>
        <p>Estoy interesado en unirme.</p>
      </div>
    </section>
  );
}
