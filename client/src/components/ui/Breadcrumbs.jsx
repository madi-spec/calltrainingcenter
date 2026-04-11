import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const ROUTE_LABELS = {
  'dashboard': 'Dashboard',
  'scenarios': 'Practice',
  'courses': 'Courses',
  'certificates': 'Certificates',
  'my-assignments': 'My Assignments',
  'assignments': 'Assign Training',
  'reports': 'Reports',
  'analytics': 'Analytics',
  'performance': 'Performance Trends',
  'leaderboard': 'Leaderboard',
  'settings': 'Settings',
  'studio': 'Content Studio',
  'setup': 'Setup Wizard',
  'results': 'Results',
  'team': 'Team',
  'billing': 'Billing',
  'replay': 'Replay',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 px-6 py-2 text-xs text-muted-foreground border-b border-border/50">
      <Link to="/dashboard" className="hover:text-foreground transition-colors">Home</Link>
      {segments.map((seg, i) => {
        const label = ROUTE_LABELS[seg] || seg;
        const path = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;

        return (
          <span key={`${seg}-${i}`} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
