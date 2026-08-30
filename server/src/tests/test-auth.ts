import { hashPassword, verifyPassword } from '../utils/password';

async function runAuthUnitTests() {
  console.log('--- Running Step 4 Auth Unit & Security Tests ---');

  // Test 1: Password Hashing and Verification
  const rawPassword = 'SecurePassword123!';
  const hash = await hashPassword(rawPassword);

  console.log('Test 1: Password hash generated successfully.');
  console.assert(hash.length > 20, 'Hash should be non-empty');
  console.assert(!hash.includes(rawPassword), 'Hash must never contain raw password');

  const validMatch = await verifyPassword(rawPassword, hash);
  console.assert(validMatch === true, 'Valid password verification failed');

  const invalidMatch = await verifyPassword('WrongPassword123!', hash);
  console.assert(invalidMatch === false, 'Invalid password should not match');

  console.log('✅ Test 1 Passed: Password hashing & verification work as expected.');
}

runAuthUnitTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
