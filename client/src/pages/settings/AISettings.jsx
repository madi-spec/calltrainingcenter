import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Save,
  RotateCcw,
  Sliders,
  Volume2,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  Heart,
  Shield,
  Zap,
  Users,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useNotifications } from '../../context/NotificationContext';

// Wizard configuration for Agent Prompt
const AGENT_WIZARD_STEPS = [
  {
    id: 'industry',
    title: 'Industry & Context',
    question: 'What industry is your company in?',
    type: 'select',
    options: [
      { value: 'pest_control', label: 'Pest Control' },
      { value: 'hvac', label: 'HVAC / Climate Control' },
      { value: 'plumbing', label: 'Plumbing' },
      { value: 'landscaping', label: 'Landscaping / Lawn Care' },
      { value: 'cleaning', label: 'Cleaning Services' },
      { value: 'home_security', label: 'Home Security' },
      { value: 'telecommunications', label: 'Telecommunications' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'financial', label: 'Financial Services' },
      { value: 'retail', label: 'Retail' },
      { value: 'other', label: 'Other Service Industry' }
    ]
  },
  {
    id: 'customerRealism',
    title: 'Customer Realism',
    question: 'How realistic should AI customers behave?',
    type: 'select',
    options: [
      { value: 'very_realistic', label: 'Very Realistic', description: 'Customers use filler words, interrupt, get emotional, and behave like real people' },
      { value: 'moderately_realistic', label: 'Moderately Realistic', description: 'Natural conversation flow with some emotional responses' },
      { value: 'professional', label: 'Professional', description: 'Customers are clear and direct, minimal emotional variance' }
    ]
  },
  {
    id: 'challengeLevel',
    title: 'Challenge Level',
    question: 'How challenging should customers be by default?',
    type: 'select',
    options: [
      { value: 'easy', label: 'Forgiving', description: 'Customers are patient and accept most solutions quickly' },
      { value: 'moderate', label: 'Moderate', description: 'Customers push back reasonably but can be satisfied with good service' },
      { value: 'demanding', label: 'Demanding', description: 'Customers require excellent service and won\'t accept mediocre responses' }
    ]
  },
  {
    id: 'escalationTriggers',
    title: 'Escalation Behavior',
    question: 'What should cause customers to become more upset?',
    type: 'multiselect',
    options: [
      { value: 'dismissive', label: 'Being dismissed or not heard' },
      { value: 'scripted', label: 'Overly scripted or robotic responses' },
      { value: 'no_solution', label: 'Not offering solutions' },
      { value: 'long_hold', label: 'Being put on hold or transferred repeatedly' },
      { value: 'no_empathy', label: 'Lack of empathy or understanding' },
      { value: 'incorrect_info', label: 'Receiving incorrect information' }
    ]
  },
  {
    id: 'deescalationTriggers',
    title: 'De-escalation Behavior',
    question: 'What should help calm frustrated customers?',
    type: 'multiselect',
    options: [
      { value: 'empathy', label: 'Genuine empathy and acknowledgment' },
      { value: 'ownership', label: 'Taking ownership of the issue' },
      { value: 'solutions', label: 'Offering concrete solutions' },
      { value: 'compensation', label: 'Offering appropriate compensation' },
      { value: 'expertise', label: 'Demonstrating product knowledge' },
      { value: 'followup', label: 'Promising and scheduling follow-up' }
    ]
  }
];

