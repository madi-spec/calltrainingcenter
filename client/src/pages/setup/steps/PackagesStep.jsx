import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Save, Wand2, CheckCircle2 } from 'lucide-react';
import { INDUSTRIES } from '../../../utils/industryTerminology';

const PEST_CONTROL_PACKAGES = [
  {
    name: 'Basic Protection',
    description: 'Essential pest control for common household pests',
    initialPrice: 149,
    recurringPrice: 49,
    frequency: 'quarterly',
    sellingPoints: [
      'Covers common household pests',
      'Quarterly treatments',
      'Interior and exterior service'
    ]
  },
  {
    name: 'Premium Protection',
    description: 'Comprehensive coverage including specialty pests',
    initialPrice: 249,
    recurringPrice: 79,
    frequency: 'bi-monthly',
    sellingPoints: [
      'All Basic features plus termite monitoring',
      'Bi-monthly treatments',
      'Priority scheduling',
      'Extended warranty'
    ]
  },
  {
    name: 'Complete Protection',
    description: 'Our most comprehensive pest management solution',
    initialPrice: 399,
    recurringPrice: 129,
    frequency: 'monthly',
    sellingPoints: [
      'All Premium features plus mosquito control',
      'Monthly treatments',
      'Same-day service',
      'Full pest guarantee',
      'Free re-services'
    ]
  }
];

const LAWN_CARE_PACKAGES = [
  {
    name: 'Basic Lawn Program',
    description: 'Essential fertilization and weed control for a healthy lawn',
    initialPrice: 99,
    recurringPrice: 65,
    frequency: 'quarterly',
    sellingPoints: [
      '4 seasonal fertilizer applications',
      'Pre-emergent weed control',
      'Basic lawn analysis',
      'Satisfaction guaranteed'
    ]
  },
  {
    name: 'Premium Lawn Care',
    description: 'Comprehensive lawn health program with specialty treatments',
    initialPrice: 149,
    recurringPrice: 95,
    frequency: 'bi-monthly',
    sellingPoints: [
      'All Basic features plus grub control',
      '6 applications per year',
      'Disease and insect monitoring',
      'Priority service scheduling',
      'Free service calls'
    ]
  },
  {
    name: 'Complete Lawn Solution',
    description: 'Our most comprehensive turf management program',
    initialPrice: 249,
    recurringPrice: 135,
    frequency: 'monthly',
    sellingPoints: [
      'All Premium features plus aeration',
      'Monthly lawn health visits',
      'Soil testing and amendments',
      'Fungus and disease treatment',
      'Tree and shrub care',
      'Same-day service guarantee'
    ]
  }
];

const COMBINED_PACKAGES = [
  {
    name: 'Essential Home Care',
    description: 'Basic pest control and lawn fertilization bundle',
    initialPrice: 199,
    recurringPrice: 99,
    frequency: 'quarterly',
    sellingPoints: [
      'Quarterly pest treatments',
      'Seasonal fertilization',
      'Pre-emergent weed control',
      'Interior and exterior pest service'
    ]
  },
  {
    name: 'Complete Property Care',
    description: 'Comprehensive pest and lawn care protection',
    initialPrice: 299,
    recurringPrice: 149,
    frequency: 'bi-monthly',
    sellingPoints: [
      'Bi-monthly pest control',
      'Full lawn care program',
      'Grub and termite monitoring',
      'Priority scheduling',
      'Integrated pest management'
    ]
  },
  {
    name: 'Ultimate Property Protection',
    description: 'Premium full-service pest and lawn management',
    initialPrice: 499,
    recurringPrice: 229,
    frequency: 'monthly',
    sellingPoints: [
      'Monthly pest and lawn visits',
      'Mosquito and tick control',
      'Aeration and overseeding',
      'Tree and shrub care',
      'Same-day emergency service',
      'Full property guarantee'
    ]
  }
];

function getDefaultPackages(industry) {
  switch (industry) {
    case INDUSTRIES.LAWN_CARE:
      return LAWN_CARE_PACKAGES;
    case INDUSTRIES.BOTH:
      return COMBINED_PACKAGES;
    case INDUSTRIES.PEST_CONTROL:
    default:
      return PEST_CONTROL_PACKAGES;
  }
}

