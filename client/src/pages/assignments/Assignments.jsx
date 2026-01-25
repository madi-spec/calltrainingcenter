import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Trash2,
  X,
  User,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Assignments() {
  const { authFetch } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // For create modal
  const [users, setUsers] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Form state
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [assignmentType, setAssignmentType] = useState('scenario'); // 'scenario' or 'course'
  const [selectedScenario, setSelectedScenario] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchAssignments = async () => {
    try {
      const response = await authFetch('/api/assignments');
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

  useEffect(() => {
    fetchAssignments();
  }, [authFetch]);

  // Fetch users, scenarios, and courses when modal opens
  useEffect(() => {
    if (showCreateModal) {
      setLoadingOptions(true);
      Promise.all([
        authFetch('/api/users').then(r => r.json()),
        authFetch('/api/scenarios').then(r => r.json()),
        authFetch('/api/courses').then(r => r.json())
      ]).then(([usersData, scenariosData, coursesData]) => {
        setUsers(usersData.users || []);
        setScenarios(scenariosData.scenarios || []);
        setCourses(coursesData.courses || []);
        setLoadingOptions(false);
      }).catch(err => {
        console.error('Error loading options:', err);
        setLoadingOptions(false);
      });
    }
  }, [showCreateModal, authFetch]);

  const handleCreateAssignment = async () => {
    if (selectedUsers.length === 0) {
      setCreateError('Please select at least one user');
      return;
    }
    if (assignmentType === 'scenario' && !selectedScenario) {
      setCreateError('Please select a scenario');
      return;
    }
    if (assignmentType === 'course' && !selectedCourse) {
      setCreateError('Please select a course');
      return;
    }
    if (!dueDate) {
      setCreateError('Please set a due date');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const response = await authFetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: selectedUsers,
          scenario_id: assignmentType === 'scenario' ? selectedScenario : null,
          course_id: assignmentType === 'course' ? selectedCourse : null,
          due_date: dueDate,
          notes: notes
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchAssignments();
      } else {
        const data = await response.json();
        setCreateError(data.error || 'Failed to create assignment');
      }
    } catch (error) {
      setCreateError('Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedUsers([]);
    setAssignmentType('scenario');
    setSelectedScenario('');
    setSelectedCourse('');
    setDueDate('');
    setNotes('');
    setCreateError('');
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.scenario_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-full">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case 'overdue':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-500/10 text-red-400 rounded-full">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-500/10 text-gray-400 rounded-full">
            <Calendar className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  // Get default due date (1 week from now)
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Assignments</h1>
          <p className="text-gray-400 mt-1">
            Manage training assignments for your team
          </p>
        </div>
        <button
          onClick={() => {
            setDueDate(getDefaultDueDate());
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Assignment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by user or scenario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: assignments.length, color: 'text-gray-400' },
          { label: 'Pending', value: assignments.filter((a) => a.status === 'pending').length, color: 'text-yellow-400' },
          { label: 'Completed', value: assignments.filter((a) => a.status === 'completed').length, color: 'text-green-400' },
          { label: 'Overdue', value: assignments.filter((a) => a.status === 'overdue').length, color: 'text-red-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Assignments Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">User</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Scenario/Course</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Due Date</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Progress</th>
                <th className="py-4 px-6"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500/10 rounded-full flex items-center justify-center">
                          <span className="text-primary-400 text-sm font-medium">
                            {assignment.user_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-gray-200">{assignment.user_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-300">
                      {assignment.scenario_name || assignment.course_name || assignment.suite_name}
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(assignment.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(assignment.status)}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500"
                            style={{ width: `${((assignment.progress?.completed || 0) / (assignment.progress?.total || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400">
                          {assignment.progress?.completed || 0}/{assignment.progress?.total || 1}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button className="p-2 hover:bg-gray-700 rounded-lg text-gray-400">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No assignments found</p>
                    <button
                      onClick={() => {
                        setDueDate(getDefaultDueDate());
                        setShowCreateModal(true);
                      }}
                      className="text-primary-400 hover:text-primary-300 mt-2"
                    >
                      Create your first assignment
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full border border-gray-700 my-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100">Create Assignment</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingOptions ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Select Users */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      <User className="w-4 h-4 inline mr-2" />
                      Select Team Members
                    </label>
                    <button
                      onClick={selectAllUsers}
                      className="text-xs text-primary-400 hover:text-primary-300"
                    >
                      {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-gray-900 rounded-lg border border-gray-700 p-2 space-y-1">
                    {users.map(user => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedUsers.includes(user.id) ? 'bg-primary-500/20' : 'hover:bg-gray-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 rounded border-gray-600 text-primary-500 focus:ring-primary-500"
                        />
                        <div className="w-8 h-8 bg-primary-500/10 rounded-full flex items-center justify-center">
                          <span className="text-primary-400 text-xs font-medium">
                            {user.full_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-200">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </label>
                    ))}
                    {users.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No team members found</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedUsers.length} user(s) selected
                  </p>
                </div>

                {/* Assignment Type Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Assignment Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAssignmentType('scenario')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                        assignmentType === 'scenario'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Single Scenario
                    </button>
                    <button
                      onClick={() => setAssignmentType('course')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                        assignmentType === 'course'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Full Course
                    </button>
                  </div>
                </div>

                {/* Select Scenario or Course */}
                {assignmentType === 'scenario' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <BookOpen className="w-4 h-4 inline mr-2" />
                      Select Scenario
                    </label>
                    <select
                      value={selectedScenario}
                      onChange={(e) => setSelectedScenario(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Choose a scenario...</option>
                      {scenarios.map(scenario => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.name} ({scenario.difficulty})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <BookOpen className="w-4 h-4 inline mr-2" />
                      Select Course
                    </label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Choose a course...</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Notes (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes for this assignment..."
                    rows={2}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>

                {/* Error Message */}
                {createError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{createError}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAssignment}
                    disabled={creating}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Assignment
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
