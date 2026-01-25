import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Trophy,
  CheckCircle2,
  Lock,
  Play,
  Star,
  Clock,
  Target,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CourseDetail() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await authFetch(`/api/courses/${id}`);
        if (response.ok) {
          const data = await response.json();
          setCourse(data.course);
        }
      } catch (error) {
        console.error('Error fetching course:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id, authFetch]);

  const handleStartCourse = async () => {
    setStarting(true);
    try {
      const response = await authFetch(`/api/courses/${id}/start`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setCourse(prev => ({
          ...prev,
          progress: data.progress,
          modules: prev.modules?.map(m => ({
            ...m,
            progress: data.moduleProgress?.find(mp => mp.module_id === m.id) || m.progress
          }))
        }));
      }
    } catch (error) {
      console.error('Error starting course:', error);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Course not found</p>
        <Link to="/courses" className="text-primary-400 hover:text-primary-300 mt-2 inline-block">
          Back to courses
        </Link>
      </div>
    );
  }

  const progress = course.progress;
  const isCompleted = progress?.status === 'completed';
  const percentComplete = progress?.percentComplete || 0;

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to courses
      </Link>

      {/* Course Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-700"
      >
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Course Icon */}
          <div className="text-6xl">{course.icon || '📚'}</div>

          {/* Course Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm text-primary-400 font-medium capitalize">
                  {course.category}
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-100 mt-1">
                  {course.name}
                </h1>
              </div>
              {isCompleted && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">Completed</span>
                </div>
              )}
            </div>

            <p className="text-gray-400 mt-3">{course.description}</p>

            {/* Course Stats */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-gray-300">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span>{course.modules?.length || 0} modules</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Target className="w-4 h-4 text-gray-500" />
                <span>{course.scenario_count || 10} scenarios per module</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>
                  {course.difficulty === 'easy' && 'Beginner'}
                  {course.difficulty === 'medium' && 'Intermediate'}
                  {course.difficulty === 'hard' && 'Advanced'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            {progress && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Course Progress</span>
                  <span className="text-gray-200 font-medium">{percentComplete}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isCompleted ? 'bg-green-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
              </div>
            )}

            {/* Start Button */}
            {!progress && (
              <button
                onClick={handleStartCourse}
                disabled={starting}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Course
                  </>
                )}
              </button>
            )}
          </div>

          {/* Badge Preview */}
          {course.badge_name && (
            <div className="bg-gray-700/50 rounded-xl p-4 text-center min-w-[160px]">
              <div className="text-4xl mb-2">
                {isCompleted ? (
                  course.badge_icon || '🏆'
                ) : (
                  <span className="opacity-30">{course.badge_icon || '🏆'}</span>
                )}
              </div>
              <p className="text-sm text-gray-400">Badge Reward</p>
              <p className="text-gray-200 font-medium">{course.badge_name}</p>
              {isCompleted && (
                <div className="flex items-center justify-center gap-1 mt-2 text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-xs font-medium">Earned!</span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Modules List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Course Modules</h2>

        <div className="space-y-3">
          {course.modules?.map((module, index) => (
            <ModuleCard
              key={module.id}
              module={module}
              index={index}
              courseStarted={!!progress}
              isLocked={index > 0 && !course.modules[index - 1]?.progress?.status?.match(/completed|mastered/)}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ModuleCard({ module, index, courseStarted, isLocked }) {
  const progress = module.progress;
  const isCompleted = progress?.status === 'completed' || progress?.status === 'mastered';
  const isInProgress = progress?.status === 'in_progress';

  const scenariosCompleted = progress?.scenariosCompleted || 0;
  const totalScenarios = module.scenario_count || 10;
  const closeRate = progress?.closeRate || 0;

  return (
    <Link
      to={isLocked || !courseStarted ? '#' : `/modules/${module.id}`}
      className={`block bg-gray-800 rounded-xl border border-gray-700 overflow-hidden transition-all ${
        isLocked || !courseStarted
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:border-gray-600'
      }`}
    >
      <div className="p-5">
        <div className="flex items-center gap-4">
          {/* Module Number */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
            isCompleted
              ? 'bg-green-500/20 text-green-400'
              : isInProgress
              ? 'bg-primary-500/20 text-primary-400'
              : isLocked
              ? 'bg-gray-700 text-gray-500'
              : 'bg-gray-700 text-gray-300'
          }`}>
            {isCompleted ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isLocked ? (
              <Lock className="w-5 h-5" />
            ) : (
              index + 1
            )}
          </div>

          {/* Module Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-200">{module.name}</h3>
              {isCompleted && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                  Complete
                </span>
              )}
              {isInProgress && (
                <span className="text-xs px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded-full">
                  In Progress
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">{module.description}</p>

            {/* Progress Stats */}
            {(isInProgress || isCompleted) && (
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-gray-400">
                  {scenariosCompleted}/{totalScenarios} scenarios
                </span>
                <span className={`${closeRate >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {closeRate}% close rate
                </span>
              </div>
            )}
          </div>

          {/* Action */}
          {!isLocked && courseStarted && (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </div>

        {/* Progress Bar */}
        {isInProgress && (
          <div className="mt-4">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all"
                style={{ width: `${(scenariosCompleted / totalScenarios) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
