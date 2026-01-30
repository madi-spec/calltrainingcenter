import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Play, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function QuickPracticeButton({ className = '' }) {
  const [loading, setLoading] = useState(false);
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const handleQuickPractice = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/practice/quick-scenario');
      const data = await response.json();

      if (data.success && data.scenario) {
        navigate(`/scenario/${data.scenario.id}`);
      }
    } catch (error) {
      console.error('Error getting quick scenario:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleQuickPractice}
      disabled={loading}
      className={`
        flex items-center justify-center gap-2
        px-6 py-3
        bg-gradient-to-r from-yellow-500 to-orange-500
        hover:from-yellow-600 hover:to-orange-600
        text-white font-semibold rounded-xl
        shadow-lg shadow-orange-500/20
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Zap className="w-5 h-5" />
          Quick Practice
        </>
      )}
    </button>
  );
}
