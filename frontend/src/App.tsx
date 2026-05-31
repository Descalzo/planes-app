import { AppRoutes } from './routes/AppRoutes';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <Navigation />
      <AppRoutes />
    </div>
  );
}

export default App;
