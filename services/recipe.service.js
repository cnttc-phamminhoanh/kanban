const dashboardRepository = require("../repositories/dashboard.repository");

function calculateTargetNow(dailyTarget, workingHours) {
    if (workingHours <= 0) return 0;

    const startTime = new Date();
    startTime.setHours(7, 30, 0, 0);

    const elapsedMinutes = Math.max(0, (Date.now() - startTime.getTime()) / (1000 * 60));

    return Math.floor(elapsedMinutes * (dailyTarget / workingHours / 60));
}

// Tính kế hoạch theo từng dòng style + orderNo rồi gộp kết quả của cả flow.
async function recipeTarget(flow) {
    const [infoData, smvData, workerData, outputData] = await Promise.all([
        dashboardRepository.getFlowStyleInfo(flow),
        dashboardRepository.getFlowStyleSMV(flow),
        dashboardRepository.getWorkerQty(flow),
        dashboardRepository.getFlowStyleOutput(flow)
    ]);

    if (infoData.length === 0) {
        return {
            percent2: null,
            dailyTarget: 0,
            poCount: 0,
            total: 0
        };
    }

    // Mỗi dòng style + orderNo là một nhóm riêng, giống dữ liệu dashboard-v6.
    const keyOf = (item) => `${item.flow}|${item.style}|${item.orderNo}`;
    const smvMap = new Map(smvData.map((item) => [keyOf(item), item.smv]));
    const outputMap = new Map(outputData.map((item) => [keyOf(item), Number(item.output || 0)]));

    const workers = workerData.find((item) => item.igm_dept === flow) || workerData[0] || {};
    const totalWorkerTg = Number(workers.worker_tg || 0);
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

    // Giữ các mốc thời gian và cách tính phần trăm row 2 của công thức cũ.
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
        // Kế hoạch của dòng = min(ceil((60 / SMV) × giờ × công nhân được chia × hiệu suất), styleQty).
        const calculatedTarget = smv > 0
            ? Math.ceil((60 / smv) * work_hr * workerShare * num_eff)
            : 0;
        const poDailyTarget = Math.min(calculatedTarget, poStyleQty);
        dailyTarget += poDailyTarget;
        styleQty += outputQty;
        // styleQty += poStyleQty;

        // Tính phần trăm row 2 cho từng dòng trước khi lấy trung bình cộng của flow.
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

    // Kế hoạch và số lượng là tổng các dòng; phần trăm là trung bình cộng các dòng.
    const percent2 = `${Number((totalPercent2 / poCount).toFixed(2))}%`;
    return {
        percent2,
        dailyTarget,
        poCount,
        total: styleQty
    };
}

module.exports = { recipeTarget };
