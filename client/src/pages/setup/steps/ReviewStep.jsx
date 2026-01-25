import { useState, useEffect } from 'react';
import {
  Building2,
  Layers,
  Package,
  Swords,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Loader2,
  Rocket
} from 'lucide-react';

export default function ReviewStep({ data, allStepData, onComplete, authFetch, organization, onEditStep }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use allStepData if available, fall back to data for backwards compatibility
  const stepData = allStepData || data;

  useEffect(() => {
    fetchSetupStats();
  }, []);

  const fetchSetupStats = async () => {
    try {
      // Fetch current configuration stats
      const [packagesRes, competitorsRes, teamsRes] = await Promise.all([
        authFetch('/api/products/packages'),
        authFetch('/api/products/competitors'),
        authFetch('/api/teams')
      ]);

      const packages = packagesRes.ok ? (await packagesRes.json()).packages : [];
      const competitors = competitorsRes.ok ? (await competitorsRes.json()).competitors : [];
      const teams = teamsRes.ok ? (await teamsRes.json()).teams : [];

      // Count from step data for items that may not be saved yet
      const packageCount = stepData.packages?.packages?.length || packages?.length || 0;
      const competitorCount = stepData.competitors?.competitors?.length || competitors?.length || 0;

      setStats({
        packages: packageCount,
        competitors: competitorCount,
        teams: teams?.length || 0,
        serviceLines: stepData.serviceLines?.selectedCategories?.length || 0,
        objections: (stepData.objections?.selectedTemplates?.length || 0) + (stepData.objections?.customObjections?.length || 0),
        // Track extracted data
        extractedPackages: stepData.company?.extractedPackages?.length || 0,
        extractedCompetitors: stepData.company?.competitors_mentioned?.length || 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get company info from step data or organization
  const companyInfo = stepData.company || {};
  const companyName = companyInfo.name || organization?.name;
  const companyPhone = companyInfo.phone || organization?.phone;
  const companyWebsite = companyInfo.website || organization?.website;
  const companyServices = companyInfo.services || organization?.services || [];
  const companyGuarantees = companyInfo.guarantees || organization?.guarantees || [];

  const sections = [
    {
      id: 'company',
      title: 'Company Information',
      icon: Building2,
      status: companyName ? 'complete' : 'incomplete',
      summary: companyName || 'Not configured',
      details: [
        companyPhone && `Phone: ${companyPhone}`,
        companyWebsite && `Website: ${companyWebsite}`,
        companyServices.length > 0 && `${companyServices.length} services offered`,
        companyGuarantees.length > 0 && `${companyGuarantees.length} guarantees`
      ].filter(Boolean)
    },
    {
      id: 'serviceLines',
      title: 'Service Lines',
      icon: Layers,
      status: stats?.serviceLines > 0 ? 'complete' : 'optional',
      summary: stats?.serviceLines > 0
        ? `${stats.serviceLines} service line${stats.serviceLines !== 1 ? 's' : ''} configured`
        : 'No service lines selected',
      details: []
    },
    {
      id: 'packages',
      title: 'Service Packages',
      icon: Package,
      status: stats?.packages > 0 ? 'complete' : 'optional',
      summary: stats?.packages > 0
        ? `${stats.packages} package${stats.packages !== 1 ? 's' : ''} created`
        : 'Using default packages',
      details: []
    },
    {
      id: 'competitors',
      title: 'Competitors',
      icon: Swords,
      status: stats?.competitors > 0 ? 'complete' : 'optional',
      summary: stats?.competitors > 0
        ? `${stats.competitors} competitor${stats.competitors !== 1 ? 's' : ''} added`
        : 'No competitors configured',
      details: []
    },
    {
      id: 'objections',
      title: 'Objection Handling',
      icon: MessageSquare,
      status: stats?.objections > 0 ? 'complete' : 'optional',
      summary: stats?.objections > 0
        ? `${stats.objections} objection response${stats.objections !== 1 ? 's' : ''} configured`
        : 'Using default objection responses',
      details: []
    },
    {
      id: 'team',
      title: 'Team Setup',
      icon: Users,
      status: stats?.teams > 0 ? 'complete' : 'optional',
      summary: stats?.teams > 0
        ? `${stats.teams} team${stats.teams !== 1 ? 's' : ''} created`
        : 'No teams created yet',
      details: []
    }
  ];

  const completedRequired = sections.filter(s => s.status === 'complete' && s.id === 'company').length;
  const completedOptional = sections.filter(s => s.status === 'complete' && s.id !== 'company').length;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'incomplete':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'border-green-500/30 bg-green-500/5';
      case 'incomplete':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-gray-700 bg-gray-800';
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
      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-primary-500/10 to-purple-500/10 rounded-xl p-6 border border-primary-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Ready to Launch!</h3>
            <p className="text-gray-400">
              Review your configuration below. You can always update these settings later.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-700/50">
          <div>
            <span className="text-2xl font-bold text-green-400">{completedOptional + 1}</span>
            <span className="text-gray-400 ml-1">/ {sections.length}</span>
            <p className="text-sm text-gray-500">Sections configured</p>
          </div>
          <div className="h-8 w-px bg-gray-700" />
          <div>
            <span className="text-2xl font-bold text-primary-400">{stats?.packages || 0}</span>
            <p className="text-sm text-gray-500">Packages</p>
          </div>
          <div className="h-8 w-px bg-gray-700" />
          <div>
            <span className="text-2xl font-bold text-primary-400">{stats?.teams || 0}</span>
            <p className="text-sm text-gray-500">Teams</p>
          </div>
        </div>
      </div>

      {/* Configuration Sections */}
      <div className="space-y-3">
        {sections.map((section, index) => {
          const Icon = section.icon;

          return (
            <div
              key={section.id}
              className={`rounded-xl border p-4 transition-colors ${getStatusColor(section.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-200">{section.title}</h4>
                      {getStatusIcon(section.status)}
                    </div>
                    <p className="text-sm text-gray-400">{section.summary}</p>
                    {section.details.length > 0 && (
                      <ul className="text-xs text-gray-500 mt-1">
                        {section.details.map((detail, i) => (
                          <li key={i}>{detail}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {onEditStep && (
                  <button
                    onClick={() => onEditStep(index)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* What Happens Next */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h4 className="font-medium text-gray-200 mb-4">What happens next?</h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-300">Training scenarios will be customized to your products</p>
              <p className="text-sm text-gray-500">AI will use your packages, pricing, and objections in training calls</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-300">Team members can start practicing immediately</p>
              <p className="text-sm text-gray-500">Invite your team and assign them to training courses</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-300">You can update these settings anytime</p>
              <p className="text-sm text-gray-500">Access settings from the sidebar to add more packages, competitors, or team members</p>
            </div>
          </li>
        </ul>
      </div>

      {/* Complete Button */}
      <div className="flex justify-end">
        <button
          onClick={() => onComplete({})}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-lg shadow-primary-500/20"
        >
          <Rocket className="w-5 h-5" />
          Complete Setup & Start Training
        </button>
      </div>
    </div>
  );
}
