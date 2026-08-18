const defaultData = {
  flow: "-",
  style: "-",
  buyer: "-",
  orderNo: "-",
  smv: "-",
  worker_at: "-",
  worker_tg: "-",
  styleQty: "-",
  startDate: "-",
  completeDate: "-",
  dailyTarget: "-",
  targetNow: "-",
  output: "-",
  banlance1: "-",
  banlance2: "-",
  banlance3: "-",
  percent1: "-",
  percent2: "-",
  percent3: "-",
  hr1: "-",
  hr2: "-",
  hr3: "-",
  accQty: "-",
  defectQty: "-",
  defectPercent: "-",
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
  document.getElementById("live-clock").textContent =
    `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

function renderDefects(defects = []) {
  const container = document.getElementById("defectList");
  container.innerHTML = "";
  if (!defects.length) {
    container.textContent = "No defects";
    return;
  }

  defects.slice(0, 5).forEach((item) => {
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
  if (workingHours <= 0) return 0;

  const startTime = new Date();
  startTime.setHours(7, 30, 0, 0);
  const elapsedMinutes = Math.max(
    0,
    (Date.now() - startTime.getTime()) / (1000 * 60),
  );
  return Math.floor(elapsedMinutes * (dailyTarget / workingHours / 60));
}

function normalizeBuyer(buyer) {
  if (!buyer || buyer === "-") {
    return buyer;
  }

  return String(buyer).toLowerCase().includes("carters") ? "carter's" : buyer;
}

function renderFlowDashboard(data) {
  document.getElementById("flowName").innerText = data.flow;
  document.getElementById("style").innerText = data.style;
  document.getElementById("brand").innerHTML = data.buyer;
  document.getElementById("po").innerText = data.orderNo;
  document.getElementById("smv").innerText = data.smv;
  document.getElementById("workerAt").innerText = data.worker_at;
  document.getElementById("workerTg").innerText = data.worker_tg;
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
  document.getElementById("hr1").innerText = data.hr1 != '-' ? `${data.hr1} Hr` : data.hr1;
  document.getElementById("hr2").innerText = data.hr2 != '-' ? `${data.hr2} Hr` : data.hr2;
  document.getElementById("hr3").innerHTML = data.hr3 != '-' ? `${data.hr3} Hr <span class="time-day">(${data.day3} Days)</span>` : data.hr3;
  document.getElementById("accQty").innerText = data.accQty;
  document.getElementById("defectQty").innerText = data.defectQty;
  document.getElementById("defectPercent").innerText = data.defectPercent;
  document.getElementById("flowEfficiency").innerText = data.flowEfficiency;

  ["banlance1", "banlance2", "banlance3"].forEach(id => {
    const el = document.getElementById(id);
    const value = Number(el.innerText);

    el.classList.toggle("balance-positive", value > 0);
    el.classList.toggle("balance-negative", value < 0);
  });
}

let slideInterval = null;
let refreshInterval = null;

async function loadFlowDashboard() {
  try {
    const flow = window.location.pathname.split("/").pop();
    const response = await fetch(`/api/monitor/private/flowDashboard?flow=${flow}`);

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
      const defects = (defectMap[key] || []).sort(
        (a, b) => Number(b.reWorkQty) - Number(a.reWorkQty),
      );
      const smv = Number(smvObject?.smv || 0).toFixed(2);
      const work_hr = workers?.work_hr || 0;
      const worker_tg = workers?.worker_tg || 0;
      const worker_at = workers?.worker_at || 0;
      const num_eff = workers?.num_eff;

      // Hiệu quả chuyền
      const flowEfficiency = workers.num_eff
        ? Math.ceil(workers.num_eff * 100) + "%"
        : "0%";

      // ==THỰC TẾ==
      // Thực tế row3
      const accQty = Number(acc?.accQty || 0);
      // Thực tế row1 và row2
      const outputQty = Number(output?.output || 0);

      // ==CHẤT LƯỢNG==
      // Số lượng lỗi
      const defectQty = defects.reduce(
        (sum, x) => sum + Number(x.reWorkQty),
        0,
      );
      // Phần trăm lỗi
      const defectPercent =
        outputQty > 0 ? Math.ceil((defectQty / outputQty) * 100) + "%" : "0%";

      // ==KẾ HOẠCH==
      // Kế hoạch row1 = (60 / smv) x số giờ làm việc x số công nhân kế hoạch x số hiêu quả -> Kết quả làm tròn lên
      const dailyTarget =
        smv > 0 ? Math.ceil((60 / smv) * work_hr * worker_tg * num_eff) : 0;
      // Kế hoạch row3
      const styleQty = Number(info?.styleQty || 0);

      // ==KẾ HOẠCH & PHẦN TRĂM ROW2==
      // Kế hoạch row2
      let targetNow = 0;
      // Phần trăm row2
      let percent2 = "0%";

      // Thời gian công nhân bắt đầu làm việc từ 7h30 -> 16h30
      const now = new Date();
      const startTime = new Date();
      startTime.setHours(7, 30, 0, 0);

      const endTime = new Date(startTime);
      const workHours = Number(workers.work_hr || 0);
      // + workHours + 1 giờ nghỉ trưa
      endTime.setHours(
        endTime.getHours() + workHours + 1
      )

      // Nếu Thực tế row2 >= Kế hoạch row1 (dailyTargetStyle) thì Kế hoạch row2 = 0 & Phần trăm row2 = 100%
      // Ngược lại Thực tế row2 < Kế hoạch row1
      //   + Thời điểm xem báo cáo > 16h30: Kế hoạch row2 = Kế hoạch row1 & Phần trăm row2 = Thực tế row2 / Kế hoạch row1 x 100
      //   + Thời điểm xem báo cáo < 16h30:
      //     - Kế hoạch row2 = Số phút từ 7h30 đến thời điểm xem báo cáo x（Kế hoạch row1 / Số giờ làm việc của công nhân / 60）
      //     - Phần trăm row2 = (Thực tế row2 / Kế hoạch row2) x 100 -> Kết quả làm tròn lên

      const dailyTargetStyle = dailyTarget > styleQty ? styleQty : dailyTarget;

      if (outputQty >= dailyTargetStyle) {
        targetNow = 0;
        percent2 = "100%";
      } else if (now > endTime) {
        targetNow = dailyTargetStyle;
        percent2 = dailyTargetStyle > 0 ? Math.ceil((outputQty / dailyTargetStyle) * 100) + "%" : "0%";
      } else if (now >= startTime) {
        targetNow = calculateTargetNow(dailyTargetStyle, workers.work_hr);
        percent2 = targetNow > 0 ? Math.ceil((outputQty / targetNow) * 100) + "%" : "0%";
      }

      // ==CÒN LẠI==
      // Còn lại row1 = Kế hoạch row1 - Thực tế row1
      const banlance1 = outputQty - dailyTargetStyle;
      // Còn lại row2 = Kế hoạch row2 - Thực tế row2
      const banlance2 = targetNow === 0 ? 0 : outputQty - targetNow;
      // Còn lại row3 = Kế hoạch row3 - Thực tế row3
      const banlance3 = accQty - styleQty;

      // ==PHẦN TRĂM==
      // Phần trăm row1 = Thực tế row1 / Kế hoạch row1 x 100 -> Kết quả làm tròn lên
      const percent1 =
        dailyTargetStyle > 0
          ? Math.ceil((outputQty / dailyTargetStyle) * 100) + "%"
          : "0%";
      // Phần trăm row3 = Thực tế row3 / Kế hoạch row3 x 100 -> Kết quả làm tròn lên
      const percent3 =
        styleQty > 0 ? Math.ceil((accQty / styleQty) * 100) + "%" : "0%";

      // ==THỜI GIAN==
      // Hr row1 = (Còn lại row1 x smv ) / Số công nhân kế hoạch / 60
      const hr1 = worker_tg > 0 ? (((banlance1 * -1) * smv) / worker_tg / 60) : 0;
      // Day row1 đặt = 1
      const day1 = 1;

      // Hr row2 = (Còn lại row2 x smv ) / Số công nhân kế hoạch / 60
      const hr2 = worker_tg > 0 ? (((banlance2 * -1) * smv) / worker_tg / 60) : 0;
      // Day row1 đặt = 1
      const day2 = 1;

      // Hr row3 = (Còn lại row3 / Kế hoạch row1) x 24 -> Kết quả làm tròn lên
      const hr3 = dailyTargetStyle > 0 ? Math.ceil((banlance3 * -1 / dailyTargetStyle) * 24) : 0;
      // Day row3 = Còn lại row3 / Kế hoạch row1 -> Kết quả làm tròn lên
      const day3 =
        dailyTargetStyle > 0 ? Math.ceil((banlance3 * -1) / dailyTargetStyle) : 0;

      const startDate = acc?.startDate ? acc.startDate.split("T")[0] : "-";
      const today = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
      );
      today.setDate(today.getDate() + day3);
      const completeDate = today.toISOString().split("T")[0];

      renderFlowDashboard({
        // flow: ['SEWING-GD-F1-06A'].includes(info.flow) ? 'GY-1' : info.flow, // Fake flow date
        flow: info.flow,
        style: info.style,
        buyer: normalizeBuyer(info.buyer),
        orderNo: info.orderNo,
        smv,
        worker_at,
        worker_tg,
        styleQty,
        startDate,
        completeDate,
        dailyTarget: dailyTarget > styleQty ? styleQty : dailyTarget, // Kế hoạch row1 > row3 thì row1 = row3, ngược lại row1 = chính nó
        targetNow,
        output: outputQty,
        banlance1,
        banlance2,
        banlance3,
        percent1,
        percent2,
        percent3,
        hr1: hr1 > 0 ? hr1.toFixed(2) : 0,
        hr2: hr2 > 0 ? hr2.toFixed(2) : 0,
        hr3,
        day3,
        accQty,
        defectQty,
        defectPercent,
        flowEfficiency,
      });

      renderDefects(defects);

      currentIndex++;

      if (currentIndex >= data.infoData.length) {
        currentIndex = 0;
      }
    }

    renderCurrent();

    if (slideInterval) {
      clearInterval(slideInterval);
    }

    slideInterval = setInterval(renderCurrent, 20000);
  } catch (err) {
    console.error(err);
    renderFlowDashboard(defaultData);
  }
}

loadFlowDashboard();

updateClock();
setInterval(updateClock, 1000);

refreshInterval = setInterval(() => {
  loadFlowDashboard();
}, 180000);

const flowItem = document.querySelector(".flow-item");

flowItem.addEventListener("click", function () {
  const flowValue = document.getElementById("flowName").textContent.trim();
  const styleValue = document.getElementById("style").textContent.trim();
  const poValue = document.getElementById("po").textContent.trim();

  if (!flowValue || flowValue === "-" || !styleValue || styleValue === "-" || !poValue || poValue === "-") {
    return;
  }

  window.location.href = `/pms/monitor/semiFGoods/${flowValue}`;
});
