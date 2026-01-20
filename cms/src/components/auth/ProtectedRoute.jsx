import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

function ProtectedRoute({ children }) {
  const { isAuthenticated, checkSession, logout } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Check session validity on mount and periodically
    const isValid = checkSession();
    
    if (!isValid && isAuthenticated) {
      logout();
    }

    // Set up interval to check session every minute
    const interval = setInterval(() => {
      const stillValid = checkSession();
      if (!stillValid) {
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkSession, logout, isAuthenticated]);

  // Check if session is valid
  const isSessionValid = checkSession();

  if (!isAuthenticated || !isSessionValid) {
    // Redirect to login while preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
