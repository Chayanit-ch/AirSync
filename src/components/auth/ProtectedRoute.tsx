import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser, loading, isLoggingOutRef } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={28} className="text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    // An intentional logout is in progress — the page that triggered it owns
    // the redirect (e.g. to Home), so stand down instead of racing it to /login.
    if (isLoggingOutRef.current) return null;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
