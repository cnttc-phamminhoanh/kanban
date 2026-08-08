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
  output1: "-",
  accQty: "-",
  defectQty: "-",
  defectPercent: "-",
  remainingQty: "-",
  efficiencyPercent: "-",
  flowEfficiency: "-",
};

function updateClock() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  document.getElementById("live-clock").textContent = `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

function renderDefects(defects = []) {
  const container = document.getElementById("defectList");
  container.innerHTML = "";
  if (!defects.length) {
    container.textContent = "No defects";
    return;
  }

  defects.slice(0, 5).forEach(item => {
    const row = document.createElement("div");
    row.className = "defect-item";
    const count = document.createElement("span");
    count.className = "defect-count";
    count.textContent = item?.reWorkQty;
    const name = document.createElement("span");
    name.className = "defect-name";
    name.textContent = item?.description;
    row.appendChild(count);
    row.appendChild(name);
    container.appendChild(row);
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
  document.getElementById("output1").innerText = data.output;
  document.getElementById("banlance1").innerText = data.banlance1;
  document.getElementById("banlance2").innerText = data.banlance2;
  document.getElementById("banlance3").innerText = data.banlance3;
  document.getElementById("percent1").innerText = data.percent1;
  document.getElementById("percent2").innerText = data.percent2;
  document.getElementById("percent3").innerText = data.percent3;
  document.getElementById("hr").innerText = data.hr;
  document.getElementById("day").innerText = data.day;
  //document.getElementById("achieve").innerText = data.achieve;
  document.getElementById("accQty").innerText = data.accQty;
  document.getElementById("defectQty").innerText = data.defectQty;
  document.getElementById("defectPercent").innerText = data.defectPercent;
  //document.getElementById("remainingQty").innerText = data.remainingQty;
  //document.getElementById("efficiencyPercent").innerText = data.efficiencyPercent;
  document.getElementById("flowEfficiency").innerText = data.flowEfficiency;
  document.getElementById("hr").innerText = data.hr;
  document.getElementById("day").innerText = data.day;
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

    data.smvData?.forEach((item) => {
      const key = `${item.flow}|${item.style}|${item.orderNo}`;
      smvMap[key] = item;
    });

    data.accQtyStartCompeleteData?.forEach((item) => {
      const key = `${item.flow}|${item.style}|${item.orderNo}`;
      accMap[key] = item;
    });

    data.outputData?.forEach((item) => {
      const key = `${item.flow}|${item.style}|${item.orderNo}`;
      outputMap[key] = item;
    });

    data.defectsData?.forEach((item) => {
      const key = `${item.flow}|${item.style}|${item.orderNo}`;
      if (!defectMap[key]) {
        defectMap[key] = [];
      }
      defectMap[key].push(item);
    });

    const workers = data.workersData?.find((x) => x.igm_dept === flow) || {};

    let currentIndex = 0;

    function renderCurrent() {
      const info = data?.infoData[currentIndex];
      if (!info) {
        renderFlowDashboard(defaultData);
        renderDefects([]);
        return;
      }
      const key = `${info.flow}|${info.style}|${info.orderNo}`;
      const smvObject = smvMap[key];
      const acc = accMap[key];
      const output = outputMap[key];
      const defects = (defectMap[key] || []).sort((a, b) => Number(b.reWorkQty) - Number(a.reWorkQty));
      const defectQty = defects.reduce((sum, x) => sum + Number(x.reWorkQty), 0);
      const outputQty = Number(output?.output || 0);
      const smv = Number(smvObject?.smv || 0).toFixed(2);
      const defectPercent = outputQty > 0 ? Math.ceil((defectQty / outputQty) * 100) + "%" : "0%";
      const work_hr = workers?.work_hr || 0;
      const worker_tg = workers?.worker_tg || 0;
      const worker_at = workers?.worker_at || 0;
      const num_eff = workers?.num_eff
      const dailyTarget = smv > 0 ? Math.ceil((60 / smv) * work_hr * worker_tg * num_eff) : 0;
      
      const now = new Date();
      const startTime = new Date();
      startTime.setHours(7, 30, 0, 0);
      const endTime = new Date();
      endTime.setHours(16, 30, 0, 0);

      let targetNow = 0;
      let percent2 = "0%";

      if (outputQty >= dailyTarget) {
        targetNow = 0;
        percent2 = "100%";
      } else if (now > endTime) {
        targetNow = dailyTarget;
        percent2 = dailyTarget > 0 ? Math.ceil((outputQty / dailyTarget) * 100) + "%" : "0%";
      } else if (now >= startTime) {
        targetNow = calculateTargetNow(dailyTarget, workers.work_hr);
        percent2 = targetNow > 0 ? Math.ceil((outputQty / targetNow) * 100) + "%" : "0%";
      }

      const remainingQty = Number(dailyTarget - outputQty || 0);

      const efficiencyPercent = dailyTarget > 0 ? Math.ceil((outputQty / dailyTarget) * 100) + "%" : "0%";

      const flowEfficiency = workers.num_eff ? Math.ceil(workers.num_eff * 100) + "%" : "0%";

      const styleQty = Number(info?.styleQty || 0);
      const accQty = Number(acc?.accQty || 0);

      const banlance1 = dailyTarget - outputQty
      const banlance2 = targetNow - outputQty
      const banlance3 = styleQty - accQty
      const percent1 = dailyTarget > 0 ? Math.ceil((outputQty / dailyTarget) * 100) + '%' : '0%'

      const percent3 = styleQty > 0 ? Math.ceil((accQty / styleQty) * 100) + '%' : '0%'

      const hr = ((banlance1 * smv) / worker_tg / 60).toFixed(2)
      const day = Math.ceil((banlance3 / dailyTarget))

      const startDate = acc?.startDate.split("T")[0];
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + 1);
      const completeDate = date.toISOString().split("T")[0]

      renderFlowDashboard({
        flow: info.flow,
        style: info.style,
        buyer: info.buyer,
        orderNo: info.orderNo,
        smv,
        workers: `Actual: ${worker_at} / Plan: ${worker_tg}`,
        styleQty,
        startDate,
        completeDate,
        dailyTarget,
        targetNow,
        output: outputQty,
        banlance1,
        banlance2,
        banlance3,
        percent1,
        percent2,
        percent3,
        hr,
        day,
        accQty,
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

    setInterval(renderCurrent, 20000);
  } catch (err) {
    console.error(err);

    renderFlowDashboard(defaultData);
  }
}

loadFlowDashboard();

updateClock();
setInterval(updateClock, 1000);
