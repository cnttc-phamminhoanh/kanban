const API_URL = '/api/monitor/private/flowEfficiency';

// DOM ELEMENTS
const flowSelect = document.getElementById('flow');
const dateInput = document.getElementById('date');
const queryBtn = document.getElementById('queryBtn');
const tbody = document.getElementById('tbody');
const flowInfo = document.getElementById('flowInfor');
const dateInfo = document.getElementById('dateInfor');
const workHourInfo = document.getElementById('workHour');

// STATE
let currentData = null;
let currentIndex = null;
let reasonData = {};

// INITIALIZE
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
dateInput.value = todayStr;

// Fetch available flows
async function loadFlows() {
  try {
    const flows = [
      'SEWING-GI-F1-04A',
      'SEWING-GA-F2-03A',
      'SEWING-GA-F2-03B',
      'SEWING-GA-F2-04A',
      'SEWING-GA-F2-05A',
    ];
    
    flowSelect.innerHTML = `
      <option value="" selected disabled hidden>Select Flow</option>
      ${flows.map(flow => `<option value="${flow}">${flow}</option>`).join('')}
    `;
    
    flowSelect.value = flows[0];
    flowInfo.textContent = flows[0];
  } catch (err) {
    console.error('Error loading flows:', err);
  }
}

// API CALLS
async function fetchEfficiencyData(flow, date) {
  try {
    const url = `${API_URL}?flow=${encodeURIComponent(flow)}&date=${encodeURIComponent(date)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch data');
    }
    
    return result.data;
  } catch (err) {
    console.error('Error fetching efficiency data:', err);
    throw err;
  }
}

// ==========================================
// RENDER FUNCTIONS
// ==========================================

function renderInfo(data) {
  if (!data) {
    flowInfo.textContent = 'N/A';
    dateInfo.textContent = 'N/A';
    workHourInfo.textContent = 'No data';
    return;
  }
  
  flowInfo.textContent = data.flow || 'N/A';
  dateInfo.textContent = data.date || 'N/A';
  
  // Lấy work hours từ workPlan
  if (data.workPlan) {
    workHourInfo.textContent = `${data.workPlan.work_hr || 0} Hours`;
  } else {
    workHourInfo.textContent = 'No data';
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderTable(data) {
  if (!data || !Array.isArray(data.productionGroups) || data.productionGroups.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="14" style="text-align: center; padding: 40px; color: #64748b; font-size: 16px;">
          No production data available
        </td>
      </tr>
    `;
    return;
  }

  const formatNumber = (value, decimals = 0) => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '-';
    }
    return number.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatSMV = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      return '-';
    }
    return number.toFixed(2);
  };

  let html = '';

  // Lặp qua từng PO Group
  data.productionGroups.forEach((group) => {
    const rows = group.rows || [];
    const totalRows = rows.length;

    // Lặp qua từng slot trong group
    rows.forEach((slot, index) => {
      // Tạo key cho reason: flow_date_poNo_slotNo
      const reasonKey = `${data.flow}_${data.date}_${group.poNo}_${slot.slotNo}`;
      const reason = reasonData[reasonKey] || '';

      // Xác định class cho percent
      let percentClass = '';
      if (slot.percent > 0) {
        if (slot.percent >= 100) percentClass = 'percent-good';
        else if (slot.percent >= 80) percentClass = 'percent-normal';
        else percentClass = 'percent-bad';
      }

      // Xác định class cho balance
      let balanceClass = '';
      if (slot.balance > 0) {
        balanceClass = 'negative';
      } else if (slot.balance < 0) {
        balanceClass = 'positive';
      }

      // Render row
      html += `
        <tr>
          ${index === 0 ? `
            <td rowspan="${totalRows}">${escapeHtml(group.brand || '-')}</td>
            <td rowspan="${totalRows}">${escapeHtml(group.style || '-')}</td>
            <td rowspan="${totalRows}">${escapeHtml(group.poNo || '-')}</td>
            <td rowspan="${totalRows}">${formatSMV(group.smv)}</td>
            <td rowspan="${totalRows}">${formatNumber(group.actualWorkers || 0)}</td>
            <td rowspan="${totalRows}">${formatNumber(group.targetWorkers || 0)}</td>
            <td rowspan="${totalRows}">${formatNumber(group.plannedUnitsForToday || 0)}</td>
          ` : ''}

          <td>${slot.slotNo}</td>
          <td>${escapeHtml(slot.time || '-')}</td>

          <td class="yellow">
            ${formatNumber(slot.targetQty)}
          </td>

          <td class="yellow">
            ${formatNumber(slot.actualOutput)}
          </td>

          <td class="${balanceClass}">
            ${formatNumber(slot.balance)}
          </td>

          <td class="${percentClass}">
            ${slot.percent.toFixed(1)}%
          </td>

          <td class="reason-cell" data-key="${reasonKey}">
            ${reason 
              ? `<span class="reason">${escapeHtml(reason)}</span>` 
              : `<span class="reason-placeholder">Click to enter...</span>`}
          </td>
        </tr>
      `;
    });
  });

  tbody.innerHTML = html;
  bindReasonEvents();
}

