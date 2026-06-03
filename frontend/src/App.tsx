import { useLocation } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  const location = useLocation();
  const isChatPage = /\/activities\/[^/]+\/(private-chat|chat)/.test(location.pathname);

  return (
    <div className={`app-shell${isChatPage ? ' app-shell--chat' : ''}`}>
      <Navigation />
      <div className="app-content">
        <AppRoutes />
      </div>
    </div>
  );
}

export default App;
