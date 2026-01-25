import { Routes, Route, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { SignIn, SignUp, useAuth as useClerkAuth } from '@clerk/clerk-react';
import Layout from './components/Layout';
import { ProtectedRoute, RoleProtectedRoute } from './components/ProtectedRoute';

// Existing pages
import Home from './pages/Home';
import PreCall from './pages/PreCall';
import Training from './pages/Training';
import Results from './pages/Results';
import Admin from './pages/Admin';
import Builder from './pages/Builder';

// Dashboard pages (lazy loaded)
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Courses = lazy(() => import('./pages/courses/Courses'));
const CourseDetail = lazy(() => import('./pages/courses/CourseDetail'));
const ModuleDetail = lazy(() => import('./pages/modules/ModuleDetail'));
const Assignments = lazy(() => import('./pages/assignments/Assignments'));
const MyAssignments = lazy(() => import('./pages/assignments/MyAssignments'));
const SessionHistory = lazy(() => import('./pages/training/SessionHistory'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Leaderboard = lazy(() => import('./pages/leaderboard/Leaderboard'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const BillingSettings = lazy(() => import('./pages/settings/Billing'));
const AISettings = lazy(() => import('./pages/settings/AISettings'));
const TeamSettings = lazy(() => import('./pages/settings/Team'));
const BranchSettings = lazy(() => import('./pages/settings/Branches'));
const ProfileSettings = lazy(() => import('./pages/settings/Profile'));
const SetupWizard = lazy(() => import('./pages/setup/SetupWizard'));

// Loading component for lazy loaded pages
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>
  );
}

// Auth page wrapper with dark styling
function AuthPageWrapper({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      {children}
    </div>
  );
}

function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Clerk Auth Routes */}
        <Route
          path="/auth/login/*"
          element={
            <AuthPageWrapper>
              <SignIn
                routing="path"
                path="/auth/login"
                signUpUrl="/auth/signup"
                afterSignInUrl="/dashboard"
                appearance={{
                  baseTheme: undefined,
                  variables: { colorPrimary: '#2563eb' }
                }}
              />
            </AuthPageWrapper>
          }
        />
        <Route
          path="/auth/signup/*"
          element={
            <AuthPageWrapper>
              <SignUp
                routing="path"
                path="/auth/signup"
                signInUrl="/auth/login"
                afterSignUpUrl="/dashboard"
                appearance={{
                  baseTheme: undefined,
                  variables: { colorPrimary: '#2563eb' }
                }}
              />
            </AuthPageWrapper>
          }
        />

        {/* Protected Routes with Layout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Dashboard */}
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Training */}
                    <Route path="/scenarios" element={<Home />} />
                    <Route path="/scenario/:id" element={<PreCall />} />
                    <Route path="/training" element={<Training />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/history" element={<SessionHistory />} />

                    {/* Courses & Modules */}
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/courses/:id" element={<CourseDetail />} />
                    <Route path="/modules/:id" element={<ModuleDetail />} />

                    {/* Assignments */}
                    <Route path="/my-assignments" element={<MyAssignments />} />
                    <Route
                      path="/assignments"
                      element={
                        <RoleProtectedRoute allowedRoles={['manager', 'admin', 'owner']}>
                          <Assignments />
                        </RoleProtectedRoute>
                      }
                    />

                    {/* Reports */}
                    <Route path="/reports" element={<Reports />} />

                    {/* Leaderboard */}
                    <Route path="/leaderboard" element={<Leaderboard />} />

                    {/* Settings */}
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/settings/profile" element={<ProfileSettings />} />
                    <Route
                      path="/settings/billing"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
                          <BillingSettings />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/ai"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
                          <AISettings />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/team"
                      element={
                        <RoleProtectedRoute allowedRoles={['manager', 'admin', 'owner']}>
                          <TeamSettings />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/branches"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
                          <BranchSettings />
                        </RoleProtectedRoute>
                      }
                    />

                    {/* Setup Wizard */}
                    <Route
                      path="/setup"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
                          <SetupWizard />
                        </RoleProtectedRoute>
                      }
                    />

                    {/* Admin */}
                    <Route
                      path="/admin"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
                          <Admin />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/builder"
                      element={
                        <RoleProtectedRoute allowedRoles={['manager', 'admin', 'owner']}>
                          <Builder />
                        </RoleProtectedRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
