const efficiencyRepository = require("../repositories/efficiency.repository");

async function getEfficiencyData(flow, date) {
  // 1. Work plan
  const workPlanRows = await efficiencyRepository.getWorkPlan(flow);

  if (!workPlanRows || workPlanRows.length === 0) {
    return {
      flow,
      date,
      workPlan: null,
      productions: [],
      productionGroups: [],
      timeSlots: [],
    };
  }

  const workPlan = workPlanRows[0];

  // 2. Productions
  const productions = await efficiencyRepository.getProductions(flow, date);

  if (!productions || productions.length === 0) {
    return {
      flow,
      date,
      workPlan,
      productions: [],
      productionGroups: [],
      timeSlots: [],
    };
  }

  // 3. Lấy danh sách WrkOrder
  const wrkOrders = productions.map((item) => item.wrkOrder);

  // 4. Lấy dữ liệu summary
  // const productionSummary = await efficiencyRepository.getProductionSummary(flow, date);

  // 5. Lấy từng lần RFID registration
  const registrations = await efficiencyRepository.getActualRegistrations(wrkOrders, date);

  // 6. Lấy SMV
  const smvRows = await efficiencyRepository.getSmv(flow, date);

  // ============================================================
  // TỪ ĐÂY TRỞ ĐI XỬ LÝ BẰNG JAVASCRIPT
  // ============================================================

  // 7. Map SMV theo Style + OrderNo
  const smvMap = new Map();

  for (const item of smvRows) {
    const key = `${item.style}|${item.orderNo}`;

    smvMap.set(key, Number(item.smv) || 0);
  }

  // Gắn SMV vào production
  const productionData = productions.map((item) => {
    const key = `${item.style}|${item.orderNo}`;

    return {
      ...item,
      smv: smvMap.get(key) || 0,
    };
  });

  // 8. CREATE TIME SLOTS
  const timeSlots = createTimeSlots(workPlan);

  // 9. ASSIGN RFID REGISTRATIONS TO TIME SLOTS, Mỗi PO có actual riêng trong từng slot
  const timeSlotsWithRegistrations = assignRegistrationsToTimeSlotsPerPO(timeSlots, registrations, productionData);

  // 10. CALCULATE EFFICIENCY METRICS CHO TỪNG PO
  const result = calculateEfficiencyMetricsPerPO(workPlan, productionData, timeSlotsWithRegistrations);

  // ============================================================
  // 11. GROUP DATA THEO PO CHO FRONTEND
  //
  // STT | Brand | Style | PO | SMV | Workers | ...
  //     |       |       |    |     |         | Time | Target | Actual...
  //
  // Các thông tin chung chỉ xuất hiện 1 lần / group PO.
  // ============================================================
  const productionGroups = buildProductionGroups(workPlan, result.productionsWithPlan, result.timeSlots);

  return {
    flow,
    date,
    workPlan,
    productions: result.productionsWithPlan,
    // productionSummary,
    // registrations,
    timeSlots: result.timeSlots,
    // Cấu trúc mới dành cho UI
    productionGroups,
    summary: result.summary,
  };
}


