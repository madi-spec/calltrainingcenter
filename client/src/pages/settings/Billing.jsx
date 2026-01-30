import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Download,
  AlertCircle,
  Check,
  ExternalLink,
  Clock,
  Zap,
  Users,
  Sparkles,
  Star,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useNotifications } from '../../context/NotificationContext';

const PLANS = {
  starter: {
    tier: 'Starter',
    name: 'Try It',
    description: 'Perfect for testing with a small team',
    monthlyPrice: 149,
    annualPrice: 124,
    annualTotal: 1490,
    features: [
      { text: '5 training hours/month', annual: '60 hours upfront' },
      { text: '3 team members' },
      { text: '8 standard scenarios' },
      { text: 'Basic coaching scorecards' },
      { text: 'Email support' }
    ],
    hourBlocks: { 5: 145, 10: 279, 25: 675 }
  },
  pro: {
    tier: 'Pro',
    name: 'Build Your Team',
    description: 'Everything you need to train a winning team',
    monthlyPrice: 349,
    annualPrice: 291,
    annualTotal: 3490,
    featured: true,
    features: [
      { text: '12 training hours/month', annual: '144 hours upfront' },
      { text: '10 team members' },
      { text: 'All scenarios + custom builder' },
      { text: 'Team trends & leaderboards' },
      { text: 'Priority support' }
    ],
    hourBlocks: { 5: 125, 10: 239, 25: 575 }
  },
  enterprise: {
    tier: 'Enterprise',
    name: 'Scale It',
    description: 'For multi-location operations',
    monthlyPrice: 699,
    annualPrice: 583,
    annualTotal: 6990,
    features: [
      { text: '25 training hours/month', annual: '300 hours upfront' },
      { text: 'Unlimited team members' },
      { text: 'All scenarios + custom development' },
      { text: 'Full analytics + API access' },
      { text: 'Dedicated success manager' }
    ],
    hourBlocks: { 5: 115, 10: 219, 25: 525 }
  }
};

const HOUR_BLOCKS = [
  { hours: 5, calls: '~60 training calls', discount: null },
  { hours: 10, calls: '~120 calls', discount: '4% off' },
  { hours: 25, calls: '~300 calls', discount: '7% off' }
];

