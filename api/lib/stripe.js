import Stripe from 'stripe';
import { createAdminClient, TABLES } from './supabase.js';

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripeClient = null;

function getStripeClient() {
  if (!stripeClient && stripeSecretKey) {
    stripeClient = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
  }
  return stripeClient;
}

/**
 * Subscription Plans Configuration
 */
export const PLANS = {
  trial: {
    name: 'Free Trial',
    tier: 'Trial',
    priceId: null, // No Stripe price for trial
    trainingHours: 1,
    maxUsers: 3,
    features: [
      '1 training hour',
      '3 team members',
      '10 day trial',
      'All scenarios',
      'Basic coaching'
    ],
    price: 0
  },
  starter: {
    name: 'Starter',
    tier: 'Try It',
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    trainingHours: 5,
    maxUsers: 3,
    features: [
      '5 training hours/month',
      '3 team members',
      '8 standard scenarios',
      'Basic coaching scorecards',
      'Email support'
    ],
    price: 149
  },
  pro: {
    name: 'Pro',
    tier: 'Build Your Team',
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    trainingHours: 12,
    maxUsers: 10,
    features: [
      '12 training hours/month',
      '10 team members',
      'All scenarios + custom builder',
      'Team trends & leaderboards',
      'Priority support'
    ],
    price: 349
  },
  enterprise: {
    name: 'Enterprise',
    tier: 'Scale It',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    trainingHours: 25,
    maxUsers: -1, // Unlimited
    features: [
      '25 training hours/month',
      'Unlimited team members',
      'All scenarios + custom development',
      'Full analytics + API access',
      'Dedicated success manager'
    ],
    price: 699
  }
};

/**
 * Overage pricing for training minutes
 */
export const OVERAGE_PRICING = {
  priceId: process.env.STRIPE_OVERAGE_PRICE_ID,
  pricePerMinute: 0.15, // $0.15 per minute overage
  pricePerHour: 9 // $9 per hour overage
};

/**
 * Create a Stripe customer for an organization
 */
export async function createCustomer(organization, email) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe not configured');

  const customer = await stripe.customers.create({
    name: organization.name,
    email: email,
    metadata: {
      organization_id: organization.id,
      organization_slug: organization.slug
    }
  });

  // Update organization with Stripe customer ID
  const adminClient = createAdminClient();
  await adminClient
    .from(TABLES.ORGANIZATIONS)
    .update({ stripe_customer_id: customer.id })
    .eq('id', organization.id);

  return customer;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(organization, planId, successUrl, cancelUrl) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe not configured');

  const plan = PLANS[planId];
  if (!plan) throw new Error('Invalid plan');

  let customerId = organization.stripe_customer_id;

  // Create customer if doesn't exist
  if (!customerId) {
    const adminClient = createAdminClient();
    const { data: owner } = await adminClient
      .from(TABLES.USERS)
      .select('email')
      .eq('organization_id', organization.id)
      .eq('role', 'super_admin')
      .single();

    const customer = await createCustomer(organization, owner?.email);
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: plan.priceId,
        quantity: 1
      }
    ],
    subscription_data: {
      metadata: {
        organization_id: organization.id,
        plan_id: planId
      }
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true
  });

  return session;
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(organization, returnUrl) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe not configured');

  if (!organization.stripe_customer_id) {
    throw new Error('Organization has no billing account');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: organization.stripe_customer_id,
    return_url: returnUrl
  });

  return session;
}

/**
 * Report usage for metered billing
 */
export async function reportUsage(organization, quantity, timestamp = null) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe not configured');

  if (!organization.stripe_customer_id) return null;

  // Get the subscription
  const subscriptions = await stripe.subscriptions.list({
    customer: organization.stripe_customer_id,
    status: 'active',
    limit: 1
  });

  if (subscriptions.data.length === 0) return null;

  const subscription = subscriptions.data[0];

  // Find the metered price item
  const meteredItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type === 'metered'
  );

  if (!meteredItem) return null;

  const usageRecord = await stripe.subscriptionItems.createUsageRecord(
    meteredItem.id,
    {
      quantity: Math.ceil(quantity), // Round up to nearest minute
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'increment'
    }
  );

  return usageRecord;
}