// CREATE TIME SLOTS
function createTimeSlots(workPlan) {
  const START_TIME = "07:30";

  const workHours = Number(workPlan.work_hr) || 0;
  const breakStart = workPlan.break_time_fr;
  const breakEnd = workPlan.break_time_to;

  if (workHours <= 0) {
    return [];
  }

  const slots = [];

  const startMinutes = timeToMinutes(START_TIME);
  const breakStartMinutes = timeToMinutes(breakStart);
  const breakEndMinutes = timeToMinutes(breakEnd);

  let currentMinutes = startMinutes;
  let remainingWorkMinutes = Math.round(workHours * 60);

  let slotNo = 1;

  while (remainingWorkMinutes > 0) {
    // Skip break
    if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
      currentMinutes = breakEndMinutes;
      continue;
    }

    let nextMinutes = currentMinutes + 60;

    // Stop slot at break
    if (currentMinutes < breakStartMinutes && nextMinutes > breakStartMinutes) {
      nextMinutes = breakStartMinutes;
    }

    // Do not exceed remaining working time
    const slotMinutes = Math.min(nextMinutes - currentMinutes, remainingWorkMinutes);

    nextMinutes = currentMinutes + slotMinutes;

    const isBreak = isBreakSlot(
      currentMinutes,
      nextMinutes,
      breakStartMinutes,
      breakEndMinutes
    );

    slots.push({
      slotNo,
      startTime: minutesToTime(currentMinutes),
      endTime: minutesToTime(nextMinutes),
      minutes: slotMinutes,
      isBreak,
      // Mỗi PO sẽ có actual, target, balance, percent riêng
      poData: {},
    });

    currentMinutes = nextMinutes;
    remainingWorkMinutes -= slotMinutes;
    slotNo++;
  }

  return slots;
}


// CHECK BREAK SLOT
function isBreakSlot(startMinutes, endMinutes, breakStartMinutes, breakEndMinutes) {
  if (breakStartMinutes === null || breakEndMinutes === null) {
    return false;
  }

  // Check if slot is completely inside break period
  return (startMinutes >= breakStartMinutes && endMinutes <= breakEndMinutes);
}


// TIME -> MINUTES
function timeToMinutes(time) {
  if (!time || typeof time !== "string") {
    return 0;
  }

  const [hour, minute] = time.split(":").map(Number);

  if (isNaN(hour) || isNaN(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}


// GET WORKING MINUTES
function getWorkingMinutesFromStart(endMinutes, workStartMinutes, breakStartMinutes, breakEndMinutes) {
  if (endMinutes <= workStartMinutes) {
    return 0;
  }

  let workingMinutes = endMinutes - workStartMinutes;

  // Trừ thời gian break nếu endTime nằm sau break
  if (breakStartMinutes !== null && breakEndMinutes !== null && endMinutes > breakStartMinutes) {
    const breakMinutes = Math.min(endMinutes, breakEndMinutes) - breakStartMinutes;

    if (breakMinutes > 0) {
      workingMinutes -= breakMinutes;
    }
  }

  return Math.max(workingMinutes, 0);
}


// MINUTES -> TIME
function minutesToTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}


// TIME WITH SECONDS -> MINUTES
function timeToMinutesWithSeconds(time) {
  if (!time || typeof time !== "string") {
    return null;
  }

  const parts = time.split(":").map(Number);

  if (parts.length !== 3) {
    return null;
  }

  const [hour, minute, second] = parts;

  if (Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)) {
    return null;
  }

  return hour * 60 + minute + second / 60;
}


// ASSIGN REGISTRATIONS TO TIME SLOTS PER PO
function assignRegistrationsToTimeSlotsPerPO(timeSlots, registrations, productions) {
  if (!Array.isArray(timeSlots) || !Array.isArray(registrations)) {
    return timeSlots;
  }

  // Khởi tạo poData cho mỗi slot
  timeSlots.forEach((slot) => {
    if (!slot.isBreak) {
      slot.poData = {};

      productions.forEach((prod) => {
        const poKey = prod.orderNo;

        slot.poData[poKey] = {
          orderNo: poKey,
          wrkOrder: prod.wrkOrder,
          style: prod.style,
          buyer: prod.buyer,
          smv: prod.smv,
          actual: 0,
          target: 0,
          balance: 0,
          percent: 0,
          registrations: [],
        };
      });
    }
  });

  // Map WrkOrder -> Production
  const productionMap = new Map(
    productions.map((production) => [
      production.wrkOrder,
      production,
    ])
  );

  // Gán registrations vào đúng PO và slot
  for (const registration of registrations) {
    const regMinutes = timeToMinutesWithSeconds(registration.RegTime);

    if (regMinutes === null) {
      continue;
    }

    // Tìm slot
    const slot = timeSlots.find((item) => {
      const startMinutes = timeToMinutes(item.startTime);
      const endMinutes = timeToMinutes(item.endTime);

      return (regMinutes >= startMinutes && regMinutes < endMinutes && !item.isBreak);
    });

    if (!slot) {
      continue;
    }

    // Tìm PO theo WrkOrder
    const wrkOrder = registration.WrkOrder;
    const production = productionMap.get(wrkOrder);

    if (!production) {
      continue;
    }

    const poKey = production.orderNo;

    if (slot.poData && slot.poData[poKey]) {
      const qty = Number(registration.Qty) || 0;

      slot.poData[poKey].actual += qty;
      slot.poData[poKey].registrations.push(registration);
    }
  }

  return timeSlots;
}


