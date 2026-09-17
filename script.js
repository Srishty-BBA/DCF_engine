// ============================================================
// DCF SENSITIVITY EXPLORER — script.js
// ============================================================

function computeFCFSeries(rev0, growth, margin, tax, capexPct, nwcPct) {
  let rev = rev0;
  const series = [];
  for (let year = 1; year <= 5; year++) {
    rev = rev * (1 + growth / 100);
    const ebitda = rev * (margin / 100);
    const nopat  = ebitda * (1 - tax / 100);
    const capex  = rev * (capexPct / 100);
    const deltaNWC = rev * (nwcPct / 100);
    const fcf = nopat - capex - deltaNWC;
    series.push({ year, rev, fcf });
  }
  return series;
}

function presentValueOfExplicitFCF(series, wacc) {
  const r = wacc / 100;
  return series.reduce((pv, s) => pv + s.fcf / Math.pow(1 + r, s.year), 0);
}

function presentValueOfTerminalValue(finalYearFCF, wacc, tg) {
  const r = wacc / 100, g = tg / 100;
  if (r <= g) return null;
  const terminalValue = finalYearFCF * (1 + g) / (r - g);
  return terminalValue / Math.pow(1 + r, 5);
}

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
