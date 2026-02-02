/**
 * Role-Based Access Control (RBAC) System
 * Defines permissions for each role in the application
 */

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY = ['trainee', 'manager', 'admin', 'super_admin'];

// Permission definitions
export const PERMISSIONS = {
  // Training permissions
  'training:start': 'Start a training session',
  'training:view_own': 'View own training sessions',
  'training:view_team': 'View team training sessions',
  'training:view_all': 'View all organization training sessions',

  // Assignment permissions
  'assignments:view_own': 'View own assignments',
  'assignments:view_team': 'View team assignments',
  'assignments:view_all': 'View all assignments',
  'assignments:create': 'Create assignments',
  'assignments:edit': 'Edit assignments',
  'assignments:delete': 'Delete assignments',

  // Suite permissions
  'suites:view': 'View training suites',
  'suites:create': 'Create training suites',
  'suites:edit': 'Edit training suites',
  'suites:delete': 'Delete training suites',

  // User management permissions
  'users:view_own': 'View own profile',
  'users:view_team': 'View team members',
  'users:view_all': 'View all users',
  'users:invite': 'Invite new users',
  'users:edit': 'Edit user profiles',
  'users:delete': 'Delete users',
  'users:change_role': 'Change user roles',

  // Branch permissions
  'branches:view': 'View branches',
  'branches:create': 'Create branches',
  'branches:edit': 'Edit branches',
  'branches:delete': 'Delete branches',

  // Report permissions
  'reports:view_own': 'View own reports',
  'reports:view_team': 'View team reports',
  'reports:view_all': 'View organization reports',
  'reports:export': 'Export reports',

  // Billing permissions
  'billing:view': 'View billing information',
  'billing:manage': 'Manage billing and subscriptions',

  // Settings permissions
  'settings:view': 'View organization settings',
  'settings:edit': 'Edit organization settings',
  'settings:ai': 'Configure AI settings',

  // Gamification permissions
  'leaderboard:view': 'View leaderboards',
  'badges:view': 'View badges',
  'badges:create': 'Create custom badges',

  // Notification permissions
  'notifications:view_own': 'View own notifications',
  'notifications:send': 'Send notifications to users'
};

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  trainee: [
    'training:start',
    'training:view_own',
    'assignments:view_own',
    'suites:view',
    'users:view_own',
    'reports:view_own',
    'leaderboard:view',
    'badges:view',
    'notifications:view_own'
  ],

  manager: [
    // All trainee permissions
    'training:start',
    'training:view_own',
    'training:view_team',
    'assignments:view_own',
    'assignments:view_team',
    'assignments:create',
    'assignments:edit',
    'suites:view',
    'suites:create',
    'users:view_own',
    'users:view_team',
    'users:invite',
    'branches:view',
    'reports:view_own',
    'reports:view_team',
    'reports:export',
    'leaderboard:view',
    'badges:view',
    'notifications:view_own',
    'notifications:send'
  ],

  admin: [
    // All manager permissions plus...
    'training:start',
    'training:view_own',
    'training:view_team',
    'training:view_all',
    'assignments:view_own',
    'assignments:view_team',
    'assignments:view_all',
    'assignments:create',
    'assignments:edit',
    'assignments:delete',
    'suites:view',
    'suites:create',
    'suites:edit',
    'suites:delete',
    'users:view_own',
    'users:view_team',
    'users:view_all',
    'users:invite',
    'users:edit',
    'branches:view',
    'branches:create',
    'branches:edit',
    'reports:view_own',
    'reports:view_team',
    'reports:view_all',
    'reports:export',
    'billing:view',
    'settings:view',
    'settings:edit',
    'settings:ai',
    'leaderboard:view',
    'badges:view',
    'badges:create',
    'notifications:view_own',
    'notifications:send'
  ],

  owner: [
    // All permissions
    ...Object.keys(PERMISSIONS)
  ]
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Permissions to check
 * @returns {boolean}
 */
