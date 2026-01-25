import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import CompanyInfoStep from './steps/CompanyInfoStep';
import ServiceLinesStep from './steps/ServiceLinesStep';
import PackagesStep from './steps/PackagesStep';
import ObjectionsStep from './steps/ObjectionsStep';
import CompetitorsStep from './steps/CompetitorsStep';
import TeamSetupStep from './steps/TeamSetupStep';
import ReviewStep from './steps/ReviewStep';

const STEPS = [
  {
    id: 'company',
    title: 'Company Info',
    description: 'Basic information about your business',
    icon: Building2,
    component: CompanyInfoStep,
    required: true
  },
  {
    id: 'serviceLines',
    title: 'Service Lines',
    description: 'Select the services you offer',
    icon: Layers,
    component: ServiceLinesStep,
    required: false
  },
  {
    id: 'packages',
    title: 'Packages',
    description: 'Configure your service packages',
    icon: Package,
    component: PackagesStep,
    required: false
  },
  {
    id: 'objections',
    title: 'Objections',
    description: 'Set up objection handling',
    icon: MessageSquare,
    component: ObjectionsStep,
    required: false
  },
  {
    id: 'competitors',
    title: 'Competitors',
    description: 'Add competitor information',
    icon: Swords,
    component: CompetitorsStep,
    required: false
  },
  {
    id: 'team',
    title: 'Team',
    description: 'Invite your team members',
    icon: Users,
    component: TeamSetupStep,
    required: false
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review and complete setup',
    icon: ClipboardCheck,
    component: ReviewStep,
    required: true
  }
];

export default function SetupWizard() {
  const navigate = useNavigate();
  const { authFetch, role } = useAuth();
  const { organization, refreshOrganization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Only admins/owners can access setup
  useEffect(() => {
    if (!['admin', 'owner'].includes(role)) {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  const CurrentStepComponent = STEPS[currentStep].component;

  const handleStepComplete = (data) => {
    setStepData(prev => ({
      ...prev,
      [STEPS[currentStep].id]: data
    }));

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeSetup();
    }
  };

  const handleSkip = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeSetup();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeSetup = async () => {
    setSaving(true);
    setError(null);

    try {
      // Mark organization setup as complete
      console.log('[SETUP] Completing setup with data:', stepData);
      console.log('[SETUP] Company data being sent:', {
        logo_url: stepData?.company?.logo_url,
        brand_colors: stepData?.company?.brand_colors
      });
      const response = await authFetch('/api/organizations/complete-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupData: stepData })
      });

      console.log('[SETUP] Response status:', response.status);

      if (response.ok) {
        console.log('[SETUP] API call succeeded, refreshing organization...');
        try {
          await refreshOrganization();
        } catch (refreshErr) {
          console.warn('[SETUP] Failed to refresh organization, continuing anyway:', refreshErr);
        }
        console.log('[SETUP] Navigating to dashboard');
        navigate('/dashboard');
      } else {
        let errorMessage = 'Failed to complete setup';
        try {
          const data = await response.json();
          console.error('[SETUP] Setup failed:', data);
          errorMessage = data.error || errorMessage;
        } catch (parseErr) {
          console.error('[SETUP] Failed to parse error response:', parseErr);
        }
        setError(errorMessage);
      }
    } catch (err) {
      console.error('[SETUP] Error during setup:', err);
      setError(`An error occurred: ${err.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">Setup Your Organization</h1>
              <p className="text-sm text-gray-400">Let's configure your training platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => index < currentStep && setCurrentStep(index)}
                    disabled={index > currentStep}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-primary-500/20 text-primary-400'
                        : isComplete
                        ? 'text-green-400 hover:bg-gray-700 cursor-pointer'
                        : 'text-gray-500'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isComplete
                        ? 'bg-green-500/20'
                        : isCurrent
                        ? 'bg-primary-500/20'
                        : 'bg-gray-700'
                    }`}>
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="hidden md:inline text-sm font-medium">{step.title}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className={`w-5 h-5 mx-2 ${
                      index < currentStep ? 'text-green-400' : 'text-gray-600'
                    }`} />
                  )}
                </div>
              );
            })}
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
              onEditStep={(stepIndex) => setCurrentStep(stepIndex)}
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
