import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MessageInput from '../components/MessageInput';
import MessageList from '../components/MessageList';

export default function ActivityChatPage() {
  const { activityId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const currentActivityId = activityId ?? '';

  return (
    <main className="page page--chat">
      <header>
        <h1>Chat de actividad</h1>
        <p>Conversacion para la actividad {currentActivityId}</p>
      </header>
      <MessageList activityId={currentActivityId} refreshKey={refreshKey} />
      <MessageInput activityId={currentActivityId} onSent={() => setRefreshKey((value) => value + 1)} />
    </main>
  );
}
