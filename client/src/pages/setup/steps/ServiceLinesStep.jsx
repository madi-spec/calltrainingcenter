import { useState, useEffect } from 'react';
import { Loader2, Save, Check, CheckCircle2 } from 'lucide-react';

// Match scraped services to category names/slugs
function matchServicesToCategories(scrapedServices, categories) {
  if (!scrapedServices || !Array.isArray(scrapedServices) || categories.length === 0) {
    return { matchedIds: [], primaryId: null };
  }

  const matchedIds = [];
  let primaryId = null;

  // Normalize scraped services for matching
  const normalizedServices = scrapedServices.map(s =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  for (const category of categories) {
    const catName = category.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const catSlug = (category.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if any scraped service matches this category
    const isMatch = normalizedServices.some(service =>
      service.includes(catName) ||
      catName.includes(service) ||
      service.includes(catSlug) ||
      catSlug.includes(service)
    );

    if (isMatch) {
      matchedIds.push(category.id);
      // First match becomes primary
      if (!primaryId) primaryId = category.id;
    }
  }

  return { matchedIds, primaryId };
}

export default function ServiceLinesStep({ data, allStepData, onComplete, authFetch }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(data.selectedCategories || []);
  const [primaryCategory, setPrimaryCategory] = useState(data.primaryCategory || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoMatched, setAutoMatched] = useState(false);

  // Get scraped services from company step
  const scrapedServices = allStepData?.company?.services || [];

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-match scraped services to categories when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && scrapedServices.length > 0 && selectedCategories.length === 0 && !autoMatched) {
      const { matchedIds, primaryId } = matchServicesToCategories(scrapedServices, categories);
      if (matchedIds.length > 0) {
        setSelectedCategories(matchedIds);
        setPrimaryCategory(primaryId);
        setAutoMatched(true);
      }
    }
  }, [categories, scrapedServices, selectedCategories, autoMatched]);

  const fetchCategories = async () => {
    try {
      const response = await authFetch('/api/products/service-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
      if (primaryCategory === categoryId) {
        setPrimaryCategory(null);
      }
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
      if (!primaryCategory) {
        setPrimaryCategory(categoryId);
      }
    }
  };

  const setPrimary = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setPrimaryCategory(categoryId);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Save service lines to API
      for (const categoryId of selectedCategories) {
        await authFetch('/api/products/service-lines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: categoryId,
            is_primary: categoryId === primaryCategory
          })
        });
      }

      onComplete({
        selectedCategories,
        primaryCategory
      });
    } catch (error) {
      console.error('Failed to save service lines:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-matched Notice */}
      {autoMatched && selectedCategories.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">
              {selectedCategories.length} service{selectedCategories.length !== 1 ? 's' : ''} auto-selected based on your website
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Review and adjust the selections below as needed.
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">Select Your Service Lines</h3>
        <p className="text-gray-400">
          Choose which types of pest control services your company offers.
          This helps customize training scenarios for your team.
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => {
          const isSelected = selectedCategories.includes(category.id);
          const isPrimary = primaryCategory === category.id;

          return (
            <div
              key={category.id}
              className={`relative rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? isPrimary
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-gray-800 border-green-500'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => toggleCategory(category.id)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{category.icon}</span>
                  {isSelected && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isPrimary ? 'bg-primary-500' : 'bg-green-500'
                    }`}>
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <h4 className="font-medium text-gray-200 mb-1">{category.name}</h4>
                <p className="text-sm text-gray-400">{category.description}</p>

                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimary(category.id);
                    }}
                    className={`mt-3 text-xs px-2 py-1 rounded transition-colors ${
                      isPrimary
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {isPrimary ? 'Primary Service' : 'Set as Primary'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedCategories.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-300">
                {selectedCategories.length} service{selectedCategories.length !== 1 ? 's' : ''} selected
              </span>
              {primaryCategory && (
                <span className="text-gray-500 ml-2">
                  (Primary: {categories.find(c => c.id === primaryCategory)?.name})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={saving || selectedCategories.length === 0}
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
    </div>
  );
}