// Helper to parse price strings like "$49", "$49/month", "49.99" into numbers
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  if (typeof priceStr === 'number') return priceStr;
  // Remove currency symbols and extract first number
  const match = priceStr.toString().match(/[\d,.]+/);
  if (match) {
    return parseFloat(match[0].replace(',', '')) || 0;
  }
  return 0;
}

// Helper to normalize frequency strings
function normalizeFrequency(freq) {
  if (!freq) return 'monthly';
  const lower = freq.toLowerCase();
  if (lower.includes('month')) return 'monthly';
  if (lower.includes('quarter')) return 'quarterly';
  if (lower.includes('bi-month') || lower.includes('every other') || lower.includes('every 2')) return 'bi-monthly';
  if (lower.includes('annual') || lower.includes('year')) return 'annually';
  if (lower.includes('one') || lower.includes('single')) return 'one-time';
  return 'monthly';
}

// Convert extracted packages from website scraping to our format
function convertExtractedPackages(extractedPackages) {
  if (!extractedPackages || !Array.isArray(extractedPackages)) return [];

  return extractedPackages.map(pkg => ({
    name: pkg.name || 'Untitled Package',
    description: pkg.description || '',
    initialPrice: parsePrice(pkg.price) || parsePrice(pkg.initial_price) || 0,
    recurringPrice: parsePrice(pkg.recurring_price) || parsePrice(pkg.price) || 0,
    frequency: normalizeFrequency(pkg.frequency),
    sellingPoints: pkg.features || pkg.selling_points || []
  }));
}

