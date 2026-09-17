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

document.getElementById("calcBtn").addEventListener("click", function() {
  const rev0 = parseFloat(document.getElementById("rev0").value);
  const growth = parseFloat(document.getElementById("growth").value);
  const margin = parseFloat(document.getElementById("margin").value);
  const tax = parseFloat(document.getElementById("tax").value);
  const capex = parseFloat(document.getElementById("capex").value);
  const nwc = parseFloat(document.getElementById("nwc").value);
  const wacc = parseFloat(document.getElementById("wacc").value);
  const tg = parseFloat(document.getElementById("tg").value);
  const netdebt = parseFloat(document.getElementById("netdebt").value);
  const shares = parseFloat(document.getElementById("shares").value);

  const r = valuePerShare(rev0, growth, margin, tax, capex, nwc, wacc, tg, netdebt, shares);

  document.getElementById("result").textContent =
    "Value per share: ₹" + r.perShare.toFixed(2);
});
console.log("Value per share: ₹" + atherTest.perShare.toFixed(2));
console.log("Actual market price: ₹1033.60");
