const dashboardRepository = require("../repositories/dashboard.repository");

function timeToMinutes(value) {
    if (value === null || value === undefined) return null;

    const match = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;

    return hours * 60 + minutes;
}

function calculateWorkedHours(now, startTime) {
    if (now <= startTime) return 0;

    // Giới hạn thời gian tính hiệu suất trong ca 07:30 -> 16:30
    const shiftEnd = new Date(startTime);
    shiftEnd.setHours(16, 30, 0, 0);
    const effectiveNow = new Date(Math.min(now.getTime(), shiftEnd.getTime()));

    // Trừ phần giao giữa thời gian làm và giờ nghỉ trưa trong ca 11:00 -> 12:00
    const elapsedMinutes = (effectiveNow.getTime() - startTime.getTime()) / 60000;
    const lunchStart = new Date(startTime);
    lunchStart.setHours(11, 0, 0, 0);
    const lunchEnd = new Date(startTime);
    lunchEnd.setHours(12, 0, 0, 0);
    const breakMinutes = Math.max(
        0,
        (Math.min(effectiveNow.getTime(), lunchEnd.getTime()) - lunchStart.getTime()) / 60000
    );

    return Math.max(0, elapsedMinutes - breakMinutes) / 60;
}

async function recipeTarget(flow) {
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
    // Chia công nhân kế hoạch đều cho các PO; phần dư ưu tiên PO có output hôm nay cao hơn.
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

        // Target PO = min(ceil((60 / SMV) × giờ làm × công nhân được chia × hiệu suất kế hoạch), số lượng PO).
        const calculatedTarget = smv > 0
            ? Math.ceil((60 / smv) * work_hr * workerShare * num_eff)
            : 0;
        const poDailyTarget = Math.min(calculatedTarget, poStyleQty);
        dailyTarget += poDailyTarget;
        styleQty += outputQty;

        if (Number.isFinite(smv) && smv > 0 && Number.isFinite(outputQty) && outputQty > 0) {
            // Giờ công tiêu chuẩn đã làm = output × SMV / 60.
            totalStandardHours += (outputQty * smv) / 60;
        }
    });

    const startTime = new Date(now);
    startTime.setHours(7, 30, 0, 0);
    const actualWorkedHours = calculateWorkedHours(
        now,
        startTime,
        work_hr
    );
    // Giờ công thực tế = số công nhân thực tế × số giờ đã làm tính từ 07:30.
    const totalActualLaborHours = actualWorkers * actualWorkedHours;
    // Hiệu suất (%) = tổng giờ công tiêu chuẩn / tổng giờ công thực tế × 100.
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