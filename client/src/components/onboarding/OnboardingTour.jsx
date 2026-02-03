import { useEffect, useState } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useAuth } from '../../context/AuthContext';

const OnboardingTour = ({ run, onComplete }) => {
  const { profile } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Welcome to CSR Training! 👋
          </h2>
          <p className="text-gray-700 text-base leading-relaxed">
            Let's take a quick tour to help you get started with your customer service training journey.
            This will only take a minute!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="gamification"]',
      content: (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Gamification & Achievements 🏆
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            Track your progress with points, badges, and achievements.
            Complete training sessions to earn rewards and level up!
          </p>
        </div>
      ),
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="dashboard-stats"]',
      content: (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Your Statistics 📊
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            Monitor your total sessions, average scores, streaks, and badges earned.
            These stats help you track your improvement over time.
          </p>
        </div>
      ),
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: 'a[href="/courses"]',
      content: (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Browse Training Courses 📚
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            Explore available training courses and scenarios.
            Click here to view all courses and start your training!
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.bg-primary-600.animate-pulse, .bg-primary-600:not(.animate-pulse)',
      content: (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Start Your Practice 🎯
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            Ready to begin? Click this button to start a training session.
            Complete your daily practice calls to maintain your streak!
          </p>
        </div>
      ),
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: 'a[href="/leaderboard"]',
      content: (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Leaderboard & Competition 🥇
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            See how you rank against other trainees. Compete for the top spot
            and earn recognition for your achievements!
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            You're All Set! 🎉
          </h2>
          <p className="text-gray-700 text-base leading-relaxed mb-4">
            You're ready to start your training journey. Remember:
          </p>
          <ul className="text-left text-gray-700 text-sm space-y-2 mb-4">
            <li>✅ Complete daily practice calls to build your streak</li>
            <li>✅ Earn points and badges as you progress</li>
            <li>✅ Track your improvement with detailed statistics</li>
            <li>✅ Compete on the leaderboard</li>
          </ul>
          <p className="text-gray-600 text-sm">
            Good luck, {profile?.full_name?.split(' ')[0] || 'there'}!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      // Update step index
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Tour finished or skipped
      setStepIndex(0);
      if (onComplete) {
        onComplete();
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#6366f1', // primary-600
          textColor: '#1f2937', // gray-800
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: '#ffffff',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 24,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#6366f1',
          fontSize: 14,
          fontWeight: 600,
          padding: '10px 20px',
          borderRadius: 8,
        },
        buttonBack: {
          color: '#6b7280',
          fontSize: 14,
          fontWeight: 600,
          marginRight: 10,
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: 14,
          fontWeight: 600,
        },
        beacon: {
          inner: '#6366f1',
          outer: '#6366f1',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
};

export default OnboardingTour;