export function hasAnyPermission(role, permissions) {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Check if a role has all of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Permissions to check
 * @returns {boolean}
 */
export function hasAllPermissions(role, permissions) {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]}
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role A is higher than role B in the hierarchy
 * @param {string} roleA - First role
 * @param {string} roleB - Second role
 * @returns {boolean}
 */
export function isHigherRole(roleA, roleB) {
  const indexA = ROLE_HIERARCHY.indexOf(roleA);
  const indexB = ROLE_HIERARCHY.indexOf(roleB);
  return indexA > indexB;
}

/**
 * Check if role A is equal to or higher than role B
 * @param {string} roleA - First role
 * @param {string} roleB - Second role
 * @returns {boolean}
 */
export function isRoleAtLeast(roleA, roleB) {
  const indexA = ROLE_HIERARCHY.indexOf(roleA);
  const indexB = ROLE_HIERARCHY.indexOf(roleB);
  return indexA >= indexB;
}

/**
 * Get list of roles that a user can assign to others
 * Users can only assign roles lower than their own
 * @param {string} role - Current user's role
 * @returns {string[]}
 */
export function getAssignableRoles(role) {
  const roleIndex = ROLE_HIERARCHY.indexOf(role);
  if (roleIndex <= 0) return [];
  return ROLE_HIERARCHY.slice(0, roleIndex);
}

/**
 * Get the scope of data access for a role
 * @param {string} role - User role
 * @returns {'own' | 'team' | 'all'}
 */
export function getDataScope(role) {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'all';
    case 'manager':
      return 'team';
    default:
      return 'own';
  }
}

/**
 * Build a query filter based on user's data access scope
 * @param {object} user - User object with role and branch_id
 * @param {string} tableName - Table being queried
 * @returns {object} - Query conditions
 */
export function buildScopeFilter(user, tableName) {
  const scope = getDataScope(user.role);

  switch (scope) {
    case 'all':
      // Admins and owners see all org data (already filtered by tenant middleware)
      return {};

    case 'team':
      // Managers see their branch data
      if (tableName === 'users' || tableName === 'training_sessions') {
        return user.branch_id ? { branch_id: user.branch_id } : {};
      }
      return {};

    case 'own':
    default:
      // Trainees only see their own data
      if (tableName === 'training_sessions' || tableName === 'training_assignments') {
        return { user_id: user.id };
      }
      if (tableName === 'users') {
        return { id: user.id };
      }
      return {};
  }
}

/**
 * Validate role transition
 * Used when changing a user's role
 * @param {string} actorRole - Role of the user making the change
 * @param {string} targetCurrentRole - Target user's current role
 * @param {string} targetNewRole - Desired new role
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateRoleTransition(actorRole, targetCurrentRole, targetNewRole) {
  // Must have permission to change roles
  if (!hasPermission(actorRole, 'users:change_role')) {
    return { valid: false, message: 'You do not have permission to change roles' };
  }

  // Cannot promote someone to your level or higher
  if (!isHigherRole(actorRole, targetNewRole)) {
    return { valid: false, message: 'Cannot assign a role equal to or higher than your own' };
  }

  // Cannot demote someone at your level or higher
  if (isRoleAtLeast(targetCurrentRole, actorRole)) {
    return { valid: false, message: 'Cannot modify the role of a user at or above your level' };
  }

  return { valid: true };
}

/**
 * Create a permissions object for the frontend
 * Returns a map of permissions with boolean values
 * @param {string} role - User role
 * @returns {Object<string, boolean>}
 */
export function getPermissionsObject(role) {
  const perms = {};
  for (const permission of Object.keys(PERMISSIONS)) {
    perms[permission] = hasPermission(role, permission);
  }
  return perms;
}

export default {
  ROLE_HIERARCHY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  isHigherRole,
  isRoleAtLeast,
  getAssignableRoles,
  getDataScope,
  buildScopeFilter,
  validateRoleTransition,
  getPermissionsObject
};
