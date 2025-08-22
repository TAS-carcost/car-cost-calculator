// --- Data (UK defaults) ---
const carData = {
  "Toyota": {
    "Corolla": { price: 22000, mpg_uk: 50, insurance: 900, maintenance: 450, dep: [0.20,0.12,0.10,0.08,0.07] },
    "Yaris":   { price: 19000, mpg_uk: 55, insurance: 850, maintenance: 420, dep: [0.19,0.12,0.10,0.08,0.07] }
  },
  "Ford": {
    "Fiesta":  { price: 18500, mpg_uk: 52, insurance: 880, maintenance: 430, dep: [0.21,0.13,0.11,0.09,0.07] },
    "Focus":   { price: 24000, mpg_uk: 48, insurance: 1000, maintenance: 500, dep: [0.22,0.13,0.10,0.09,0.07] }
  },
  "Volkswagen": {
    "Golf":    { price: 26000, mpg_uk: 47, insurance: 1050, maintenance: 520, dep: [0.22,0.12,0.10,0.08,0.07] }
  },
  "Tesla": {
    "Model 3": { price: 38000, mpg_uk: 120, insurance: 1200, maintenance: 350, dep: [0.23,0.14,0.11,0.09,0.08] } // MPGe approximated as UK mpg
  }
};

// --- Elements ---
const el = id => document.getElementById(id);
const brandSel = el('brand');
const modelSel = el('model');
const priceInp = el('price');
const yearsInp = el('years');
const milesInp = el('miles');
const mpgInp = el('mpg');
const fuelPriceInp = el('fuelPrice');
const insInp = el('insurance');
const maintBaseInp = el('maintBase');
const inflInp = el('inflation');
const depGrid = el('dep-grid');
const calcBtn = el('calcBtn');
const tooltip = el('tooltip');

// --- Tooltips ---
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('hint')) {
    const tip = e.target.getAttribute('data-tip') || '';
    tooltip.textContent = tip;
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = (rect.left + window.scrollX + 28) + 'px';
    tooltip.style.top = (rect.top + window.scrollY - 8) + 'px';
    tooltip.hidden = false;
  } else {
    tooltip.hidden = true;
  }
});

// --- Utils ---
const GBP = n => '£' + Math.round(n).toLocaleString('en-GB');
const litresPerUKGallon = 4.54609;

// Build depreciation grid (5 years)
function buildDepGrid(curve) {
  depGrid.innerHTML = '';
  for (let y = 1; y <= 5; y++) {
    const row = document.createElement('label');
    row.className = 'row';
    const span = document.createElement('span');
    span.textContent = `Year ${y} depreciation (%)`;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.min = 0; inp.max = 100; inp.step = 0.1;
    inp.id = 'dep' + y;
    inp.value = curve && curve[y-1] ? (curve[y-1]*100) : (y===1?20:(y===2?12:(y===3?10:(y===4?8:7))));
    row.appendChild(span); row.appendChild(inp);
    depGrid.appendChild(row);
  }
}
el('resetCurve').addEventListener('click', () => buildDepGrid());

function getCurve(nYears) {
  const arr = [];
  for (let i=1;i<=nYears;i++) {
    const v = parseFloat(el('dep'+i).value || '0');
    arr.push(v/100);
  }
  return arr;
}

// Populate brands and models
function populateBrands() {
  brandSel.innerHTML = '';
  Object.keys(carData).forEach(b => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = b;
    brandSel.appendChild(opt);
  });
  populateModels();
}
function populateModels() {
  modelSel.innerHTML = '';
  const b = brandSel.value;
  Object.keys(carData[b]).forEach(m => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = m;
    modelSel.appendChild(opt);
  });
  applyDefaults();
}
brandSel.addEventListener('change', populateModels);
modelSel.addEventListener('change', applyDefaults);

function applyDefaults() {
  const d = carData[brandSel.value][modelSel.value];
  priceInp.value = d.price;
  mpgInp.value = d.mpg_uk;
  insInp.value = d.insurance;
  maintBaseInp.value = d.maintenance;
  buildDepGrid(d.dep);
  calculate();
}

// Inflation escalator: base * (1+infl)^yearIdx
const escalate = (base, ratePct, yearIdx) => base * Math.pow(1 + ratePct/100, yearIdx);

