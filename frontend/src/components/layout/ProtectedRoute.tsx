import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/ui/Loading';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  requiredPermission?: string;
  children?: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, requiredPermission, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role) && user.role !== 'Administrator') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
