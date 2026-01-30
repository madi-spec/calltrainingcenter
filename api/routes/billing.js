import { Router } from 'express';
import Stripe from 'stripe';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient, TABLES } from '../lib/supabase.js';
import {
  createCheckoutSession,
  createBillingPortalSession,
  getCurrentUsage,
  getInvoices,
  getSubscriptionStatus,
  handleWebhookEvent,
  verifyWebhookSignature,
  cancelSubscription,
  PLANS,
  OVERAGE_PRICING
} from '../lib/stripe.js';

const router = Router();

// ============ PROMO CODES ============
// Each code gives 1 month of Enterprise tier for free
const PROMO_CODES = {
  'UGROUPPALMSPRINGS2026': {
    name: 'UGroup Palm Springs 2026',
    plan: 'enterprise',
    durationDays: 30,
    trainingHours: 25,
    maxRedemptions: 50,  // Limit total uses
    description: 'One month free Enterprise access for UGroup Palm Springs attendees'
  },
  'FOUNDINGPARTNER2026': {
    name: 'Founding Partner',
    plan: 'enterprise',
    durationDays: 30,
    trainingHours: 25,
    maxRedemptions: 20,
    description: 'One month free Enterprise access for our founding development partners'
  }
};

// Initialize Stripe for direct operations
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

/**
 * POST /api/billing/webhook
 * Handle Stripe webhooks (no auth required)
 * Note: express.raw() middleware is applied to this route in index.js
 * so req.body will be a Buffer, not parsed JSON
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    // req.body is a Buffer when using express.raw()
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const event = verifyWebhookSignature(rawBody, signature);
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Apply auth middleware to remaining routes
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/billing/plans
 * Get available subscription plans
 */
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

/**
 * GET /api/billing/usage
 * Get current usage for the organization
 */
