import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/ui/Loading';

interface ProtectedRouteProps {
  requiredPermission?: string;
  children?: React.ReactNode;
}

export default function ProtectedRoute({ requiredPermission, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
