import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  ChevronRight,
  Target
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MyAssignments() {
  const { authFetch } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const response = await authFetch('/api/assignments/my');
        if (response.ok) {
          const data = await response.json();
          setAssignments(data.assignments || []);
        }
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [authFetch]);

  const filteredAssignments = assignments.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'in_progress'].includes(a.status);
    if (filter === 'overdue') return a.status === 'overdue';
    if (filter === 'completed') return a.status === 'completed';
    return true;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-400" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-400" />;
    }
  };

  const getDueDateColor = (dueDate, status) => {
    if (status === 'completed') return 'text-green-400';
    const now = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'text-red-400';
    if (daysUntilDue <= 2) return 'text-yellow-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">My Assignments</h1>
        <p className="text-gray-400 mt-1">
          Complete your assigned training scenarios
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: 'pending', label: 'Pending' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'completed', label: 'Completed' },
          { value: 'all', label: 'All' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filter === tab.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
            {tab.value === 'overdue' && assignments.filter((a) => a.status === 'overdue').length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {assignments.filter((a) => a.status === 'overdue').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map((assignment, index) => (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gray-800 rounded-xl p-6 border ${
                assignment.status === 'overdue'
                  ? 'border-red-500/30'
                  : 'border-gray-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    assignment.status === 'completed'
                      ? 'bg-green-500/10'
                      : assignment.status === 'overdue'
                      ? 'bg-red-500/10'
                      : 'bg-primary-500/10'
                  }`}>
                    {getStatusIcon(assignment.status)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-100">
                      {assignment.scenario_name || assignment.suite_name}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {assignment.suite_name ? 'Training Suite' : 'Single Scenario'}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className={`text-sm ${getDueDateColor(assignment.due_date, assignment.status)}`}>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Due {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                      {assignment.progress && (
                        <span className="text-sm text-gray-400">
                          <Target className="w-4 h-4 inline mr-1" />
                          {assignment.progress.completed}/{assignment.progress.total} completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {assignment.status !== 'completed' && (
                    <Link
                      to={`/scenario/${assignment.scenario_id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      {assignment.status === 'in_progress' ? 'Continue' : 'Start'}
                    </Link>
                  )}
                  {assignment.status === 'completed' && (
                    <Link
                      to={`/history?assignment=${assignment.id}`}
                      className="flex items-center gap-2 text-primary-400 hover:text-primary-300"
                    >
                      View Results <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {assignment.progress && assignment.status !== 'completed' && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-gray-300">
                      {Math.round((assignment.progress.completed / assignment.progress.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-500"
                      style={{
                        width: `${(assignment.progress.completed / assignment.progress.total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center"
          >
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-100 mb-2">
              {filter === 'completed' ? 'No completed assignments' : 'All caught up!'}
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === 'pending'
                ? "You don't have any pending assignments."
                : filter === 'overdue'
                ? "You don't have any overdue assignments."
                : 'No assignments to show.'}
            </p>
            <Link
              to="/scenarios"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Practice on your own
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