// Core calculation
let depChart;
function calculate() {
  const price = +priceInp.value || 0;
  const years = Math.max(1, Math.min(5, +yearsInp.value || 5));
  const miles = +milesInp.value || 0;
  const mpg = +mpgInp.value || 1;
  const fuelPrice = +fuelPriceInp.value || 0; // £/litre
  const insBase = +insInp.value || 0;
  const maintBase = +maintBaseInp.value || 0;
  const infl = +inflInp.value || 0;

  const curve = getCurve(years);

  const tbody = document.querySelector('#table tbody');
  tbody.innerHTML='';

  let startVal = price;
  let tFuel=0, tIns=0, tMaint=0, tDep=0, tTotal=0;
  const rows = [];

  for (let y=0;y<years;y++) {
    const dep = startVal * (curve[y] || 0);
    const endVal = startVal - dep;

    // Fuel calculation (UK): gallons = miles/mpg; litres = gallons * 4.54609; cost = litres * £/litre
    const annualFuelCost = ((miles / mpg) * litresPerUKGallon) * fuelPrice;
    const fuel = escalate(annualFuelCost, infl, y);

    const ins = escalate(insBase, infl, y);
    const maint = escalate(maintBase * Math.pow(1.12, y), infl, 0); // age effect (12%/yr) then inflation baseline

    const total = dep + fuel + ins + maint;

    rows.push({ y:y+1, startVal, dep, endVal, fuel, ins, maint, total, cpm: (miles>0 ? total/miles : 0) });

    tFuel += fuel; tIns += ins; tMaint += maint; tDep += dep; tTotal += total;
    startVal = endVal;
  }

  // Fill table
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.y}</td><td>${GBP(r.startVal)}</td><td>${GBP(r.dep)}</td><td>${GBP(r.endVal)}</td>
      <td>${GBP(r.fuel)}</td><td>${GBP(r.ins)}</td><td>${GBP(r.maint)}</td><td>${GBP(r.total)}</td><td>${r.cpm.toFixed(2)}</td>`;
    tbody.appendChild(tr);
  }

  // Totals
  document.getElementById('tFuel').textContent = GBP(tFuel);
  document.getElementById('tIns').textContent = GBP(tIns);
  document.getElementById('tMaint').textContent = GBP(tMaint);
  document.getElementById('tDep').textContent = GBP(tDep);
  document.getElementById('tTotal').textContent = GBP(tTotal);
  document.getElementById('tCPM').textContent = (miles>0 ? (tTotal/(miles*rows.length)).toFixed(2) : '—');

  // KPIs
  document.getElementById('kpi-tco').textContent = GBP(tTotal);
  document.getElementById('kpi-cpm').textContent = (miles>0 ? (tTotal/(miles*rows.length)).toFixed(2) : '—');
  document.getElementById('kpi-residual').textContent = GBP(rows.length ? rows[rows.length-1].endVal : price);
  document.getElementById('kpi-dep').textContent = GBP(tDep);

  // Chart
  const ctx = document.getElementById('depChart').getContext('2d');
  if (depChart) depChart.destroy();
  depChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rows.map(r => 'Year ' + r.y),
      datasets: [
        {
          label: 'Vehicle value (£)',
          data: rows.map(r => r.endVal),
          borderColor: '#ffd84d',
          backgroundColor: 'rgba(255,216,77,0.12)',
          fill: false,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#eaeaea' } }
      },
      scales: {
        x: { ticks: { color: '#c7c7c7' }, grid: { color: '#1f1f1f' } },
        y: { ticks: { color: '#c7c7c7' }, grid: { color: '#1f1f1f' } }
      }
    }
  });
}

// Bind
document.getElementById('calcBtn').addEventListener('click', calculate);
['price','years','miles','mpg','fuelPrice','insurance','maintBase','inflation'].forEach(id => {
  document.getElementById(id).addEventListener('input', calculate);
});

// Fuel presets
document.querySelectorAll('.pill[data-fuel]').forEach(btn => {
  btn.addEventListener('click', () => {
    fuelPriceInp.value = btn.getAttribute('data-fuel');
    calculate();
  });
});

// Init
function populateBrands(){
  brandSel.innerHTML='';
  Object.keys(carData).forEach(b=>{
    const opt=document.createElement('option'); opt.value=opt.textContent=b; brandSel.appendChild(opt);
  });
  populateModels();
}
function populateModels(){
  modelSel.innerHTML='';
  const b = brandSel.value;
  Object.keys(carData[b]).forEach(m=>{
    const opt=document.createElement('option'); opt.value=opt.textContent=m; modelSel.appendChild(opt);
  });
  applyDefaults();
}

populateBrands();
calculate();
