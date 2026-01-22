import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CompanyContext = createContext(null);

const defaultCompany = {
  name: 'Accel Pest & Termite Control',
  phone: '(555) 123-4567',
  website: 'https://www.accelpest.com',
  logo: null,
  colors: {
    primary: '#2563eb',
    secondary: '#1e40af',
    accent: '#3b82f6'
  },
  serviceAreas: ['Phoenix Metro', 'Scottsdale', 'Tempe', 'Mesa', 'Gilbert'],
  services: [
    'Termite Control',
    'Ant Control',
    'Scorpion Control',
    'Rodent Control',
    'Bed Bug Treatment',
    'Mosquito Control',
    'Wildlife Removal'
  ],
  pricing: {
    quarterlyPrice: '149',
    initialPrice: '199',
    hasPublicPricing: true
  },
  guarantees: [
    '100% Satisfaction Guarantee',
    'Free Re-treatment if pests return'
  ],
  valuePropositions: [
    'Same-day service available',
    'Family and pet safe treatments',
    'Licensed and insured technicians'
  ],
  businessHours: 'Mon-Sat 7am-7pm'
};

export function CompanyProvider({ children }) {
  const [company, setCompany] = useState(defaultCompany);
  const [loading, setLoading] = useState(true);

  // Fetch company data from server
  const fetchCompany = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/current-config');
      if (response.ok) {
        const data = await response.json();
        if (data.company) {
          setCompany(data.company);
          applyBrandColors(data.company.colors);
        }
      }
    } catch (error) {
      console.error('Error fetching company config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply brand colors to CSS variables
  const applyBrandColors = (colors) => {
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
  };

  // Update company data
  const updateCompany = useCallback(async (newData) => {
    const updatedCompany = { ...company, ...newData };
    setCompany(updatedCompany);
    applyBrandColors(updatedCompany.colors);

    try {
      await fetch('/api/admin/apply-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyData: updatedCompany })
      });
    } catch (error) {
      console.error('Error saving company config:', error);
    }
  }, [company]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const value = {
    company,
    setCompany,
    updateCompany,
    loading,
    refreshCompany: fetchCompany
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

export default CompanyContext;
