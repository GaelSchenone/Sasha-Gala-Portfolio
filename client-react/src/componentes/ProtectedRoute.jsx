import { Navigate } from 'react-router-dom';
import { isTokenExpired } from '../services/api';

export function ProtectedRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  const user = localStorage.getItem('adminUser');

  if (!token || !user || isTokenExpired(token)) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    return <Navigate to="/login" replace />;
  }

  return children;
}
