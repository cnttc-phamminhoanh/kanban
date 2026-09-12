const { getIgPool } = require("../config/database");
const { getT8Pool, sql } = require("../config/sqlserver");

async function getWorkPlan(flow) {
  const pool = await getT8Pool();

  const result = await pool
    .request()
    .input("flow", sql.VarChar, flow)
    .query(
      `
        SELECT
          igm_dept, num_eff, worker_tg, worker_at, work_hr,
          ppc_user, prod_user, break_time_fr, break_time_to
        FROM kanban_plan
        WHERE igm_dept = @flow
      `,
    );

  return result.recordset;
}

async function getProductions(flow, date) {
  const pool = await getIgPool();

  const [rows] = await pool.execute(
    `
      SELECT t.flow, o.wrkOrder, o.style, o.buyer, o.orderNo
      FROM (
        SELECT DISTINCT WrkOrder, flow
        FROM pyregsum
        WHERE StepNo = 450 AND RegDate = ? AND flow = ?
      ) t
      INNER JOIN pywrkord o ON o.wrkOrder = t.WrkOrder
      WHERE t.flow = ?
      GROUP BY t.flow, o.WrkOrder, o.style, o.orderNo, o.buyer
    `,
    [date, flow, flow],
  );

  return rows;
}

async function getProductionSummary(flow, date) {
  const pool = await getIgPool();

  const [rows] = await pool.execute(
    `
      SELECT WrkOrder, Flow, Sizx, SUM(Qty) AS qty
      FROM pyregsum
      WHERE Flow = ? AND RegDate = ? AND StepNo = 450
      GROUP BY WrkOrder, Flow, Sizx
    `,
    [flow, date],
  );

  return rows;
}

async function getActualRegistrations(wrkOrders, date) {
  if (!Array.isArray(wrkOrders) || wrkOrders.length === 0) {
    return [];
  }

  const pool = await getIgPool();

  const placeholders = wrkOrders.map(() => "?").join(", ");

  const startDate = `${date} 00:00:00`;

  const endDateObj = new Date(`${date}T00:00:00`);
  endDateObj.setDate(endDateObj.getDate() + 1);

  const yyyy = endDateObj.getFullYear();
  const mm = String(endDateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(endDateObj.getDate()).padStart(2, "0");

  const endDate = `${yyyy}-${mm}-${dd} 00:00:00`;

  console.log({
    startDate,
    endDate,
    wrkOrderCount: wrkOrders.length,
    wrkOrders,
  });

  const [rows] = await pool.execute(
    `
      SELECT
        p.TicketNo, p.WrkOrder, p.Qty,
        DATE_FORMAT(RegDate, '%Y-%m-%d %H:%i:%s') AS RegDate,
        DATE_FORMAT(RegTime, '%H:%i:%s') AS RegTime,
        p.Flow
      FROM pytckreg p
      WHERE
        p.WrkOrder IN (${placeholders})
        AND p.StepNo = 450
        AND p.RegDate >= ?
        AND p.RegDate < ?
    `,
    [...wrkOrders, startDate, endDate],
  );

  return rows;
}

async function getSmv(flow, date) {
  const pool = await getIgPool();

  const [rows] = await pool.execute(
    `
      SELECT flow, style, orderNo, SUM(smv) AS smv
      FROM (
        SELECT flow, style, orderNo, AVG(smv) AS smv
        FROM (
          SELECT t.flow, o.style, o.orderNo, t.WrkOrder, SUM(IFNULL(IFNULL(a.StepTime, 0), s.StepTime)) AS smv
          FROM (
            SELECT DISTINCT WrkOrder, flow FROM pyregsum WHERE StepNo = '450' AND RegDate = ?
          ) t
          INNER JOIN pywrkstp s ON t.WrkOrder = s.WrkOrder
          LEFT JOIN pystpasm a ON a.WrkOrder = t.WrkOrder AND a.StepNo = s.StepNo
          INNER JOIN pywrkord o ON s.WrkOrder = o.WrkOrder
          WHERE s.process LIKE 'SEW%' AND s.stepNo <> 301 AND a.wrkOrder IS NOT NULL AND t.flow = ?
          GROUP BY t.flow, o.style, o.orderNo, t.WrkOrder, a.sizx
        ) x
        GROUP BY flow, style, orderNo

        UNION ALL

        SELECT flow, style, orderNo, AVG(smv) AS smv
        FROM (
          SELECT t.flow, o.style, o.orderNo, t.WrkOrder, SUM(IFNULL(a.stepTime, s.stepTime)) AS smv
          FROM (
            SELECT DISTINCT WrkOrder, flow FROM pyregsum WHERE StepNo = '450' AND RegDate = ?
          ) t
          INNER JOIN pywrkstp s ON t.WrkOrder = s.WrkOrder
          LEFT JOIN pystpasm a ON a.WrkOrder = t.WrkOrder AND a.stepNo = s.stepNo
          INNER JOIN pywrkord o ON s.WrkOrder = o.WrkOrder
          WHERE s.process LIKE 'SEW%' AND a.wrkOrder IS NULL AND t.flow = ?
          GROUP BY t.flow, o.style, o.orderNo, t.WrkOrder, a.sizx
        ) x
        GROUP BY flow, style, orderNo
      ) x
      GROUP BY flow, style, orderNo
      ORDER BY style, orderNo
    `,
    [date, flow, date, flow],
  );

  return rows;
}

module.exports = {
  getWorkPlan,
  getProductions,
  getProductionSummary,
  getActualRegistrations,
  getSmv,
};
