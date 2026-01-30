# Stripe Integration Setup Checklist

This document outlines the steps needed to fully wire up Stripe for payments.

## Prerequisites

1. Create a Stripe account at https://dashboard.stripe.com
2. Get your API keys from the Developers section

## Environment Variables

Add these to your `.env` file:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...           # From Stripe Dashboard > Developers > API keys
STRIPE_WEBHOOK_SECRET=whsec_...         # From Stripe Dashboard > Developers > Webhooks

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PROFESSIONAL_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
STRIPE_OVERAGE_PRICE_ID=price_...       # Optional: for metered overage billing
```

## Stripe Dashboard Configuration

### 1. Create Products and Prices

Go to **Products** in Stripe Dashboard and create:

#### Starter Plan ($99/month)
- Name: "CSR Training - Starter"
- Price: $99/month (recurring)
- Add metadata: `plan_id: starter`
- Copy the Price ID to `STRIPE_STARTER_PRICE_ID`

#### Professional Plan ($299/month)
- Name: "CSR Training - Professional"
- Price: $299/month (recurring)
- Add metadata: `plan_id: professional`
- Copy the Price ID to `STRIPE_PROFESSIONAL_PRICE_ID`

#### Enterprise Plan ($799/month)
- Name: "CSR Training - Enterprise"
- Price: $799/month (recurring)
- Add metadata: `plan_id: enterprise`
- Copy the Price ID to `STRIPE_ENTERPRISE_PRICE_ID`

#### Overage/Additional Hours (Optional)
- Name: "Additional Training Hours"
- Price: $9/hour (metered, per unit)
- Copy the Price ID to `STRIPE_OVERAGE_PRICE_ID`

### 2. Configure Webhook

Go to **Developers > Webhooks** and create an endpoint:

- **Endpoint URL**: `https://your-domain.com/api/billing/webhook`
- **Events to listen for**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Copy the **Signing Secret** to `STRIPE_WEBHOOK_SECRET`

### 3. Configure Customer Portal

Go to **Settings > Billing > Customer Portal**:

- Enable the customer portal
- Configure allowed actions:
  - [x] Update payment method
  - [x] View invoice history
  - [x] Cancel subscription (optional)
  - [x] Update billing information
- Set return URL: `https://your-domain.com/settings/billing`

## Database Setup

Run the migration to create billing tables:

```bash
# In Supabase SQL Editor, run:
supabase-migrations/003_billing_tables.sql
```

This creates:
- `usage_records` - Track training minutes usage
- `invoices` - Store invoice records
- `hour_purchases` - Track additional hour purchases

## Plan Features by Tier

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Training Hours/month | 10 | 50 | 200 |
| Max Users | 5 | 25 | Unlimited |
| Basic Scenarios | ✓ | ✓ | ✓ |
| Custom Scenarios | - | ✓ | ✓ |
| Branch Management | - | ✓ | ✓ |
| Advanced Analytics | - | - | ✓ |
| API Access | - | - | ✓ |
| Support | Email | Priority | Dedicated |
| Price | $99/mo | $299/mo | $799/mo |

## API Endpoints

The following billing endpoints are available:

### Public
- `POST /api/billing/webhook` - Stripe webhook handler

### Authenticated (Admin/Owner)
- `GET /api/billing/plans` - Get available plans
- `GET /api/billing/usage` - Get current usage
- `GET /api/billing/status` - Get subscription status
- `GET /api/billing/invoices` - Get invoice history
- `GET /api/billing/hour-packages` - Get available hour packages
- `POST /api/billing/checkout` - Create subscription checkout (Owner only)
- `POST /api/billing/portal` - Access billing portal
- `POST /api/billing/cancel` - Cancel subscription (Owner only)
- `POST /api/billing/purchase-hours` - Buy additional training hours

## Testing

### Test Mode
- Use test API keys (starting with `sk_test_`)
- Use Stripe test card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

### Test Webhook Locally
Use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/billing/webhook
```

## User Management

Training hours and user limits are enforced through:

1. **User limits**: Check `PLANS[planId].maxUsers` when adding team members
2. **Training hours**: Track via `organization.training_hours_used`
3. **Overage**: When hours exceed included, either:
   - Block new training sessions
   - Allow overage at $9/hour (if metered billing enabled)

## Troubleshooting

### Webhook Signature Verification Failed
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
- The webhook endpoint uses `express.raw()` for signature verification
- Check that no other middleware is parsing the body before the webhook route

### Subscription Not Updating
- Verify webhook events are being received (check Stripe Dashboard > Webhooks)
- Check server logs for webhook processing errors
- Ensure the `organization_id` metadata is set correctly on checkout sessions

### Hours Not Provisioning
- Check that `checkout.session.completed` webhook is received
- Verify the `purchase_type: 'training_hours'` metadata is set
- Check database for the `hour_purchases` record
