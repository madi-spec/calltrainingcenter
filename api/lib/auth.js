import { createClerkClient, verifyToken } from '@clerk/clerk-sdk-node';
import { createAdminClient, TABLES } from './supabase.js';

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

/**
 * Verify Clerk JWT token
 */
async function verifyClerkToken(token) {
  try {
    console.log('[Auth] CLERK_SECRET_KEY exists:', !!process.env.CLERK_SECRET_KEY);
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });
    return payload.sub; // Returns the Clerk user ID
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    return null;
  }
}

/**
 * Authentication middleware that validates Clerk JWT and fetches user profile
 */
export async function authMiddleware(req, res, next) {
  try {
    console.log('[Auth] Starting auth middleware');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[Auth] Verifying Clerk token...');
    const clerkUserId = await verifyClerkToken(token);

    if (!clerkUserId) {
      console.log('[Auth] Token verification failed');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    console.log('[Auth] Token verified, clerk user ID:', clerkUserId);

    // Fetch the user profile with organization data
    console.log('[Auth] Creating Supabase admin client...');
    const adminClient = createAdminClient();
    console.log('[Auth] Fetching user from database...');
    const { data: user, error: userError } = await adminClient
      .from(TABLES.USERS)
      .select(`
        *,
        organization:organizations(*),
        branch:branches(*)
      `)
      .eq('clerk_id', clerkUserId)
      .single();

    // Store clerk ID on request (useful for sync-user endpoint)
    req.clerkUserId = clerkUserId;
    req.token = token;

    if (userError || !user) {
      // User exists in Clerk but not in database yet
      // Allow request to continue for sync-user endpoint
      req.user = null;
      req.organization = null;
      req.branch = null;
      return next();
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account is not active'
      });
    }

    // Attach user data to request
    req.user = user;
    req.organization = user.organization;
    req.branch = user.branch;

    next();
  } catch (error) {
    console.error('[Auth] Auth middleware error:', error.message, error.stack);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed: ' + error.message
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no auth header
 */
export async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    req.organization = null;
    req.clerkUserId = null;
    return next();
  }

  // If there is an auth header, validate it
  return authMiddleware(req, res, next);
}

/**
 * Tenant middleware - requires organization context
 */
export function tenantMiddleware(req, res, next) {
  if (!req.user || !req.organization) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'User or organization not found'
    });
  }

  // Create a helper for tenant-scoped queries
  req.tenantQuery = (tableName) => {
    const adminClient = createAdminClient();
    return adminClient
      .from(tableName)
      .select('*')
      .eq('organization_id', req.organization.id);
  };

  // Create a helper for inserting with tenant scope
  req.tenantInsert = (tableName, data) => {
    const adminClient = createAdminClient();
    return adminClient
      .from(tableName)
      .insert({
        ...data,
        organization_id: req.organization.id
      })
      .select()
      .single();
  };

  next();
}

/**
 * Role-based access control middleware
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Permission-based access control middleware
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    const { hasPermission } = await import('./permissions.js');

    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`
      });
    }

    next();
  };
}

/**
 * Subscription status check middleware
 */
export function requireActiveSubscription(req, res, next) {
  if (!req.organization) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Organization not found'
    });
  }

  const activeStatuses = ['active', 'trialing'];

  if (!activeStatuses.includes(req.organization.subscription_status)) {
    return res.status(402).json({
      error: 'Payment Required',
      message: 'Active subscription required',
      subscription_status: req.organization.subscription_status
    });
  }

  next();
}

/**
 * Usage quota check middleware
 */
export function checkUsageQuota(req, res, next) {
  if (!req.organization) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Organization not found'
    });
  }

  const hoursIncluded = req.organization.training_hours_included || 0;
  const hoursUsed = parseFloat(req.organization.training_hours_used) || 0;

  const hasPaymentMethod = !!req.organization.stripe_customer_id;

  if (hoursUsed >= hoursIncluded && !hasPaymentMethod) {
    return res.status(402).json({
      error: 'Quota Exceeded',
      message: 'Training hours quota exceeded. Please upgrade or add a payment method.',
      hours_included: hoursIncluded,
      hours_used: hoursUsed
    });
  }

  req.usageInfo = {
    hoursIncluded,
    hoursUsed,
    hoursRemaining: Math.max(0, hoursIncluded - hoursUsed),
    isOverage: hoursUsed >= hoursIncluded
  };

  next();
}

/**
 * Branch access middleware
 */
export function checkBranchAccess(req, res, next) {
  const branchId = req.params.branchId || req.body.branch_id;

  if (!branchId) {
    return next();
  }

  if (['owner', 'admin'].includes(req.user.role)) {
    return next();
  }

  if (req.user.role === 'manager' && req.user.branch_id === branchId) {
    return next();
  }

  if (req.user.branch_id !== branchId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this branch'
    });
  }

  next();
}

/**
 * User access middleware
 */
export function checkUserAccess(req, res, next) {
  const targetUserId = req.params.userId || req.body.user_id;

  if (!targetUserId) {
    return next();
  }

  if (req.user.id === targetUserId) {
    return next();
  }

  if (['owner', 'admin'].includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden',
    message: 'You do not have access to this user'
  });
}

export default {
  authMiddleware,
  optionalAuthMiddleware,
  tenantMiddleware,
  requireRole,
  requirePermission,
  requireActiveSubscription,
  checkUsageQuota,
  checkBranchAccess,
  checkUserAccess
};
