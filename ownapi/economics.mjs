export function ownership({ bill, calls, removed, infra, variable, maintenance, investment, months }) {
  const fields = [bill, calls, removed, infra, variable, maintenance, investment, months];
  if (fields.some(v => !Number.isFinite(v) || v < 0) || removed > 100 || months < 1 || months > 120) throw new RangeError('Use valid nonnegative amounts, 0–100% and 1–120 months.');
  const remaining = bill * (1 - removed / 100);
  const cash = infra + calls * variable + remaining;
  const total = cash + maintenance;
  const savings = bill - total;
  return { remaining, cash, total, savings, payback: savings > 0 ? investment / savings : null, advantage: months * savings - investment };
}
export function tokenBudget({ tin, tout, pin, pout, fx }) {
  if ([tin, tout, pin, pout, fx].some(v => !Number.isFinite(v) || v < 0) || fx === 0) throw new RangeError('Use nonnegative amounts and a positive exchange rate.');
  const usd = tin * pin + tout * pout;
  return { usd, inr: usd * fx };
}
