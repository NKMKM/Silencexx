#!/usr/bin/env node
// All amounts are USD. No exchange rate or actual revenue is inferred.
function cost(input, output, rates) {
  return (input * rates.input + output * rates.output) / 1e6;
}
function calculate(s) {
  for (const [key, value] of Object.entries(s)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`Invalid ${key}`);
  }
  if (s.paidShare > 1 || s.storeFee > 1 || s.taxRate > 1 || s.paymentFee > 1) throw new Error('Shares must be between 0 and 1');
  const rates = { input: s.inputRate, output: s.outputRate };
  const perChat = cost(s.chatInput, s.chatOutput, rates);
  const auxiliary = cost(s.wishInput, s.wishOutput, rates) + s.moodsDaily * cost(s.moodInput, s.moodOutput, rates) + s.journalsDaily * cost(s.journalInput, s.journalOutput, rates);
  const freeAi = 30 * (s.freeChatsDaily * perChat + auxiliary);
  const paidAi = 30 * (s.paidChatsDaily * perChat + auxiliary);
  const payers = s.users * s.paidShare;
  const grossRevenue = payers * s.price;
  // Fees are modeled separately as fractions of gross revenue; adjust to your actual settlement.
  const netRevenue = grossRevenue * (1 - s.storeFee - s.taxRate - s.paymentFee);
  if (netRevenue < 0) throw new Error('Combined fees exceed revenue');
  const aiCost = (s.users - payers) * freeAi + payers * paidAi;
  const variableCost = s.users * (s.otherVariablePerUser + s.acquisitionAmortizedPerUser);
  const contribution = netRevenue - aiCost - variableCost;
  const profit = contribution - s.fixedCosts;
  const paidNet = s.price * (1 - s.storeFee - s.taxRate - s.paymentFee);
  const breakEvenShare = (s.users * freeAi + variableCost + s.fixedCosts) / (s.users * (paidNet - paidAi + freeAi));
  return { users:s.users, paidShare:s.paidShare, price:s.price, payers, grossRevenue, netRevenue, aiCost, variableCost, fixedCosts:s.fixedCosts,
    scenarioProfitBeforeUnmodeledCosts:profit, freeAiPerUser:freeAi, paidAiPerUser:paidAi, costPerChat:perChat,
    breakEvenPaidShare:Number.isFinite(breakEvenShare) && breakEvenShare >= 0 && breakEvenShare <= 1 ? breakEvenShare : null };
}
const defaults = {
  users:1000, paidShare:0.05, price:4.99, storeFee:0.15, taxRate:0, paymentFee:0,
  inputRate:0.05, outputRate:0.4, fixedCosts:50, otherVariablePerUser:0, acquisitionAmortizedPerUser:0,
  chatInput:2000, chatOutput:350, freeChatsDaily:5, paidChatsDaily:20,
  wishInput:180, wishOutput:60, moodsDaily:1, moodInput:500, moodOutput:80,
  journalsDaily:0.2, journalInput:1000, journalOutput:250,
};
if (require.main === module) {
  let overrides = {};
  if (process.argv[2]) overrides = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
  const assumptions = { ...defaults, ...overrides };
  const scenarios = [];
  for (const price of [4.99,9.99]) for (const paidShare of [0.01,0.05,0.1]) scenarios.push(calculate({...assumptions, price, paidShare}));
  console.log(JSON.stringify({ currency:'USD', assumptions,
    warning:'Scenario, not actual profit. Zero-valued taxes, acquisition, voice/TTS and support costs must be filled before business decisions. Store fee is a scenario assumption, not confirmed eligibility.',
    configuredScenario:calculate(assumptions), scenarios }, null, 2));
}
module.exports = {calculate, cost, defaults};
