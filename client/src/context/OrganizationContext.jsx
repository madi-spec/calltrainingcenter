import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext(null);

// Track which user we fetched data for to reset on user change
let lastFetchedUserId = null;

const defaultOrganization = {
  name: 'Your Company',
  phone: '',
  website: '',
  logo_url: null,
  colors: {
    primary: '#2563eb',
    secondary: '#1e40af',
    accent: '#3b82f6'
  },
  services: [],
  pricing: {},
  settings: {
    aiModel: 'claude-sonnet-4-20250514',
    customPromptAdditions: '',
    scoringWeights: {
      empathyRapport: 20,
      problemResolution: 25,
      productKnowledge: 20,
      professionalism: 15,
      scenarioSpecific: 20
    },
    voicePreferences: {
      defaultVoiceId: '11labs-Brian',
      allowedVoices: []
    }
  }
};

export function OrganizationProvider({ children }) {
  const { organization: authOrganization, authFetch, isAuthenticated, refreshProfile, profile } = useAuth();
  const currentUserId = profile?.id;
  const [organization, setOrganization] = useState(defaultOrganization);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetchedFromApi = useRef(false);

  // Apply brand colors to CSS variables
  const applyBrandColors = useCallback((colors) => {
    if (!colors) return;

    const root = document.documentElement;
    if (colors.primary) {
      root.style.setProperty('--color-brand', colors.primary);
      root.style.setProperty('--color-primary-600', colors.primary);
    }
    if (colors.secondary) {
      root.style.setProperty('--color-brand-dark', colors.secondary);
      root.style.setProperty('--color-primary-800', colors.secondary);
    }
    if (colors.accent) {
      root.style.setProperty('--color-brand-light', colors.accent);
      root.style.setProperty('--color-primary-500', colors.accent);
    }
  }, []);

  // Fetch organization directly from API
  // force: bypass the isAuthenticated check (used during refresh when auth state is transitioning)
  const fetchOrganization = useCallback(async (force = false) => {
    console.log('[ORG] fetchOrganization called, isAuthenticated:', isAuthenticated, 'force:', force);
    if (!force && !isAuthenticated) {
      console.log('[ORG] Not authenticated and not forced, returning null');
      return null;
    }

    try {
      console.log('[ORG] Fetching from /api/organizations/current...');
      const response = await authFetch('/api/organizations/current');
      console.log('[ORG] API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[ORG] Fetched org data:', {
          name: data.organization?.name,
          logo_url: data.organization?.logo_url,
          brand_colors: data.organization?.brand_colors
        });
        return data.organization;
      } else {
        console.error('[ORG] API response not ok:', response.status);
      }
    } catch (err) {
      console.error('[ORG] Error fetching organization:', err);
    }
    return null;
  }, [isAuthenticated, authFetch]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await authFetch('/api/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data.branches || []);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  }, [isAuthenticated, authFetch]);

  // Helper to process organization data
  const processOrgData = useCallback((orgData) => {
    if (!orgData) return null;

    // Map brand_colors from database to colors for the context
    const brandColors = orgData.brand_colors || orgData.colors || {};
    const mergedOrg = {
      ...defaultOrganization,
      ...orgData,
      colors: { ...defaultOrganization.colors, ...brandColors },
      settings: { ...defaultOrganization.settings, ...orgData.settings }
    };

    console.log('[ORG] Processed organization:', {
      name: mergedOrg.name,
      logo_url: mergedOrg.logo_url,
      colors: mergedOrg.colors
    });

    return mergedOrg;
  }, []);

  // Reset state when user logs out or changes
  useEffect(() => {
    if (!isAuthenticated && !authOrganization) {
      console.log('[ORG] User logged out, resetting state');
      hasFetchedFromApi.current = false;
      lastFetchedUserId = null;
      setOrganization(defaultOrganization);
      // Reset CSS variables to defaults
      const root = document.documentElement;
      root.style.removeProperty('--color-brand');
      root.style.removeProperty('--color-brand-dark');
      root.style.removeProperty('--color-brand-light');
      root.style.removeProperty('--color-primary-500');
      root.style.removeProperty('--color-primary-600');
      root.style.removeProperty('--color-primary-800');
      // Also reset Layout-applied variables
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-secondary');
      root.style.removeProperty('--brand-accent');
      root.style.removeProperty('--brand-primary-rgb');
    }
  }, [isAuthenticated, authOrganization]);

  // Update organization from auth context AND fetch from API
  useEffect(() => {
    const loadOrganization = async () => {
      // Check if this is a new user (different from last fetch)
      const userChanged = currentUserId && lastFetchedUserId !== currentUserId;
      if (userChanged) {
        console.log('[ORG] User changed, resetting fetch flag. Old:', lastFetchedUserId, 'New:', currentUserId);
        hasFetchedFromApi.current = false;
        lastFetchedUserId = currentUserId;
      }

      // First, use auth context data for quick initial render
      if (authOrganization) {
        console.log('[ORG] Processing authOrganization:', {
          id: authOrganization.id,
          name: authOrganization.name,
          logo_url: authOrganization.logo_url,
          brand_colors: authOrganization.brand_colors
        });
        const mergedOrg = processOrgData(authOrganization);
        if (mergedOrg) {
          setOrganization(mergedOrg);
          applyBrandColors(mergedOrg.colors);
        }
      }

      // Fetch from API to ensure we have the latest data (including logo_url, brand_colors)
      // Only fetch once per user session to avoid unnecessary API calls
      if (isAuthenticated && !hasFetchedFromApi.current) {
        console.log('[ORG] Fetching fresh data from API...');
        hasFetchedFromApi.current = true;
        const orgData = await fetchOrganization();
        if (orgData) {
          const mergedOrg = processOrgData(orgData);
          if (mergedOrg) {
            console.log('[ORG] Loaded from API:', {
              name: mergedOrg.name,
              logo_url: mergedOrg.logo_url,
              colors: mergedOrg.colors
            });
            setOrganization(mergedOrg);
            applyBrandColors(mergedOrg.colors);
          }
        }
      }

      setLoading(false);
    };

    if (isAuthenticated || authOrganization) {
      loadOrganization();
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [authOrganization, isAuthenticated, currentUserId, applyBrandColors, processOrgData, fetchOrganization]);

  // Fetch branches when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchBranches();
    }
  }, [isAuthenticated, fetchBranches]);

  // Update organization data
  const updateOrganization = useCallback(async (updates) => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }

    setError(null);

    try {
      const response = await authFetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update organization');
      }

      const data = await response.json();
      const updatedOrg = { ...organization, ...data.organization };
      setOrganization(updatedOrg);
      applyBrandColors(updatedOrg.colors);

      return data.organization;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [isAuthenticated, authFetch, organization, applyBrandColors]);

  // Update organization settings
  const updateSettings = useCallback(async (settings) => {
    return updateOrganization({
      settings: { ...organization.settings, ...settings }
    });
  }, [organization.settings, updateOrganization]);

  // Update AI configuration
  const updateAIConfig = useCallback(async (aiConfig) => {
    return updateSettings({
      ...organization.settings,
      ...aiConfig
    });
  }, [organization.settings, updateSettings]);

  // Update brand colors
  const updateColors = useCallback(async (colors) => {
    return updateOrganization({ colors });
  }, [updateOrganization]);

  // Scrape website for company data
  const scrapeWebsite = useCallback(async (url) => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }

    setError(null);

    try {
      const response = await authFetch('/api/admin/scrape-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scrape website');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [isAuthenticated, authFetch]);

  // Apply scraped company data
  const applyScrapedData = useCallback(async (scrapedData) => {
    const updates = {};

    if (scrapedData.extracted) {
      const extracted = scrapedData.extracted;
      if (extracted.name) updates.name = extracted.name;
      if (extracted.phone) updates.phone = extracted.phone;
      if (extracted.services) updates.services = extracted.services;
      if (extracted.pricing) updates.pricing = extracted.pricing;
      if (extracted.serviceAreas) updates.service_areas = extracted.serviceAreas;
      if (extracted.guarantees) updates.guarantees = extracted.guarantees;
      if (extracted.valuePropositions) updates.value_propositions = extracted.valuePropositions;
      if (extracted.businessHours) updates.business_hours = extracted.businessHours;
    }

    if (scrapedData.logo) {
      updates.logo_url = scrapedData.logo;
    }

    if (scrapedData.url) {
      updates.website = scrapedData.url;
    }

    return updateOrganization(updates);
  }, [updateOrganization]);

  // Get usage statistics
  const getUsageStats = useCallback(async () => {
    if (!isAuthenticated) return null;

    try {
      const response = await authFetch('/api/billing/usage');
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error('Error fetching usage:', err);
    }
    return null;
  }, [isAuthenticated, authFetch]);

  // Create a branch
  const createBranch = useCallback(async (branchData) => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await authFetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create branch');
      }

      const data = await response.json();
      setBranches((prev) => [...prev, data.branch]);
      return data.branch;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [isAuthenticated, authFetch]);

  // Update a branch
  const updateBranch = useCallback(async (branchId, updates) => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await authFetch(`/api/branches/${branchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update branch');
      }

      const data = await response.json();
      setBranches((prev) =>
        prev.map((b) => (b.id === branchId ? data.branch : b))
      );
      return data.branch;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [isAuthenticated, authFetch]);

  // Delete a branch
  const deleteBranch = useCallback(async (branchId) => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await authFetch(`/api/branches/${branchId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete branch');
      }

      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [isAuthenticated, authFetch]);

  // Refresh organization data from the server
  const refreshOrganization = useCallback(async () => {
    console.log('[ORG] Refreshing organization data...');

    // First, refresh the auth profile (which includes org data)
    if (refreshProfile) {
      console.log('[ORG] Refreshing auth profile...');
      await refreshProfile();
    }

    // Also fetch organization data directly to ensure we have the latest
    // Pass force=true to bypass isAuthenticated check since auth state may be transitioning
    console.log('[ORG] Fetching organization data (forced)...');
    const orgData = await fetchOrganization(true);
    console.log('[ORG] fetchOrganization returned:', orgData ? 'data' : 'null');

    if (orgData) {
      const mergedOrg = processOrgData(orgData);
      if (mergedOrg) {
        console.log('[ORG] Refreshed organization:', {
          name: mergedOrg.name,
          logo_url: mergedOrg.logo_url,
          colors: mergedOrg.colors
        });
        setOrganization(mergedOrg);
        applyBrandColors(mergedOrg.colors);
        console.log('[ORG] Organization state updated and colors applied');
      } else {
        console.warn('[ORG] processOrgData returned null');
      }
    } else {
      console.warn('[ORG] No org data returned from fetchOrganization');
    }
  }, [refreshProfile, fetchOrganization, processOrgData, applyBrandColors]);

  const value = {
    // State
    organization,
    branches,
    loading,
    error,

    // Organization methods
    updateOrganization,
    updateSettings,
    updateAIConfig,
    updateColors,
    scrapeWebsite,
    applyScrapedData,
    getUsageStats,
    refreshOrganization,

    // Branch methods
    createBranch,
    updateBranch,
    deleteBranch,
    refreshBranches: fetchBranches,

    // Convenience getters
    name: organization.name,
    logo: organization.logo_url,
    colors: organization.colors,
    settings: organization.settings,
    subscriptionStatus: organization.subscription_status,
    subscriptionPlan: organization.subscription_plan,
    trainingHoursIncluded: organization.training_hours_included,
    trainingHoursUsed: organization.training_hours_used
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export default OrganizationContext;
