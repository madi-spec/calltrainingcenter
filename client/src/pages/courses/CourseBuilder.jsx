import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Trash2,
  GripVertical,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Predefined icons for selection
const COURSE_ICONS = ['📚', '🎯', '💼', '🎓', '📞', '🛡️', '💡', '🚀', '⭐', '🏆', '📈', '🤝', '💪', '🔥', '✨'];
const BADGE_ICONS = ['🏆', '🥇', '🎖️', '⭐', '💎', '👑', '🌟', '✅', '🎯', '💪'];

// Predefined categories
const CATEGORIES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'product_knowledge', label: 'Product Knowledge' },
  { value: 'objection_handling', label: 'Objection Handling' },
  { value: 'sales_skills', label: 'Sales Skills' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'retention', label: 'Retention' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'advanced', label: 'Advanced Training' },
  { value: 'custom', label: 'Custom' }
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'text-green-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'hard', label: 'Hard', color: 'text-red-400' }
];

export default function CourseBuilder() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Course fields
  const [course, setCourse] = useState({
    name: '',
    description: '',
    category: 'custom',
    icon: '📚',
    badge_name: '',
    badge_icon: '🏆'
  });

  // Modules
  const [modules, setModules] = useState([]);
  const [expandedModules, setExpandedModules] = useState({});

  // Update course field
  const updateCourse = (field, value) => {
    setCourse(prev => ({ ...prev, [field]: value }));
  };

  // Add new module
  const addModule = () => {
    const newModule = {
      id: Date.now(), // Temporary ID for UI
      name: '',
      description: '',
      difficulty: 'medium',
      scenario_count: 10,
      pass_threshold: 70,
      required_completions: 1
    };
    setModules(prev => [...prev, newModule]);
    setExpandedModules(prev => ({ ...prev, [newModule.id]: true }));
  };

  // Update module field
  const updateModule = (moduleId, field, value) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, [field]: value } : m
    ));
  };

  // Remove module
  const removeModule = (moduleId) => {
    setModules(prev => prev.filter(m => m.id !== moduleId));
  };

  // Toggle module expansion
  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Move module up/down
  const moveModule = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;

    const newModules = [...modules];
    [newModules[index], newModules[newIndex]] = [newModules[newIndex], newModules[index]];
    setModules(newModules);
  };

  // Validate form
  const validateForm = () => {
    if (!course.name.trim()) {
      setError('Course name is required');
      return false;
    }
    if (!course.description.trim()) {
      setError('Course description is required');
      return false;
    }
    if (modules.length === 0) {
      setError('At least one module is required');
      return false;
    }
    for (const module of modules) {
      if (!module.name.trim()) {
        setError('All modules must have a name');
        return false;
      }
    }
    return true;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Prepare modules data (remove temporary IDs)
      const moduleData = modules.map(({ id, ...rest }) => rest);

      const response = await authFetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...course,
          modules: moduleData
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create course');
      }

      const data = await response.json();
      setSuccess(true);

      // Navigate to the new course after a short delay
      setTimeout(() => {
        navigate(`/courses/${data.course.id}`);
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </button>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Create New Course</h1>
            <p className="text-gray-400">Build a custom training course for your team</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-300">Course created successfully! Redirecting...</span>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Course Details Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl border border-gray-700 p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-6">Course Details</h2>

          <div className="grid gap-6">
            {/* Course Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Course Name *
              </label>
              <input
                type="text"
                value={course.name}
                onChange={(e) => updateCourse('name', e.target.value)}
                placeholder="e.g., Customer Objection Handling"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={course.description}
                onChange={(e) => updateCourse('description', e.target.value)}
                placeholder="Describe what trainees will learn in this course..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>

            {/* Category and Icon Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={course.category}
                  onChange={(e) => updateCourse('category', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Course Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Course Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {COURSE_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => updateCourse('icon', icon)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        course.icon === icon
                          ? 'bg-primary-500 ring-2 ring-primary-400'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Badge Settings */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Completion Badge Name
                </label>
                <input
                  type="text"
                  value={course.badge_name}
                  onChange={(e) => updateCourse('badge_name', e.target.value)}
                  placeholder="e.g., Objection Master"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Badge Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {BADGE_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => updateCourse('badge_icon', icon)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        course.badge_icon === icon
                          ? 'bg-yellow-500 ring-2 ring-yellow-400'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Modules Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl border border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Course Modules</h2>
              <p className="text-sm text-gray-400 mt-1">
                Modules unlock sequentially as trainees complete them
              </p>
            </div>
            <button
              type="button"
              onClick={addModule}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Module
            </button>
          </div>

          {modules.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-xl">
              <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No modules yet</p>
              <button
                type="button"
                onClick={addModule}
                className="text-primary-400 hover:text-primary-300"
              >
                Add your first module
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((module, index) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-700/50 rounded-xl border border-gray-600 overflow-hidden"
                >
                  {/* Module Header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-700/70 transition-colors"
                    onClick={() => toggleModule(module.id)}
                  >
                    <GripVertical className="w-5 h-5 text-gray-500" />
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-600 text-sm font-medium text-white">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {module.name || 'Untitled Module'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {module.scenario_count} scenarios • {module.difficulty} difficulty
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveModule(index, 'up'); }}
                        disabled={index === 0}
                        className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveModule(index, 'down'); }}
                        disabled={index === modules.length - 1}
                        className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeModule(module.id); }}
                        className="p-1.5 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedModules[module.id] ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Module Details (Expanded) */}
                  {expandedModules[module.id] && (
                    <div className="p-4 pt-0 border-t border-gray-600 mt-2">
                      <div className="grid gap-4 pt-4">
                        {/* Module Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Module Name *
                          </label>
                          <input
                            type="text"
                            value={module.name}
                            onChange={(e) => updateModule(module.id, 'name', e.target.value)}
                            placeholder="e.g., Price Objections"
                            className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                          />
                        </div>

                        {/* Module Description */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Description
                          </label>
                          <textarea
                            value={module.description}
                            onChange={(e) => updateModule(module.id, 'description', e.target.value)}
                            placeholder="What will trainees learn in this module?"
                            rows={2}
                            className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                          />
                        </div>

                        {/* Settings Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Difficulty */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Difficulty
                            </label>
                            <select
                              value={module.difficulty}
                              onChange={(e) => updateModule(module.id, 'difficulty', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
                            >
                              {DIFFICULTIES.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Scenario Count */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Scenarios
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={module.scenario_count}
                              onChange={(e) => updateModule(module.id, 'scenario_count', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
                            />
                          </div>

                          {/* Pass Threshold */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Pass Score %
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={module.pass_threshold}
                              onChange={(e) => updateModule(module.id, 'pass_threshold', parseInt(e.target.value) || 70)}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
                            />
                          </div>

                          {/* Required Completions */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Required Passes
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={module.required_completions}
                              onChange={(e) => updateModule(module.id, 'required_completions', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Preview Section */}
        {course.name && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-xl border border-gray-700 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>
            <div className="bg-gray-700/50 rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{course.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{course.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{course.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                    <span>{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{modules.reduce((sum, m) => sum + m.scenario_count, 0)} scenarios</span>
                    {course.badge_name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {course.badge_icon} {course.badge_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || success}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Create Course
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
