const { getBIPool, sql } = require("../config/sqlserver");

async function findUserByUserNoAndPassword(userNo, password) {
  const pool = await getBIPool();

  const result = await pool
    .request()
    .input("userNo", sql.VarChar, userNo)
    .input("password", sql.VarChar, password)
    .query(
      `
        SELECT user_no    
        FROM kanban.dbo.kanban_user
        WHERE
          user_no = @userNo
          AND pass_word = @password
      `,
    );

  return result.recordset[0] || null;
}

async function findUserByUserNo(userNo) {
  const pool = await getBIPool();

  const result = await pool
    .request()
    .input("userNo", sql.VarChar, userNo)
    .query(
      `
        SELECT user_no    
        FROM kanban.dbo.kanban_user
        WHERE user_no = @userNo
      `,
    );

  return result.recordset[0] || null;
}

async function findFlowsByUserNo(userNo) {
  const pool = await getBIPool();

  const result = await pool
    .request()
    .input("userNo", sql.VarChar, userNo)
    .query(
      `
        SELECT flow    
        FROM kanban.dbo.kanban_flow
        WHERE user_no = @userNo
      `,
    );

  return result.recordset || null;
}

async function insertLoginLog(userNo) {
  const pool = await getBIPool();

  await pool
    .request()
    .input("userNo", sql.VarChar(20), userNo)
    .input("dashboardName", sql.VarChar(100), "Kanban")
    .query(
      `
        INSERT INTO kanban.dbo.kanban_login
        (
          user_no,
          dashboard_name,
          login_time
        )
        VALUES
        (
          @userNo,
          @dashboardName,
          GETDATE()
        )
      `
    );
}

module.exports = {
  findUserByUserNoAndPassword,
  findUserByUserNo,
  findFlowsByUserNo,
  insertLoginLog,
};
