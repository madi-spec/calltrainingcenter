import { motion } from 'framer-motion';
import { Bug, Sprout, Home, CheckCircle2 } from 'lucide-react';
import { INDUSTRIES, INDUSTRY_LABELS } from '../../../utils/industryTerminology';

const INDUSTRY_OPTIONS = [
  {
    id: INDUSTRIES.PEST_CONTROL,
    label: INDUSTRY_LABELS[INDUSTRIES.PEST_CONTROL],
    icon: Bug,
    description: 'Pest control, extermination, and related services',
    examples: ['Residential Pest Control', 'Commercial Pest Management', 'Termite Services', 'Wildlife Control'],
    color: 'blue'
  },
  {
    id: INDUSTRIES.LAWN_CARE,
    label: INDUSTRY_LABELS[INDUSTRIES.LAWN_CARE],
    icon: Sprout,
    description: 'Lawn care, fertilization, and turf management',
    examples: ['Fertilization Programs', 'Weed Control', 'Aeration & Seeding', 'Grub Control'],
    color: 'green'
  },
  {
    id: INDUSTRIES.BOTH,
    label: INDUSTRY_LABELS[INDUSTRIES.BOTH],
    icon: Home,
    description: 'Full-service pest control and lawn care',
    examples: ['Integrated Pest & Lawn', 'Full Property Care', 'Combination Packages', 'Year-Round Service'],
    color: 'indigo'
  }
];

const colorClasses = {
  blue: {
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    hover: 'hover:border-blue-400',
    ring: 'ring-blue-500'
  },
  green: {
    border: 'border-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    hover: 'hover:border-green-400',
    ring: 'ring-green-500'
  },
  indigo: {
    border: 'border-indigo-500',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    hover: 'hover:border-indigo-400',
    ring: 'ring-indigo-500'
  }
};

export default function IndustryStep({ data, onComplete }) {
  const selectedIndustry = data.industry || '';

  const handleSelect = (industryId) => {
    const updatedData = { industry: industryId };
    // Save and advance to next step
    if (onComplete) {
      onComplete(updatedData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-100 mb-2">
          What industry are you in?
        </h2>
        <p className="text-gray-400">
          This helps us customize the training experience for your team
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {INDUSTRY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const colors = colorClasses[option.color];
          const isSelected = selectedIndustry === option.id;

          return (
            <motion.button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}`
                  : `border-gray-700 bg-gray-800/50 ${colors.hover}`
              }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <CheckCircle2 className={`w-6 h-6 ${colors.text}`} />
                </div>
              )}

              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${colors.bg} mb-4`}>
                <Icon className={`w-6 h-6 ${colors.text}`} />
              </div>

              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                {option.label}
              </h3>

              <p className="text-sm text-gray-400 mb-4">
                {option.description}
              </p>

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Examples:
                </p>
                {option.examples.map((example, i) => (
                  <p key={i} className="text-xs text-gray-400">
                    • {example}
                  </p>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>

      {selectedIndustry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
        >
          <p className="text-sm text-gray-300">
            <span className="font-medium text-gray-100">Selected:</span>{' '}
            {INDUSTRY_OPTIONS.find(o => o.id === selectedIndustry)?.label}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            We'll customize terminology, scenarios, and training content to match your industry.
          </p>
        </motion.div>
      )}
    </div>
  );
}
