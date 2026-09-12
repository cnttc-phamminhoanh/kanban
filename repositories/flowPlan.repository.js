const { getBIPool, getT8Pool, sql } = require("../config/sqlserver");

async function getFlowPlanByUser(user) {
  const pool = await getT8Pool();

  const { recordset: rows } = await pool.request().query(
    `
      select igm_dept, worker_at, work_hr, break_time_fr, break_time_to
      from kanban_plan
    `,
  );

  const biPool = await getBIPool();

  const result = await biPool
    .request()
    .input("userNo", sql.VarChar, user.id)
    .query(
      `
        SELECT flow
        FROM kanban.dbo.kanban_flow
        WHERE user_no = @userNo
      `,
    );

  const allowedFlowPlans = new Set(result.recordset.map((row) => row.flow));

  return rows.filter((row) => allowedFlowPlans.has(row.igm_dept));
}

async function updateFlowPlan(data) {
  const pool = await getT8Pool();

  const result = await pool
    .request()
    .input("igm_dept", sql.VarChar, data.igm_dept)
    .input("worker_at", sql.Int, data.worker_at)
    .input("break_time_fr", sql.VarChar, data.break_time_fr)
    .input("break_time_to", sql.VarChar, data.break_time_to).query(`
      UPDATE kanban_plan
      SET
        worker_at = @worker_at,
        break_time_fr = @break_time_fr,
        break_time_to = @break_time_to
      WHERE igm_dept = @igm_dept
    `);

  if (result.rowsAffected[0] === 0) {
    throw new Error(`Flow '${data.igm_dept}' not found`);
  }

  return result.rowsAffected[0];
}

module.exports = {
  getFlowPlanByUser,
  updateFlowPlan,
}
