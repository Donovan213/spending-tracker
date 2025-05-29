const spendForm = document.getElementById("spendForm");
const summaryDiv = document.getElementById("summary");
const alertsDiv = document.getElementById("alerts");
const dateRangeDisplay = document.getElementById("dateRangeDisplay");

const storeGroups = {
  groceries: ["Pick n Pay", "Woolworths", "Food Lovers Market"],
  childHealth: ["Dischem", "Baby City"],
  fuel: ["Sasol"]
};

const thresholds = {
  groceries: 4000,
  childHealth: 3000,
  fuel: 3000
};

function getCurrentPeriodDates() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  let startDate, endDate;

  if (today.getDate() < 16) {
    startDate = new Date(year, month - 1, 16);
    endDate = new Date(year, month, 15);
  } else {
    startDate = new Date(year, month, 16);
    endDate = new Date(year, month + 1, 15);
  }

  return { startDate, endDate };
}

function formatDateString(date) {
  return date.toISOString().split("T")[0];
}

function loadData() {
  const data = localStorage.getItem("spendData");
  return data ? JSON.parse(data) : [];
}

function saveData(data) {
  localStorage.setItem("spendData", JSON.stringify(data));
}

function filterCurrentPeriod(data) {
  const { startDate, endDate } = getCurrentPeriodDates();
  return data.filter(entry => {
    const date = new Date(entry.date);
    return date >= startDate && date <= endDate;
  });
}

function calculateTotals(entries) {
  const storeTotals = {};
  const groupTotals = {
    groceries: 0,
    childHealth: 0,
    fuel: 0
  };

  for (const entry of entries) {
    const { store, amount } = entry;

    storeTotals[store] = (storeTotals[store] || 0) + parseFloat(amount);

    for (const [group, stores] of Object.entries(storeGroups)) {
      if (stores.includes(store)) {
        groupTotals[group] += parseFloat(amount);
      }
    }
  }

  return { storeTotals, groupTotals };
}

function displaySummary() {
  const data = filterCurrentPeriod(loadData());
  const { storeTotals, groupTotals } = calculateTotals(data);

  const { startDate, endDate } = getCurrentPeriodDates();
  dateRangeDisplay.textContent = `Tracking Period: ${formatDateString(startDate)} to ${formatDateString(endDate)}`;
  	
  const overallGroupTotal = Object.values(groupTotals).reduce((sum, val) => sum + val, 0);	

  summaryDiv.innerHTML = `
    <ul>
      ${Object.entries(storeTotals)
        .map(([store, total]) => `<li><strong>${store}:</strong> R${total.toFixed(2)}</li>`)
        .join("")}
    </ul>
    <h3>Group Totals (R${overallGroupTotal.toFixed(2)})</h3>
    <ul>
      ${Object.entries(groupTotals)
        .map(([group, total]) => `<li><strong>${group}:</strong> R${total.toFixed(2)}</li>`)
        .join("")}
    </ul>
  `;

  displayAlerts(groupTotals);
}

function displayAlerts(totals) {
  alertsDiv.innerHTML = "";

  for (const [group, total] of Object.entries(totals)) {
    if (total > thresholds[group]) {
      const div = document.createElement("div");
      div.className = "alert";
      div.textContent = `⚠️ ${group} spending exceeds R${thresholds[group]} (Current: R${total.toFixed(2)})`;
      alertsDiv.appendChild(div);
    }
  }
}

spendForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const store = document.getElementById("store").value;
  const amount = document.getElementById("amount").value;
  const date = document.getElementById("date").value || new Date().toISOString().split("T")[0];

  if (!store || !amount) return;

  const newEntry = { store, amount: parseFloat(amount), date };
  const data = loadData();
  data.push(newEntry);
  saveData(data);

  spendForm.reset();
  document.getElementById("date").value = new Date().toISOString().split("T")[0];
  displaySummary();
});

document.getElementById("downloadCSV").addEventListener("click", () => {
  const data = loadData();
  if (!data.length) return;

  const headers = ["Store", "Amount", "Date"];
  const rows = data.map(entry => [entry.store, entry.amount, entry.date]);

  let csvContent =
    headers.join(",") + "\n" +
    rows.map(row => row.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", "spend_data.csv");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

document.getElementById("importCSV").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const csvText = event.target.result;
    const lines = csvText.split("\n").filter(line => line.trim().length > 0);
    const [header, ...rows] = lines;

    const expectedHeaders = ["Store", "Amount", "Date"];
    const csvHeaders = header.trim().split(",").map(h => h.trim());

    if (!expectedHeaders.every(h => csvHeaders.includes(h))) {
      alert("Invalid CSV format. Expected headers: Store,Amount,Date");
      return;
    }

    const importedEntries = rows.map(row => {
      const [store, amount, date] = row.split(",").map(x => x.trim());
      return { store, amount: parseFloat(amount), date };
    });

    const existing = loadData();
    const combined = existing.concat(importedEntries);
    saveData(combined);
    displaySummary();
    alert("CSV imported successfully!");
  };

  reader.readAsText(file);
});

document.getElementById("clearData").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all spend data? This cannot be undone.")) {
    localStorage.removeItem("spendData");
    displaySummary();
    alert("Spend data cleared.");
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("date").value = today;
  displaySummary();


});
