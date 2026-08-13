const info = {
  brand: "HADDAD",
  style: "S27-L940-042",
  po: "0756463",
  smv: 13.52,
  actualWorker: 24,
  targetWorker: 23,
  dailyTarget: 790,
};

const rows = [
  {
    stt: 1,
    time: "7h30 - 8h30",
    target: 90,
    actual: 50,
    reason: "",
  },
  {
    stt: 2,
    time: "8h31 - 9h30",
    target: 180,
    actual: 180,
    reason: "",
  },
  {
    stt: 3,
    time: "9h31 - 10h30",
    target: 270,
    actual: 265,
    reason: "",
  },
  {
    stt: 4,
    // time: "10h31 - 11h30 (Nghỉ trưa 30 phút)",
    time: "10h31 - 11h30",
    target: 360,
    actual: 320,
    reason: "Machine",
  },
  {
    stt: 5,
    // time: "11h31 - 12h30 (Nghỉ trưa 30 phút)",
    time: "11h31 - 12h30",
    target: 450,
    actual: 465,
    reason: "",
  },
  {
    stt: 6,
    time: "12h31 - 13h30",
    target: 540,
    actual: 540,
    reason: "",
  },
  {
    stt: 7,
    time: "13h31 - 14h30",
    target: 630,
    actual: 640,
    reason: "",
  },
  {
    stt: 8,
    time: "14h31 - 15h30",
    target: 700,
    actual: 705,
    reason: "",
  },
  {
    stt: 9,
    time: "15h31 - 16h30",
    target: 760,
    actual: 750,
    reason: "Needle",
  },
  {
    stt: 10,
    time: "16h31 - 17h30",
    target: 790,
    actual: 795,
    reason: "",
  },
];

const flows = [
  "SEWING-GA-F2-03A",
  "SEWING-GA-F2-03B",
  "SEWING-GA-F2-04A",
  "SEWING-GA-F2-05A",
];

const flowSelect = document.getElementById("flow");

flows.forEach((flow) => {
  flowSelect.innerHTML += `
          <option value="${flow}">${flow}</option>
        `;
});

flowSelect.value = flows[0];

const today = new Date();
const todayStr = today.toISOString().split("T")[0];

document.getElementById("date").value = todayStr;

document.getElementById("flowInfor").textContent = flowSelect.value;
document.getElementById("dateInfor").textContent = todayStr;

let currentIndex = null;

renderTable();

document.getElementById("saveBtn").addEventListener("click", () => {
  const reason = document.getElementById("reasonInput").value.trim();

  console.log({
    stt: rows[currentIndex].stt,
    time: rows[currentIndex].time,
    reason,
  });

  rows[currentIndex].reason = reason;

  closeModal();
  renderTable();
  showToast("Saved successfully");
});

document.getElementById("cancelBtn").addEventListener("click", closeModal);

document.getElementById("closeModal").addEventListener("click", closeModal);

document.getElementById("reasonModal").addEventListener("click", (e) => {
  if (e.target.id === "reasonModal") {
    closeModal();
  }
});

function bindReasonEvents() {
  document.querySelectorAll(".reason-cell").forEach((cell) => {
    cell.addEventListener("click", () => {
      openReasonModal(cell.dataset.index);
    });
  });
}

function renderTable() {
  const tbody = document.getElementById("tbody");

  tbody.innerHTML = "";

  rows.forEach((r, index) => {
    const balance = r.actual - r.target;
    const percent = ((r.actual / r.target) * 100).toFixed(2);

    tbody.innerHTML += `
            <tr>
              ${
                index === 0
                  ? `
                  <td rowspan="${rows.length}">${info.brand}</td>
                  <td rowspan="${rows.length}">${info.style}</td>
                  <td rowspan="${rows.length}">${info.po}</td>
                  <td rowspan="${rows.length}">${info.smv}</td>
                  <td rowspan="${rows.length}">${info.actualWorker}</td>
                  <td rowspan="${rows.length}">${info.targetWorker}</td>
                  <td rowspan="${rows.length}">${info.dailyTarget}</td>
                `
                  : ""
              }

              <td>${r.stt}</td>

              <td>${r.time}</td>

              <td class="yellow">
                ${r.target}
              </td>

              <td class="yellow">
                ${r.actual}
              </td>

              <td class="${balance >= 0 ? "positive" : "negative"}">
                ${balance}
              </td>

              <td class="${percent >= 100 ? "percent-good" : "percent-bad"}">
                ${percent}%
              </td>

              <td
                class="reason-cell"
                data-index="${index}"
              >
                ${
                  r.reason
                    ? `<span class="reason">${r.reason}</span>`
                    : `<span class="reason-placeholder">Click to enter...</span>`
                }
              </td>
            </tr>
          `;
  });

  bindReasonEvents();
}

function openReasonModal(index) {
  currentIndex = Number(index);
  document.getElementById("reasonInput").value = rows[index].reason || "";
  document.getElementById("reasonModal").classList.add("show");
}

function closeModal() {
  document.getElementById("reasonModal").classList.remove("show");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}
