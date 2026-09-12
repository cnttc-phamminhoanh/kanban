const { getIgPool } = require("../config/database");

async function getFlowSemiFGoods(flow) {
  const pool = await getIgPool();

  const [rows] = await pool.execute(
    `
      select
        x.ExtField10 as CustStyle, x.style, concat(x.ExtField01, concat(' - ', right(x.style, 1))) as ProType, x.OrderNo, x.sizx, x.OutPut, 
        ifnull(sum(r.Qty), 0) as outputOtherSMFGs, concat(o.ExtField01, concat(' - ', right(o.style, 1))) typeOtherSMFGs, SizxQty
      from (
        select x.style, x.OrderNo, x.extfield10, x.sizx, sum(x.output) as output, sum(SizxQty) as SizxQty, x.ExtField01
        from (
          select x.extfield10, x.style, x.OrderNo, x.sizx, x.output as Output, sum(Qty) as SizxQty, x.ExtField01 
          from (
            select o.ExtField10, o.style, o.orderNo, r.Sizx, o.WrkOrder, sum(r.Qty) as output, o.ExtField01 
            from pywrkord o 
            left join pyregsum r on o.WrkOrder = r.WrkOrder and r.StepNo = 450
            where o.WrkOrder in (
              select distinct WrkOrder from pyregsum 
              where RegDate = curdate() and flow = ?
            )
            group by o.ExtField10, o.style, o.OrderNo, o.WrkOrder, r.Sizx, ExtField01 
          ) x
          inner join pybundle b on x.WrkOrder = b.Wrkorder and x.sizx = b.sizx 
          group by x.extfield10, x.style, x.OrderNo, x.sizx, x.output
        ) x
        group by x.style, x.OrderNo, x.extfield10, x.sizx, x.ExtField01
      ) x
      left join pywrkord o on o.ExtField10 = x.extfield10 and o.OrderNo = x.OrderNo and o.ExtField10 <> o.style  and o.style <> x.style
      left join pyregsum r on o.WrkOrder = r.WrkOrder and r.sizx = x.sizx and r.stepNo in (450, 480, 100)
      group by x.extfield10, x.style, x.OrderNo, x.Sizx, x.output, x.sizxqty, o.style, x.ExtField01 
    `,
    [flow],
  );

  return rows;
}

module.exports = {
  getFlowSemiFGoods,
}
