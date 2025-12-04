import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/Loader";

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Show loading state while checking authentication
    return <Loader size="md" text="Loading..." fullScreen />;
  }

  if (isAuthenticated) {
    // Redirect authenticated users away from login/register pages
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
