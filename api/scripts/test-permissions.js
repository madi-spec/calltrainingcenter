/**
 * Test permissions for a user role
 * Usage: node api/scripts/test-permissions.js <role>
 */

import { hasPermission, getRolePermissions, ROLE_PERMISSIONS } from '../lib/permissions.js';

const role = process.argv[2] || 'super_admin';

console.log(`\n=== Testing permissions for role: ${role} ===\n`);

// Check if role exists in ROLE_PERMISSIONS
console.log('1. Role exists in ROLE_PERMISSIONS:', role in ROLE_PERMISSIONS);
console.log('   Available roles:', Object.keys(ROLE_PERMISSIONS).join(', '));

// Get all permissions for this role
const permissions = getRolePermissions(role);
console.log('\n2. Total permissions for role:', permissions.length);

// Check specific permission
const canInvite = hasPermission(role, 'users:invite');
console.log('\n3. Can invite users (users:invite):', canInvite);

// Check other key permissions
const keyPermissions = [
  'users:invite',
  'users:view_all',
  'users:edit',
  'users:change_role',
  'settings:edit',
  'billing:manage'
];

console.log('\n4. Key permissions check:');
keyPermissions.forEach(perm => {
  const has = hasPermission(role, perm);
  console.log(`   ${perm}: ${has ? '✓' : '✗'}`);
});

// Show first 10 permissions
console.log('\n5. First 10 permissions:');
permissions.slice(0, 10).forEach(perm => {
  console.log(`   - ${perm}`);
});

console.log('\n=== Test Complete ===\n');
