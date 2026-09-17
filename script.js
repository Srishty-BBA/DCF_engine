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

function renderSensitivity(vals) {
  const waccSteps = [-1, -0.5, 0, 0.5, 1].map(d => Math.round((vals.wacc + d) * 100) / 100);
  const tgSteps = [-1, -0.5, 0, 0.5, 1].map(d => Math.round((vals.tg + d) * 100) / 100);

  let html = "<tr><th></th>";
  tgSteps.forEach(t => html += `<th>g=${t}%</th>`);
  html += "</tr>";

  waccSteps.forEach(w => {
    html += `<tr><th>WACC=${w}%</th>`;
    tgSteps.forEach(t => {
      if (w <= t) {
        html += "<td>—</td>";
      } else {
        const r = valuePerShare(
          vals.rev0, vals.growth, vals.margin, vals.tax,
          vals.capex, vals.nwc, w, t, vals.netdebt, vals.shares
        );
        const isCurrent = Math.abs(w - vals.wacc) < 0.001 && Math.abs(t - vals.tg) < 0.001;
        const style = isCurrent ? "font-weight:bold; background:#EFE3C8; color:#16273D;" : "";
        html += `<td style="${style}">₹${r.perShare.toFixed(1)}</td>`;
      }
    });
    html += "</tr>";
  });

  document.getElementById("sensTable").innerHTML = html;
}

let fcfChart;
function renderChart(series) {
  const labels = series.map(s => "FY+" + s.year);
  const data = series.map(s => Math.round(s.fcf));

  if (fcfChart) {
    fcfChart.data.labels = labels;
    fcfChart.data.datasets[0].data = data;
    fcfChart.update();
  } else {
    const ctx = document.getElementById("fcfChart").getContext("2d");
    fcfChart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ data, backgroundColor: "#1F3A5C", borderRadius: 4, maxBarThickness: 46 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => "₹" + c.parsed.y.toLocaleString("en-IN") + " Cr" } } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: "#DCD3BE" } }
        }
      }
    });
  }
}

const ids = ["rev0","growth","margin","tax","capex","nwc","wacc","tg","netdebt","shares","mktprice"];

// Baseline values the "Reset to defaults" button restores.
// If you make this tool generic for other companies, update
// these to match whatever placeholder values you put in index.html.
const defaults = {
  rev0: 3671.76,
  growth: 30,
  margin: 8,
  tax: 25,
  capex: 18.8,
  nwc: -3,
  wacc: 12,
  tg: 4,
  netdebt: -158.93,
  shares: 38.3,
  mktprice: 1033.60
};

function recalculate() {
  const vals = {};
  ids.forEach(id => {
    const val = parseFloat(document.getElementById(id).value);
    vals[id] = val;
    const labelEl = document.getElementById(id + "-val");
    if (labelEl) labelEl.textContent = val;
  });

  const r = valuePerShare(
    vals.rev0, vals.growth, vals.margin, vals.tax,
    vals.capex, vals.nwc, vals.wacc, vals.tg,
    vals.netdebt, vals.shares
  );

  document.getElementById("verdict").textContent = "₹" + r.perShare.toFixed(2);
  document.getElementById("ev-sub").textContent = "₹" + Math.round(r.enterpriseValue).toLocaleString("en-IN") + " Cr";
  document.getElementById("eq-sub").textContent = "₹" + Math.round(r.equityValue).toLocaleString("en-IN") + " Cr";

  const upsideEl = document.getElementById("upside-badge");
  const upside = ((r.perShare - vals.mktprice) / vals.mktprice) * 100;
  upsideEl.textContent = (upside >= 0 ? "+" : "") + upside.toFixed(1) + "% vs market price";
  upsideEl.className = "upside " + (upside >= 0 ? "up-pos" : "up-neg");

  const pctExplicit = (r.pvExplicit / r.enterpriseValue) * 100;
  const pctTerminal = 100 - pctExplicit;
  document.getElementById("split-explicit").style.width = pctExplicit + "%";
  document.getElementById("split-terminal").style.width = pctTerminal + "%";
  document.getElementById("pct-explicit").textContent = pctExplicit.toFixed(0) + "%";
  document.getElementById("pct-terminal").textContent = pctTerminal.toFixed(0) + "%";

  renderChart(r.series);
  renderSensitivity(vals);
}

ids.forEach(id => {
  document.getElementById(id).addEventListener("input", recalculate);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  ids.forEach(id => {
    document.getElementById(id).value = defaults[id];
  });
  recalculate();
});

recalculate();
