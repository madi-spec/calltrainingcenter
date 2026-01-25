import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Download,
  AlertCircle,
  Check,
  ExternalLink,
  TrendingUp,
  Clock,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';

const PLANS = {
  starter: {
    name: 'Starter',
    price: 99,
    features: [
      '10 training hours/month',
      'Up to 5 users',
      'Basic scenarios',
      'Email support'
    ]
  },
  professional: {
    name: 'Professional',
    price: 299,
    features: [
      '50 training hours/month',
      'Up to 25 users',
      'All scenarios',
      'Custom scenarios',
      'Branch management',
      'Priority support'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 799,
    features: [
      '200 training hours/month',
      'Unlimited users',
      'All scenarios',
      'Custom scenarios',
      'Advanced analytics',
      'API access',
      'Dedicated support',
      'Custom integrations'
    ]
  }
};

export default function Billing() {
  const { authFetch } = useAuth();
  const { organization, subscriptionStatus, subscriptionPlan, trainingHoursIncluded, trainingHoursUsed } = useOrganization();

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
        console.error('Error fetching billing data:', error);
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
      console.error('Error opening billing portal:', error);
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
          successUrl: `${window.location.origin}/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/settings/billing`
        })
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
    }
  };

  const usagePercentage = trainingHoursIncluded
    ? Math.min(100, ((trainingHoursUsed || 0) / trainingHoursIncluded) * 100)
    : 0;

  const currentPlan = PLANS[subscriptionPlan] || PLANS.starter;

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
            Manage your subscription and view usage
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

      {/* Current Plan */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-100">{currentPlan.name} Plan</h2>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                subscriptionStatus === 'active' ? 'bg-green-500/10 text-green-400' :
                subscriptionStatus === 'trialing' ? 'bg-blue-500/10 text-blue-400' :
                'bg-yellow-500/10 text-yellow-400'
              }`}>
                {subscriptionStatus === 'trialing' ? 'Trial' : subscriptionStatus}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-100">
              ${currentPlan.price}<span className="text-lg text-gray-400 font-normal">/month</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm mb-1">Next billing date</p>
            <p className="text-gray-200 font-medium">
              {organization?.current_period_end
                ? new Date(organization.current_period_end).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Usage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Training Hours Usage</h2>
          <span className="text-gray-400 text-sm">
            Billing period: {new Date().toLocaleDateString('en-US', { month: 'short' })}
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">
              {(trainingHoursUsed || 0).toFixed(1)} / {trainingHoursIncluded || 0} hours used
            </span>
            <span className={`font-medium ${
              usagePercentage > 90 ? 'text-red-400' : usagePercentage > 70 ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {usagePercentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
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
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-400">
              You're running low on training hours. Consider upgrading your plan or usage will be billed at overage rates.
            </p>
          </div>
        )}

        {usage?.overageHours > 0 && (
          <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 font-medium">Overage Usage</p>
                <p className="text-sm text-gray-400">
                  {usage.overageHours.toFixed(1)} additional hours
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-300 font-medium">
                  ${usage.overageCost.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">@ $9/hour</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Plans Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <h2 className="text-lg font-semibold text-gray-100 mb-6">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(PLANS).map(([planId, plan]) => {
            const isCurrent = planId === subscriptionPlan;
            return (
              <div
                key={planId}
                className={`rounded-xl p-6 border ${
                  isCurrent
                    ? 'border-primary-500 bg-primary-500/5'
                    : 'border-gray-700 bg-gray-700/30'
                }`}
              >
                <h3 className="text-lg font-semibold text-gray-100">{plan.name}</h3>
                <p className="text-2xl font-bold text-gray-100 mt-2">
                  ${plan.price}<span className="text-sm text-gray-400 font-normal">/mo</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full mt-6 py-2 bg-primary-600/50 text-primary-300 font-medium rounded-lg"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(planId)}
                    className="w-full mt-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {PLANS[planId].price > currentPlan.price ? 'Upgrade' : 'Downgrade'}
                  </button>
                )}
              </div>
            );
          })}
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
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No invoices yet</p>
        )}
      </motion.div>
    </div>
  );
}
