import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Trophy,
  ChevronRight,
  Lock,
  CheckCircle2,
  Star,
  Clock,
  Filter,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Courses() {
  const { authFetch, role } = useAuth();
  const canCreate = ['admin', 'owner'].includes(role);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await authFetch('/api/courses');
        if (response.ok) {
          const data = await response.json();
          setCourses(data.courses || []);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [authFetch]);

  const filteredCourses = courses.filter(course => {
    if (filter === 'all') return true;
    if (filter === 'in_progress') return course.progress?.status === 'in_progress';
    if (filter === 'completed') return course.progress?.status === 'completed';
    if (filter === 'not_started') return !course.progress;
    return true;
  });

  const categories = [...new Set(courses.map(c => c.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
            Training Courses
          </h1>
          <p className="text-gray-400 mt-1">
            Complete courses to master your skills and earn badges
          </p>
        </div>

        {/* Filter and Create */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Courses</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="not_started">Not Started</option>
            </select>
          </div>

          {canCreate && (
            <Link
              to="/courses/create"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Course
            </Link>
          )}
        </div>
      </motion.div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{courses.length}</p>
              <p className="text-sm text-gray-400">Total Courses</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">
                {courses.filter(c => c.progress?.status === 'in_progress').length}
              </p>
              <p className="text-sm text-gray-400">In Progress</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Trophy className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">
                {courses.filter(c => c.progress?.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-400">Completed</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Course Grid */}
      {categories.map((category, catIndex) => {
        const categoryCourses = filteredCourses.filter(c => c.category === category);
        if (categoryCourses.length === 0) return null;

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + catIndex * 0.05 }}
          >
            <h2 className="text-lg font-semibold text-gray-200 mb-4 capitalize">
              {category} Training
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </motion.div>
        );
      })}

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No courses found matching your filter</p>
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }) {
  const progress = course.progress;
  const isCompleted = progress?.status === 'completed';
  const isLocked = false; // Could implement prerequisite logic here
  const percentComplete = progress?.percentComplete || 0;

  return (
    <Link
      to={`/courses/${course.id}`}
      className={`block bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-all group ${
        isLocked ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      {/* Course Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="text-3xl">{course.icon || '📚'}</div>
          {isCompleted ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 font-medium">Complete</span>
            </div>
          ) : isLocked ? (
            <Lock className="w-5 h-5 text-gray-500" />
          ) : progress ? (
            <span className="text-xs text-primary-400 font-medium">
              {percentComplete}%
            </span>
          ) : null}
        </div>

        <h3 className="font-semibold text-gray-200 mb-1 group-hover:text-primary-400 transition-colors">
          {course.name}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-2">
          {course.description}
        </p>

        {/* Module Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">
              {progress?.modulesCompleted || 0} / {progress?.totalModules || course.module_count || 0} modules
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isCompleted ? 'bg-green-500' : 'bg-primary-500'
              }`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Badge Preview */}
        {course.badge_name && (
          <div className="mt-4 flex items-center gap-2 p-2 bg-gray-700/50 rounded-lg">
            <span className="text-xl">{course.badge_icon || '🏆'}</span>
            <div className="flex-1">
              <p className="text-xs text-gray-400">Earn badge</p>
              <p className="text-sm text-gray-200 font-medium">{course.badge_name}</p>
            </div>
            {isCompleted && (
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-700/30 border-t border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {course.difficulty === 'easy' && '⭐ Beginner'}
          {course.difficulty === 'medium' && '⭐⭐ Intermediate'}
          {course.difficulty === 'hard' && '⭐⭐⭐ Advanced'}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}
