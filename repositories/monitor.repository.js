const pool = require("../config/database");
const { getPool, sql } = require("../config/sqlserver")

async function getMonitorData() {
  const [rows] = await pool.execute(`
    select distinct flow
    from pytckreg p
    where
      RegDate = curdate()
      and flow like 'SEW%'
      and flow not like '%F9%'
      order by flow
  `);

  return rows;
}

async function getFlowStyleInfo(flow) {
  const [rows] = await pool.execute(
    `select flow, o.style, o.buyer, o.orderNo, sum(o.qty) as styleQty, 0 as targetQty, 0 as targetNow
    from (select distinct wrkOrder, flow from pyregsum where StepNo between '302' and '450' and RegDate = curdate()) t 
    inner join pywrkord o on o.wrkOrder = t.wrkOrder
    where flow = ?
    group by flow, o.style, o.orderNo`,
    [flow]
  );

  return rows;
}

async function getFlowStyleSMV(flow) {
  const [rows] = await pool.execute(
    `select flow, style, orderNo, sum(smv) as smv
    from (
      select flow, style, orderNo, avg(smv) as smv
      from (
        select t.flow, o.style, o.orderNo, t.WrkOrder, sum(ifnull(ifnull(a.StepTime, 0), s.StepTime)) as smv
        from (
          select distinct WrkOrder, flow from pyregsum where StepNo between '302' and '450' and RegDate = curdate()
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
          select distinct wrkOrder, flow from pyregsum where stepNo between '302' and '450' and regDate = curdate()
        ) t 
        inner join pywrkstp s on t.wrkOrder = s.wrkOrder 
        left join pystpasm a on a.wrkOrder = t.wrkOrder and a.stepNo = s.stepNo
        inner join pywrkord o on s.wrkOrder = o.wrkorder
        where s.process LIKE 'SEW%' and a.wrkOrder is null and t.flow = ?
        group by t.flow, o.style, o.orderNo, t.wrkOrder, a.sizx
      ) x 
      group by flow, style, orderNo
    ) x
    group by flow, style, orderNo;`,
    [flow, flow]
  );

  return rows;
}

async function getFlowStyleAccQtyStartCompelete(flow) {
  const [rows] = await pool.execute(
    `select r.flow, o.style, o.orderNo, min(regDate) as startDate, max(regDate) as completeDate, sum(r.Qty) as accQty
    from (
      select distinct wrkOrder,flow from pyregsum where StepNo between '302' and '450' and RegDate = curdate()
    ) t
    inner join pyregsum r on t.wrkOrder = r.wrkOrder 
    inner join pywrkord o on o.wrkOrder = t.wrkOrder
    where r.StepNo = 450 and r.flow = ?
    group by r.flow, o.style, o.orderNo`,
    [flow]
  );

  return rows;
}

async function getFlowStyleOutput(flow) {
  const [rows] = await pool.execute(
    `select r.regDate, r.flow, o.style, o.orderNo, sum(r.Qty) as output
    from pyregsum r
    inner join (
      select distinct wrkOrder, flow from pyregsum where stepNo between '302' and '450' and RegDate = curdate()
    ) t on r.wrkOrder = t.wrkOrder and r.regDate = curdate() and t.flow = r.flow
    inner join pywrkord o on r.wrkOrder = o.wrkOrder 
    where r.stepNo = 450 and r.flow = ?
    group by r.regDate, r.flow, o.style, o.orderNo`,
    [flow]
  );

  return rows;
}

async function getDefects(flow) {
  const [rows] = await pool.execute(
    `select t.flow, o.style, o.orderNo, c.description as description, sum(w.qty) as reWorkQty
    from pyrework w
    inner join pywrkord o on o.wrkOrder = w.wrkOrder 
    inner join (
      select distinct WrkOrder, Flow from pyregsum where StepNo between '302' and '450' and RegDate = curdate()
    ) t on t.wrkOrder = w.wrkOrder 
    inner join pyrereason r on r.wrkOrder = w.wrkOrder and r.seqNo = w.seqNo and r.bundleNo = w.bundleNo 
    inner join pycode c on c.code = r.reasonCode and c.CType = 'REWORKREASON'
    where w.rewDate= curdate() and t.flow = ?
    group by o.style, o.orderNo, concat(r.ReasonCode, c.description), t.flow`,
    [flow]
  );

  return rows;
}

async function getWorkerQty(flow) {
  const pool = await getPool()

  const result = await pool
    .request()
    .input("flow", sql.VarChar, flow)
    .query(`
      select *
      from kanban_plan
      where igm_dept = @flow
    `);

  return result.recordset;
}

module.exports = {
  getMonitorData,
  getFlowStyleInfo,
  getFlowStyleSMV,
  getFlowStyleAccQtyStartCompelete,
  getFlowStyleOutput,
  getDefects,
  getWorkerQty,
};
