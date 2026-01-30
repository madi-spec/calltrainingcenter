import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useClerk, useUser } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  Phone,
  ClipboardList,
  BarChart3,
  Trophy,
  Settings,
  Users,
  Building2,
  CreditCard,
  Sparkles,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Play,
  BookOpen,
  Wand2,
  Sun,
  Moon
} from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsModal from './help/KeyboardShortcutsModal';

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { profile, role, actualRole, roleOverride, setRoleOverride } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Keyboard shortcuts
  const { showHelpModal, setShowHelpModal } = useKeyboardShortcuts({
    onCloseModal: () => {
      setSidebarOpen(false);
      setUserMenuOpen(false);
    }
  });

  // Apply brand colors as CSS variables
  useEffect(() => {
    if (organization?.colors) {
      const root = document.documentElement;
      const { primary, secondary, accent } = organization.colors;

      if (primary) {
        root.style.setProperty('--brand-primary', primary);
        // Convert hex to RGB for Tailwind compatibility
        const rgb = hexToRgb(primary);
        if (rgb) {
          root.style.setProperty('--brand-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
      }
      if (secondary) {
        root.style.setProperty('--brand-secondary', secondary);
      }
      if (accent) {
        root.style.setProperty('--brand-accent', accent);
      }
    }
  }, [organization?.colors]);

  // Helper to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const isTrainingPage = location.pathname === '/training';

  // Hide nav during active call
  if (isTrainingPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  // Navigation items with role-based visibility
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['trainee', 'manager', 'admin', 'owner'] },
    { to: '/scenarios', icon: Play, label: 'Practice', roles: ['trainee', 'manager', 'admin', 'owner'] },
    { to: '/courses', icon: BookOpen, label: 'Courses', roles: ['trainee', 'manager', 'admin', 'owner'] },
    { to: '/my-assignments', icon: ClipboardList, label: 'My Assignments', roles: ['trainee', 'manager', 'admin', 'owner'] },
    { to: '/assignments', icon: ClipboardList, label: 'Assign Training', roles: ['manager', 'admin', 'owner'] },
    { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['trainee', 'manager', 'admin', 'owner'] },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard', roles: ['trainee', 'manager', 'admin', 'owner'] },
  ];

  const settingsItems = [
    { to: '/setup', icon: Wand2, label: 'Setup Wizard', roles: ['admin', 'owner'] },
    { to: '/settings', icon: Settings, label: 'Settings', roles: ['trainee', 'manager', 'admin', 'owner'] },
    { to: '/settings/team', icon: Users, label: 'Team', roles: ['manager', 'admin', 'owner'] },
    { to: '/settings/branches', icon: Building2, label: 'Branches', roles: ['admin', 'owner'] },
    { to: '/settings/billing', icon: CreditCard, label: 'Billing', roles: ['admin', 'owner'] },
    { to: '/settings/ai', icon: Sparkles, label: 'AI Settings', roles: ['admin', 'owner'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(role || 'trainee'));
  const filteredSettingsItems = settingsItems.filter(item => item.roles.includes(role || 'trainee'));

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/' || location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        data-tutorial="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center justify-between h-16 px-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <Link to="/dashboard" className="flex items-center gap-3">
              {organization?.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={organization?.name || 'Company'}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </div>
              )}
              <div>
                <h1 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>CSR Training</h1>
                <p className={`text-xs truncate max-w-[140px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{organization?.name || 'Your Company'}</p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className={`lg:hidden p-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                data-tutorial={
                  item.to === '/scenarios' ? 'scenarios-link' :
                  item.to === '/my-assignments' ? 'assignments-link' :
                  undefined
                }
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.to)
                    ? 'bg-primary-600 text-white'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}

            {/* Settings section */}
            <div className={`pt-4 mt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Settings
              </p>
              {filteredSettingsItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(item.to)
                      ? 'bg-primary-600 text-white'
                      : isDark
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* Role Switcher - Only visible to admins/owners */}
          {(actualRole === 'admin' || actualRole === 'owner') && (
            <div className={`px-3 py-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <span>View As</span>
              </p>
              <div className="px-3">
                <select
                  value={roleOverride || ''}
                  onChange={(e) => setRoleOverride(e.target.value || null)}
                  className={`w-full px-3 py-1.5 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'} border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                >
                  <option value="">Your view ({actualRole || 'trainee'})</option>
                  <option value="trainee">View as: Trainee</option>
                  <option value="manager">View as: Manager</option>
                  <option value="admin">View as: Admin</option>
                </select>
                {roleOverride && (
                  <p className="text-xs text-gray-400 mt-1">
                    Viewing as {roleOverride}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* User section */}
          <div className={`p-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 px-3 py-2">
              <img
                src={user?.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'User')}&background=3b82f6&color=fff`}
                alt={profile?.full_name || 'User'}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{profile?.full_name || 'User'}</p>
                <p className={`text-xs capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{role || 'trainee'}</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleSignOut}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className={`lg:hidden flex items-center justify-between h-16 px-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`p-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary-500" />
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>CSR Training</span>
          </Link>
          <div className="relative flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2"
            >
              <img
                src={user?.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'User')}&background=3b82f6&color=fff`}
                alt={profile?.full_name || 'User'}
                className="w-8 h-8 rounded-full"
              />
            </button>
            {userMenuOpen && (
              <div className={`absolute right-0 top-full mt-2 w-48 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg py-1 z-50`}>
                <button
                  onClick={handleSignOut}
                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}

export default Layout;
