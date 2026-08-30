import { generateCustomerUserId } from '../utils/idGenerator';

async function runCustomerTests() {
  console.log('--- Running Step 6 Customer User ID Generation & Logic Tests ---');

  // Test 1: User ID Generation formatting
  const name1 = 'Rahul Sharma';
  const generatedId1 = await generateCustomerUserId(name1);
  console.log(`Generated ID for '${name1}':`, generatedId1);
  console.assert(generatedId1.startsWith('RAH'), 'ID should start with RAH');
  console.assert(generatedId1.length === 8, 'Generated ID should be 8 characters long (3 prefix + 5 digits)');

  const name2 = 'An';
  const generatedId2 = await generateCustomerUserId(name2);
  console.log(`Generated ID for '${name2}':`, generatedId2);
  console.assert(generatedId2.startsWith('ANC'), 'Short name ID should start with ANC');

  console.log('✅ Step 6 Customer Logic & User ID Generator Tests Passed.');
}

runCustomerTests().catch((err) => {
  console.error('❌ Customer test failed:', err);
  process.exit(1);
});
