import { Routes, Route, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { SignIn, SignUp, useAuth as useClerkAuth } from '@clerk/clerk-react';
import Layout from './components/Layout';
import { ProtectedRoute, RoleProtectedRoute } from './components/ProtectedRoute';
import { TutorialOverlay } from './components/onboarding';
import { InstallPrompt, UpdatePrompt } from './components/pwa';
import { TutorialProvider } from './context/TutorialContext';

// Public pages
import Landing from './pages/Landing';

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
const CourseBuilder = lazy(() => import('./pages/courses/CourseBuilder'));
const ModuleDetail = lazy(() => import('./pages/modules/ModuleDetail'));
const Assignments = lazy(() => import('./pages/assignments/Assignments'));
const MyAssignments = lazy(() => import('./pages/assignments/MyAssignments'));
const SessionHistory = lazy(() => import('./pages/training/SessionHistory'));
const Favorites = lazy(() => import('./pages/scenarios/Favorites'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const LiveDashboard = lazy(() => import('./pages/reports/LiveDashboard'));
const SkillGapHeatmap = lazy(() => import('./pages/reports/SkillGapHeatmap'));
const ROIDashboard = lazy(() => import('./pages/reports/ROIDashboard'));
const Leaderboard = lazy(() => import('./pages/leaderboard/Leaderboard'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const BillingSettings = lazy(() => import('./pages/settings/Billing'));
const AISettings = lazy(() => import('./pages/settings/AISettings'));
const TeamSettings = lazy(() => import('./pages/settings/Team'));
const BranchSettings = lazy(() => import('./pages/settings/Branches'));
const ProfileSettings = lazy(() => import('./pages/settings/Profile'));
const NotificationSettings = lazy(() => import('./pages/settings/Notifications'));
const SetupWizard = lazy(() => import('./pages/setup/SetupWizard'));
const PreCallWarmup = lazy(() => import('./pages/warmup/PreCallWarmup'));
const MicroPractice = lazy(() => import('./pages/micro/MicroPractice'));
const Recommendations = lazy(() => import('./pages/recommendations/Recommendations'));
const CallReplay = lazy(() => import('./pages/replay/CallReplay'));
const ComparativeAnalysis = lazy(() => import('./pages/analysis/ComparativeAnalysis'));
const CompanyOnboarding = lazy(() => import('./pages/onboarding/CompanyOnboarding'));

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
    <>
      <InstallPrompt />
      <UpdatePrompt />
      <AnimatePresence mode="wait">
        <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<Landing />} />

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

        {/* Onboarding Route - Protected but no Layout */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <CompanyOnboarding />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Protected Routes with Layout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <TutorialProvider>
                <TutorialOverlay />
                <Layout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Dashboard */}
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Training */}
                    <Route path="/scenarios" element={<Home />} />
                    <Route path="/scenario/:id" element={<PreCall />} />
                    <Route path="/warmup/:scenarioId" element={<PreCallWarmup />} />
                    <Route path="/training" element={<Training />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/results/:sessionId" element={<Results />} />
                    <Route path="/replay/:sessionId" element={<CallReplay />} />
                    <Route path="/analysis/:scenarioId" element={<ComparativeAnalysis />} />
                    <Route path="/history" element={<SessionHistory />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/quick-drills" element={<MicroPractice />} />
                    <Route path="/recommendations" element={<Recommendations />} />

                    {/* Courses & Modules */}
                    <Route path="/courses" element={<Courses />} />
                    <Route
                      path="/courses/create"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                          <CourseBuilder />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route path="/courses/:id" element={<CourseDetail />} />
                    <Route path="/modules/:id" element={<ModuleDetail />} />

                    {/* Assignments */}
                    <Route path="/my-assignments" element={<MyAssignments />} />
                    <Route
                      path="/assignments"
                      element={
                        <RoleProtectedRoute allowedRoles={['manager', 'admin', 'super_admin']}>
                          <Assignments />
                        </RoleProtectedRoute>
                      }
                    />

                    {/* Reports */}
                    <Route path="/reports" element={<Reports />} />
                    <Route
                      path="/live"
                      element={
                        <RoleProtectedRoute allowedRoles={['manager', 'admin', 'super_admin']}>
                          <LiveDashboard />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/skill-gaps"
                      element={
                        <RoleProtectedRoute allowedRoles={['manager', 'admin', 'super_admin']}>
                          <SkillGapHeatmap />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/roi"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                          <ROIDashboard />
                        </RoleProtectedRoute>
                      }
                    />

                    {/* Leaderboard */}
                    <Route path="/leaderboard" element={<Leaderboard />} />

                    {/* Settings */}
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/settings/profile" element={<ProfileSettings />} />
                    <Route path="/settings/notifications" element={<NotificationSettings />} />
                    <Route
                      path="/settings/billing"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                          <BillingSettings />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/ai"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                          <AISettings />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/team"
                      element={
                        <RoleProtectedRoute allowedRoles={['manager', 'admin', 'super_admin']}>
                          <TeamSettings />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/branches"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                          <BranchSettings />
                        </RoleProtectedRoute>
                      }
                    />

                    {/* Setup Wizard */}
                    <Route
                      path="/setup"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                          <SetupWizard />
                        </RoleProtectedRoute>
                      }
                    />

                    {/* Admin */}
                    <Route
                      path="/admin"
                      element={
                        <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                          <Admin />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/builder"
                      element={
                        <RoleProtectedRoute allowedRoles={['manager', 'admin', 'super_admin']}>
                          <Builder />
                        </RoleProtectedRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              </Layout>
              </TutorialProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
