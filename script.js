const cars = {
  "Toyota Corolla": { price: 20000, mpg: 32, insurance: 1200, maintenance: 600 },
  "Ford Fiesta": { price: 18000, mpg: 34, insurance: 1100, maintenance: 550 },
  "Tesla Model 3": { price: 40000, mpg: 120, insurance: 1500, maintenance: 400 },
  "VW Golf": { price: 25000, mpg: 30, insurance: 1300, maintenance: 650 }
};

const carSelect = document.getElementById("carSelect");
const purchasePrice = document.getElementById("purchasePrice");
const fuelEconomy = document.getElementById("fuelEconomy");
const fuelCost = document.getElementById("fuelCost");
const insurance = document.getElementById("insurance");
const maintenance = document.getElementById("maintenance");
const mileage = document.getElementById("mileage");
const resultsDiv = document.getElementById("results");

let chart;

window.onload = () => {
  for (let car in cars) {
    let option = document.createElement("option");
    option.value = car;
    option.text = car;
    carSelect.appendChild(option);
  }
  setCarDefaults("Toyota Corolla");
};

carSelect.addEventListener("change", () => {
  setCarDefaults(carSelect.value);
});

function setCarDefaults(car) {
  const data = cars[car];
  purchasePrice.value = data.price;
  fuelEconomy.value = data.mpg;
  insurance.value = data.insurance;
  maintenance.value = data.maintenance;
}

function calculate() {
  const price = parseFloat(purchasePrice.value);
  const mpg = parseFloat(fuelEconomy.value);
  const fuel_price = parseFloat(fuelCost.value);
  const ins = parseFloat(insurance.value);
  const maint = parseFloat(maintenance.value);
  const miles = parseFloat(mileage.value);

  let years = [1, 2, 3, 4, 5];
  let values = [];
  let totalCosts = [];

  years.forEach(year => {
    let depreciation = price * Math.pow(0.85, year);
    let fuel = (miles / mpg) * fuel_price * year;
    let insCost = ins * year;
    let maintCost = maint * year;
    let totalCost = (price - depreciation) + fuel + insCost + maintCost;
    values.push(depreciation);
    totalCosts.push(totalCost);
  });

  let costPerMile = (totalCosts[4] / (miles * 5)).toFixed(2);

  resultsDiv.innerHTML = `<p><strong>Cost per mile over 5 years:</strong> $${costPerMile}</p>`;

  if (chart) chart.destroy();
  const ctx = document.getElementById("depreciationChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: years.map(y => "Year " + y),
      datasets: [
        {
          label: "Car Value ($)",
          data: values,
          borderColor: "blue",
          fill: false
        },
        {
          label: "Total Cost ($)",
          data: totalCosts,
          borderColor: "red",
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}
