const dashboardRepository = require("../repositories/dashboard.repository");

function timeToMinutes(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;

    return hours * 60 + minutes;
}

function calculateWorkedHours(now, startTime, workHours, breakFrom, breakTo) {
    if (workHours <= 0 || now <= startTime) return 0;

    const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
    const currentMinute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const startMinute = startTime.getHours() * 60 + startTime.getMinutes();
    const breakStart = timeToMinutes(breakFrom);
    const breakEnd = timeToMinutes(breakTo);
    let breakMinutes = 0;

    if (breakStart !== null && breakEnd !== null && breakEnd > breakStart) {
        breakMinutes = Math.max(
            0,
            Math.min(currentMinute, breakEnd) - Math.max(startMinute, breakStart)
        );
    }

    const workedMinutes = Math.max(0, elapsedMinutes - breakMinutes);
    return Math.min(workedMinutes / 60, workHours);
}

// Tính kế hoạch theo từng dòng style + orderNo rồi gộp kết quả của cả flow.
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
    // tính ngày từ ngày bắt đầu sản xuất (lấy PO gần nhất) đến hôm nay, dựa vào accQtyStartCompeleteData.
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
    // Tính số ngày từ startDate đến hôm nay, bỏ qua Chủ nhật
    let daysFromStart = null;

    if (latestStart) {
        let count = 1; // tính cả ngày startDate

        // Bắt đầu tính từ ngày sau startDate
        for (
            let day = latestStart.day + 86400000;
            day <= todayDay;
            day += 86400000
        ) {
            const currentDate = new Date(day);

            // getUTCDay() === 0 là Chủ nhật
            if (currentDate.getUTCDay() !== 0) {
                count++;
            }
        }

        daysFromStart = count;
    }

    // Mỗi dòng style + orderNo là một nhóm riêng, giống dữ liệu dashboard-v6.
    const keyOf = (item) => `${item.flow}|${item.style}|${item.orderNo}`;
    const smvMap = new Map(smvData.map((item) => [keyOf(item), item.smv]));
    const outputMap = new Map(outputData.map((item) => [keyOf(item), Number(item.output || 0)]));

    const workers = workerData.find((item) => item.igm_dept === flow) || workerData[0] || {};
    const totalWorkerTg = Number(workers.worker_tg || 0);
    const actualWorkers = Number(workers.worker_at || 0);
    const work_hr = Number(workers.work_hr || 0);
    const num_eff = Number(workers.num_eff || 0);

    // Chia nguyên công nhân theo số dòng; người dư ưu tiên dòng có sản lượng hôm nay cao hơn.
    const poCount = infoData.length;
    const baseShare = Math.floor(totalWorkerTg / poCount);
    const remainder = totalWorkerTg % poCount;
    const rankedPOs = [...infoData].sort((a, b) =>
        (outputMap.get(keyOf(b)) || 0) - (outputMap.get(keyOf(a)) || 0) ||
        String(a.orderNo).localeCompare(String(b.orderNo))
    );

    const startTime = new Date();
    startTime.setHours(7, 30, 0, 0);

    let dailyTarget = 0;
    let styleQty = 0;
    let totalStandardHours = 0;

    rankedPOs.forEach((po, index) => {
        const key = keyOf(po);
        const smv = Number(Number(smvMap.get(key) || 0).toFixed(2));
        const outputQty = outputMap.get(key) || 0;
        const poStyleQty = Number(po.styleQty || 0);
        const workerShare = baseShare + (index < remainder ? 1 : 0);
        // Kế hoạch của dòng = min(ceil((60 / SMV) × giờ × công nhân được chia × hiệu suất), styleQty).
        const calculatedTarget = smv > 0
            ? Math.ceil((60 / smv) * work_hr * workerShare * num_eff)
            : 0;
        const poDailyTarget = Math.min(calculatedTarget, poStyleQty);
        dailyTarget += poDailyTarget;
        styleQty += outputQty;

        // Giờ công tiêu chuẩn của PO = sản lượng thực tế × SMV / 60.
        if (smv > 0 && outputQty > 0) {
            totalStandardHours += (outputQty * smv) / 60;
        }
    });

    // Hiệu suất chuyền = tổng giờ công tiêu chuẩn / tổng giờ công thực tế.
    // Số giờ đã làm không bao gồm giờ nghỉ và không vượt quá tổng giờ của ca.
    const actualWorkedHours = calculateWorkedHours(
        new Date(),
        startTime,
        work_hr,
        workers.break_time_fr,
        workers.break_time_to
    );
    const totalActualLaborHours = actualWorkers * actualWorkedHours;
    const efficiency = totalActualLaborHours > 0
        ? (totalStandardHours / totalActualLaborHours) * 100
        : null;
    const percent2 = efficiency === null
        ? null
        : `${Number(efficiency.toFixed(2))}%`;
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