// CALCULATE EFFICIENCY METRICS PER PO
function calculateEfficiencyMetricsPerPO(workPlan, productions, timeSlots) {
  // Get parameters
  const numEff = Number(workPlan.num_eff) || 1;
  const workerTg = Number(workPlan.worker_tg) || 0;
  const workHr = Number(workPlan.work_hr) || 0;

  // Tính Planned Units cho từng PO
  const productionsWithPlan = productions.map((prod) => {
    const smv = Number(prod.smv) || 0;

    let plannedUnitsToday = 0;

    if (smv > 0 && workerTg > 0 && workHr > 0) {
      plannedUnitsToday = Math.floor((60 / smv) * workHr * workerTg * numEff);
    }

    return {
      ...prod,
      plannedUnitsToday,
    };
  });

  // WORK_START_MINUTES
  const WORK_START_MINUTES = timeToMinutes("07:30")
  const breakStartMinutes = timeToMinutes(workPlan.break_time_fr);
  const breakEndMinutes = timeToMinutes(workPlan.break_time_to);

  // Tính target cho từng PO trong từng slot
  const workingSlots = timeSlots.filter((slot) => !slot.isBreak);

  workingSlots.forEach((slot) => {
    const endMinutes = timeToMinutes(slot.endTime);

    // Số phút làm việc thực tế từ 07:30 đến endTime, Không tính thời gian break
    const workingMinutesFromStart = getWorkingMinutesFromStart(endMinutes, WORK_START_MINUTES, breakStartMinutes, breakEndMinutes);

    if (slot.poData) {
      Object.keys(slot.poData).forEach((poKey) => {
        const po = slot.poData[poKey];

        const production = productionsWithPlan.find((item) => item.orderNo === poKey);

        if (!production) {
          return;
        }

        const plannedUnitsToday = Number(production.plannedUnitsToday) || 0;

        // Target riêng cho từng PO
        const target = plannedUnitsToday > 0 && workHr > 0 ? workingMinutesFromStart * (plannedUnitsToday / (workHr * 60)) : 0;

        po.target = Math.floor(target * 100) / 100;
        po.balance = po.target - po.actual
        po.percent = po.target > 0 ? Math.floor((po.actual / po.target) * 10000) / 100 : 0;
      });
    }
  });

  // TÍNH SUMMARY CHO TỪNG PO
  const poSummaries = {};

  productionsWithPlan.forEach((prod) => {
    const poKey = prod.orderNo;

    let totalTarget = 0;
    let totalActual = 0;

    workingSlots.forEach((slot) => {
      if (slot.poData && slot.poData[poKey]) {
        totalTarget += slot.poData[poKey].target || 0;
        totalActual += slot.poData[poKey].actual || 0;
      }
    });

    const totalBalance = totalTarget - totalActual;
    const totalPercent = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

    poSummaries[poKey] = {
      orderNo: poKey,
      plannedUnitsToday: prod.plannedUnitsToday,
      totalTarget: Math.round(totalTarget * 100) / 100,
      totalActual: totalActual,
      totalBalance: Math.round(totalBalance * 100) / 100,
      totalPercent: Math.round(totalPercent * 100) / 100,
    };
  });

  // TÍNH SUMMARY TỔNG
  const totalPlannedUnitsToday = productionsWithPlan.reduce((sum, prod) => sum + prod.plannedUnitsToday, 0);

  const totalTargetAll =
    workingSlots.reduce((sum, slot) => {
      let slotTarget = 0;

      if (slot.poData) {
        Object.keys(slot.poData).forEach((poKey) => {
          slotTarget += slot.poData[poKey].target || 0;
        });
      }

      return sum + slotTarget;
    }, 0);

  const totalActualAll =
    workingSlots.reduce((sum, slot) => {
      let slotActual = 0;

      if (slot.poData) {
        Object.keys(slot.poData).forEach((poKey) => {
          slotActual += slot.poData[poKey].actual || 0;
        });
      }

      return sum + slotActual;
    }, 0);

  const totalBalanceAll = totalTargetAll - totalActualAll;
  const totalPercentAll = totalTargetAll > 0 ? (totalActualAll / totalTargetAll) * 100 : 0;

  return {
    productionsWithPlan,
    timeSlots,
    summary: {
      totalPlannedUnitsToday,
      totalTarget: Math.round(totalTargetAll * 100) / 100,
      totalActual: totalActualAll,
      totalBalance: Math.round(totalBalanceAll * 100) / 100,
      totalPercent: Math.round(totalPercentAll * 100) / 100,
      totalSlots: timeSlots.length,
      workingSlots: workingSlots.length,
      breakSlots: timeSlots.length - workingSlots.length,
      poSummaries,
    },
  };
}

