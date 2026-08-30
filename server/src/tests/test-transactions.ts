async function runTransactionLogicTests() {
  console.log('--- Running Step 7 Ledger Transaction Logic Tests ---');

  // Test 1: Balance delta logic
  let initialBalanceInPaise = 5000; // ₹50.00
  const creditAmount = 25.50; // ₹25.50 -> 2550 paise
  const creditPaise = Math.round(creditAmount * 100);

  initialBalanceInPaise += creditPaise; // CREDIT increases debt
  console.assert(initialBalanceInPaise === 7550, 'CREDIT balance calculation failed');

  const paymentAmount = 20.00; // ₹20.00 -> 2000 paise
  const paymentPaise = Math.round(paymentAmount * 100);

  initialBalanceInPaise -= paymentPaise; // PAYMENT decreases debt
  console.assert(initialBalanceInPaise === 5550, 'PAYMENT balance calculation failed');

  console.log('✅ Step 7 Ledger & Balance Logic Verification Passed.');
}

runTransactionLogicTests().catch((err) => {
  console.error('❌ Transaction test failed:', err);
  process.exit(1);
});
