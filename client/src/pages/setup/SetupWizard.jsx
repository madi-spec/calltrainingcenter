import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Package,
  Users,
  Swords,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  SkipForward,
  Loader2,
  Layers,
  MessageSquare,
  ClipboardCheck,
  Bot,
  Sliders,
  Settings2,
  Rocket,
  Globe,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useNotifications } from '../../context/NotificationContext';
import CompanyInfoStep from './steps/CompanyInfoStep';
import ServiceLinesStep from './steps/ServiceLinesStep';
import PackagesStep from './steps/PackagesStep';
import ObjectionsStep from './steps/ObjectionsStep';
import CompetitorsStep from './steps/CompetitorsStep';
import TeamSetupStep from './steps/TeamSetupStep';
import AICustomerBehaviorStep from './steps/AICustomerBehaviorStep';
import AICoachingStyleStep from './steps/AICoachingStyleStep';
import AIScoringStep from './steps/AIScoringStep';
import ReviewStep from './steps/ReviewStep';

const STEPS = [
  {
    id: 'company',
    title: 'Company Info',
    shortTitle: 'Company',
    description: 'Basic information about your business',
    icon: Building2,
    component: CompanyInfoStep,
    required: true,
    category: 'business'
  },
  {
    id: 'serviceLines',
    title: 'Service Lines',
    shortTitle: 'Services',
    description: 'Select the services you offer',
    icon: Layers,
    component: ServiceLinesStep,
    required: false,
    category: 'business'
  },
  {
    id: 'packages',
    title: 'Packages',
    shortTitle: 'Packages',
    description: 'Configure your service packages',
    icon: Package,
    component: PackagesStep,
    required: false,
    category: 'business'
  },
  {
    id: 'objections',
    title: 'Objections',
    shortTitle: 'Objections',
    description: 'Set up objection handling',
    icon: MessageSquare,
    component: ObjectionsStep,
    required: false,
    category: 'business'
  },
  {
    id: 'competitors',
    title: 'Competitors',
    shortTitle: 'Competitors',
    description: 'Add competitor information',
    icon: Swords,
    component: CompetitorsStep,
    required: false,
    category: 'business'
  },
  {
    id: 'aiCustomer',
    title: 'AI Customer Behavior',
    shortTitle: 'AI Customer',
    description: 'How AI customers behave',
    icon: Bot,
    component: AICustomerBehaviorStep,
    required: false,
    category: 'ai'
  },
  {
    id: 'aiCoaching',
    title: 'Coaching Style',
    shortTitle: 'Coaching',
    description: 'How feedback is delivered',
    icon: MessageSquare,
    component: AICoachingStyleStep,
    required: false,
    category: 'ai'
  },
  {
    id: 'aiScoring',
    title: 'Scoring Weights',
    shortTitle: 'Scoring',
    description: 'Customize scoring criteria',
    icon: Sliders,
    component: AIScoringStep,
    required: false,
    category: 'ai'
  },
  {
    id: 'team',
    title: 'Team',
    shortTitle: 'Team',
    description: 'Invite your team members',
    icon: Users,
    component: TeamSetupStep,
    required: false,
    category: 'team'
  },
  {
    id: 'review',
    title: 'Review',
    shortTitle: 'Review',
    description: 'Review and complete setup',
    icon: ClipboardCheck,
    component: ReviewStep,
    required: true,
    category: 'review'
  }
];

