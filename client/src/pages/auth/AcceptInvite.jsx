import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSignUp, useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, User, UserPlus, AlertCircle, Check, Building2, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp, setActive } = useSignUp();
  const { getToken, isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();

  const token = searchParams.get('token');

  const [inviteData, setInviteData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const passwordRequirements = [
    { text: 'At least 8 characters', test: (p) => p.length >= 8 },
    { text: 'Contains a number', test: (p) => /\d/.test(p) },
    { text: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { text: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) }
  ];

  // Sign out current user if someone is already signed in
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      // Reload the page to reset all Clerk state
      window.location.reload();
    } catch (err) {
      console.error('Error signing out:', err);
      setSigningOut(false);
    }
  };

  // Verify the invitation token
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/invitations/validate/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Invalid or expired invitation');
        }

        // Map the response to match expected format
        setInviteData({
          email: data.invitation?.email,
          organization_name: data.invitation?.organizationName,
          role: data.invitation?.role
        });
        setFormData((prev) => ({ ...prev, fullName: '' }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password
    if (!passwordRequirements.every((req) => req.test(formData.password))) {
      setError('Password does not meet requirements');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create Clerk account
      let signUpAttempt = await signUp.create({
        emailAddress: inviteData.email,
        password: formData.password,
        firstName: formData.fullName.split(' ')[0],
        lastName: formData.fullName.split(' ').slice(1).join(' ') || '',
        unsafeMetadata: {
          invitationToken: token
        }
      });

      // Step 2: Handle email verification if required by Clerk
      // For invited users, attempt to prepare email verification and complete it
      if (signUpAttempt.status === 'missing_requirements') {
        try {
          // Try to prepare email verification
          await signUpAttempt.prepareEmailAddressVerification({ strategy: 'email_code' });
        } catch (prepError) {
          // If preparation fails, try updating the email to trigger completion
          console.log('[AcceptInvite] Email verification prep failed, trying update:', prepError.message);
          await signUpAttempt.update({
            emailAddress: inviteData.email
          });
        }
      }

      // Step 3: Wait for sign-up to complete and set session active
      // Poll for completion if sign-up isn't done yet
      let attempts = 0;
      while (!signUpAttempt.createdSessionId && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        // Reload the sign-up attempt to check for updates
        if (signUpAttempt.status === 'complete') break;
        attempts++;
      }

      if (signUpAttempt.createdSessionId) {
        await setActive({ session: signUpAttempt.createdSessionId });
        // Wait for session to fully propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 4: Get the authenticated user's clerk ID from the session
      // CRITICAL: Use the Clerk session token as source of truth, not signUpAttempt
      const clerkToken = await getToken();
      const clerkUserId = signUpAttempt.createdUserId;

      if (!clerkUserId) {
        throw new Error('Account creation incomplete. Please try signing in with your email and password.');
      }

      // Step 5: Accept the invitation in our backend
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clerkToken && { 'Authorization': `Bearer ${clerkToken}` })
        },
        body: JSON.stringify({
          token: token,
          clerk_user_id: clerkUserId,
          full_name: formData.fullName
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept invitation');
      }

      // Success! Navigate to dashboard
      // Use window.location instead of navigate to ensure a full page load
      window.location.href = '/';
    } catch (err) {
      console.error('Invitation acceptance error:', err);
      setError(err.message || err.errors?.[0]?.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Invalid Invitation</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500/10 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-100">Join Your Team</h1>
            <p className="text-gray-400 mt-2">
              You've been invited to join{' '}
              <span className="text-primary-400 font-medium">{inviteData?.organization_name}</span>
            </p>
          </div>

          {/* Invite Info */}
          <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">You're joining as</p>
                <p className="text-gray-200 font-medium capitalize">{inviteData?.role || 'Team Member'}</p>
              </div>
            </div>
          </div>

          {/* Already signed in warning */}
          {isSignedIn && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg"
            >
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-amber-400 text-sm">
                  You're currently signed in as <strong>{clerkUser?.primaryEmailAddress?.emailAddress}</strong>. You must sign out before creating a new account.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {signingOut ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    Sign Out & Continue
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="John Smith"
                  required
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="py-3 px-4 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400">
                {inviteData?.email}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password Requirements */}
              <div className="mt-3 space-y-2">
                {passwordRequirements.map((req, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-sm ${
                      req.test(formData.password) ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    <Check className={`w-4 h-4 ${req.test(formData.password) ? 'opacity-100' : 'opacity-30'}`} />
                    {req.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Confirm your password"
                  required
                />
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-2 text-sm text-red-400">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || isSignedIn}
              className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Accept Invitation
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