export default function Billing() {
  const { authFetch } = useAuth();
  const { organization, subscriptionStatus, subscriptionPlan, trainingHoursIncluded, trainingHoursUsed } = useOrganization();
  const notifications = useNotifications();
  const showSuccess = notifications?.showSuccess || (() => {});
  const showError = notifications?.showError || (() => {});

  const [billingCycle, setBillingCycle] = useState('monthly');
  const [usage, setUsage] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const [usageRes, invoicesRes] = await Promise.all([
          authFetch('/api/billing/usage'),
          authFetch('/api/billing/invoices')
        ]);

        if (usageRes.ok) {
          const data = await usageRes.json();
          setUsage(data);
        }

        if (invoicesRes.ok) {
          const data = await invoicesRes.json();
          setInvoices(data.invoices || []);
        }
      } catch (error) {
        // Silent fail - billing data may not be available
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [authFetch]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const response = await authFetch('/api/billing/portal', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      showError('Error', 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      const response = await authFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          successUrl: `${window.location.origin}/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/settings/billing`
        })
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      showError('Error', 'Could not start checkout');
    }
  };

  const handlePurchaseHours = async (hours) => {
    try {
      const response = await authFetch('/api/billing/purchase-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours,
          successUrl: `${window.location.origin}/settings/billing?hours=purchased`,
          cancelUrl: `${window.location.origin}/settings/billing`
        })
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      showError('Error', 'Could not start checkout');
    }
  };

  const usagePercentage = trainingHoursIncluded
    ? Math.min(100, ((trainingHoursUsed || 0) / trainingHoursIncluded) * 100)
    : 0;

  const currentPlan = PLANS[subscriptionPlan] || PLANS.starter;
  const isAnnual = billingCycle === 'annual';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Billing & Subscription</h1>
          <p className="text-gray-400 mt-1">
            Simple, transparent pricing. Platform access plus training hours.
          </p>
        </div>
        <button
          onClick={handleManageBilling}
          disabled={portalLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
        >
          <CreditCard className="w-5 h-5" />
          {portalLoading ? 'Loading...' : 'Manage Billing'}
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Current Plan & Usage */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">Current Plan</h2>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              subscriptionStatus === 'active' ? 'bg-green-500/10 text-green-400' :
              subscriptionStatus === 'trialing' ? 'bg-blue-500/10 text-blue-400' :
              'bg-yellow-500/10 text-yellow-400'
            }`}>
              {subscriptionStatus === 'trialing' ? 'Trial' : subscriptionStatus || 'Active'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-100">{currentPlan.tier}</span>
            <span className="text-gray-400">- {currentPlan.name}</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">
            ${currentPlan.monthlyPrice}<span className="text-sm text-gray-400 font-normal">/month</span>
          </p>
          {organization?.current_period_end && (
            <p className="text-sm text-gray-400 mt-4">
              Next billing: {new Date(organization.current_period_end).toLocaleDateString()}
            </p>
          )}
        </motion.div>

        {/* Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">Training Hours</h2>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">
                {(trainingHoursUsed || 0).toFixed(1)} / {trainingHoursIncluded || 0} hours used
              </span>
              <span className={`font-medium ${
                usagePercentage > 90 ? 'text-red-400' : usagePercentage > 70 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {(trainingHoursIncluded - (trainingHoursUsed || 0)).toFixed(1)}h remaining
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>

          {usagePercentage > 80 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-400">
                Running low on hours. Purchase more below.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Billing Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center justify-center gap-4"
      >
        <span className={`text-sm font-medium cursor-pointer transition-colors ${
          !isAnnual ? 'text-gray-100' : 'text-gray-500'
        }`} onClick={() => setBillingCycle('monthly')}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(isAnnual ? 'monthly' : 'annual')}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isAnnual ? 'bg-gradient-to-r from-pink-500 to-orange-500' : 'bg-gray-600'
          }`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            isAnnual ? 'translate-x-7' : 'translate-x-1'
          }`} />
        </button>
        <span className={`text-sm font-medium cursor-pointer transition-colors ${
          isAnnual ? 'text-gray-100' : 'text-gray-500'
        }`} onClick={() => setBillingCycle('annual')}>
          Annual
        </span>
        <span className="px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full">
          Save 17%
        </span>
      </motion.div>

      {/* Plans */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid md:grid-cols-3 gap-6"
      >
        {Object.entries(PLANS).map(([planId, plan]) => {
          const isCurrent = planId === subscriptionPlan;
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

          return (
            <div
              key={planId}
              className={`relative rounded-2xl p-6 border-2 transition-all ${
                plan.featured
                  ? 'border-transparent bg-gradient-to-b from-gray-800 to-gray-800 shadow-lg'
                  : isCurrent
                  ? 'border-primary-500 bg-gray-800'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
              style={plan.featured ? {
                background: 'linear-gradient(#1f2937, #1f2937) padding-box, linear-gradient(135deg, #ec4899, #f97316, #eab308) border-box'
              } : undefined}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">{plan.tier}</p>
                <h3 className="text-xl font-bold text-gray-100 mt-1">{plan.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-100">${price}</span>
                <span className="text-gray-400">/month</span>
                {isAnnual && (
                  <p className="text-sm text-green-400 mt-1">${plan.annualTotal.toLocaleString()} billed annually</p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">
                      {isAnnual && feature.annual ? feature.annual : feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 bg-gray-700 text-gray-400 font-medium rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(planId)}
                  className={`w-full py-3 font-medium rounded-lg transition-colors ${
                    plan.featured
                      ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:opacity-90'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  {planId === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
                </button>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Hour Blocks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Need more training hours?</h2>
            <p className="text-gray-400 mt-1">Purchase hour blocks anytime. They never expire.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {HOUR_BLOCKS.map((block) => (
            <div key={block.hours} className="bg-gray-750 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-100">{block.hours}-Hour Block</h4>
                <span className="text-sm text-gray-400">
                  {block.calls}{block.discount && ` · ${block.discount}`}
                </span>
              </div>
              <div className="space-y-2">
                {Object.entries(PLANS).map(([planId, plan]) => (
                  <div key={planId} className="flex justify-between text-sm">
                    <span className="text-gray-400">{plan.tier}</span>
                    <span className="font-semibold text-gray-200">${plan.hourBlocks[block.hours]}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handlePurchaseHours(block.hours)}
                className="w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Purchase
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gradient-to-r from-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-xl flex items-start gap-4">
          <div className="p-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg flex-shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-100">Annual plans: All hours upfront</h4>
            <p className="text-sm text-gray-400 mt-1">
              Monthly plans reset each month. Annual plans give you all your hours immediately—perfect for heavy onboarding months or pre-season training pushes. Purchased hour blocks never expire on any plan.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Invoices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <h2 className="text-lg font-semibold text-gray-100 mb-6">Recent Invoices</h2>
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Invoice</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-700/50">
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-300">{invoice.number}</td>
                    <td className="py-3 px-4 text-gray-300">
                      ${(invoice.amount_paid / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-500/10 text-green-400' :
                        invoice.status === 'open' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {invoice.invoice_url && (
                        <a
                          href={invoice.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary-400 hover:text-primary-300"
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No invoices yet</p>
            <p className="text-sm text-gray-500 mt-1">Invoices will appear here after your first payment</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