export default function PackagesStep({ data, allStepData, onComplete, authFetch }) {
  // Check for extracted packages from website scraping
  console.log('[PACKAGES] allStepData received:', allStepData);
  console.log('[PACKAGES] allStepData.company:', allStepData?.company);
  const extractedPackages = allStepData?.company?.extractedPackages || [];
  console.log('[PACKAGES] extractedPackages:', extractedPackages);
  const hasExtractedPackages = extractedPackages.length > 0;

  // Get selected industry
  const selectedIndustry = allStepData?.industry || INDUSTRIES.PEST_CONTROL;
  const defaultPackages = getDefaultPackages(selectedIndustry);

  // Initialize with existing data, or extracted packages if available
  const initialPackages = data.packages?.length > 0
    ? data.packages
    : hasExtractedPackages
      ? convertExtractedPackages(extractedPackages)
      : [];

  const [packages, setPackages] = useState(initialPackages);
  const [usedExtractedData, setUsedExtractedData] = useState(hasExtractedPackages && initialPackages.length > 0);
  const [expandedPackage, setExpandedPackage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Update packages if extracted packages become available after mount
  useEffect(() => {
    if (hasExtractedPackages && packages.length === 0) {
      console.log('[PACKAGES] Updating packages from extracted data:', extractedPackages);
      const converted = convertExtractedPackages(extractedPackages);
      setPackages(converted);
      setUsedExtractedData(true);
    }
  }, [hasExtractedPackages, extractedPackages, packages.length]);

  const handleUseDefaults = () => {
    setPackages(defaultPackages);
  };

  const handleGenerateWithAI = async () => {
    setGenerating(true);
    try {
      const response = await authFetch('/api/products/generate-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.packages) {
          setPackages(data.packages);
        }
      }
    } catch (error) {
      console.error('Failed to generate packages:', error);
      // Fall back to industry-specific defaults
      setPackages(defaultPackages);
    } finally {
      setGenerating(false);
    }
  };

  const addPackage = () => {
    const newPackage = {
      name: '',
      description: '',
      initialPrice: 0,
      recurringPrice: 0,
      frequency: 'monthly',
      sellingPoints: []
    };
    setPackages([...packages, newPackage]);
    setExpandedPackage(packages.length);
  };

  const updatePackage = (index, field, value) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    setPackages(updated);
  };

  const removePackage = (index) => {
    setPackages(packages.filter((_, i) => i !== index));
    setExpandedPackage(null);
  };

  const addSellingPoint = (index) => {
    const updated = [...packages];
    updated[index].sellingPoints = [...(updated[index].sellingPoints || []), ''];
    setPackages(updated);
  };

  const updateSellingPoint = (packageIndex, pointIndex, value) => {
    const updated = [...packages];
    updated[packageIndex].sellingPoints[pointIndex] = value;
    setPackages(updated);
  };

  const removeSellingPoint = (packageIndex, pointIndex) => {
    const updated = [...packages];
    updated[packageIndex].sellingPoints = updated[packageIndex].sellingPoints.filter((_, i) => i !== pointIndex);
    setPackages(updated);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // During setup, we just pass packages to complete-setup which stores them
      // in the organization's pricing field. Individual package records
      // require service_line_id which isn't set up yet during initial setup.
      console.log('[PACKAGES] Saving packages:', packages);
      onComplete({ packages });
    } catch (error) {
      console.error('Failed to save packages:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Extracted Packages Notice */}
      {usedExtractedData && packages.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">
              {packages.length} package{packages.length !== 1 ? 's' : ''} pre-filled from your website
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Review and adjust the details below, then save to continue.
          </p>
        </div>
      )}

      {/* Quick Start Options */}
      {packages.length === 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Quick Start</h3>
          <p className="text-gray-400 mb-6">
            Choose how you'd like to set up your service packages
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={handleUseDefaults}
              className="p-4 bg-gray-700 hover:bg-gray-600 rounded-xl border border-gray-600 text-left transition-colors"
            >
              <h4 className="font-medium text-gray-200 mb-1">Use Template</h4>
              <p className="text-sm text-gray-400">
                Start with our standard 3-tier package structure
              </p>
            </button>

            <button
              onClick={handleGenerateWithAI}
              disabled={generating}
              className="p-4 bg-primary-500/10 hover:bg-primary-500/20 rounded-xl border border-primary-500/30 text-left transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                {generating ? (
                  <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 text-primary-400" />
                )}
                <h4 className="font-medium text-primary-300">Generate with AI</h4>
              </div>
              <p className="text-sm text-gray-400">
                Create customized packages based on your company info
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Package List */}
      {packages.length > 0 && (
        <div className="space-y-4">
          {packages.map((pkg, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedPackage(expandedPackage === index ? null : index)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 font-bold">
                    {index + 1}
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-200">
                      {pkg.name || 'New Package'}
                    </h4>
                    <p className="text-sm text-gray-400">
                      ${pkg.recurringPrice}/{pkg.frequency}
                    </p>
                  </div>
                </div>
                {expandedPackage === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedPackage === index && (
                <div className="p-4 pt-0 space-y-4 border-t border-gray-700">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Package Name
                      </label>
                      <input
                        type="text"
                        value={pkg.name}
                        onChange={(e) => updatePackage(index, 'name', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
                        placeholder="Premium Protection"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Service Frequency
                      </label>
                      <select
                        value={pkg.frequency}
                        onChange={(e) => updatePackage(index, 'frequency', e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="bi-monthly">Bi-Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annually">Annually</option>
                        <option value="one-time">One-Time</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Initial Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={pkg.initialPrice}
                          onChange={(e) => updatePackage(index, 'initialPrice', parseInt(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Recurring Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          value={pkg.recurringPrice}
                          onChange={(e) => updatePackage(index, 'recurringPrice', parseInt(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={pkg.description}
                      onChange={(e) => updatePackage(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
                      placeholder="Brief description of this package..."
                    />
                  </div>

                  {/* Selling Points */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Selling Points
                    </label>
                    <div className="space-y-2">
                      {(pkg.sellingPoints || []).map((point, pointIndex) => (
                        <div key={pointIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={point}
                            onChange={(e) => updateSellingPoint(index, pointIndex, e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
                            placeholder="Key benefit..."
                          />
                          <button
                            onClick={() => removeSellingPoint(index, pointIndex)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addSellingPoint(index)}
                        className="flex items-center gap-2 px-3 py-2 text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add selling point
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => removePackage(index)}
                      className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Package
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addPackage}
            className="w-full flex items-center justify-center gap-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 border-dashed text-gray-400 hover:text-gray-300 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Another Package
          </button>
        </div>
      )}

      {/* Submit Button */}
      {packages.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save & Continue
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
