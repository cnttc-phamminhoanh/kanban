const dashboardRepository = require("../repositories/dashboard.repository");

const experimentalFlows = new Set([
    "SEWING-GI-F1-01A",
    "SEWING-GI-F1-02A",
    "SEWING-GI-F1-03A",
    "SEWING-GI-F1-04A",
    "SEWING-GI-F1-05A",
    "SEWING-GI-F1-06A",
    "SEWING-GI-F1-07A",
    "SEWING-GI-F1-08A",
    "SEWING-GI-F1-09A"
]);
function calculateTargetNow(dailyTarget, workingHours) {
    if (workingHours <= 0) return 0;

    const startTime = new Date();
    startTime.setHours(7, 30, 0, 0);

    const elapsedMinutes = Math.max(
        0,
        (Date.now() - startTime.getTime()) / (1000 * 60)
    );

    return Math.floor(elapsedMinutes * (dailyTarget / workingHours / 60));
}

// Tính kế hoạch theo từng dòng style + orderNo rồi gộp kết quả của cả flow.
async function recipeTarget(flow) {
    if (experimentalFlows.has(flow)) {
        return recipeTargetExperimental(flow);
    }

    const [infoData, smvData, workerData, outputData, accQtyStartCompeleteData] = await Promise.all([
        dashboardRepository.getFlowStyleInfo(flow),
        dashboardRepository.getFlowStyleSMV(flow),
        dashboardRepository.getWorkerQty(flow),
        dashboardRepository.getFlowStyleOutput(flow),
        dashboardRepository.getFlowStyleAccQtyStartCompelete(flow)
    ]);

    if (infoData.length === 0) {
        return {
            percent2: null,
            dailyTarget: 0,
            poCount: 0,
            total: 0,
            startDate: null,
            daysFromStart: null
        };
    }

    const today = new Date();
    const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const latestStart = accQtyStartCompeleteData.reduce((latest, item) => {
        if (!item.startDate) return latest;
        const date = new Date(item.startDate);
        if (Number.isNaN(date.getTime())) return latest;

        const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
        if (day > todayDay || (latest && day <= latest.day)) return latest;
        return { startDate: item.startDate, day };
    }, null);

    // Tính cả ngày bắt đầu và bỏ qua các Chủ nhật sau đó.
    let daysFromStart = null;

    if (latestStart) {
        let count = 1;

        for (
            let day = latestStart.day + 86400000;
            day <= todayDay;
            day += 86400000
        ) {
            const currentDate = new Date(day);

            if (currentDate.getUTCDay() !== 0) {
                count++;
            }
        }

        daysFromStart = count;
    }

    const keyOf = (item) => `${item.flow}|${item.style}|${item.orderNo}`;
    const smvMap = new Map(smvData.map((item) => [keyOf(item), item.smv]));
    const outputMap = new Map(outputData.map((item) => [keyOf(item), Number(item.output || 0)]));

    const workers = workerData.find((item) => item.igm_dept === flow) || workerData[0] || {};
    const totalWorkerTg = Number(workers.worker_tg || 0);
    const work_hr = Number(workers.work_hr || 0);
    const num_eff = Number(workers.num_eff || 0);

    // Công nhân dư được ưu tiên cho dòng có sản lượng hôm nay cao hơn.
    const poCount = infoData.length;
    const baseShare = Math.floor(totalWorkerTg / poCount);
    const remainder = totalWorkerTg % poCount;
    const rankedPOs = [...infoData].sort((a, b) =>
        (outputMap.get(keyOf(b)) || 0) - (outputMap.get(keyOf(a)) || 0) ||
        String(a.orderNo).localeCompare(String(b.orderNo))
    );

    const now = new Date();
    const startTime = new Date();
    startTime.setHours(7, 30, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + work_hr + 1);

    let dailyTarget = 0;
    let styleQty = 0;
    let totalPercent2 = 0;

    rankedPOs.forEach((po, index) => {
        const key = keyOf(po);
        const smv = Number(Number(smvMap.get(key) || 0).toFixed(2));
        const outputQty = outputMap.get(key) || 0;
        const poStyleQty = Number(po.styleQty || 0);
        const workerShare = baseShare + (index < remainder ? 1 : 0);

        const calculatedTarget = smv > 0
            ? Math.ceil((60 / smv) * work_hr * workerShare * num_eff)
            : 0;
        const poDailyTarget = Math.min(calculatedTarget, poStyleQty);
        dailyTarget += poDailyTarget;
        styleQty += outputQty;

        let poPercent2 = 0;
        if (outputQty >= poDailyTarget) {
            poPercent2 = 100;
        } else if (now > endTime) {
            poPercent2 = poDailyTarget > 0
                ? Math.ceil((outputQty / poDailyTarget) * 100)
                : 0;
        } else if (now >= startTime) {
            const targetNow = calculateTargetNow(poDailyTarget, work_hr);
            poPercent2 = targetNow > 0
                ? Math.ceil((outputQty / targetNow) * 100)
                : 0;
        }
        totalPercent2 += poPercent2;
    });

    const percent2 = `${Number((totalPercent2 / poCount).toFixed(2))}%`;
    return {
        percent2,
        dailyTarget,
        poCount,
        total: styleQty,
        startDate: latestStart?.startDate ?? null,
        daysFromStart
    };
}

