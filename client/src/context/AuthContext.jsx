import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth, useOrganization } from '@clerk/clerk-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (for database only, not auth)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Use empty string for same-origin API calls in production (Vercel serves both frontend and API)
const apiUrl = import.meta.env.VITE_API_URL || '';

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const AuthContext = createContext(null);

// Default permissions based on role
const ROLE_PERMISSIONS = {
  trainee: {
    'training:start': true,
    'training:view_own': true,
    'assignments:view_own': true,
    'reports:view_own': true,
    'leaderboard:view': true,
    'badges:view': true
  },
  manager: {
    'training:start': true,
    'training:view_own': true,
    'training:view_team': true,
    'assignments:view_own': true,
    'assignments:view_team': true,
    'assignments:create': true,
    'assignments:edit': true,
    'users:view_team': true,
    'reports:view_own': true,
    'reports:view_team': true,
    'reports:export': true,
    'leaderboard:view': true,
    'badges:view': true,
    'notifications:send': true
  },
  admin: {
    'training:start': true,
    'training:view_own': true,
    'training:view_team': true,
    'training:view_all': true,
    'assignments:view_all': true,
    'assignments:create': true,
    'assignments:edit': true,
    'assignments:delete': true,
    'suites:create': true,
    'suites:edit': true,
    'suites:delete': true,
    'users:view_all': true,
    'users:invite': true,
    'users:edit': true,
    'branches:view': true,
    'branches:create': true,
    'branches:edit': true,
    'reports:view_all': true,
    'reports:export': true,
    'billing:view': true,
    'settings:view': true,
    'settings:edit': true,
    'settings:ai': true,
    'leaderboard:view': true,
    'badges:view': true,
    'badges:create': true,
    'notifications:send': true
  },
  super_admin: {
    'all': true
  }
};

export function AuthProvider({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useClerkAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dev mode role override (stored in localStorage)
  const [roleOverride, setRoleOverrideState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dev_role_override') || null;
    }
    return null;
  });

  const setRoleOverride = useCallback((role) => {
    if (role) {
      localStorage.setItem('dev_role_override', role);
    } else {
      localStorage.removeItem('dev_role_override');
    }
    setRoleOverrideState(role);
  }, []);

  // Fetch user profile from Supabase database
  const fetchProfile = useCallback(async (clerkUserId) => {
    if (!supabase || !clerkUserId) return null;

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          organization:organizations(*),
          branch:branches(*)
        `)
        .eq('clerk_id', clerkUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  // Sync Clerk user to Supabase on sign in
  const syncUserToDatabase = useCallback(async () => {
    if (!user) return null;

    try {
      const token = await getToken();

      const response = await fetch(`${apiUrl}/api/auth/sync-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          fullName: user.fullName || user.firstName || 'User',
          imageUrl: user.imageUrl
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch (err) {
      console.error('Error syncing user:', err);
      return null;
    }
  }, [user, getToken]);

  // Load profile when user signs in
  useEffect(() => {
    if (!isLoaded) return;

    const loadProfile = async () => {
      setProfileLoading(true);

      if (isSignedIn && user) {
        // Always sync/fetch through API to get correct profile with role
        // This bypasses RLS issues with direct Supabase queries
        const userProfile = await syncUserToDatabase();

        if (userProfile) {
          console.log('[AUTH] Profile loaded:', {
            email: userProfile.email,
            role: userProfile.role
          });
        }

        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setProfileLoading(false);
    };

    loadProfile();
  }, [isLoaded, isSignedIn, user, syncUserToDatabase]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission) => {
    if (!profile) return false;
    const role = profile.role;
    if (role === 'super_admin') return true;
    const perms = ROLE_PERMISSIONS[role] || {};
    return perms[permission] === true;
  }, [profile]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissions) => {
    return permissions.some((p) => hasPermission(p));
  }, [hasPermission]);

  // Check if user is at least a certain role
  const isAtLeastRole = useCallback((requiredRole) => {
    if (!profile) return false;
    const hierarchy = ['trainee', 'manager', 'admin', 'super_admin'];
    const userIndex = hierarchy.indexOf(profile.role);
    const requiredIndex = hierarchy.indexOf(requiredRole);
    return userIndex >= requiredIndex;
  }, [profile]);

  // Make authenticated API request
  const authFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    // Prepend API URL if the url starts with /api
    const fullUrl = url.startsWith('/api') ? `${apiUrl}${url}` : url;
    const response = await fetch(fullUrl, { ...options, headers });
    return response;
  }, [getToken]);

  // Refresh profile from database (via API to avoid RLS issues)
  const refreshProfile = useCallback(async () => {
    if (user) {
      // Use the sync-user API to get fresh profile data
      const userProfile = await syncUserToDatabase();
      if (userProfile) {
        setProfile(userProfile);
      }
      return userProfile;
    }
    return null;
  }, [user, syncUserToDatabase]);

  // Effective role (override takes precedence for dev/testing)
  const effectiveRole = roleOverride || profile?.role;

  const value = {
    // Clerk state
    user,
    isLoaded,
    isSignedIn,

    // Profile state
    profile,
    loading: !isLoaded || profileLoading || (isSignedIn && !profile),
    error,
    isAuthenticated: isSignedIn && !!profile,

    // Profile methods
    refreshProfile,

    // Permission helpers
    hasPermission,
    hasAnyPermission,
    isAtLeastRole,

    // API helpers
    authFetch,
    getToken,

    // Convenience getters
    organization: profile?.organization,
    branch: profile?.branch,
    role: effectiveRole,
    actualRole: profile?.role, // The real role from database

    // Dev role override
    roleOverride,
    setRoleOverride,

    // Supabase client for direct queries
    supabase
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
