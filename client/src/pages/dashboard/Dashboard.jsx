import { useAuth } from '../../context/AuthContext';
import ManagerDashboard from './ManagerDashboard';
import AgentDashboard from './AgentDashboard';

export default function Dashboard() {
  const { role } = useAuth();

  // Render manager dashboard for managers and above
  if (['manager', 'admin', 'super_admin'].includes(role)) {
    return <ManagerDashboard />;
  }

  // Render agent dashboard for trainees
  return <AgentDashboard />;
}