// Wizard configuration for Coaching Prompt
const COACHING_WIZARD_STEPS = [
  {
    id: 'coachingStyle',
    title: 'Coaching Style',
    question: 'What coaching style works best for your team?',
    type: 'select',
    options: [
      { value: 'encouraging', label: 'Encouraging & Supportive', description: 'Focus on positives first, gentle suggestions for improvement' },
      { value: 'balanced', label: 'Balanced', description: 'Equal focus on strengths and areas for improvement' },
      { value: 'direct', label: 'Direct & Results-Focused', description: 'Straight to the point with clear action items' }
    ]
  },
  {
    id: 'feedbackDetail',
    title: 'Feedback Detail',
    question: 'How detailed should the coaching feedback be?',
    type: 'select',
    options: [
      { value: 'concise', label: 'Concise', description: 'Key points only, quick to read' },
      { value: 'standard', label: 'Standard', description: 'Balanced detail with examples' },
      { value: 'comprehensive', label: 'Comprehensive', description: 'In-depth analysis with multiple examples and alternatives' }
    ]
  },
  {
    id: 'prioritySkills',
    title: 'Priority Skills',
    question: 'Which skills are most important to evaluate?',
    type: 'multiselect',
    options: [
      { value: 'empathy', label: 'Empathy & Rapport Building' },
      { value: 'problem_solving', label: 'Problem Resolution' },
      { value: 'product_knowledge', label: 'Product/Service Knowledge' },
      { value: 'professionalism', label: 'Professionalism & Tone' },
      { value: 'sales', label: 'Sales & Upselling' },
      { value: 'retention', label: 'Customer Retention' },
      { value: 'efficiency', label: 'Call Efficiency' },
      { value: 'compliance', label: 'Compliance & Script Adherence' }
    ]
  },
  {
    id: 'quoteExamples',
    title: 'Example Quotes',
    question: 'Should feedback include direct quotes from the call?',
    type: 'select',
    options: [
      { value: 'always', label: 'Always', description: 'Include quotes for every piece of feedback' },
      { value: 'key_moments', label: 'Key Moments Only', description: 'Quote only the most important exchanges' },
      { value: 'minimal', label: 'Minimal', description: 'Summarize without extensive quoting' }
    ]
  },
  {
    id: 'actionItems',
    title: 'Action Items',
    question: 'How should improvement suggestions be framed?',
    type: 'select',
    options: [
      { value: 'specific_scripts', label: 'Specific Scripts', description: 'Provide exact phrases they could use' },
      { value: 'techniques', label: 'Techniques & Principles', description: 'Teach the underlying technique to apply broadly' },
      { value: 'both', label: 'Both', description: 'Combine specific examples with broader techniques' }
    ]
  }
];

