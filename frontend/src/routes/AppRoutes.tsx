import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ActivitiesPage from '../pages/ActivitiesPage';
import MyActivitiesPage from '../pages/MyActivitiesPage';
import CreateActivityPage from '../pages/CreateActivityPage';
import ActivityDetailPage from '../pages/ActivityDetailPage';
import ActivityChatPage from '../pages/ActivityChatPage';
import ProfilePage from '../pages/ProfilePage';
import { getAuthToken } from '../services/api';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  if (!getAuthToken()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={getAuthToken() ? '/activities' : '/login'} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/activities"
        element={
          <ProtectedRoute>
            <ActivitiesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-activities"
        element={
          <ProtectedRoute>
            <MyActivitiesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activities/new"
        element={
          <ProtectedRoute>
            <CreateActivityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activities/:activityId"
        element={
          <ProtectedRoute>
            <ActivityDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activities/:activityId/chat"
        element={
          <ProtectedRoute>
            <ActivityChatPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
