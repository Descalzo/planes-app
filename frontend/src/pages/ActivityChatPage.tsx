import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MessageInput from '../components/MessageInput';
import MessageList from '../components/MessageList';
import { CurrentUser, fetchCurrentUser } from '../services/authService';

export default function ActivityChatPage() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const currentActivityId = activityId ?? '';
  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;

  useEffect(() => {
    let isMounted = true;
    fetchCurrentUser()
      .then((user) => {
        if (isMounted) {
          setCurrentUser(user);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="page page--chat">
      <header>
        <button 
          className="button button--ghost button--small" 
          onClick={() => navigate(`/activities/${activityId}`)}
        >
          ← Volver a la actividad
        </button>
        <h1>Chat de actividad</h1>
      </header>
      <MessageList activityId={currentActivityId} currentUserId={currentUserId} refreshKey={refreshKey} />
      <MessageInput activityId={currentActivityId} onSent={() => setRefreshKey((value) => value + 1)} />
    </main>
  );
}
