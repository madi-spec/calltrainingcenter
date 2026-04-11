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
  Plus,
  Gift,
  Loader2,
  CheckCircle2,
  Tag
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
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [promoStatus, setPromoStatus] = useState(null);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const [usageRes, invoicesRes, promoRes] = await Promise.all([
          authFetch('/api/billing/usage'),
          authFetch('/api/billing/invoices'),
          authFetch('/api/billing/promo-status')
        ]);

        if (usageRes.ok) {
          const data = await usageRes.json();
          setUsage(data);
        }

        if (invoicesRes.ok) {
          const data = await invoicesRes.json();
          setInvoices(data.invoices || []);
        }

        if (promoRes.ok) {
          const data = await promoRes.json();
          setPromoStatus(data);
        }
      } catch (error) {
        // Silent fail - billing data may not be available
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [authFetch]);

  const handleRedeemPromo = async (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    setPromoLoading(true);
    setPromoError('');
    setPromoSuccess('');

    try {
      const response = await authFetch('/api/billing/redeem-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setPromoSuccess(data.message);
        setPromoCode('');
        showSuccess('Promo Applied!', data.message);
        // Refresh the page to show updated plan
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setPromoError(data.error || 'Failed to redeem promo code');
      }
    } catch (error) {
      setPromoError('An error occurred. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Simple, transparent pricing. Platform access plus training hours.
          </p>
        </div>
        <button
          onClick={handleManageBilling}
          disabled={portalLoading}
          className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted text-secondary-foreground font-medium rounded-md transition-colors"
        >
          <CreditCard className="w-5 h-5" />
          {portalLoading ? 'Loading...' : 'Manage Billing'}
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Active Promo Banner */}
      {promoStatus?.hasPromo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Gift className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-green-400 font-medium">Promo Active: {promoStatus.promoCode}</p>
              <p className="text-sm text-green-300/70">
                {promoStatus.daysRemaining} days remaining on your free Enterprise trial
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
        </motion.div>
      )}

      {/* Promo Code Entry */}
      {!promoStatus?.hasPromo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-5"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Tag className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-foreground font-medium">Have a promo code?</p>
                <p className="text-sm text-muted-foreground">Enter your code to unlock special access</p>
              </div>
            </div>
            <form onSubmit={handleRedeemPromo} className="flex gap-2 flex-1 md:max-w-md">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                className="flex-1 px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 uppercase"
              />
              <button
                type="submit"
                disabled={promoLoading || !promoCode.trim()}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-muted disabled:text-muted-foreground text-foreground font-medium rounded-md transition-colors flex items-center gap-2"
              >
                {promoLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Gift className="w-4 h-4" />
                )}
                Apply
              </button>
            </form>
          </div>
          {promoError && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {promoError}
            </div>
          )}
          {promoSuccess && (
            <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              {promoSuccess}
            </div>
          )}
        </motion.div>
      )}

      {/* Current Plan & Usage */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg p-6 border border-border"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Current Plan</h2>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              subscriptionStatus === 'active' ? 'bg-green-500/10 text-green-400' :
              subscriptionStatus === 'trialing' ? 'bg-blue-500/10 text-blue-400' :
              'bg-yellow-500/10 text-yellow-400'
            }`}>
              {subscriptionStatus === 'trialing' ? 'Trial' : subscriptionStatus || 'Active'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-foreground">{currentPlan.tier}</span>
            <span className="text-muted-foreground">- {currentPlan.name}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ${currentPlan.monthlyPrice}<span className="text-sm text-muted-foreground font-normal">/month</span>
          </p>
          {organization?.current_period_end && (
            <p className="text-sm text-muted-foreground mt-4">
              Next billing: {new Date(organization.current_period_end).toLocaleDateString()}
            </p>
          )}
        </motion.div>

        {/* Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-lg p-6 border border-border"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Training Hours</h2>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {(trainingHoursUsed || 0).toFixed(1)} / {trainingHoursIncluded || 0} hours used
              </span>
              <span className={`font-medium ${
                usagePercentage > 90 ? 'text-red-400' : usagePercentage > 70 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {(trainingHoursIncluded - (trainingHoursUsed || 0)).toFixed(1)}h remaining
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
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
          !isAnnual ? 'text-foreground' : 'text-muted-foreground'
        }`} onClick={() => setBillingCycle('monthly')}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(isAnnual ? 'monthly' : 'annual')}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isAnnual ? 'bg-gradient-to-r from-pink-500 to-orange-500' : 'bg-muted'
          }`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            isAnnual ? 'translate-x-7' : 'translate-x-1'
          }`} />
        </button>
        <span className={`text-sm font-medium cursor-pointer transition-colors ${
          isAnnual ? 'text-foreground' : 'text-muted-foreground'
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
              className={`relative rounded-lg p-6 border-2 transition-all ${
                plan.featured
                  ? 'border-transparent bg-gradient-to-b from-card to-card shadow-lg'
                  : isCurrent
                  ? 'border-primary-500 bg-card'
                  : 'border-border bg-card hover:border-border'
              }`}
              style={plan.featured ? {
                background: 'linear-gradient(#1f2937, #1f2937) padding-box, linear-gradient(135deg, #ec4899, #f97316, #eab308) border-box'
              } : undefined}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-pink-500 to-orange-500 text-foreground text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">{plan.tier}</p>
                <h3 className="text-xl font-bold text-foreground mt-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">${price}</span>
                <span className="text-muted-foreground">/month</span>
                {isAnnual && (
                  <p className="text-sm text-green-400 mt-1">${plan.annualTotal.toLocaleString()} billed annually</p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-secondary-foreground">
                      {isAnnual && feature.annual ? feature.annual : feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 bg-muted text-muted-foreground font-medium rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(planId)}
                  className={`w-full py-3 font-medium rounded-md transition-colors ${
                    plan.featured
                      ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-foreground hover:opacity-90'
                      : 'bg-muted text-foreground hover:bg-muted border border-border'
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
        className="bg-card rounded-lg p-6 border border-border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Need more training hours?</h2>
            <p className="text-muted-foreground mt-1">Purchase hour blocks anytime. They never expire.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {HOUR_BLOCKS.map((block) => (
            <div key={block.hours} className="bg-muted border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-foreground">{block.hours}-Hour Block</h4>
                <span className="text-sm text-muted-foreground">
                  {block.calls}{block.discount && ` · ${block.discount}`}
                </span>
              </div>
              <div className="space-y-2">
                {Object.entries(PLANS).map(([planId, plan]) => (
                  <div key={planId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{plan.tier}</span>
                    <span className="font-semibold text-foreground">${plan.hourBlocks[block.hours]}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handlePurchaseHours(block.hours)}
                className="w-full mt-4 py-2 bg-muted hover:bg-muted text-foreground font-medium rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Purchase
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gradient-to-r from-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-lg flex items-start gap-4">
          <div className="p-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg flex-shrink-0">
            <Clock className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">Annual plans: All hours upfront</h4>
            <p className="text-sm text-muted-foreground mt-1">
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
        className="bg-card rounded-lg p-6 border border-border"
      >
        <h2 className="text-lg font-semibold text-foreground mb-6">Recent Invoices</h2>
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border border-l-2 border-l-transparent hover:border-l-primary-500 hover:bg-accent transition-colors">
                    <td className="px-6 py-3 text-sm text-foreground">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-foreground">{invoice.number}</td>
                    <td className="px-6 py-3 text-sm text-foreground">
                      ${(invoice.amount_paid / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-500/10 text-green-400' :
                        invoice.status === 'open' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-muted/10 text-muted-foreground'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
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
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground mt-1">Invoices will appear here after your first payment</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