function timeToMinutes(value) {
    if (value === null || value === undefined) return null;

    const match = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;

    return hours * 60 + minutes;
}

// Chỉ hỗ trợ ca trong cùng ngày và một khoảng nghỉ trong cùng ngày.
function calculateWorkedHours(now, startTime, workHours, breakFrom, breakTo) {
    if (!Number.isFinite(workHours) || workHours <= 0 || now <= startTime) return 0;

    const elapsedMinutes = (now.getTime() - startTime.getTime()) / 60000;
    const startMinute = startTime.getHours() * 60 + startTime.getMinutes();
    const currentMinute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const breakStart = timeToMinutes(breakFrom);
    const breakEnd = timeToMinutes(breakTo);
    let breakMinutes = 0;

    if (breakStart !== null && breakEnd !== null && breakEnd > breakStart) {
        breakMinutes = Math.max(
            0,
            Math.min(currentMinute, breakEnd) - Math.max(startMinute, breakStart)
        );
    }

    return Math.min(Math.max(0, elapsedMinutes - breakMinutes) / 60, workHours);
}

// Công thức thử nghiệm dành riêng cho flow 1.
async function recipeTargetExperimental(flow) {
    const [infoData, smvData, workerData, outputData, accQtyStartCompeleteData] = await Promise.all([
        dashboardRepository.getFlowStyleInfo(flow),
        dashboardRepository.getFlowStyleSMV(flow),
        dashboardRepository.getWorkerQty(flow),
        dashboardRepository.getFlowStyleOutput(flow),
        dashboardRepository.getFlowStyleAccQtyStartCompelete(flow)
    ]);

    if (infoData.length === 0) {
        return {
            percent2: null,
            dailyTarget: 0,
            poCount: 0,
            total: 0,
            startDate: null,
            daysFromStart: null
        };
    }

    const now = new Date();
    const todayDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const latestStart = accQtyStartCompeleteData.reduce((latest, item) => {
        if (!item.startDate) return latest;
        const date = new Date(item.startDate);
        if (Number.isNaN(date.getTime())) return latest;

        const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
        if (day > todayDay || (latest && day <= latest.day)) return latest;
        return { startDate: item.startDate, day };
    }, null);

    let daysFromStart = null;
    if (latestStart) {
        let count = 1;

        for (let day = latestStart.day + 86400000; day <= todayDay; day += 86400000) {
            if (new Date(day).getUTCDay() !== 0) count++;
        }

        daysFromStart = count;
    }

    const keyOf = (item) => `${item.flow}|${item.style}|${item.orderNo}`;
    const smvMap = new Map(smvData.map((item) => [keyOf(item), Number(item.smv || 0)]));
    const outputMap = new Map(outputData.map((item) => [keyOf(item), Number(item.output || 0)]));

    const workers = workerData.find((item) => item.igm_dept === flow) || {};
    const totalWorkerTg = Number(workers.worker_tg || 0);
    const actualWorkers = Number(workers.worker_at || 0);
    const work_hr = Number(workers.work_hr || 0);
    const num_eff = Number(workers.num_eff || 0);

    const poCount = infoData.length;
    const baseShare = Math.floor(totalWorkerTg / poCount);
    const remainder = totalWorkerTg % poCount;
    const rankedPOs = [...infoData].sort((a, b) =>
        (outputMap.get(keyOf(b)) || 0) - (outputMap.get(keyOf(a)) || 0) ||
        String(a.orderNo).localeCompare(String(b.orderNo))
    );

    let dailyTarget = 0;
    let styleQty = 0;
    let totalStandardHours = 0;

    rankedPOs.forEach((po, index) => {
        const key = keyOf(po);
        const smv = smvMap.get(key) || 0;
        const outputQty = outputMap.get(key) || 0;
        const poStyleQty = Number(po.styleQty || 0);
        const workerShare = baseShare + (index < remainder ? 1 : 0);

        const calculatedTarget = smv > 0
            ? Math.ceil((60 / smv) * work_hr * workerShare * num_eff)
            : 0;
        const poDailyTarget = Math.min(calculatedTarget, poStyleQty);
        dailyTarget += poDailyTarget;
        styleQty += outputQty;

        if (Number.isFinite(smv) && smv > 0 && Number.isFinite(outputQty) && outputQty > 0) {
            totalStandardHours += (outputQty * smv) / 60;
        }
    });

    const startTime = new Date(now);
    startTime.setHours(7, 30, 0, 0);
    const actualWorkedHours = calculateWorkedHours(
        now,
        startTime,
        work_hr,
        workers.break_time_fr,
        workers.break_time_to
    );
    const totalActualLaborHours = actualWorkers * actualWorkedHours;
    const efficiency = Number.isFinite(totalActualLaborHours) && totalActualLaborHours > 0
        ? (totalStandardHours / totalActualLaborHours) * 100
        : null;
    const percent2 = efficiency !== null && Number.isFinite(efficiency)
        ? `${Number(efficiency.toFixed(2))}%`
        : null;

    return {
        percent2,
        dailyTarget,
        poCount,
        total: styleQty,
        startDate: latestStart?.startDate ?? null,
        daysFromStart
    };
}

module.exports = { recipeTarget };