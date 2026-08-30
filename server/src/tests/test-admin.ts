import { verifyPassword } from '../utils/password';
import { env } from '../utils/env';

async function runAdminSecurityTests() {
  console.log('--- Running Step 5 Hidden Admin Security Tests ---');

  // Test 1: Admin Hash Environment Variable Check
  console.assert(!!env.ADMIN_PASSWORD_HASH, 'ADMIN_PASSWORD_HASH must be configured');

  // Test 2: Valid Admin Password
  const isValidAdmin = await verifyPassword('adminsecret123', env.ADMIN_PASSWORD_HASH);
  console.assert(isValidAdmin === true, 'Admin password verification failed for correct password');

  // Test 3: Invalid Admin Password
  const isInvalidAdmin = await verifyPassword('wrongadminpass', env.ADMIN_PASSWORD_HASH);
  console.assert(isInvalidAdmin === false, 'Invalid admin password should be rejected');

  console.log('✅ Step 5 Admin Security Verification Passed.');
}

runAdminSecurityTests().catch((err) => {
  console.error('❌ Admin test failed:', err);
  process.exit(1);
});