export default function AISettings() {
  const { authFetch } = useAuth();
  const { settings, updateAIConfig } = useOrganization();
  const notifications = useNotifications();
  const showSuccess = notifications?.showSuccess || ((title, msg) => console.log('Success:', title, msg));
  const showError = notifications?.showError || ((title, msg) => console.error('Error:', title, msg));

  // Voice preferences
  const [voiceOptions, setVoiceOptions] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesExpanded, setVoicesExpanded] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('11labs-Brian');

  // Scoring weights
  const [scoringWeights, setScoringWeights] = useState({
    empathyRapport: 20,
    problemResolution: 25,
    productKnowledge: 20,
    professionalism: 15,
    scenarioSpecific: 20
  });
  const [hasWeightChanges, setHasWeightChanges] = useState(false);
  const [savingWeights, setSavingWeights] = useState(false);

  // Wizard state
  const [activeWizard, setActiveWizard] = useState(null); // 'agent' | 'coaching' | null
  const [wizardStep, setWizardStep] = useState(0);
  const [agentWizardAnswers, setAgentWizardAnswers] = useState({});
  const [coachingWizardAnswers, setCoachingWizardAnswers] = useState({});
  const [savingPrompts, setSavingPrompts] = useState(false);

  // Current prompt status
  const [hasCustomPrompts, setHasCustomPrompts] = useState({ agent: false, coaching: false });
  const [promptsLoading, setPromptsLoading] = useState(true);

  // Fetch voices
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await authFetch('/api/scenarios/meta/voices');
        if (response.ok) {
          const data = await response.json();
          if (data.voices && data.voices.length > 0) {
            setVoiceOptions(data.voices.map(v => ({
              id: v.id,
              name: v.name,
              gender: v.gender === 'male' ? 'Male' : v.gender === 'female' ? 'Female' : 'Unknown',
              provider: v.provider
            })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch voices:', error);
      } finally {
        setVoicesLoading(false);
      }
    };
    fetchVoices();
  }, [authFetch]);

  // Load existing settings
  useEffect(() => {
    if (settings) {
      if (settings.voicePreferences?.defaultVoiceId) {
        setSelectedVoice(settings.voicePreferences.defaultVoiceId);
      }
      if (settings.scoringWeights) {
        setScoringWeights(settings.scoringWeights);
      }
    }
  }, [settings]);

  // Fetch custom prompts status
  useEffect(() => {
    const fetchPromptStatus = async () => {
      try {
        const response = await authFetch('/api/admin/prompts/custom');
        if (response?.ok) {
          const data = await response.json();
          setHasCustomPrompts({
            agent: !!data.customPrompts?.agent,
            coaching: !!(data.customPrompts?.coaching?.system || data.customPrompts?.coaching?.user)
          });

          // Load saved wizard answers if they exist
          if (data.customPrompts?.agentWizardAnswers) {
            setAgentWizardAnswers(data.customPrompts.agentWizardAnswers);
          }
          if (data.customPrompts?.coachingWizardAnswers) {
            setCoachingWizardAnswers(data.customPrompts.coachingWizardAnswers);
          }
        }
      } catch (error) {
        console.error('Error fetching prompt status:', error);
      } finally {
        setPromptsLoading(false);
      }
    };
    if (authFetch) fetchPromptStatus();
  }, [authFetch]);

  const totalWeight = Object.values(scoringWeights).reduce((a, b) => a + b, 0);

  const handleWeightChange = (category, value) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    setScoringWeights(prev => ({ ...prev, [category]: numValue }));
    setHasWeightChanges(true);
  };

  const handleSaveWeights = async () => {
    if (totalWeight !== 100) {
      showError('Invalid Weights', 'Scoring weights must add up to 100%');
      return;
    }
    setSavingWeights(true);
    try {
      await updateAIConfig({ scoringWeights });
      showSuccess('Settings Saved', 'Scoring weights updated successfully');
      setHasWeightChanges(false);
    } catch (error) {
      showError('Error', error.message || 'Failed to save settings');
    } finally {
      setSavingWeights(false);
    }
  };

  const handleSaveVoice = async () => {
    try {
      await updateAIConfig({
        voicePreferences: {
          defaultVoiceId: selectedVoice,
          allowedVoices: []
        }
      });
      showSuccess('Voice Updated', 'Default voice preference saved');
    } catch (error) {
      showError('Error', error.message || 'Failed to save voice preference');
    }
  };

  // Wizard navigation
  const currentWizardSteps = activeWizard === 'agent' ? AGENT_WIZARD_STEPS : COACHING_WIZARD_STEPS;
  const currentAnswers = activeWizard === 'agent' ? agentWizardAnswers : coachingWizardAnswers;
  const setCurrentAnswers = activeWizard === 'agent' ? setAgentWizardAnswers : setCoachingWizardAnswers;

  const handleWizardAnswer = (stepId, value) => {
    setCurrentAnswers(prev => ({ ...prev, [stepId]: value }));
  };

  const handleMultiselectToggle = (stepId, value) => {
    setCurrentAnswers(prev => {
      const current = prev[stepId] || [];
      if (current.includes(value)) {
        return { ...prev, [stepId]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [stepId]: [...current, value] };
      }
    });
  };

  const canProceed = () => {
    const step = currentWizardSteps[wizardStep];
    const answer = currentAnswers[step.id];
    if (step.type === 'multiselect') {
      return answer && answer.length > 0;
    }
    return !!answer;
  };

  const generateAgentPrompt = (answers) => {
    const industry = answers.industry || 'service';
    const realism = answers.customerRealism || 'moderately_realistic';
    const challenge = answers.challengeLevel || 'moderate';
    const escalations = answers.escalationTriggers || ['dismissive', 'no_empathy'];
    const deescalations = answers.deescalationTriggers || ['empathy', 'solutions'];

    const realismInstructions = {
      very_realistic: `- Use natural speech patterns with filler words like "um", "uh", "you know"
- Occasionally interrupt or talk over the CSR when frustrated
- Show realistic emotional progression throughout the call
- Reference personal circumstances and real-life context
- Don't always have perfect information about your account`,
      moderately_realistic: `- Use natural conversational language
- Show appropriate emotional responses to the situation
- Be clear about your needs while maintaining realism
- React naturally to good or poor service`,
      professional: `- Communicate clearly and directly
- Stay focused on the issue at hand
- Be reasonable and open to solutions
- Maintain a professional demeanor throughout`
    };

    const challengeInstructions = {
      easy: `- Be patient and give the CSR time to help
- Accept reasonable solutions readily
- Express appreciation for good efforts
- Don't require perfect responses to be satisfied`,
      moderate: `- Push back on solutions that don't fully address your concerns
- Require the CSR to demonstrate understanding before accepting help
- Be fair but expect competent service
- Give credit when the CSR does well`,
      demanding: `- Expect excellent service and won't settle for less
- Challenge vague or incomplete answers
- Require specific details and commitments
- Only accept solutions that truly address your needs`
    };

    const escalationMap = {
      dismissive: 'The CSR dismisses or minimizes your concerns',
      scripted: 'Responses feel robotic or overly scripted',
      no_solution: 'No concrete solution is offered',
      long_hold: 'You\'re put on hold repeatedly or transferred without resolution',
      no_empathy: 'The CSR shows no empathy or understanding',
      incorrect_info: 'You receive incorrect or contradictory information'
    };

    const deescalationMap = {
      empathy: 'The CSR genuinely acknowledges your feelings and frustration',
      ownership: 'The CSR takes personal ownership of resolving your issue',
      solutions: 'Concrete, actionable solutions are offered',
      compensation: 'Appropriate compensation or goodwill gestures are offered',
      expertise: 'The CSR demonstrates confident product knowledge',
      followup: 'Clear follow-up steps and timelines are provided'
    };

    return `You are playing the role of a customer calling {{company.name}}. You are participating in a training simulation for customer service representatives.

## Your Character
Name: {{scenario.customerName}}
Personality: {{scenario.personality}}
Emotional State: {{scenario.emotionalState}}
Background: {{scenario.customerBackground}}

## The Situation
{{scenario.situation}}

## Your Goals
{{scenario.customerGoals}}

## Conversation Style
${realismInstructions[realism]}

## Challenge Level
${challengeInstructions[challenge]}

## When to Escalate (become more frustrated)
${escalations.map(e => `- ${escalationMap[e]}`).join('\n')}

## When to De-escalate (calm down)
${deescalations.map(d => `- ${deescalationMap[d]}`).join('\n')}

## Company Context (use naturally when relevant)
- Company: {{company.name}}
- Services: {{company.services}}
- Quarterly price: ${{company.pricing.quarterlyPrice}}
{{#if company.guarantees}}- Guarantee: {{company.guarantees}}{{/if}}

## Key Points to Mention
{{scenario.keyPointsToMention}}

## Resolution Conditions
{{scenario.resolutionConditions}}

Remember: This is training - challenge the CSR appropriately but be fair. Give them opportunities to succeed when they use good techniques.`;
  };

  const generateCoachingPrompts = (answers) => {
    const style = answers.coachingStyle || 'balanced';
    const detail = answers.feedbackDetail || 'standard';
    const skills = answers.prioritySkills || ['empathy', 'problem_solving', 'professionalism'];
    const quotes = answers.quoteExamples || 'key_moments';
    const actions = answers.actionItems || 'both';

    const styleInstructions = {
      encouraging: 'Lead with strengths and positive observations. Frame improvements as opportunities for growth. Use encouraging language.',
      balanced: 'Provide equal weight to strengths and areas for improvement. Be constructive and objective.',
      direct: 'Be straightforward and results-focused. Prioritize actionable feedback over pleasantries.'
    };

    const detailInstructions = {
      concise: 'Keep feedback brief and focused on the most important points. Limit to 2-3 key strengths and improvements.',
      standard: 'Provide thorough feedback with examples. Include 3-4 strengths and improvements with context.',
      comprehensive: 'Provide in-depth analysis covering all aspects of the call. Include multiple examples and detailed alternatives.'
    };

    const quoteInstructions = {
      always: 'Include direct quotes from the transcript for every piece of feedback.',
      key_moments: 'Quote only the most significant exchanges that illustrate key points.',
      minimal: 'Summarize observations without extensive quoting.'
    };

    const actionInstructions = {
      specific_scripts: 'Provide exact phrases and scripts the CSR could use in similar situations.',
      techniques: 'Focus on teaching underlying techniques and principles that can be applied broadly.',
      both: 'Combine specific example phrases with explanations of the underlying techniques.'
    };

    const skillPriorities = skills.map(s => {
      const skillNames = {
        empathy: 'Empathy & Rapport Building',
        problem_solving: 'Problem Resolution',
        product_knowledge: 'Product/Service Knowledge',
        professionalism: 'Professionalism & Tone',
        sales: 'Sales & Upselling Techniques',
        retention: 'Customer Retention',
        efficiency: 'Call Efficiency & Time Management',
        compliance: 'Compliance & Script Adherence'
      };
      return skillNames[s];
    }).join(', ');

    const systemPrompt = `You are an expert customer service coach specializing in call center training.
Your role is to provide detailed, constructive feedback on call performance.

Coaching Style: ${styleInstructions[style]}

Always respond with valid JSON matching the exact schema provided.
Be specific with feedback - ${quoteInstructions[quotes]}
${actionInstructions[actions]}

Priority areas to evaluate: ${skillPriorities}`;

    const userPrompt = `Analyze this CSR training call and provide a comprehensive coaching scorecard.

## Call Context
- Scenario: {{scenario.name}}
- Difficulty: {{scenario.difficulty}}
- Company: {{company.name}}
- Call Duration: {{callDuration}} seconds
- Scenario Goal: {{scenario.csrObjective}}

## Transcript
{{transcript}}

## Evaluation Focus
Priority skills to assess: ${skillPriorities}

## Scoring Criteria

### 1. Empathy & Rapport (0-100)
- Active listening indicators
- Emotional acknowledgment
- Building connection with the customer

### 2. Problem Resolution (0-100)
- Understanding the core issue
- Providing effective solutions
- Following through on commitments

### 3. Product Knowledge (0-100)
- Accuracy of information provided
- Confidence in answers
- Appropriate recommendations

### 4. Professionalism (0-100)
- Tone and language appropriateness
- Handling objections gracefully
- Maintaining call control

### 5. Scenario-Specific Performance (0-100)
- Met the specific scenario objectives
- Handled scenario-specific challenges
- Achieved the desired outcome

## Feedback Guidelines
- Detail level: ${detailInstructions[detail]}
- Quote usage: ${quoteInstructions[quotes]}
- Improvement suggestions: ${actionInstructions[actions]}

Respond with JSON in this exact format:
{
  "overallScore": 0-100,
  "categories": {
    "empathyRapport": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "problemResolution": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "productKnowledge": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "professionalism": { "score": 0-100, "feedback": "Specific feedback", "keyMoments": [] },
    "scenarioSpecific": { "score": 0-100, "feedback": "Scenario-specific feedback", "keyMoments": [] }
  },
  "strengths": [{ "title": "Strength", "description": "Why effective", "quote": "Example quote" }],
  "improvements": [{ "title": "Area", "issue": "What went wrong", "quote": "What they said", "alternative": "Better approach" }],
  "keyMoment": { "timestamp": "When", "description": "What happened", "impact": "Effect", "betterApproach": "Alternative" },
  "summary": "2-3 sentence overall assessment",
  "nextSteps": ["Action item 1", "Action item 2", "Action item 3"]
}`;

    return { system: systemPrompt, user: userPrompt };
  };

  const handleFinishWizard = async () => {
    setSavingPrompts(true);
    try {
      let payload = {};

      if (activeWizard === 'agent') {
        const agentPrompt = generateAgentPrompt(agentWizardAnswers);
        payload = {
          agentPrompt,
          agentWizardAnswers,
          // Preserve existing coaching prompts
          preserveCoaching: true
        };
      } else {
        const { system, user } = generateCoachingPrompts(coachingWizardAnswers);
        payload = {
          coachingSystemPrompt: system,
          coachingUserPrompt: user,
          coachingWizardAnswers,
          // Preserve existing agent prompt
          preserveAgent: true
        };
      }

      const response = await authFetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response?.ok) {
        showSuccess('Configuration Saved', `${activeWizard === 'agent' ? 'Customer behavior' : 'Coaching'} settings have been saved`);
        setHasCustomPrompts(prev => ({
          ...prev,
          [activeWizard]: true
        }));
        setActiveWizard(null);
        setWizardStep(0);
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      showError('Error', error.message || 'Failed to save configuration');
    } finally {
      setSavingPrompts(false);
    }
  };

  const handleResetPrompt = async (type) => {
    try {
      const payload = type === 'agent'
        ? { agentPrompt: null, agentWizardAnswers: null, preserveCoaching: true }
        : { coachingSystemPrompt: null, coachingUserPrompt: null, coachingWizardAnswers: null, preserveAgent: true };

      const response = await authFetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response?.ok) {
        showSuccess('Reset Complete', `${type === 'agent' ? 'Customer behavior' : 'Coaching'} settings reset to defaults`);
        setHasCustomPrompts(prev => ({ ...prev, [type]: false }));
        if (type === 'agent') {
          setAgentWizardAnswers({});
        } else {
          setCoachingWizardAnswers({});
        }
      }
    } catch (error) {
      showError('Error', error.message || 'Failed to reset configuration');
    }
  };

  // Render wizard
  const renderWizard = () => {
    const steps = currentWizardSteps;
    const step = steps[wizardStep];
    const progress = ((wizardStep + 1) / steps.length) * 100;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-100">
                {activeWizard === 'agent' ? 'Customer Behavior Setup' : 'Coaching Style Setup'}
              </h2>
              <button
                onClick={() => { setActiveWizard(null); setWizardStep(0); }}
                className="text-gray-400 hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Step {wizardStep + 1} of {steps.length}: {step.title}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-100 mb-6">{step.question}</h3>

            {step.type === 'select' && (
              <div className="space-y-3">
                {step.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleWizardAnswer(step.id, option.value)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      currentAnswers[step.id] === option.value
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-100">{option.label}</span>
                      {currentAnswers[step.id] === option.value && (
                        <Check className="w-5 h-5 text-primary-400" />
                      )}
                    </div>
                    {option.description && (
                      <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {step.type === 'multiselect' && (
              <div className="space-y-3">
                {step.options.map((option) => {
                  const selected = (currentAnswers[step.id] || []).includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleMultiselectToggle(step.id, option.value)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-750'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-100">{option.label}</span>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          selected ? 'bg-primary-500 border-primary-500' : 'border-gray-600'
                        }`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
                <p className="text-sm text-gray-500 mt-2">Select all that apply</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700 flex items-center justify-between">
            <button
              onClick={() => setWizardStep(prev => prev - 1)}
              disabled={wizardStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {wizardStep < steps.length - 1 ? (
              <button
                onClick={() => setWizardStep(prev => prev + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinishWizard}
                disabled={!canProceed() || savingPrompts}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
              >
                {savingPrompts ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Finish & Save
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">AI Configuration</h1>
        <p className="text-gray-400 mt-1">
          Customize how AI customers behave and how coaching feedback is delivered
        </p>
      </div>

      {/* Scoring Weights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Sliders className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Scoring Weights</h2>
              <p className="text-sm text-gray-400">Adjust how different categories impact the overall score</p>
            </div>
          </div>
          {hasWeightChanges && (
            <button
              onClick={handleSaveWeights}
              disabled={savingWeights || totalWeight !== 100}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              {savingWeights ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          )}
        </div>

        {totalWeight !== 100 && (
          <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-400">
              Weights must add up to 100% (currently {totalWeight}%)
            </p>
          </div>
        )}

        <div className="space-y-4">
          {[
            { key: 'empathyRapport', label: 'Empathy & Rapport', icon: Heart },
            { key: 'problemResolution', label: 'Problem Resolution', icon: Target },
            { key: 'productKnowledge', label: 'Product Knowledge', icon: Zap },
            { key: 'professionalism', label: 'Professionalism', icon: Shield },
            { key: 'scenarioSpecific', label: 'Scenario Specific', icon: Sparkles }
          ].map((category) => (
            <div key={category.key} className="flex items-center gap-4">
              <div className="w-48 flex items-center gap-2">
                <category.icon className="w-4 h-4 text-gray-500" />
                <span className="text-gray-300">{category.label}</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={scoringWeights[category.key]}
                onChange={(e) => handleWeightChange(category.key, e.target.value)}
                className="flex-1 accent-primary-500"
              />
              <div className="w-20 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={scoringWeights[category.key]}
                  onChange={(e) => handleWeightChange(category.key, e.target.value)}
                  className="w-14 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-center"
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between">
          <span className="text-gray-400">Total</span>
          <span className={`font-medium ${totalWeight === 100 ? 'text-green-400' : 'text-red-400'}`}>
            {totalWeight}%
          </span>
        </div>
      </motion.div>

      {/* Customer Behavior Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Bot className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Customer Behavior</h2>
              <p className="text-sm text-gray-400">
                Configure how AI customers act during training calls
                {hasCustomPrompts.agent && (
                  <span className="ml-2 text-xs text-cyan-400">(Customized)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasCustomPrompts.agent && (
              <button
                onClick={() => handleResetPrompt('agent')}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-300 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            <button
              onClick={() => { setActiveWizard('agent'); setWizardStep(0); }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {hasCustomPrompts.agent ? 'Reconfigure' : 'Configure'}
            </button>
          </div>
        </div>

        {hasCustomPrompts.agent && Object.keys(agentWizardAnswers).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-3">Current configuration:</p>
            <div className="flex flex-wrap gap-2">
              {agentWizardAnswers.industry && (
                <span className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
                  {AGENT_WIZARD_STEPS.find(s => s.id === 'industry')?.options.find(o => o.value === agentWizardAnswers.industry)?.label}
                </span>
              )}
              {agentWizardAnswers.customerRealism && (
                <span className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
                  {AGENT_WIZARD_STEPS.find(s => s.id === 'customerRealism')?.options.find(o => o.value === agentWizardAnswers.customerRealism)?.label}
                </span>
              )}
              {agentWizardAnswers.challengeLevel && (
                <span className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
                  {AGENT_WIZARD_STEPS.find(s => s.id === 'challengeLevel')?.options.find(o => o.value === agentWizardAnswers.challengeLevel)?.label} challenge
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Coaching Style Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <MessageSquare className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Coaching Style</h2>
              <p className="text-sm text-gray-400">
                Configure how feedback and scores are delivered
                {hasCustomPrompts.coaching && (
                  <span className="ml-2 text-xs text-purple-400">(Customized)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasCustomPrompts.coaching && (
              <button
                onClick={() => handleResetPrompt('coaching')}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-300 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            <button
              onClick={() => { setActiveWizard('coaching'); setWizardStep(0); }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {hasCustomPrompts.coaching ? 'Reconfigure' : 'Configure'}
            </button>
          </div>
        </div>

        {hasCustomPrompts.coaching && Object.keys(coachingWizardAnswers).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-3">Current configuration:</p>
            <div className="flex flex-wrap gap-2">
              {coachingWizardAnswers.coachingStyle && (
                <span className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
                  {COACHING_WIZARD_STEPS.find(s => s.id === 'coachingStyle')?.options.find(o => o.value === coachingWizardAnswers.coachingStyle)?.label}
                </span>
              )}
              {coachingWizardAnswers.feedbackDetail && (
                <span className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
                  {COACHING_WIZARD_STEPS.find(s => s.id === 'feedbackDetail')?.options.find(o => o.value === coachingWizardAnswers.feedbackDetail)?.label} detail
                </span>
              )}
              {coachingWizardAnswers.prioritySkills?.length > 0 && (
                <span className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
                  {coachingWizardAnswers.prioritySkills.length} priority skills
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Voice Preferences (Collapsible) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
      >
        <button
          onClick={() => setVoicesExpanded(!voicesExpanded)}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Volume2 className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-gray-100">Voice Preferences</h2>
              <p className="text-sm text-gray-400">
                Default voice for AI customer simulations
                {selectedVoice && (
                  <span className="ml-2 text-green-400">
                    ({voiceOptions.find(v => v.id === selectedVoice)?.name || selectedVoice})
                  </span>
                )}
              </p>
            </div>
          </div>
          {voicesExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {voicesExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 pt-0 border-t border-gray-700">
                {voicesLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading available voices...</span>
                  </div>
                ) : voiceOptions.length === 0 ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      No voices found. Please check your Retell configuration.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid md:grid-cols-4 gap-3 mt-4">
                      {voiceOptions.map((voice) => (
                        <button
                          key={voice.id}
                          onClick={() => setSelectedVoice(voice.id)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            selectedVoice === voice.id
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <p className="font-medium text-gray-100">{voice.name}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {voice.gender} {voice.provider ? `(${voice.provider})` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleSaveVoice}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save Voice Preference
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Wizard Modal */}
      <AnimatePresence>
        {activeWizard && renderWizard()}
      </AnimatePresence>
    </div>
  );
}
