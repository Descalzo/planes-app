import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ActivitiesPage from '../pages/ActivitiesPage';
import CreateActivityPage from '../pages/CreateActivityPage';
import ActivityDetailPage from '../pages/ActivityDetailPage';
import ActivityChatPage from '../pages/ActivityChatPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/activities" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/activities" element={<ActivitiesPage />} />
      <Route path="/activities/new" element={<CreateActivityPage />} />
      <Route path="/activities/:activityId" element={<ActivityDetailPage />} />
      <Route path="/activities/:activityId/chat" element={<ActivityChatPage />} />
    </Routes>
  );
}
