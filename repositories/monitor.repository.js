const { getIgPool } = require("../config/database");
const { getBIPool, sql } = require("../config/sqlserver");

async function getMonitorData() {
  const pool = await getIgPool();

  const [rows] = await pool.execute(
    `
      select distinct flow
      from pytckreg p
      where
        RegDate = curdate()
        and flow like 'SEW%'
        and flow not like '%F9%'
        order by flow
    `,
  );

  return rows;
}

async function getMonitorDataByUser(user) {
  const igPool = await getIgPool();

  const [rows] = await igPool.execute(
    `
      SELECT DISTINCT flow
      FROM pytckreg
      WHERE
        RegDate = CURDATE()
        AND flow LIKE 'SEW%'
        AND flow NOT LIKE '%F9%'
      ORDER BY flow
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

  const allowedFlows = new Set(result.recordset.map((row) => row.flow));

  return rows.filter((row) => allowedFlows.has(row.flow));
}

module.exports = {
  getMonitorData,
  getMonitorDataByUser,
};