/*
 * ============================================================
 * BUILD PRODUCTION GROUPS
 *
 * Chuyển:
 *
 * timeSlots -> poData
 * thành:
 * productionGroups -> rows
 *
 * Đây là structure dành cho UI.
 * ============================================================
*/
function buildProductionGroups(workPlan, productions, timeSlots) {
  if (!Array.isArray(productions)) {
    return [];
  }

  const groups = [];

  productions.forEach((production, index) => {
    const poKey = production.orderNo;

    // Lấy tất cả working slot của PO này
    const rows = [];

    timeSlots.forEach((slot) => {
      if (slot.isBreak) {
        return;
      }

      const po = slot.poData?.[poKey];

      if (!po) {
        return;
      }

      rows.push({
        slotNo: slot.slotNo,
        time: `${slot.startTime} - ${slot.endTime}`,
        targetQty: po.target,
        actualOutput: po.actual,
        balance: po.balance,
        percent: po.percent,
        // Delay Reason chưa có trong DB hiện tại
        // để frontend update sau
        delayReason: "",
        // Giữ lại registration nếu UI cần
        registrations: po.registrations || [],
      });
    });

    // Nếu vì lý do nào đó PO không có slot, vẫn tạo group
    if (rows.length === 0) {
      groups.push({
        stt: index + 1,
        brand: production.buyer || "",
        style: production.style || "",
        poNo: production.orderNo || "",
        smv: Number(production.smv) || 0,
        actualWorkers: Number(workPlan.worker_at) || 0,
        targetWorkers: Number(workPlan.worker_tg) || 0,
        plannedUnitsForToday: Number(production.plannedUnitsToday) || 0,
        rowSpan: 0,
        rows: [],
      });

      return;
    }

    groups.push({
      // STT của GROUP PO
      stt: index + 1,
      // CÁC FIELD CHUNG
      brand: production.buyer || "",
      style: production.style || "",
      poNo: production.orderNo || "",
      smv: Number(production.smv) || 0,
      actualWorkers: Number(workPlan.worker_at) || 0,
      targetWorkers: Number(workPlan.worker_tg) || 0,
      plannedUnitsForToday: Number(production.plannedUnitsToday) || 0,
      // Frontend có thể dùng trực tiếp cho rowspan
      rowSpan: rows.length,
      //CÁC FIELD THAY ĐỔI THEO TIME SLOT
      rows,
    });
  });

  return groups;
}


module.exports = {
  getEfficiencyData,
};
