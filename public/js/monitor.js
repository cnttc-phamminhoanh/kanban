const container = document.getElementById("flowContainer");

let flows = [];

function getColor(index) {
  const colors = [
    "#00d4ff",
    "#00ff9d",
    "#ffd60a",
    "#c44dff",
    "#ff3864",
    "#ff9f1c",
  ];

  return colors[index % colors.length];
}

function renderFlows(data) {
  container.innerHTML = "";

  data.forEach((item, index) => {
    const card = document.createElement("div");

    card.className = `flow-card`;

    card.innerHTML = `
      <h3>${item.flow}</h3>
      <p>Production Line</p>
    `;

    card.style.borderLeft = `5px solid ${getColor(index)}`;

    card.addEventListener("click", () => {
      const flow = item.flow;
      window.location.href = `/pms/monitor/flowDashboard/v6/${flow}`;
    });

    container.appendChild(card);
  });
}

async function loadFlows() {
  try {
    const response = await fetch("/pms/monitor");

    const result = await response.json();

    flows = result.data;

    renderFlows(flows);
  } catch (err) {
    console.error(err);
  }
}

const input = document.getElementById("searchInput");

input.addEventListener("input", (e) => {
  const keyword = e.target.value.toLowerCase();

  const filtered = flows.filter((x) => x.flow.toLowerCase().includes(keyword));

  renderFlows(filtered);
});

loadFlows();

function goToManagement() {
  window.location.href = "/pms/monitor/flowPlan";
}
