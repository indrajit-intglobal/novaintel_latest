import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/Loader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Wait for auth check to complete before making decisions
  // Show loading state while checking authentication
  if (isLoading) {
    return <Loader size="md" text="Loading..." fullScreen />;
  }

  // Only redirect if loading is complete AND definitely not authenticated
  // Check localStorage directly as a fallback (in case state hasn't updated)
  const token = localStorage.getItem('access_token');
  const hasStoredUser = !!localStorage.getItem('user_data');
  const actuallyAuthenticated = isAuthenticated || (!!token && hasStoredUser);

  if (!isLoading && !actuallyAuthenticated) {
    // Redirect to login with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
