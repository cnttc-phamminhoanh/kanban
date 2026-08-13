let plans = [];

let currentIndex = null;

// INIT
init();

async function loadPlans() {
  try {
    const response = await authFetch("/api/monitor/flowPlan");

    const result = await response.json();

    if (!result.success) {
      renderTable([]);
      return;
    }

    plans = result.data || [];

    renderTable(plans);
  } catch (error) {
    console.error("Load flow plan failed:", error);

    renderTable([]);
  }
}

async function init() {
  bindEvents();

  await loadPlans();
}

// EVENTS
function bindEvents() {
  document.getElementById("search").addEventListener("input", queryData);

  document.getElementById("saveBtn").addEventListener("click", saveData);

  document.getElementById("cancelBtn").addEventListener("click", closeModal);

  document.getElementById("closeModal").addEventListener("click", closeModal);

  document.getElementById("editModal").addEventListener("click", (e) => {
    if (e.target.id === "editModal") {
      closeModal();
    }
  });
}

// QUERY
function queryData() {
  const keyword = document.getElementById("search").value.trim().toLowerCase();

  if (!keyword) {
    renderTable(plans);
    return;
  }

  const result = plans.filter((item) =>
    (item.igm_dept || "").toLowerCase().includes(keyword),
  );

  renderTable(result);
}

// RENDER
function renderTable(data) {
  const tbody = document.getElementById("tbody");

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `
    <tr>
      <td colspan="6">
        No data found
      </td>
    </tr>
  `;
    return;
  }

  data.forEach((item, index) => {
    tbody.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${item.igm_dept}</td>
        <td>${item.worker_at}</td>
        <td>${item.break_time_fr}</td>
        <td>${item.break_time_to}</td>
        <td>
          <button
              class="edit-btn"
              data-flow="${item.igm_dept}"
          >
            Edit
          </button>
        </td>
      </tr>
    `;
  });

  bindEditButtons();
}

// EDIT
function bindEditButtons() {
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openModal(btn.dataset.flow);
    });
  });
}

// OPEN
function openModal(flow) {
  currentIndex = plans.findIndex((x) => x.igm_dept === flow);

  if (currentIndex === -1) return;

  const row = plans[currentIndex];

  document.getElementById("modalFlow").value = row.igm_dept;
  document.getElementById("modalWorker").value = row.worker_at;
  document.getElementById("modalBreakFrom").value = row.break_time_fr;
  document.getElementById("modalBreakTo").value = row.break_time_to;
  document.getElementById("editModal").classList.add("show");
}

// CLOSE
function closeModal() {
  document.getElementById("editModal").classList.remove("show");
}

// SAVE
async function saveData() {
  const worker = Number(document.getElementById("modalWorker").value);
  const breakFrom = document.getElementById("modalBreakFrom").value;
  const breakTo = document.getElementById("modalBreakTo").value;

  plans[currentIndex].worker_at = worker;
  plans[currentIndex].break_time_fr = breakFrom;
  plans[currentIndex].break_time_to = breakTo;

  await fetch("/pms/monitor/api/flowPlan", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      igm_dept: plans[currentIndex].igm_dept,
      worker_at: worker,
      break_time_fr: breakFrom,
      break_time_to: breakTo,
    }),
  });

  closeModal();
  queryData();
  showToast("Saved successfully");
}

// TOAST
function showToast(message) {
  const toast = document.getElementById("toast");

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}