export default function SetupWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authFetch, role, refreshProfile } = useAuth();
  const { organization, refreshOrganization } = useOrganization();
  const notifications = useNotifications();
  const showSuccess = notifications?.showSuccess || (() => {});
  const showError = notifications?.showError || (() => {});

  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState({});
  const [visitedSteps, setVisitedSteps] = useState(new Set([0]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [autoScraping, setAutoScraping] = useState(false);
  const hasAutoScraped = useRef(false);

  // Check for new user from redirect
  const { isNewUser, website, autoScrape } = location.state || {};

  // Welcome modal for new users
  const [showWelcomeModal, setShowWelcomeModal] = useState(isNewUser === true);

  // Only admins/owners can access setup
  useEffect(() => {
    if (!['admin', 'super_admin'].includes(role)) {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  // Auto-scrape website if coming from onboarding
  useEffect(() => {
    const performAutoScrape = async () => {
      if (autoScrape && website && !hasAutoScraped.current) {
        hasAutoScraped.current = true;
        setAutoScraping(true);

        try {
          const response = await authFetch('/api/organizations/scrape-website', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ website })
          });

          const result = await response.json();

          if (response.ok && result.extracted) {
            const extracted = result.extracted;

            // Pre-populate step data with scraped info
            setStepData(prev => ({
              ...prev,
              company: {
                name: extracted.name || organization?.name || '',
                phone: extracted.phone || organization?.phone || '',
                website: website,
                address: extracted.address || '',
                services: extracted.services || [],
                guarantees: extracted.guarantees || [],
                logo_url: extracted.logo_url || '',
                brand_colors: extracted.brand_colors || {},
                tagline: extracted.tagline || '',
                extractedPackages: extracted.packages || [],
                competitors_mentioned: extracted.competitors_mentioned || []
              }
            }));

            // Mark company step as visited
            setVisitedSteps(prev => new Set([...prev, 0]));

            showSuccess('Website Imported', `Found: ${[
              extracted.services?.length && `${extracted.services.length} services`,
              extracted.packages?.length && `${extracted.packages.length} packages`,
              extracted.logo_url && 'logo',
              extracted.brand_colors?.primary && 'brand colors'
            ].filter(Boolean).join(', ')}`);
          }
        } catch (err) {
          console.error('Auto-scrape error:', err);
          // Don't show error - user can still manually enter info
        } finally {
          setAutoScraping(false);
        }
      }
    };

    performAutoScrape();
  }, [autoScrape, website, authFetch, organization, showSuccess]);

  const CurrentStepComponent = STEPS[currentStep].component;

  const handleStepComplete = (data) => {
    setStepData(prev => ({
      ...prev,
      [STEPS[currentStep].id]: data
    }));

    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setVisitedSteps(prev => new Set([...prev, nextStep]));
    } else {
      completeSetup();
    }
  };

  const handleSkip = () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setVisitedSteps(prev => new Set([...prev, nextStep]));
    } else {
      completeSetup();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleJumpToStep = (index) => {
    setVisitedSteps(prev => new Set([...prev, index]));
    setCurrentStep(index);
  };

  const completeSetup = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await authFetch('/api/organizations/complete-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupData: stepData })
      });

      if (response.ok) {
        try {
          // Refresh both organization context and auth profile
          // Auth profile contains organization data that ProtectedRoute checks
          await Promise.all([
            refreshOrganization(),
            refreshProfile()
          ]);
        } catch (refreshErr) {
          // Continue anyway
        }
        showSuccess('Setup Complete', 'Your organization is ready to go!');
        navigate('/dashboard');
      } else {
        let errorMessage = 'Failed to complete setup';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (parseErr) {
          // Use default error
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError(`An error occurred: ${err.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  // Group steps by category for the navigation
  const businessSteps = STEPS.filter(s => s.category === 'business');
  const aiSteps = STEPS.filter(s => s.category === 'ai');
  const teamSteps = STEPS.filter(s => s.category === 'team');
  const reviewSteps = STEPS.filter(s => s.category === 'review');

  const renderStepButton = (step, index) => {
    const StepIcon = step.icon;
    const isComplete = visitedSteps.has(index) && stepData[step.id];
    const isCurrent = index === currentStep;
    const isVisited = visitedSteps.has(index);

    return (
      <button
        key={step.id}
        onClick={() => handleJumpToStep(index)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left ${
          isCurrent
            ? 'bg-primary-500/20 text-primary-400 ring-2 ring-primary-500/50'
            : isComplete
            ? 'text-green-400 hover:bg-gray-700 cursor-pointer'
            : isVisited
            ? 'text-gray-300 hover:bg-gray-700 cursor-pointer'
            : 'text-gray-500 hover:bg-gray-700 hover:text-gray-400 cursor-pointer'
        }`}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          isComplete
            ? 'bg-green-500/20'
            : isCurrent
            ? 'bg-primary-500/20'
            : 'bg-gray-700'
        }`}>
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <StepIcon className="w-3.5 h-3.5" />
          )}
        </div>
        <span className="text-sm font-medium whitespace-nowrap">{step.shortTitle}</span>
      </button>
    );
  };

  // Show loading while auto-scraping
  if (autoScraping) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-100 mb-2">Importing Your Company Data</h2>
          <p className="text-gray-400">Scanning {website} for services, pricing, and branding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Welcome Modal for New Users */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full border border-gray-700 shadow-2xl"
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 mb-6">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-100 mb-3">
                  Welcome to Your Training Platform!
                </h2>
                <p className="text-gray-400 mb-6">
                  Let's personalize your experience. This configuration wizard will help you set up:
                </p>

                <div className="grid grid-cols-2 gap-3 mb-8 text-left">
                  <div className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">Company Info</p>
                      <p className="text-xs text-gray-400">Your business details</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                    <Package className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">Services & Packages</p>
                      <p className="text-xs text-gray-400">What you offer</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                    <Bot className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">AI Behavior</p>
                      <p className="text-xs text-gray-400">Customize training</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">Team Setup</p>
                      <p className="text-xs text-gray-400">Invite your team</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-primary-500/10 rounded-lg mb-6">
                  <Globe className="w-5 h-5 text-primary-400" />
                  <p className="text-sm text-primary-300">
                    <strong>Tip:</strong> Enter your website URL and we'll auto-import your company data!
                  </p>
                </div>

                <button
                  onClick={() => setShowWelcomeModal(false)}
                  className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Let's Get Started
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-xl">
                <Settings2 className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-100">Setup Your Organization</h1>
                <p className="text-sm text-gray-400">Click any section to configure</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              Exit Setup
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="py-3 space-y-3">
            {/* Business Info Row */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Business Info</p>
              <div className="flex flex-wrap gap-2">
                {businessSteps.map((step) => renderStepButton(step, STEPS.findIndex(s => s.id === step.id)))}
              </div>
            </div>

            {/* AI Settings Row */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Settings
              </p>
              <div className="flex flex-wrap gap-2">
                {aiSteps.map((step) => renderStepButton(step, STEPS.findIndex(s => s.id === step.id)))}
              </div>
            </div>

            {/* Team & Review Row */}
            <div className="flex gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Team</p>
                <div className="flex flex-wrap gap-2">
                  {teamSteps.map((step) => renderStepButton(step, STEPS.findIndex(s => s.id === step.id)))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Finish</p>
                <div className="flex flex-wrap gap-2">
                  {reviewSteps.map((step) => renderStepButton(step, STEPS.findIndex(s => s.id === step.id)))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span>Step {currentStep + 1} of {STEPS.length}</span>
                {STEPS[currentStep].required && (
                  <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-xs">Required</span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-100">
                {STEPS[currentStep].title}
              </h2>
              <p className="text-gray-400 mt-1">
                {STEPS[currentStep].description}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Step Component */}
            <CurrentStepComponent
              data={stepData[STEPS[currentStep].id] || {}}
              allStepData={stepData}
              onComplete={handleStepComplete}
              authFetch={authFetch}
              organization={organization}
              onEditStep={(stepIndex) => handleJumpToStep(stepIndex)}
            />

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentStep === 0
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="flex items-center gap-3">
                {!STEPS[currentStep].required && (
                  <button
                    onClick={handleSkip}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                    Skip for now
                  </button>
                )}

                {currentStep === STEPS.length - 1 && (
                  <button
                    onClick={completeSetup}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Finishing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Complete Setup
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
