import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import {
  createCheckoutSession,
  createBillingPortalSession,
  getCurrentUsage,
  getInvoices,
  getSubscriptionStatus,
  handleWebhookEvent,
  verifyWebhookSignature,
  cancelSubscription,
  PLANS
} from '../lib/stripe.js';

const router = Router();

/**
 * POST /api/billing/webhook
 * Handle Stripe webhooks (no auth required)
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = verifyWebhookSignature(req.body, signature);
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

export default router;