// ==========================================
// REASON HANDLING
// ==========================================

function bindReasonEvents() {
  document.querySelectorAll('.reason-cell').forEach((cell) => {
    // Remove existing listener to avoid duplicate
    cell.removeEventListener('click', handleReasonClick);
    cell.addEventListener('click', handleReasonClick);
  });
}

function handleReasonClick(e) {
  const cell = e.currentTarget;
  const key = cell.dataset.key;
  openReasonModal(key);
}

function openReasonModal(key) {
  currentIndex = key;
  document.getElementById('reasonInput').value = reasonData[key] || '';
  document.getElementById('reasonModal').classList.add('show');
}

function closeModal() {
  document.getElementById('reasonModal').classList.remove('show');
}

function saveReason() {
  const reason = document.getElementById('reasonInput').value.trim();
  
  if (currentIndex) {
    reasonData[currentIndex] = reason;
    
    // Cập nhật lại delayReason trong dữ liệu
    if (currentData && currentData.productionGroups) {
      const parts = currentIndex.split('_');
      const poNo = parts[2];
      const slotNo = parseInt(parts[3]);
      
      currentData.productionGroups.forEach(group => {
        if (group.poNo === poNo) {
          group.rows.forEach(row => {
            if (row.slotNo === slotNo) {
              row.delayReason = reason;
            }
          });
        }
      });
    }
    
    renderTable(currentData);
    showToast('Saved successfully');
  }
  
  closeModal();
}

// ==========================================
// TOAST
// ==========================================

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ==========================================
// MAIN QUERY FUNCTION
// ==========================================

async function queryEfficiency() {
  const flow = flowSelect.value;
  const date = dateInput.value;
  
  if (!flow) {
    showToast('Please select a flow');
    return;
  }
  
  if (!date) {
    showToast('Please select a date');
    return;
  }
  
  // Show loading
  tbody.innerHTML = `
    <tr>
      <td colspan="14" style="text-align: center; padding: 40px; color: #64748b; font-size: 16px;">
        Loading...
      </td>
    </tr>
  `;
  
  try {
    const data = await fetchEfficiencyData(flow, date);
    currentData = data;
    
    renderInfo(data);
    renderTable(data);
    
    // Update URL with query params
    const url = new URL(window.location);
    url.searchParams.set('flow', flow);
    url.searchParams.set('date', date);
    window.history.pushState({}, '', url);
    
  } catch (err) {
    console.error('Query error:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="14" style="text-align: center; padding: 40px; color: #dc2626; font-size: 16px;">
          Error: ${err.message || 'Failed to load data'}
        </td>
      </tr>
    `;
    showToast('Error loading data');
  }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
queryBtn.addEventListener('click', queryEfficiency);

document.getElementById('saveBtn').addEventListener('click', saveReason);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('closeModal').addEventListener('click', closeModal);

document.getElementById('reasonModal').addEventListener('click', (e) => {
  if (e.target.id === 'reasonModal') {
    closeModal();
  }
});

document.getElementById('reasonInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    saveReason();
  }
});

// ==========================================
// URL PARAMS HANDLING
// ==========================================
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const flow = params.get('flow');
  const date = params.get('date');
  
  if (flow) {
    flowSelect.value = flow;
  }
  
  if (date) {
    dateInput.value = date;
  }
  
  if (flow && date) {
    queryEfficiency();
  }
}

// ==========================================
// INITIALIZE
// ==========================================
async function init() {
  await loadFlows();
  loadFromURL();
}

init();
