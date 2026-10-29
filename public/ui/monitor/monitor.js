"use strict";
const container = document.getElementById("flowContainer");
const statusEl = document.getElementById("status");
const input = document.getElementById("searchInput");
const retry = document.getElementById("retry");
let flows = [], selectedArea = "all";
const themes = {GI:["#009cff","#e1f2ff"],GA:["#00ac91","#dff5f2"],GD:["#9b36ff","#f0e6ff"],GL:["#d79900","#fff2d4"],TOY:["#e57190","#ffedf3"]};
const number = value => value === null || value === undefined || String(value).trim() === "" ? null : Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
// API contract: total / target are quantities; efficiency is a ratio (0.85 = 85%).
// Map the actual API field names here. Do not use num_eff (commitment) as actual efficiency.
function normalize(row) {
  const flow = String(row.flow ?? "").trim();
  const parts = flow.split("-");
  const parsed = parts[0]?.toUpperCase() === "SEWING";

  const progressText = String(row.percent2 ?? "").trim();

  const progress = /^\d+(?:\.\d+)?%?$/.test(progressText)
    ? number(progressText.replace(/%$/, ""))
    : null;

  return {
    flow,
    area: String(
      row.area ?? (parsed ? parts[1] : null) ?? "KHÁC"
    ),
    workshop: String(
      row.workshop ??
      (parsed ? parts[2] : null) ??
      "Chưa phân xưởng"
    ),
    poCount: number(row.poCount),
    total: number(row.total),
    target: number(row.dailyTarget),
    percent: progress
  };
}
function color(p) {
  if (p === null || !Number.isFinite(p)) return "unknown";
  if (p < 75) return "red";
  if (p < 90) return "orange";
  if (p < 100) return "yellow";
  return "green";
}
function el(tag, className, text) {const node=document.createElement(tag); if(className)node.className=className; if(text!==undefined)node.textContent=text;return node;}
function format(n) {
  return n === null ? "—" : String(Math.round(n));
}
function percent(n) {return n === null ? "—" : `${Number(n.toFixed(1))}%`;}
function summary(rows) {
  const node=el("div","summary");node.append(el("span","",`Tổng chuyền: ${rows.length}`));
  for(const c of ["red","orange","yellow","green","unknown"]){const count=rows.filter(x=>color(x.percent)===c).length;if(c==="unknown"&&!count)continue;const s=el("span");s.append(el("i",`dot ${c}`),document.createTextNode(String(count)));s.title={red:"Dưới 75%",orange:"75–89%",yellow:"90–99%",green:"Trên 100%",unknown:"Chưa có dữ liệu"}[c];node.append(s);}return node;
}

function card(row) {
  const state = color(row.percent);
  const link = el(
    "a",
    `flow-card${sortByEfficiency ? ` pastel-${state}` : " compact"}`
  );

  link.dataset.flow = row.flow;

  link.href =
    `/pms/monitor/flowDashboard/v6/${encodeURIComponent(row.flow)}`;

  const top = el("div", "card-top");
  const name = el("div", "card-name");

  // Chỉ rút gọn tên hiển thị; giữ nguyên mã gốc cho link và tìm kiếm.
  const displayName = row.flow.replace(/^SEWING-/i, "");
  name.append(el("h3", "", displayName));

  // Thêm cảnh báo cho chuyền có hiệu suất dưới 75%.
  if (state === "red") {
    link.classList.add("efficiency-alert");

    const warning = el("span", "warning-icon");
    warning.title = "Cảnh báo: Hiệu suất dưới 75%";
    warning.setAttribute("role", "img");
    warning.setAttribute(
      "aria-label",
      "Cảnh báo: Hiệu suất dưới 75%"
    );

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");

    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");

    const triangle = document.createElementNS(ns, "path");
    triangle.setAttribute("d", "M12 3 22 21H2Z");
    triangle.setAttribute("fill", "#ffdf32");
    triangle.setAttribute("stroke", "#dc2626");
    triangle.setAttribute("stroke-width", "1.7");
    triangle.setAttribute("stroke-linejoin", "round");

    const mark = document.createElementNS(ns, "path");
    mark.setAttribute("d", "M12 9v5");
    mark.setAttribute("stroke", "#7f1d1d");
    mark.setAttribute("stroke-width", "2.5");
    mark.setAttribute("stroke-linecap", "round");

    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", "12");
    dot.setAttribute("cy", "17");
    dot.setAttribute("r", "1.3");
    dot.setAttribute("fill", "#7f1d1d");

    svg.append(triangle, mark, dot);
    warning.append(svg);
    name.append(warning);
  }

  top.append(name);

  if (sortByEfficiency) {
    const po = el(
      "span",
      "po-badge",
      row.poCount === null ? "—" : `${row.poCount} PO`
    );

    po.title = "Số lượng PO";
    top.append(po);
  }

  link.append(top);

  if (sortByEfficiency) {
    const metrics = el("div", "metrics");

    for (const [label, value, className] of [
      ["Total", `${format(row.total)}/${format(row.target)}`, ""],
      ["Efficiency", percent(row.percent), `eff-${state}`]
    ]) {
      const metric = el("div", "metric");

      metric.append(
        el("span", "", label),
        el("strong", className, value)
      );

      metrics.append(metric);
    }

    link.append(metrics);
  }

  const arrow = el("span", "arrow", "›");
  arrow.setAttribute("aria-hidden", "true");
  link.append(arrow);

  return link;
}
function group(rows,key){const map=new Map();for(const row of rows){if(!map.has(row[key]))map.set(row[key],[]);map.get(row[key]).push(row);}return [...map].sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}));}
function createAreaIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");

  svg.classList.add("area-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("aria-hidden", "true");

  for (const [x, y] of [[3, 3], [14, 3], [3, 14], [14, 14]]) {
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", "7");
    rect.setAttribute("height", "7");
    rect.setAttribute("rx", "2");
    svg.append(rect);
  }

  return svg;
}
function renderFlows(){
  const keyword=input.value.trim().toLowerCase();
  const rows=flows.filter(x=>(selectedArea==="all"||x.area===selectedArea)&&x.flow.toLowerCase().includes(keyword));
  container.replaceChildren();statusEl.textContent=rows.length?"":"Không tìm thấy chuyền phù hợp.";
  for(const [area,areaRows] of group(rows,"area")){
    const region=el("section","region");const theme=themes[area]??["#5c7ba5","#eaf0f8"];region.style.setProperty("--accent",theme[0]);region.style.setProperty("--tint",theme[1]);
    const head=el("div","region-head"),body=el("div","workshops");
    const title = el("h2", "region-title");
    title.append(
      createAreaIcon(),
      document.createTextNode(`KHU VỰC ${area}`)
    );

    head.append(
      title,
      el("span", "count", String(areaRows.length))
    );

    // Đưa nhãn SEWING lên cạnh tên khu vực và số lượng.
    if (areaRows.some(row => /^SEWING-/i.test(row.flow))) {
      head.append(el("span", "region-process", "SEWING"));
    }
    
    for(const [workshop,workRows] of group(areaRows,"workshop")){
      const section = el("section", "workshop");
      const cards = el("div", "cards");
      workRows.sort((a, b) => {
        const byName = a.flow.localeCompare(b.flow, "vi", {
          numeric: true
        });

        if (!sortByEfficiency) return byName;

        // Chuyền chưa có hiệu suất nằm cuối.
        if (a.percent === null && b.percent === null) return byName;
        if (a.percent === null) return 1;
        if (b.percent === null) return -1;

        return a.percent - b.percent || byName;
      });
      workRows.forEach(row => cards.append(card(row)));
      section.append(cards);
      body.append(section);
    }
    region.append(head,body);container.append(region);
  }
}

