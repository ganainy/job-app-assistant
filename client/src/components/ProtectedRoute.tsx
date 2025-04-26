// client/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement; // Expects a single JSX element as children
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation(); // Get current location

  // Show loading state while checking auth status on initial load
  if (isLoading) {
    // You can replace this with a more sophisticated spinner component
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // If not authenticated and not loading, redirect to login
  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to in the state. This allows us to send them back after login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the child component (e.g., DashboardPage)
  return children;
};

export default ProtectedRoute;