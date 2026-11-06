const { getIgPool } = require("../config/database");
const { getT8Pool, sql } = require("../config/sqlserver");

async function getFlowStyleInfo(flow) {
  const pool = await getIgPool();

  const [rows] = await pool.execute(
    `
      select flow, o.style, o.buyer, o.orderNo, sum(o.qty) as styleQty, 0 as targetQty, 0 as targetNow
      from (
        select distinct WrkOrder, flow from pyregsum where StepNo in ('450', '700') and RegDate = curdate()
      ) t 
      inner join pywrkord o on o.wrkOrder = t.wrkOrder
      where flow = ?
      group by flow, o.style, o.orderNo
    `,
    [flow],
  );

  return rows;
}

async function getFlowStyleSMV(flow) {
  const pool = await getIgPool();

  const [rows] = await pool.execute(
    `
      select flow, style, orderNo, sum(smv) as smv
      from (
        select flow, style, orderNo, avg(smv) as smv
        from (
          select t.flow, o.style, o.orderNo, t.WrkOrder, sum(ifnull(ifnull(a.StepTime, 0), s.StepTime)) as smv
          from (
            select distinct WrkOrder, flow from pyregsum WHERE StepNo in ('450', '700') and RegDate = curdate()
          ) t 
          inner join pywrkstp s on t.wrkOrder = s.wrkOrder 
          left join pystpasm a on a.wrkOrder = t.wrkOrder and a.stepNo = s.stepNo
          inner join pywrkord o on s.wrkOrder = o.wrkorder
          where s.process LIKE 'SEW%' and s.stepNo <> 301 and a.wrkOrder is not null and t.flow = ?
          group by t.flow, o.style, o.orderNo, t.wrkOrder, a.sizx
        ) x  
        group by flow, style, orderNo

        UNION ALL

        select flow, style, orderNo, avg(smv) as smv
        from (
          select t.flow, style, orderNo, t.wrkOrder, sum(ifnull(a.stepTime, s.stepTime)) as smv
          from (
            select distinct wrkOrder, flow from pyregsum where stepNo in ('450', '700') and regDate = curdate()
          ) t 
          inner join pywrkstp s on t.wrkOrder = s.wrkOrder 
          left join pystpasm a on a.wrkOrder = t.wrkOrder and a.stepNo = s.stepNo
          inner join pywrkord o on s.wrkOrder = o.wrkorder
          where s.process LIKE 'SEW%' and a.wrkOrder is null and t.flow = ?
          group by t.flow, o.style, o.orderNo, t.wrkOrder, a.sizx
        ) x 
        group by flow, style, orderNo
      ) x
      group by flow, style, orderNo;
    `,
    [flow, flow],
  );

  return rows;
}

async function getFlowStyleAccQtyStartCompelete(flow) {
  const pool = await getIgPool();

  const [rows] = await pool.execute(
    `
      SELECT
          x.flow,
          x.style,
          x.orderNo,
          MIN(x.startDate) AS startDate,
          MAX(x.completeDate) AS completeDate,
          SUM(x.accQty) AS accQty
      FROM (
          SELECT
              t.flow,
              o.style,
              o.orderNo,
              MIN(r.regDate) AS startDate,
              MAX(r.regDate) AS completeDate,
              SUM(r.Qty) AS accQty
          FROM (
              SELECT DISTINCT wrkOrder, flow
              FROM pyregsum
              WHERE StepNo = '450'
                AND RegDate = CURDATE()
                AND flow = ?
          ) t
          INNER JOIN pyregsum r
              ON t.wrkOrder = r.wrkOrder
          INNER JOIN pywrkord o
              ON o.wrkOrder = t.wrkOrder
          WHERE r.StepNo = '450'
          GROUP BY t.flow, o.style, o.orderNo

          UNION ALL

          SELECT
              t.flow,
              o.style,
              o.orderNo,
              MIN(r.regDate) AS startDate,
              MAX(r.regDate) AS completeDate,
              SUM(r.Qty) AS accQty
          FROM (
              SELECT DISTINCT wrkOrder, flow
              FROM pyregsum
              WHERE StepNo = '700'
                AND RegDate = CURDATE()
                AND flow = ?
          ) t
          INNER JOIN pyregsum r
              ON t.wrkOrder = r.wrkOrder
          INNER JOIN pywrkord o
              ON o.wrkOrder = t.wrkOrder
          WHERE r.StepNo = '700'
          GROUP BY t.flow, o.style, o.orderNo
      ) x
      GROUP BY x.flow, x.style, x.orderNo;
    `,
    [flow, flow],
  );

  return rows;
}

async function getFlowStyleOutput(flow) {
  const pool = await getIgPool();

  // const [rows] = await pool.execute(
  //   `
  //     select r.regDate, r.flow, o.style, o.orderNo, sum(r.Qty) as output
  //     from pyregsum r
  //     inner join (
  //       select distinct wrkOrder,flow from pyregsum where StepNo = '450' and RegDate = curdate()
  //     ) t on r.wrkOrder = t.wrkOrder and r.regDate = curdate() and t.flow = r.flow
  //     inner join pywrkord o on r.wrkOrder = o.wrkOrder 
  //     where r.stepNo = 450 and r.flow = ?
  //     group by r.regDate, r.flow, o.style, o.orderNo
  //   `,
  //   [flow],
  // );

  const [rows] = await pool.execute(
    `
      SELECT r.regDate, r.flow, o.style, o.orderNo, SUM(r.Qty) AS output
      FROM pyregsum r
      INNER JOIN pywrkord o ON r.wrkOrder = o.wrkOrder
      WHERE r.stepNo in ('450', '700')
      AND r.regDate = CURDATE()
      AND r.flow = ?
      GROUP BY r.regDate, r.flow, o.style, o.orderNo;
    `,
    [flow],
  );

  return rows;
}

async function getDefects(flow) {
  const pool = await getIgPool();

  const [rows] = await pool.execute(
    `
      select t.flow, o.style, o.orderNo, c.description as description, sum(w.qty) as reWorkQty
      from pyrework w
      inner join pywrkord o on o.wrkOrder = w.wrkOrder 
      inner join (
        select distinct wrkOrder,flow from pyregsum where StepNo in ('450','700') and RegDate = curdate()
      ) t on t.wrkOrder = w.wrkOrder and w.Flow = t.Flow
      inner join pyrereason r on r.wrkOrder = w.wrkOrder and r.seqNo = w.seqNo and r.bundleNo = w.bundleNo 
      inner join pycode c on c.code = r.reasonCode and c.CType = 'REWORKREASON'
      where w.rewDate= curdate() and t.flow = ?
      group by o.style, o.orderNo, concat(r.ReasonCode, c.description), t.flow
    `,
    [flow],
  );

  return rows;
}

async function getWorkerQty(flow) {
  const pool = await getT8Pool();

  const result = await pool
    .request()
    .input("flow", sql.VarChar, flow)
    .query(
      `
        select *
        from kanban_plan
        where igm_dept = @flow
      `,
    );

  return result.recordset;
}

async function getFlowPlan() {
  const pool = await getT8Pool();

  const result = await pool.request().query(
    `
      select igm_dept, worker_at, work_hr, break_time_fr, break_time_to
      from kanban_plan
    `,
  );

  return result.recordset;
}

module.exports = {
  getFlowStyleInfo,
  getFlowStyleSMV,
  getFlowStyleAccQtyStartCompelete,
  getFlowStyleOutput,
  getDefects,
  getWorkerQty,
  getFlowPlan,
}