const sortByEfficiency = true;

const DASHBOARD_STATE_KEY = "factoryDashboardState";

let pendingDashboardRestore = null;

try {
  pendingDashboardRestore = JSON.parse(
    sessionStorage.getItem(DASHBOARD_STATE_KEY) || "null"
  );
} catch {
  sessionStorage.removeItem(DASHBOARD_STATE_KEY);
}

if (pendingDashboardRestore) {
  selectedArea = pendingDashboardRestore.area || "all";
  input.value = pendingDashboardRestore.keyword || "";
}

function syncEfficiencyButton() {
  document.body.classList.add("show-efficiency");
}

// Lưu ngay trước khi người dùng mở một chuyền.
container.addEventListener("click", event => {
  const card = event.target.closest("a.flow-card");

  if (!card) return;

  try {
    sessionStorage.setItem(
      DASHBOARD_STATE_KEY,
      JSON.stringify({
        area: selectedArea,
        keyword: input.value,
        sortByEfficiency,
        scrollY: window.scrollY,
        flow: card.dataset.flow
      })
    );
  } catch (error) {
    console.warn("Không lưu được trạng thái dashboard:", error);
  }
});

function restoreDashboardPosition() {
  if (!pendingDashboardRestore) return;

  const saved = pendingDashboardRestore;
  pendingDashboardRestore = null;

  const lastCard = [...container.querySelectorAll(".flow-card")]
    .find(card => card.dataset.flow === saved.flow);

  if (lastCard) {
    lastCard.classList.add("last-viewed");
    lastCard.title = "Chuyền vừa xem";
  }

  // Chờ trình duyệt hoàn thành bố cục rồi mới cuộn.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: Number(saved.scrollY) || 0,
        behavior: "instant"
      });
    });
  });
}

async function loadFlows() {
  retry.hidden = true;
  statusEl.textContent = "Đang tải danh sách chuyền...";
  container.replaceChildren();

  try {
    const response = await fetch("/api/monitor/private/flows", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!Array.isArray(result.data)) {
      throw new Error("API data phải là một mảng");
    }

    flows = result.data
      .filter(row =>
        row &&
        typeof row.flow === "string" &&
        row.flow.trim()
      )
      .map(normalize);

    syncEfficiencyButton();
    renderFilters();
    renderFlows();
    restoreDashboardPosition();
  } catch (error) {
    console.error("Không tải được danh sách chuyền:", error);
    statusEl.textContent =
      "Không tải được danh sách chuyền. Vui lòng thử lại.";
    retry.hidden = false;
  }
}

input.addEventListener("input", renderFlows);
retry.addEventListener("click", loadFlows);

function renderFilters() {
  const filtersEl = document.getElementById("areaFilters");
  filtersEl.replaceChildren();

  const areas = [
    "all",
    ...new Set([
      "GI", "GA", "GD", "TOY",
      ...flows.map(row => row.area)
    ])
  ];

  for (const area of areas) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = area === "all" ? "Tất cả" : area;
    button.classList.toggle("active", selectedArea === area);
    button.setAttribute(
      "aria-pressed",
      String(selectedArea === area)
    );

    button.addEventListener("click", () => {
      selectedArea = area;
      renderFilters();
      renderFlows();
    });

    filtersEl.appendChild(button);
  }
}

renderFilters();
loadFlows();