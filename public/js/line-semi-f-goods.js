document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const flow = window.location.pathname.split("/").pop();

    document.getElementById("flowName").textContent = flow;

    const response = await fetch(`/pms/monitor/semiFGoods?flow=${flow}`);

    const result = await response.json();

    if (!result.success || !result.data?.length) {
      renderEmpty();
      return;
    }

    renderData(result.data);
  } catch (error) {
    console.error(error);
    renderEmpty("Failed to load data");
  }
}

function renderData(data) {
  document.getElementById("loading").style.display = "none";

  const grouped = {};

  data.forEach(item => {
    const key = `${item.style}_${item.OrderNo}`;

    if (!grouped[key]) {
      grouped[key] = {
        style: item.style,
        custStyle: item.CustStyle,
        po: item.OrderNo,
        rows: {}
      };
    }

    const sizeKey = item.sizx;

    if (!grouped[key].rows[sizeKey]) {
      grouped[key].rows[sizeKey] = {
        product: item.ProType,
        size: item.sizx,
        output: Number(item.OutPut || 0),
        sizxQty: Number(item.sizxQty || 0),
        semi: [],
        available: 0,
        completed: 0,
        percent: 0
      };
    }

    grouped[key].rows[sizeKey].semi.push({
      name: item.typeOtherSMFGs,
      output: Number(item.outputOtherSMFGs || 0)
    });
  });

  Object.values(grouped).forEach(style => {
    Object.values(style.rows).forEach(row => {

      const values = [
        row.output,
        ...row.semi.map(x => Number(x.output || 0))
      ];

      row.available = Math.min(...values);

      row.completed = row.sizxQty;

      row.percent = row.completed > 0 ? ((row.available / row.completed) * 100).toFixed(2) : "0.00";
    });
  });

  const html = Object.values(grouped).map(renderStyleBlock).join("");

  document.getElementById("styleList").innerHTML = html;
}

function renderStyleBlock(styleData) {
  const rows = Object.values(styleData.rows);

  return `
    <div class="style-block">
      <div class="style-po-header">
        <div class="style-po-item">
          <span class="style-po-label">Style:</span>
          <span>${escapeHtml(styleData.custStyle)}</span>
        </div>

        <div class="style-po-item">
          <span class="style-po-label">PO:</span>
          <span>${escapeHtml(styleData.po)}</span>
        </div>
      </div>

      <div class="section-title">
        OUTPUT (Step 450)
      </div>

      <div class="table-wrap">
        <table class="output-table">

          <thead>
            <tr>
              <th class="col-product">Product</th>
              <th class="col-size">Size</th>
              <th class="col-output">Output</th>
              <th class="col-semi">Other Semi-FGs</th>
              <th class="col-semi-output">Output</th>
              <th class="col-available">Quantity Available for Matching</th>
              <th class="col-completed">Qty to be<br>completed</th>
              <th class="col-percent">%</th>
            </tr>
          </thead>

          <tbody>
            ${rows.map(renderRow).join("")}
          </tbody>

        </table>
      </div>

    </div>
  `;
}

function renderRow(row) {
  const values = [
    row.output,
    ...row.semi.map(x => Number(x.output || 0))
  ];

  const maxValue = Math.max(...values);

  const isOutputMax = row.output === maxValue;

  const statusClass = isOutputMax
    ? "status-green"
    : "status-red";

  const outputClass = isOutputMax
    ? "output-green"
    : "output-red";

  return `
    <tr>

      <td class="product-cell">
        ${escapeHtml(row.product)}
      </td>

      <td class="size-cell">
        ${escapeHtml(row.size)}
      </td>

      <td class="${outputClass}">
        ${row.output.toLocaleString()}
      </td>

      <td class="semi-group ${statusClass} grouped-cell">
        ${row.semi
          .map(
            semi => `
              <div class="semi-line">
                ${escapeHtml(semi.name)}
              </div>
            `
          )
          .join("")}
      </td>

      <td class="semi-output-group grouped-cell">
        ${row.semi
          .map(
            semi => `
              <div class="semi-output-line">
                ${Number(semi.output).toLocaleString()}
              </div>
            `
          )
          .join("")}
      </td>

      <td class="available-value">
        ${row.available.toLocaleString()}
      </td>

      <td class="completed-value">
        ${row.completed.toLocaleString()}
      </td>

      <td class="percent-value">
        ${row.percent}%
      </td>

    </tr>
  `;
}

function renderEmpty(message = "No data found") {
  document.getElementById("loading").innerHTML = `
    <div class="empty">
      ${message}
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
