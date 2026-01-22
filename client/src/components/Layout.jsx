import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Settings, PlusCircle, Phone } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';

function Layout({ children }) {
  const location = useLocation();
  const { company } = useCompany();

  const isTrainingPage = location.pathname === '/training';

  // Hide nav during active call
  if (isTrainingPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-card border-t-0 border-x-0 rounded-none sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Brand */}
            <Link to="/" className="flex items-center gap-3">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-white">CSR Training</h1>
                <p className="text-xs text-gray-400">{company.name}</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <NavLink to="/" icon={Home} label="Scenarios" active={location.pathname === '/'} />
              <NavLink to="/builder" icon={PlusCircle} label="Create" active={location.pathname === '/builder'} />
              <NavLink to="/admin" icon={Settings} label="Setup" active={location.pathname === '/admin'} />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-500">
        <p>CSR Training Simulator &middot; Powered by AI</p>
      </footer>
    </div>
  );
}

function NavLink({ to, icon: Icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline text-sm font-medium">{label}</span>
    </Link>
  );
}

export default Layout;
