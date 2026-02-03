import { useOrganization } from '../context/OrganizationContext';
import { getIndustryTerm, getIndustryLabel, getIndustryTheme, INDUSTRIES } from '../utils/industryTerminology';

export function useIndustry() {
  const { organization } = useOrganization();
  const industry = organization?.settings?.industry || INDUSTRIES.PEST_CONTROL;

  return {
    industry,
    term: (termKey) => getIndustryTerm(industry, termKey),
    label: () => getIndustryLabel(industry),
    theme: () => getIndustryTheme(industry)
  };
}