/**
 * Get current usage for billing period
 */
export async function getCurrentUsage(organization) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe not configured');

  if (!organization.stripe_customer_id) {
    return {
      hoursIncluded: organization.training_hours_included || 10,
      hoursUsed: parseFloat(organization.training_hours_used) || 0,
      hoursRemaining: (organization.training_hours_included || 10) - (parseFloat(organization.training_hours_used) || 0),
      overageHours: 0,
      overageCost: 0
    };
  }

  const hoursIncluded = organization.training_hours_included || 10;
  const hoursUsed = parseFloat(organization.training_hours_used) || 0;
  const hoursRemaining = Math.max(0, hoursIncluded - hoursUsed);
  const overageHours = Math.max(0, hoursUsed - hoursIncluded);
  const overageCost = overageHours * OVERAGE_PRICING.pricePerHour;

  return {
    hoursIncluded,
    hoursUsed: Math.round(hoursUsed * 100) / 100,
    hoursRemaining: Math.round(hoursRemaining * 100) / 100,
    overageHours: Math.round(overageHours * 100) / 100,
    overageCost: Math.round(overageCost * 100) / 100
  };
}

/**
 * Get invoices for an organization
 */
export async function getInvoices(organization, limit = 10) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe not configured');

  if (!organization.stripe_customer_id) return [];

  const invoices = await stripe.invoices.list({
    customer: organization.stripe_customer_id,
    limit: limit
  });

  return invoices.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    period_start: new Date(invoice.period_start * 1000),
    period_end: new Date(invoice.period_end * 1000),
    invoice_url: invoice.hosted_invoice_url,
    pdf_url: invoice.invoice_pdf,
    created_at: new Date(invoice.created * 1000)
  }));
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(organization) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe not configured');

  if (!organization.stripe_customer_id) {
    return {
      status: organization.subscription_status || 'trialing',
      plan: organization.subscription_plan || 'starter',
      current_period_end: null,
      cancel_at_period_end: false
    };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: organization.stripe_customer_id,
    limit: 1
  });

  if (subscriptions.data.length === 0) {
    return {
      status: 'canceled',
      plan: null,
      current_period_end: null,
      cancel_at_period_end: false
    };
  }

  const subscription = subscriptions.data[0];

  return {
    status: subscription.status,
    plan: subscription.metadata.plan_id || 'starter',
    current_period_end: new Date(subscription.current_period_end * 1000),
    cancel_at_period_end: subscription.cancel_at_period_end
  };
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event) {
  const adminClient = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;

      // Check if this is a one-time purchase of training hours
      if (session.metadata?.purchase_type === 'training_hours') {
        const organizationId = session.metadata.organization_id;
        const purchasedHours = parseInt(session.metadata.hours, 10);

        if (organizationId && purchasedHours > 0) {
          // Get current org data
          const { data: org } = await adminClient
            .from(TABLES.ORGANIZATIONS)
            .select('training_hours_included')
            .eq('id', organizationId)
            .single();

          if (org) {
            // Add purchased hours to included hours
            const newIncluded = (org.training_hours_included || 0) + purchasedHours;
            await adminClient
              .from(TABLES.ORGANIZATIONS)
              .update({ training_hours_included: newIncluded })
              .eq('id', organizationId);

            // Record the purchase for tracking
            await adminClient
              .from(TABLES.HOUR_PURCHASES)
              .insert({
                organization_id: organizationId,
                stripe_session_id: session.id,
                stripe_payment_intent_id: session.payment_intent,
                hours_purchased: purchasedHours,
                amount_paid: session.amount_total,
                currency: session.currency,
                status: 'completed',
                completed_at: new Date()
              });

            console.log(`Added ${purchasedHours} training hours to org ${organizationId}. New total: ${newIncluded}`);
          }
        }
        break;
      }

      // Handle subscription checkout
      const organizationId = session.subscription_data?.metadata?.organization_id;
      const planId = session.subscription_data?.metadata?.plan_id;

      if (organizationId) {
        const plan = PLANS[planId] || PLANS.starter;
        await adminClient
          .from(TABLES.ORGANIZATIONS)
          .update({
            subscription_status: 'active',
            subscription_plan: planId,
            training_hours_included: plan.trainingHours
          })
          .eq('id', organizationId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const { data: org } = await adminClient
        .from(TABLES.ORGANIZATIONS)
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (org) {
        const planId = subscription.metadata.plan_id;
        const plan = PLANS[planId] || PLANS.starter;

        await adminClient
          .from(TABLES.ORGANIZATIONS)
          .update({
            subscription_status: subscription.status,
            subscription_plan: planId,
            training_hours_included: plan.trainingHours
          })
          .eq('id', org.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      await adminClient
        .from(TABLES.ORGANIZATIONS)
        .update({
          subscription_status: 'canceled'
        })
        .eq('stripe_customer_id', customerId);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      const { data: org } = await adminClient
        .from(TABLES.ORGANIZATIONS)
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (org) {
        // Reset usage for new billing period
        await adminClient
          .from(TABLES.ORGANIZATIONS)
          .update({ training_hours_used: 0 })
          .eq('id', org.id);

        // Store invoice record
        await adminClient.from(TABLES.INVOICES).insert({
          organization_id: org.id,
          stripe_invoice_id: invoice.id,
          period_start: new Date(invoice.period_start * 1000),
          period_end: new Date(invoice.period_end * 1000),
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          status: 'paid',
          invoice_url: invoice.hosted_invoice_url
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      await adminClient
        .from(TABLES.ORGANIZATIONS)
        .update({ subscription_status: 'past_due' })
        .eq('stripe_customer_id', customerId);
      break;
    }

    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }

  return { received: true };
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(payload, signature) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe not configured');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('Webhook secret not configured');

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(organization, cancelImmediately = false) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe not configured');

  if (!organization.stripe_customer_id) {
    throw new Error('Organization has no billing account');
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: organization.stripe_customer_id,
    status: 'active',
    limit: 1
  });

  if (subscriptions.data.length === 0) {
    throw new Error('No active subscription found');
  }

  const subscription = subscriptions.data[0];

  if (cancelImmediately) {
    await stripe.subscriptions.cancel(subscription.id);
  } else {
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true
    });
  }

  return { success: true };
}

/**
 * Update usage in database and report to Stripe if overage
 */
export async function recordUsage(organizationId, minutes, sessionId = null, userId = null) {
  const adminClient = createAdminClient();

  // Get organization
  const { data: org } = await adminClient
    .from(TABLES.ORGANIZATIONS)
    .select('*')
    .eq('id', organizationId)
    .single();

  if (!org) throw new Error('Organization not found');

  const hours = minutes / 60;
  const newHoursUsed = (parseFloat(org.training_hours_used) || 0) + hours;

  // Update organization usage
  await adminClient
    .from(TABLES.ORGANIZATIONS)
    .update({ training_hours_used: newHoursUsed })
    .eq('id', organizationId);

  // Record usage for tracking
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  await adminClient.from(TABLES.USAGE_RECORDS).insert({
    organization_id: organizationId,
    session_id: sessionId,
    user_id: userId,
    usage_type: 'training_minutes',
    quantity: minutes,
    unit: 'minutes',
    billing_period_start: periodStart,
    billing_period_end: periodEnd
  });

  // Report overage to Stripe if applicable
  const hoursIncluded = org.training_hours_included || 10;
  if (newHoursUsed > hoursIncluded && org.stripe_customer_id) {
    const overageMinutes = Math.min(minutes, (newHoursUsed - hoursIncluded) * 60);
    if (overageMinutes > 0) {
      await reportUsage(org, overageMinutes);
    }
  }

  return {
    hoursUsed: newHoursUsed,
    hoursIncluded: hoursIncluded,
    isOverage: newHoursUsed > hoursIncluded
  };
}

export default {
  PLANS,
  OVERAGE_PRICING,
  createCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  reportUsage,
  getCurrentUsage,
  getInvoices,
  getSubscriptionStatus,
  handleWebhookEvent,
  verifyWebhookSignature,
  cancelSubscription,
  recordUsage
};
