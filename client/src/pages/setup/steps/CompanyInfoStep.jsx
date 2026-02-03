import { useState } from 'react';
import { Loader2, Globe, Phone, MapPin, Save, Sparkles, CheckCircle2, AlertCircle, Image, Palette } from 'lucide-react';
import { INDUSTRIES } from '../../../utils/industryTerminology';

export default function CompanyInfoStep({ data, allStepData, onComplete, authFetch, organization }) {
  // Handle both brand_colors (database) and colors (context-mapped) naming
  const orgColors = organization?.brand_colors || organization?.colors || {};

  const [formData, setFormData] = useState({
    name: organization?.name || data.name || '',
    phone: organization?.phone || data.phone || '',
    website: organization?.website || data.website || '',
    address: organization?.address || data.address || '',
    services: organization?.services || data.services || [],
    guarantees: organization?.guarantees || data.guarantees || [],
    logo_url: organization?.logo_url || data.logo_url || '',
    brand_colors: data.brand_colors || orgColors || { primary: '', secondary: '', accent: '' },
    tagline: organization?.tagline || data.tagline || ''
  });
  const [extractedPackages, setExtractedPackages] = useState(data.extractedPackages || []);
  const [extractedCompetitors, setExtractedCompetitors] = useState(data.competitors_mentioned || []);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState(null);
  const [scrapeError, setScrapeError] = useState(null);

  // Get selected industry (nested in stepData.industry.industry)
  const selectedIndustry = allStepData?.industry?.industry || INDUSTRIES.PEST_CONTROL;

  // Industry-specific services
  const getCommonServices = () => {
    switch (selectedIndustry) {
      case INDUSTRIES.LAWN_CARE:
        return [
          'Lawn Fertilization',
          'Weed Control',
          'Grub Control',
          'Aeration & Seeding',
          'Disease Control',
          'Insect Control',
          'Soil Testing',
          'Tree & Shrub Care',
          'Mosquito Control',
          'Tick Control'
        ];
      case INDUSTRIES.BOTH:
        return [
          'General Pest Control',
          'Lawn Fertilization',
          'Termite Control',
          'Weed Control',
          'Rodent Control',
          'Grub Control',
          'Mosquito Control',
          'Aeration & Seeding',
          'Bed Bug Treatment',
          'Disease Control'
        ];
      case INDUSTRIES.PEST_CONTROL:
      default:
        return [
          'General Pest Control',
          'Termite Control',
          'Rodent Control',
          'Mosquito Control',
          'Bed Bug Treatment',
          'Wildlife Removal',
          'Ant Control',
          'Cockroach Control',
          'Spider Control',
          'Flea & Tick Treatment'
        ];
    }
  };

  // Industry-specific guarantees
  const getCommonGuarantees = () => {
    switch (selectedIndustry) {
      case INDUSTRIES.LAWN_CARE:
        return [
          'Satisfaction Guarantee',
          'Weed-Free Guarantee',
          'Green Lawn Guarantee',
          'Re-application Guarantee',
          'Money-back Guarantee',
          '30-day Guarantee',
          'Season-Long Protection'
        ];
      case INDUSTRIES.BOTH:
        return [
          'Satisfaction Guarantee',
          'Re-service Guarantee',
          'Weed-Free Guarantee',
          'Pest-Free Guarantee',
          'Money-back Guarantee',
          '60-day Guarantee',
          'Year-Round Protection'
        ];
      case INDUSTRIES.PEST_CONTROL:
      default:
        return [
          'Satisfaction Guarantee',
          'Re-service Guarantee',
          'Money-back Guarantee',
          '30-day Guarantee',
          '60-day Guarantee',
          '90-day Guarantee',
          'Pest-free Guarantee'
        ];
    }
  };

  const commonServices = getCommonServices();
  const commonGuarantees = getCommonGuarantees();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const toggleService = (service) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const toggleGuarantee = (guarantee) => {
    setFormData(prev => ({
      ...prev,
      guarantees: prev.guarantees.includes(guarantee)
        ? prev.guarantees.filter(g => g !== guarantee)
        : [...prev.guarantees, guarantee]
    }));
  };

  const handleScrapeWebsite = async () => {
    if (!formData.website) return;

    setScraping(true);
    setScrapeStatus('Analyzing website...');
    setScrapeError(null);

    try {
      const response = await authFetch('/api/organizations/scrape-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: formData.website })
      });

      const result = await response.json();

      if (response.ok && result.extracted) {
        const extracted = result.extracted;

        console.log('[COMPANY] Raw API response:', JSON.stringify(result, null, 2));
        console.log('[COMPANY] Extracted data:', {
          logo_url: extracted.logo_url,
          logo_url_type: typeof extracted.logo_url,
          brand_colors: extracted.brand_colors,
          brand_colors_type: typeof extracted.brand_colors
        });

        // Update form with extracted data
        setFormData(prev => {
          // Handle brand colors - ensure we have valid hex codes
          const newBrandColors = {
            primary: (extracted.brand_colors?.primary && extracted.brand_colors.primary !== 'null')
              ? extracted.brand_colors.primary
              : prev.brand_colors?.primary || '',
            secondary: (extracted.brand_colors?.secondary && extracted.brand_colors.secondary !== 'null')
              ? extracted.brand_colors.secondary
              : prev.brand_colors?.secondary || '',
            accent: (extracted.brand_colors?.accent && extracted.brand_colors.accent !== 'null')
              ? extracted.brand_colors.accent
              : prev.brand_colors?.accent || ''
          };

          // Handle logo URL
          const newLogoUrl = (extracted.logo_url && extracted.logo_url !== 'null' && extracted.logo_url !== '')
            ? extracted.logo_url
            : prev.logo_url;

          const newData = {
            ...prev,
            name: extracted.name || prev.name,
            phone: extracted.phone || prev.phone,
            address: extracted.address || prev.address,
            services: extracted.services?.length > 0 ? extracted.services : prev.services,
            guarantees: extracted.guarantees?.length > 0 ? extracted.guarantees : prev.guarantees,
            logo_url: newLogoUrl,
            brand_colors: newBrandColors,
            tagline: extracted.tagline || prev.tagline
          };
          console.log('[COMPANY] Updated form data:', {
            logo_url: newData.logo_url,
            brand_colors: newData.brand_colors
          });
          return newData;
        });

        // Store extracted packages for the Packages step
        if (extracted.packages?.length > 0) {
          console.log('[COMPANY] Setting extracted packages:', extracted.packages);
          setExtractedPackages(extracted.packages);
        } else {
          console.log('[COMPANY] No packages found in extracted data:', extracted);
        }

        // Store extracted competitors for the Competitors step
        if (extracted.competitors_mentioned?.length > 0) {
          setExtractedCompetitors(extracted.competitors_mentioned);
        }

        const foundItems = [
          extracted.services?.length && `${extracted.services.length} services`,
          extracted.packages?.length && `${extracted.packages.length} packages`,
          extracted.logo_url && 'logo',
          extracted.brand_colors?.primary && 'brand colors'
        ].filter(Boolean);

        setScrapeStatus(`Found: ${foundItems.join(', ')}`);

        // Clear status after 5 seconds
        setTimeout(() => setScrapeStatus(null), 5000);
      } else {
        setScrapeError(result.error || 'Failed to extract data from website');
      }
    } catch (error) {
      console.error('Failed to scrape website:', error);
      setScrapeError('Failed to connect to website');
    } finally {
      setScraping(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setScrapeError(null);

    try {
      const response = await authFetch('/api/organizations/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        // Pass extracted data to next steps
        console.log('[COMPANY] Passing to next step with extractedPackages:', extractedPackages);
        onComplete({
          ...formData,
          extractedPackages,
          competitors_mentioned: extractedCompetitors
        });
      } else {
        setScrapeError(result.error || 'Failed to save. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save company info:', error);
      setScrapeError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Website Auto-Fill - First! */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-500/30">
        <h3 className="text-lg font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Quick Start - Enter Your Website
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Enter your website URL and we'll automatically extract your company info, services, packages, and branding.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
              placeholder="yourcompany.com"
            />
          </div>
          <button
            type="button"
            onClick={handleScrapeWebsite}
            disabled={scraping || !formData.website}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 border border-purple-500 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
          >
            {scraping ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Auto-Fill</span>
              </>
            )}
          </button>
        </div>

        {/* Scrape Status/Progress */}
        {scraping && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-purple-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Scanning website pages for company information, services, and pricing...</span>
            </div>
          </div>
        )}

        {/* Success Status */}
        {scrapeStatus && !scraping && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">{scrapeStatus}</span>
            </div>
          </div>
        )}

        {/* Extracted Packages Preview */}
        {extractedPackages.length > 0 && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400 font-medium mb-2">
              Found {extractedPackages.length} package(s) - will be available in the Packages step:
            </p>
            <div className="flex flex-wrap gap-2">
              {extractedPackages.map((pkg, i) => (
                <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                  {pkg.name} {pkg.price && `- ${pkg.price}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error Status */}
        {scrapeError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{scrapeError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Company Details</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Acme Pest Control"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="123 Main St, City, State"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary-400" />
          Branding
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Customize the platform with your company's look and feel
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Logo URL
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              {formData.logo_url && (
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-gray-600">
                  <img
                    src={formData.logo_url}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tagline / Slogan
            </label>
            <input
              type="text"
              name="tagline"
              value={formData.tagline}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Your trusted pest control experts"
            />
          </div>
        </div>

        {/* Brand Colors */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Brand Colors
          </label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.brand_colors?.primary || '#3b82f6'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  brand_colors: { ...prev.brand_colors, primary: e.target.value }
                }))}
                className="w-10 h-10 rounded-lg border border-gray-600 cursor-pointer bg-transparent"
              />
              <div>
                <span className="text-sm text-gray-300">Primary</span>
                <input
                  type="text"
                  value={formData.brand_colors?.primary || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brand_colors: { ...prev.brand_colors, primary: e.target.value }
                  }))}
                  className="block w-24 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-300"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.brand_colors?.secondary || '#6b7280'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  brand_colors: { ...prev.brand_colors, secondary: e.target.value }
                }))}
                className="w-10 h-10 rounded-lg border border-gray-600 cursor-pointer bg-transparent"
              />
              <div>
                <span className="text-sm text-gray-300">Secondary</span>
                <input
                  type="text"
                  value={formData.brand_colors?.secondary || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brand_colors: { ...prev.brand_colors, secondary: e.target.value }
                  }))}
                  className="block w-24 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-300"
                  placeholder="#6b7280"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.brand_colors?.accent || '#10b981'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  brand_colors: { ...prev.brand_colors, accent: e.target.value }
                }))}
                className="w-10 h-10 rounded-lg border border-gray-600 cursor-pointer bg-transparent"
              />
              <div>
                <span className="text-sm text-gray-300">Accent</span>
                <input
                  type="text"
                  value={formData.brand_colors?.accent || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brand_colors: { ...prev.brand_colors, accent: e.target.value }
                  }))}
                  className="block w-24 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-300"
                  placeholder="#10b981"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Services Offered</h3>
        <p className="text-sm text-gray-400 mb-4">
          Select the services your company provides
        </p>

        <div className="flex flex-wrap gap-2">
          {commonServices.map(service => (
            <button
              key={service}
              type="button"
              onClick={() => toggleService(service)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                formData.services.includes(service)
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {service}
            </button>
          ))}
        </div>
      </div>

      {/* Guarantees */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Service Guarantees</h3>
        <p className="text-sm text-gray-400 mb-4">
          Select the guarantees you offer to customers
        </p>

        <div className="flex flex-wrap gap-2">
          {commonGuarantees.map(guarantee => (
            <button
              key={guarantee}
              type="button"
              onClick={() => toggleGuarantee(guarantee)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                formData.guarantees.includes(guarantee)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {guarantee}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {scrapeError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{scrapeError}</span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !formData.name}
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
    </form>
  );
}
