/**
 * Tutorial Steps Configuration
 * Defines the guided onboarding experience for new users
 */

export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    type: 'modal',
    title: 'Welcome to CSR Training Simulator!',
    description: 'Practice handling real customer scenarios with AI-powered voice calls. Get instant coaching feedback to improve your skills.',
    image: '/images/welcome-illustration.svg',
    tips: [
      'Practice in a safe environment',
      'Get real-time AI coaching',
      'Track your progress over time'
    ]
  },
  {
    id: 'navigation',
    type: 'highlight',
    target: '[data-tutorial="sidebar"]',
    title: 'Navigation',
    description: 'Use the sidebar to navigate between different sections of the app. You can access scenarios, courses, your assignments, and more.',
    position: 'right',
    highlightPadding: 8
  },
  {
    id: 'dashboard',
    type: 'highlight',
    target: '[data-tutorial="dashboard-stats"]',
    title: 'Your Dashboard',
    description: 'This is your personal dashboard. Track your training progress, streaks, points, and recent activity all in one place.',
    position: 'right',
    highlightPadding: 8
  },
  {
    id: 'scenarios',
    type: 'highlight',
    target: '[data-tutorial="scenarios-link"]',
    title: 'Training Scenarios',
    description: 'Click here to browse available training scenarios. Each scenario simulates a real customer interaction you might encounter.',
    position: 'right',
    action: {
      type: 'navigate',
      path: '/scenarios'
    }
  },
  {
    id: 'scenario-card',
    type: 'highlight',
    target: '[data-tutorial="scenario-card"]',
    title: 'Choose a Scenario',
    description: 'Each card shows a different scenario. You can see the difficulty level, category, and what skills it focuses on.',
    position: 'bottom',
    highlightPadding: 8
  },
  {
    id: 'pre-call',
    type: 'highlight',
    target: '[data-tutorial="pre-call-info"]',
    title: 'Pre-Call Briefing',
    description: 'Before each call, review the scenario details, customer background, and your objectives. This prepares you for the conversation.',
    position: 'bottom',
    highlightPadding: 8,
    action: {
      type: 'navigate-to-scenario'
    }
  },
  {
    id: 'start-training',
    type: 'highlight',
    target: '[data-tutorial="start-button"]',
    title: 'Start Your Training',
    description: 'When you\'re ready, click this button to begin the voice call. The AI customer will respond naturally to what you say.',
    position: 'top',
    highlightPadding: 4
  },
  {
    id: 'gamification',
    type: 'highlight',
    target: '[data-tutorial="gamification"]',
    title: 'Points & Achievements',
    description: 'Earn points for completing training sessions. Build your streak by practicing daily, and unlock badges as you improve!',
    position: 'top',
    highlightPadding: 8,
    action: {
      type: 'navigate',
      path: '/dashboard'
    }
  },
  {
    id: 'assignments',
    type: 'highlight',
    target: '[data-tutorial="assignments-link"]',
    title: 'Your Assignments',
    description: 'Check here for any training assignments from your manager. Complete them by the due date to stay on track.',
    position: 'right'
  },
  {
    id: 'complete',
    type: 'modal',
    title: 'You\'re All Set!',
    description: 'You now know the basics. Start practicing with your first scenario to begin improving your customer service skills.',
    tips: [
      'Start with easy scenarios',
      'Review your feedback after each call',
      'Practice daily to build your streak'
    ],
    primaryAction: {
      label: 'Start Practicing',
      path: '/scenarios'
    },
    secondaryAction: {
      label: 'Explore Dashboard',
      path: '/dashboard'
    }
  }
];

export const TUTORIAL_STORAGE_KEY = 'csr_tutorial_progress';

export const getTutorialStepById = (stepId) => {
  return TUTORIAL_STEPS.find(step => step.id === stepId);
};

export const getNextStep = (currentStepId) => {
  const currentIndex = TUTORIAL_STEPS.findIndex(step => step.id === currentStepId);
  if (currentIndex === -1 || currentIndex === TUTORIAL_STEPS.length - 1) {
    return null;
  }
  return TUTORIAL_STEPS[currentIndex + 1];
};

export const getPreviousStep = (currentStepId) => {
  const currentIndex = TUTORIAL_STEPS.findIndex(step => step.id === currentStepId);
  if (currentIndex <= 0) {
    return null;
  }
  return TUTORIAL_STEPS[currentIndex - 1];
};

export const getStepProgress = (currentStepId) => {
  const currentIndex = TUTORIAL_STEPS.findIndex(step => step.id === currentStepId);
  return {
    current: currentIndex + 1,
    total: TUTORIAL_STEPS.length,
    percentage: Math.round(((currentIndex + 1) / TUTORIAL_STEPS.length) * 100)
  };
};
