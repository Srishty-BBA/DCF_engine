// ============================================================
// DCF SENSITIVITY EXPLORER — script.js
// Commit 1: pure math engine, tested against hardcoded Ather numbers.
// No HTML wiring yet — that's Commit 2.
// ============================================================

// ---- STEP 1: Project 5 years of unlevered free cash flow ----
function computeFCFSeries(rev0, growth, margin, tax, capexPct, nwcPct) {
  let rev = rev0;
  const series = [];

  for (let year = 1; year <= 5; year++) {
    rev = rev * (1 + growth / 100);              // grow revenue
    const ebitda = rev * (margin / 100);          // apply margin
    const nopat  = ebitda * (1 - tax / 100);      // after-tax operating profit
    const capex  = rev * (capexPct / 100);
    const deltaNWC = rev * (nwcPct / 100);

    const fcf = nopat - capex - deltaNWC;         // simplified unlevered FCF
    series.push({ year, rev, fcf });
  }
  return series;
}

// ---- STEP 2: Discount explicit FCFs back to present value ----
function presentValueOfExplicitFCF(series, wacc) {
  const r = wacc / 100;
  return series.reduce((pv, s) => pv + s.fcf / Math.pow(1 + r, s.year), 0);
}

// ---- STEP 3: Terminal value (Gordon Growth) + discount it back ----
function presentValueOfTerminalValue(finalYearFCF, wacc, tg) {
  const r = wacc / 100, g = tg / 100;
  if (r <= g) return null;                        // WACC must exceed terminal growth

  const terminalValue = finalYearFCF * (1 + g) / (r - g);
  const pvTerminalValue = terminalValue / Math.pow(1 + r, 5); // discounted 5 years back
  return pvTerminalValue;
}

// ---- STEP 4: Roll everything up to per-share value ----
function valuePerShare(rev0, growth, margin, tax, capexPct, nwcPct, wacc, tg, netDebt, shares) {
  const series = computeFCFSeries(rev0, growth, margin, tax, capexPct, nwcPct);

  const pvExplicit = presentValueOfExplicitFCF(series, wacc);
  const finalFCF = series[series.length - 1].fcf;
  const pvTerminal = presentValueOfTerminalValue(finalFCF, wacc, tg);

  const enterpriseValue = pvExplicit + pvTerminal;
  const equityValue = enterpriseValue - netDebt;
  const perShare = equityValue / shares;

  return { enterpriseValue, equityValue, perShare, pvExplicit, pvTerminal, series };
}

// ============================================================
// TEST BLOCK — Ather Energy Ltd, FY26 actuals as the base case.
// Delete or comment this out once Commit 2 wires up real inputs.
// Run with: node script.js   (or paste into a browser console)
// ============================================================

const atherTest = valuePerShare(
  3671.76,   // rev0: FY26 revenue, ₹ Cr
  30,        // growth: assumed forward growth %, moderating from 38.6%
  8,         // margin: assumed EBITDA margin % (FY26 actual was -11.5%)
  25,        // tax: %
  18.8,      // capexPct: matches FY26 capex/sales
  -3,        // nwcPct: negative — Ather's negative CCC releases cash
  12,        // wacc: %
  4,         // tg: terminal growth %
  -158.93,   // netDebt: Ather is net CASH, so this is negative
  38.3       // shares: Cr
);

console.log("---- Ather DCF test ----");
console.log("Year-by-year FCF (₹ Cr):", atherTest.series.map(s => s.fcf.toFixed(1)));
console.log("PV of explicit FCF:", atherTest.pvExplicit.toFixed(1));
console.log("PV of terminal value:", atherTest.pvTerminal.toFixed(1));
console.log("Enterprise value:", atherTest.enterpriseValue.toFixed(1));
console.log("Equity value:", atherTest.equityValue.toFixed(1));
console.log("Value per share: ₹" + atherTest.perShare.toFixed(2));
console.log("Actual market price: ₹1033.60");
