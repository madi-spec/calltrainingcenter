import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute - Wrapper for routes that require authentication
 * Redirects to login if not authenticated
 * Redirects to onboarding if company setup is not complete
 */
export function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useUser();
  const { loading, profile, organization } = useAuth();
  const location = useLocation();

  // Wait for Clerk to load
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not signed in
  if (!isSignedIn) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Wait for profile to load (optional - remove if you want faster access)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Check if super_admin needs to complete initial company info
  // Redirect to /onboarding if no website set yet
  const needsOnboarding = profile?.role === 'super_admin' &&
    organization &&
    !organization.website &&
    location.pathname !== '/onboarding';

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Check if setup wizard is needed for super_admins
  // Redirect to /setup if onboarding not completed (but website is set)
  const needsSetup = profile?.role === 'super_admin' &&
    organization &&
    organization.website &&
    !organization.onboarding_completed &&
    location.pathname !== '/setup' &&
    location.pathname !== '/onboarding' &&
    !location.pathname.startsWith('/settings');

  if (needsSetup) {
    return <Navigate to="/setup" state={{ isNewUser: true }} replace />;
  }

  return children;
}

/**
 * RoleProtectedRoute - Wrapper for routes that require specific roles
 */
export function RoleProtectedRoute({ children, allowedRoles }) {
  const { isLoaded, isSignedIn } = useUser();
  const { loading, profile, role } = useAuth();
  const location = useLocation();

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Use role from context (which handles API fetch) instead of profile?.role
  const effectiveRole = role || profile?.role;

  if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-100">Access Denied</h1>
          <p className="text-gray-400 mt-2">You don't have permission to view this page.</p>
          <p className="text-gray-500 mt-1 text-sm">Role: {effectiveRole || 'none'} | Required: {allowedRoles.join(', ')}</p>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
