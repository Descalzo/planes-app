import { useParams } from 'react-router-dom';
import MessageInput from '../components/MessageInput';
import MessageList from '../components/MessageList';

export default function ActivityChatPage() {
  const { activityId } = useParams();

  return (
    <main className="page page--chat">
      <header>
        <h1>Chat de actividad</h1>
        <p>Conversación para la actividad {activityId}</p>
      </header>
      <MessageList activityId={activityId ?? ''} />
      <MessageInput activityId={activityId ?? ''} />
    </main>
  );
}
