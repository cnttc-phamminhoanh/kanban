const defaultData = {
  flow: "-",
  style: "-",
  buyer: "-",
  orderNo: "-",
  smv: "-",
  workers: "-/-",
  styleQty: "-",
  startDate: "-",
  completeDate: "-",
  dailyTarget: "-",
  targetNow: "-",
  output: "-",
  achieve: "-",
  accQty: "-",
  defectQty: "-",
  defectPercent: "-",
  remainingQty: "-",
  efficiencyPercent: "-",
  flowEfficiency: "-",
};

function updateClock() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const dateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  document.getElementById("clock").innerText = dateTime;
}

function renderDefects(defects = []) {
  const ul = document.getElementById("defectList");
  ul.innerHTML = "";
  if (!defects.length) {
    ul.innerHTML = "<li>No defects</li>";
    return;
  }
  defects.slice(0, 5).forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="badge">${item.reWorkQty}</span>
      ${item.description}
    `;
    ul.appendChild(li);
  });
}

function calculateTargetNow(dailyTarget, workingHours) {
  const startTime = new Date();
  startTime.setHours(7, 30, 0, 0);

  const elapsedMinutes = Math.max(0, (Date.now() - startTime.getTime()) / (1000 * 60));

  return Math.floor(elapsedMinutes * (dailyTarget / workingHours / 60));
}

function renderFlowDashboard(data) {
  document.getElementById("flowName").innerText = data.flow;
  document.getElementById("style").innerText = data.style;
  document.getElementById("brand").innerText = data.buyer;
  document.getElementById("po").innerText = data.orderNo;
  document.getElementById("smv").innerText = data.smv;
  document.getElementById("workers").innerText = data.workers;
  document.getElementById("styleQty").innerText = data.styleQty;
  document.getElementById("startDate").innerText = data.startDate;
  document.getElementById("completeDate").innerText = data.completeDate;
  document.getElementById("dailyTarget").innerText = data.dailyTarget;
  document.getElementById("targetNow").innerText = data.targetNow;
  document.getElementById("output").innerText = data.output;
  document.getElementById("achieve").innerText = data.achieve;
  document.getElementById("accQty").innerText = data.accQty;
  document.getElementById("defectQty").innerText = data.defectQty;
  document.getElementById("defectPercent").innerText = data.defectPercent;
  document.getElementById("remainingQty").innerText = data.remainingQty;
  document.getElementById("efficiencyPercent").innerText = data.efficiencyPercent;
  document.getElementById("flowEfficiency").innerText = data.flowEfficiency;
}

async function loadFlowDashboard() {
  try {
    const flow = window.location.pathname.split("/").pop();
    const response = await fetch(`/pms/monitor/flowDashboard?flow=${flow}`);
    const data = await response.json();

    if (!data || !data.infoData?.length) {
      renderFlowDashboard(defaultData);
      renderDefects([]);
      return;
    }

    const smvMap = {};
    const accMap = {};
    const outputMap = {};
    const defectMap = {};

    data.smvData.forEach((item) => {
      const key = `${item.flow}|${item.style}|${item.orderNo}`;
      smvMap[key] = item;
    });

    data.accQtyStartCompeleteData.forEach((item) => {
      const key = `${item.flow}|${item.style}|${item.orderNo}`;
      accMap[key] = item;
    });

    data.outputData.forEach((item) => {
      const key = `${item.flow}|${item.style}|${item.orderNo}`;
      outputMap[key] = item;
    });

    data.defectsData.forEach((item) => {
      const key = `${item.flow}|${item.style}|${item.orderNo}`;
      if (!defectMap[key]) {
        defectMap[key] = [];
      }
      defectMap[key].push(item);
    });

    const workers = data.workersData.find((x) => x.igm_dept === flow) || {}

    let currentIndex = 0;

    function renderCurrent() {
      const info = data.infoData[currentIndex];

      if (!info) {
        renderFlowDashboard(defaultData);
        renderDefects([]);
        return;
      }

      const key = `${info.flow}|${info.style}|${info.orderNo}`;

      const smv = smvMap[key];

      const acc = accMap[key];

      const output = outputMap[key];

      const defects = (defectMap[key] || []).sort((a, b) => Number(b.reWorkQty) - Number(a.reWorkQty));

      const defectQty = defects.reduce((sum, x) => sum + Number(x.reWorkQty), 0);

      const outputQty = Number(output?.output || 0);

      const defectPercent = outputQty > 0 ? Math.ceil(defectQty / outputQty * 100) + "%" : "0%";

      const dailyTarget = smv.smv > 0 ? Math.ceil(60 / Number(smv.smv).toFixed(2) * workers.work_hr * workers.worker_tg * workers.num_eff) : 0

      const now = new Date();
      const startTime = new Date();
      startTime.setHours(7, 30, 0, 0);
      const endTime = new Date();
      endTime.setHours(16, 30, 0, 0);

      let targetNow = 0;
      let achieve = "0%";

      if (outputQty >= dailyTarget) {
        targetNow = 0;
        achieve = "100%";
      } else if (now > endTime) {
        targetNow = dailyTarget;
        achieve = dailyTarget > 0 ? Math.ceil(outputQty / dailyTarget * 100) + "%" : "0%";
      } else if (now >= startTime) {
        targetNow = calculateTargetNow(dailyTarget, workers.work_hr);
        achieve = targetNow > 0 ? Math.ceil(outputQty / targetNow * 100) + "%" : "0%";
      }

      const remainingQty = Number(dailyTarget - outputQty || 0)

      const efficiencyPercent = dailyTarget > 0 ? Math.ceil(outputQty / dailyTarget * 100) + "%" : "0%"

      const flowEfficiency = workers.num_eff ? Math.ceil(workers.num_eff * 100) + "%" : "0%"

      renderFlowDashboard({
        flow: info.flow,
        style: info.style,
        buyer: info.buyer,
        orderNo: info.orderNo,
        smv: smv ? Number(smv.smv).toFixed(2) : "-",
        workers: `${workers.worker_at ?? 0}/${workers.worker_tg ?? 0}`,
        styleQty: Number(info.styleQty || 0),
        startDate: acc?.startDate ?.split("T")[0] ?? "-",
        //completeDate: acc?.completeDate ?.split("T")[0] ?? "-",
        completeDate: "-",
        dailyTarget,
        targetNow,
        output: outputQty,
        achieve,
        accQty: Number(acc?.accQty || 0),
        defectQty,
        defectPercent,
        remainingQty,
        efficiencyPercent,
        flowEfficiency,
      });

      renderDefects(defects);

      currentIndex++;

      if (currentIndex >= data.infoData.length) {
        currentIndex = 0;
      }
    }

    renderCurrent();

    setInterval(renderCurrent, 10000);
  } catch (err) {
    console.error(err);

    renderFlowDashboard(defaultData);
  }
}

loadFlowDashboard();

updateClock();
setInterval(updateClock, 1000);