router.get('/usage', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const usage = await getCurrentUsage(req.organization);
    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/status
 * Get subscription status
 */
router.get('/status', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const status = await getSubscriptionStatus(req.organization);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/invoices
 * Get invoice history
 */
router.get('/invoices', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const invoices = await getInvoices(req.organization, parseInt(limit));
    res.json({ invoices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/billing/checkout
 * Create a checkout session for subscription
 */
router.post('/checkout', requireRole('owner'), async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;

    if (!planId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = await createCheckoutSession(
      req.organization,
      planId,
      successUrl,
      cancelUrl
    );

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/billing/portal
 * Create a billing portal session
 */
router.post('/portal', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const returnUrl = req.body.returnUrl || `${process.env.APP_URL}/settings/billing`;
    const session = await createBillingPortalSession(req.organization, returnUrl);
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/billing/cancel
 * Cancel subscription
 */
router.post('/cancel', requireRole('owner'), async (req, res) => {
  try {
    const { immediately = false } = req.body;
    await cancelSubscription(req.organization, immediately);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/billing/purchase-hours
 * Purchase additional training hours
 */
router.post('/purchase-hours', requireRole('admin', 'owner'), async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const { hours, successUrl, cancelUrl } = req.body;

    if (!hours || hours < 1 || hours > 100) {
      return res.status(400).json({ error: 'Hours must be between 1 and 100' });
    }

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Success and cancel URLs are required' });
    }

    const organization = req.organization;
    let customerId = organization.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const adminClient = createAdminClient();
      const { data: owner } = await adminClient
        .from(TABLES.USERS)
        .select('email')
        .eq('organization_id', organization.id)
        .eq('role', 'owner')
        .single();

      const customer = await stripe.customers.create({
        name: organization.name,
        email: owner?.email,
        metadata: {
          organization_id: organization.id,
          organization_slug: organization.slug
        }
      });

      await adminClient
        .from(TABLES.ORGANIZATIONS)
        .update({ stripe_customer_id: customer.id })
        .eq('id', organization.id);

      customerId = customer.id;
    }

    // Calculate price (using overage rate for additional hours)
    const pricePerHour = OVERAGE_PRICING.pricePerHour * 100; // Convert to cents
    const totalAmount = hours * pricePerHour;

    // Create a one-time checkout session for additional hours
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${hours} Additional Training Hours`,
              description: `One-time purchase of ${hours} training hours at $${OVERAGE_PRICING.pricePerHour}/hour`
            },
            unit_amount: pricePerHour
          },
          quantity: hours
        }
      ],
      metadata: {
        organization_id: organization.id,
        purchase_type: 'training_hours',
        hours: hours.toString()
      },
      success_url: successUrl,
      cancel_url: cancelUrl
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Purchase hours error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/hour-packages
 * Get available hour packages for purchase
 */
router.get('/hour-packages', requireRole('admin', 'owner'), (req, res) => {
  // Predefined packages for additional hours
  const packages = [
    {
      id: 'hours_5',
      hours: 5,
      price: 5 * OVERAGE_PRICING.pricePerHour,
      pricePerHour: OVERAGE_PRICING.pricePerHour,
      savings: 0,
      description: '5 hours'
    },
    {
      id: 'hours_10',
      hours: 10,
      price: 10 * OVERAGE_PRICING.pricePerHour * 0.95, // 5% discount
      pricePerHour: OVERAGE_PRICING.pricePerHour * 0.95,
      savings: 5,
      description: '10 hours (5% off)',
      popular: true
    },
    {
      id: 'hours_25',
      hours: 25,
      price: 25 * OVERAGE_PRICING.pricePerHour * 0.90, // 10% discount
      pricePerHour: OVERAGE_PRICING.pricePerHour * 0.90,
      savings: 10,
      description: '25 hours (10% off)'
    },
    {
      id: 'hours_50',
      hours: 50,
      price: 50 * OVERAGE_PRICING.pricePerHour * 0.85, // 15% discount
      pricePerHour: OVERAGE_PRICING.pricePerHour * 0.85,
      savings: 15,
      description: '50 hours (15% off)',
      bestValue: true
    }
  ];

  res.json({ packages, basePrice: OVERAGE_PRICING.pricePerHour });
});

/**
 * POST /api/billing/redeem-promo
 * Redeem a promotional code for free Enterprise access
 */
router.post('/redeem-promo', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    // Normalize code to uppercase
    const normalizedCode = code.trim().toUpperCase();
    const promoConfig = PROMO_CODES[normalizedCode];

    if (!promoConfig) {
      return res.status(400).json({ error: 'Invalid promo code' });
    }

    const adminClient = createAdminClient();
    const organization = req.organization;

    // Check if this organization already redeemed this code
    const { data: existingRedemption } = await adminClient
      .from(TABLES.PROMO_REDEMPTIONS)
      .select('id')
      .eq('organization_id', organization.id)
      .eq('promo_code', normalizedCode)
      .single();

    if (existingRedemption) {
      return res.status(400).json({ error: 'This code has already been redeemed by your organization' });
    }

    // Check total redemptions for this code
    const { count: totalRedemptions } = await adminClient
      .from(TABLES.PROMO_REDEMPTIONS)
      .select('id', { count: 'exact', head: true })
      .eq('promo_code', normalizedCode);

    if (totalRedemptions >= promoConfig.maxRedemptions) {
      return res.status(400).json({ error: 'This promo code has reached its maximum redemptions' });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + promoConfig.durationDays);

    // Update organization with promo benefits
    const { error: updateError } = await adminClient
      .from(TABLES.ORGANIZATIONS)
      .update({
        subscription_plan: promoConfig.plan,
        subscription_status: 'active',
        training_hours_included: promoConfig.trainingHours,
        training_hours_used: 0,
        promo_code: normalizedCode,
        promo_expires_at: expiresAt.toISOString(),
        current_period_end: expiresAt.toISOString()
      })
      .eq('id', organization.id);

    if (updateError) {
      console.error('Error updating organization:', updateError);
      throw new Error('Failed to apply promo code');
    }

    // Record the redemption
    await adminClient
      .from(TABLES.PROMO_REDEMPTIONS)
      .insert({
        organization_id: organization.id,
        promo_code: normalizedCode,
        promo_name: promoConfig.name,
        plan_granted: promoConfig.plan,
        hours_granted: promoConfig.trainingHours,
        expires_at: expiresAt.toISOString(),
        redeemed_by: req.user.id
      });

    res.json({
      success: true,
      message: `Promo code applied! You now have ${promoConfig.durationDays} days of free ${promoConfig.plan.charAt(0).toUpperCase() + promoConfig.plan.slice(1)} access.`,
      plan: promoConfig.plan,
      trainingHours: promoConfig.trainingHours,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Promo redemption error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/promo-status
 * Check if organization has an active promo
 */
router.get('/promo-status', requireRole('admin', 'owner'), async (req, res) => {
  try {
    const organization = req.organization;

    if (organization.promo_code && organization.promo_expires_at) {
      const expiresAt = new Date(organization.promo_expires_at);
      const isActive = expiresAt > new Date();

      res.json({
        hasPromo: isActive,
        promoCode: isActive ? organization.promo_code : null,
        expiresAt: isActive ? organization.promo_expires_at : null,
        daysRemaining: isActive ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)) : 0
      });
    } else {
      res.json({ hasPromo: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
