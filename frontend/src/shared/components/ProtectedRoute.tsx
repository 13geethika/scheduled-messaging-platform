import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { PATHS } from '../../routes/paths';

export const ProtectedRoute = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  return isAuthenticated ? <Outlet /> : <Navigate to={PATHS.LOGIN} replace />;
};
