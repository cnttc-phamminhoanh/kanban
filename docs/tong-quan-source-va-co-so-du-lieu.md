# Tổng quan source code và cơ sở dữ liệu Kanban

Tài liệu này được lập bằng cách đọc source code hiện có. Tên file, hàm, route, database, table và field được giữ nguyên để tiện tra cứu. Repository không có file DDL/migration hay tài liệu schema, vì vậy danh sách field bên dưới **chỉ gồm những field xuất hiện trong truy vấn**, không phải định nghĩa đầy đủ của bảng. Chưa đối chiếu với database đang chạy.

## 1. Cấu trúc cơ bản

Ứng dụng là Node.js CommonJS, dùng Express 5 để cung cấp API và các trang HTML/JS/CSS tĩnh. Điểm khởi động là `server.js` (`npm start`), khi phát triển là `npm run dev` (`nodemon server.js`). `server.js` nạp biến môi trường, khởi tạo cả ba pool database, rồi mới mở HTTP server. Nếu một kết nối SQL Server không thành công, tiến trình thoát. Cấu hình PM2 nằm ở `ecosystem.config.js`; workflow deploy nằm ở `.github/workflows/deploy.yml`.

```text
server.js                         Khởi động, đăng ký API, phục vụ public/
config/database.js                Pool MySQL IG
config/sqlserver.js               Hai pool SQL Server T8 và BI
routes/                           Khai báo endpoint và middleware
controllers/                      Đọc request, gọi service, trả JSON
services/                         Điều phối repository, xử lý nghiệp vụ
repositories/                     Truy vấn database
middleware/                       Xác thực JWT và kiểm tra quyền flow
public/ui/                        Các trang và script giao diện thường
public/ui_require_login/          Các trang và script giao diện đăng nhập
public/common/                    Script/CSS dùng chung, gồm auth.js
```

Luồng dữ liệu thường là `HTML/JS → route → middleware (nếu có) → controller → service → repository → database → JSON → giao diện`. `monitor.service.js` chủ yếu chuyển tiếp lời gọi repository; `efficiency.service.js` còn tính khung giờ, sản lượng mục tiêu, sản lượng thực tế và nhóm dữ liệu theo PO.

`server.js` phục vụ toàn bộ `public/` qua `express.static`. Route trang gồm `/` (monitor), `/production`, `/pms/monitor/flowDashboard/:flow` cùng các phiên bản `v2`–`v6`, `/pms/monitor/semiFGoods/:flow`, `/pms/monitor/flowEfficiency`, `/pms/monitor/flowPlan`, và các route tương ứng bắt đầu bằng `/login/` cho giao diện `ui_require_login`. Các route trả HTML; dữ liệu được lấy qua API riêng. Không có middleware JWT gắn trực tiếp lên những route HTML trong `server.js`; các script thuộc `ui_require_login` dùng `public/common/js/auth.js` để quản lý token và gọi API bằng `authFetch` ở những nơi có áp dụng.

## 2. Kết nối và phân chia database

| Kết nối | Hệ quản trị, cấu hình | Pool được gọi ở repository | Vai trò trong source |
| --- | --- | --- | --- |
| `IG` | MySQL, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` trong `config/database.js` | `getIgPool()` | Dữ liệu đăng ký sản xuất, lệnh sản xuất, công đoạn, bán thành phẩm và lỗi |
| `T8` | SQL Server, `MSSQL_HOST`, `MSSQL_USER`, `MSSQL_PASSWORD`, `MSSQL_DB` trong `config/sqlserver.js` | `getT8Pool()` | Kế hoạch chuyền và số công nhân (`kanban_plan`) |
| `BI` | SQL Server, `BI_MSSQL_HOST`, `BI_MSSQL_USER`, `BI_MSSQL_PASSWORD`, `BI_MSSQL_DB` trong `config/sqlserver.js` | `getBIPool()` | Người dùng, quyền truy cập flow, nhật ký đăng nhập (`kanban.dbo.*`) |

`PORT` mặc định là `3000`; `ecosystem.config.js` đặt `PORT=4001` khi chạy PM2. JWT dùng `JWT_SECRET` và `JWT_EXPIRES_IN` (mặc định `1h`). Các tên biến ở đây là tên cấu hình, không phải giá trị credential.

Truy vấn MySQL dùng `mysql2/promise`, dấu `?` và `pool.execute()`. Truy vấn SQL Server dùng `mssql`, `request().input(...)` và tham số `@...`. Những chức năng cần dữ liệu từ hai hệ, như danh sách flow theo user hoặc màn hình dashboard, ghép kết quả trong JavaScript; source không thực hiện SQL join trực tiếp giữa MySQL và SQL Server.

## 3. Các bảng MySQL (`IG`)

Tất cả tên bảng trong phần này xuất hiện trong truy vấn chạy qua `getIgPool()`. Quan hệ dưới đây là quan hệ suy ra từ điều kiện `JOIN`/`WHERE` trong source, chưa xác nhận khóa ngoại trong schema.

| Bảng | Field được source sử dụng | Vai trò và nơi đọc |
| --- | --- | --- |
| `pytckreg` | `TicketNo`, `WrkOrder`, `Qty`, `RegDate`, `RegTime`, `Flow`, `StepNo` | Lần đăng ký sản lượng theo ticket/thời điểm; lấy flow có hoạt động hôm nay và số lượng thực tế theo khung giờ. `monitor.repository.js`, `efficiency.repository.js` |
| `pyregsum` | `WrkOrder`, `flow`/`Flow`, `StepNo`, `RegDate`, `Qty`, `Sizx` | Tổng hợp đăng ký sản lượng; xác định lệnh đang chạy tại công đoạn `450`, sản lượng ngày, sản lượng lũy kế và dữ liệu bán thành phẩm. `dashboard.repository.js`, `efficiency.repository.js`, `semiFGoods.repository.js` |
| `pywrkord` | `WrkOrder`, `style`, `buyer`, `OrderNo`, `qty`, `ExtField10`, `ExtField01` | Thông tin lệnh sản xuất, style, buyer, PO và thuộc tính phục vụ bán thành phẩm; thường nối qua `WrkOrder`. `dashboard.repository.js`, `efficiency.repository.js`, `semiFGoods.repository.js` |
| `pywrkstp` | `WrkOrder`, `StepNo`, `StepTime`, `process` | Công đoạn và thời gian chuẩn để tính `SMV`. `dashboard.repository.js`, `efficiency.repository.js` |
| `pystpasm` | `WrkOrder`, `StepNo`, `StepTime`, `sizx` | Thời gian công đoạn theo assembly/size nếu có; nối với `pywrkstp` qua `WrkOrder` và `StepNo`. `dashboard.repository.js`, `efficiency.repository.js` |
| `pyrework` | `WrkOrder`, `seqNo`, `bundleNo`, `Flow`, `rewDate`, `qty` | Số lượng rework/lỗi theo chuyền và ngày. `dashboard.repository.js` |
| `pyrereason` | `WrkOrder`, `seqNo`, `bundleNo`, `reasonCode` | Mã nguyên nhân rework, nối với `pyrework`. `dashboard.repository.js` |
| `pycode` | `code`, `CType`, `description` | Mô tả nguyên nhân; truy vấn lọc `CType = 'REWORKREASON'`. `dashboard.repository.js` |
| `pybundle` | `WrkOrder`, `sizx`, `Qty` | Số lượng bundle theo lệnh và size cho bán thành phẩm. `semiFGoods.repository.js` |

Các liên kết truy vấn chính: `pyregsum.WrkOrder ↔ pywrkord.WrkOrder`; `pywrkstp.WrkOrder ↔ pywrkord.WrkOrder`; `pystpasm.(WrkOrder, StepNo) ↔ pywrkstp.(WrkOrder, StepNo)`; `pyrework.(WrkOrder, seqNo, bundleNo) ↔ pyrereason` cùng bộ field; `pyrereason.reasonCode ↔ pycode.code` với `CType = 'REWORKREASON'`; `pybundle.(WrkOrder, sizx)` nối với dữ liệu lệnh/size trong truy vấn bán thành phẩm. `StepNo = 450` là điều kiện lặp lại ở các truy vấn sản lượng may; `semiFGoods.repository.js` còn dùng `450`, `480`, `100`. Ý nghĩa nghiệp vụ chính thức của các mã bước cần kiểm tra với người quản lý dữ liệu.

## 4. Các bảng SQL Server: tách theo pool

### T8 (`getT8Pool()`)

| Bảng | Field được source sử dụng | Thao tác và nơi dùng |
| --- | --- | --- |
| `kanban_plan` | `igm_dept`, `num_eff`, `worker_tg`, `worker_at`, `work_hr`, `ppc_user`, `prod_user`, `break_time_fr`, `break_time_to` | `SELECT` kế hoạch/chỉ tiêu theo flow cho dashboard, hiệu suất, màn hình plan; `UPDATE` `worker_at`, `break_time_fr`, `break_time_to` theo `igm_dept` trong `flowPlan.repository.js`. Cũng được đọc tại `dashboard.repository.js` và `efficiency.repository.js` |

Các truy vấn T8 dùng tên `kanban_plan` không có schema/database prefix, nên bảng được giải quyết theo `MSSQL_DB` và default schema của tài khoản kết nối. `igm_dept` là mã chuyền dùng để ghép với `flow` lấy từ MySQL/BI trong JavaScript.

### BI (`getBIPool()`)

| Bảng | Field được source sử dụng | Thao tác và nơi dùng |
| --- | --- | --- |
| `kanban.dbo.kanban_user` | `user_no`, `pass_word` | Tra user để đăng nhập và xác nhận `/api/auth/me`. `auth.repository.js` |
| `kanban.dbo.kanban_flow` | `user_no`, `flow` | Danh sách flow được cấp cho user; dùng ở xác thực quyền, lọc monitor và plan. `auth.repository.js`, `monitor.repository.js`, `flowPlan.repository.js` |
| `kanban.dbo.kanban_login` | `user_no`, `dashboard_name`, `login_time` | `INSERT` một bản ghi khi đăng nhập thành công; `dashboard_name` được đặt là `Kanban`, thời điểm dùng `GETDATE()`. `auth.repository.js` |

Các bảng BI được ghi rõ `kanban.dbo.*` trong truy vấn. `BI_MSSQL_DB` là cấu hình database của pool; tên được truy vấn thực tế là `kanban` theo cú pháp ba phần trong source.

## 5. API và đường đi của dữ liệu

Prefix API được gắn trong `server.js`. Tên `private` trong URL **không phản ánh middleware đang áp dụng**: `/api/monitor/private` được khai báo ở `routes/monitorPrivate.route.js` và không gắn `authMiddleware`; `/api/monitor` được khai báo ở `routes/monitor.routes.js` và mỗi route có `authMiddleware` (hai route xem dữ liệu theo flow còn có `flowAccessMiddleware`). Đây là mô tả hiện trạng để tránh nhầm khi chỉnh sửa.

| Endpoint | Dữ liệu/xử lý chính | Nơi đọc/ghi |
| --- | --- | --- |
| `POST /api/auth/login` | Kiểm tra `username`, `password`; ghi login log; trả JWT | BI: `kanban_user`, `kanban_login` |
| `GET /api/auth/me` | JWT → user và flow được cấp | BI: `kanban_user`, `kanban_flow` |
| `POST /api/auth/logout` | Trả thông báo thành công; client xóa token | Không truy vấn DB |
| `GET /api/monitor/private/flows` | Các flow `SEW%` có `pytckreg` hôm nay, loại `%F9%` | MySQL: `pytckreg` |
| `GET /api/monitor/flows` | Như trên, lọc thêm flow được cấp cho user | MySQL: `pytckreg`; BI: `kanban_flow` |
| `GET /api/monitor/private/flowDashboard?flow=...` | Thông tin style/PO, `SMV`, lũy kế, output ngày, lỗi, công nhân | MySQL: `pyregsum`, `pywrkord`, `pywrkstp`, `pystpasm`, `pyrework`, `pyrereason`, `pycode`; T8: `kanban_plan` |
| `GET /api/monitor/flowDashboard?flow=...` | Cùng dữ liệu dashboard, có JWT và kiểm tra quyền flow | Cùng bảng như route trên; BI: `kanban_flow` để kiểm tra quyền |
| `GET /api/monitor/private/flowSemiFGoods?flow=...` | Sản lượng bán thành phẩm theo style/size/PO | MySQL: `pywrkord`, `pyregsum`, `pybundle` |
| `GET /api/monitor/flowSemiFGoods?flow=...` | Cùng dữ liệu bán thành phẩm, có JWT và kiểm tra quyền flow | Các bảng MySQL trên; BI: `kanban_flow` để kiểm tra quyền |
| `GET /api/monitor/private/flowPlan` | Toàn bộ plan | T8: `kanban_plan` |
| `GET /api/monitor/flowPlan` | Plan lọc theo flow của user đăng nhập | T8: `kanban_plan`; BI: `kanban_flow` |
| `PUT /api/monitor/private/flowPlan` | Sửa `worker_at`, giờ nghỉ theo `igm_dept` | T8: `kanban_plan` |
| `PUT /api/monitor/flowPlan` | Cùng thao tác sửa, có JWT | T8: `kanban_plan` |
| `GET /api/monitor/private/flowEfficiency?flow=...&date=...` | Tính hiệu suất theo ngày/PO/khung giờ | T8: `kanban_plan`; MySQL: `pyregsum`, `pywrkord`, `pytckreg`, `pywrkstp`, `pystpasm` |

`flowAccessMiddleware` chỉ gắn trên `GET /api/monitor/flowDashboard` và `GET /api/monitor/flowSemiFGoods`; nó tìm flow ở `req.params.flow`, `req.query.flow` hoặc `req.body.igm_dept`, rồi đối chiếu với `kanban_flow`. `PUT /api/monitor/flowPlan` hiện chỉ có `authMiddleware`; source không gắn `flowAccessMiddleware` cho route này. Controller của route cập nhật đọc `igm_dept`, `worker_at`, `break_time_fr`, `break_time_to` từ body.

## 6. Theo một chức năng từ màn hình đến bảng

- **Dashboard v6:** `public/ui/dashboard/v6/dashboard-v6.js` gọi `/api/monitor/private/flowDashboard`; phiên bản `ui_require_login` gọi `/api/monitor/flowDashboard` qua `authFetch`. `monitor.controller.js` gọi song song sáu hàm service: style info, SMV, lũy kế, output, defects và worker quantity. Năm nhóm đầu đọc MySQL ở `dashboard.repository.js`; worker quantity đọc T8 `kanban_plan`. Response chứa `infoData`, `smvData`, `accQtyStartCompeleteData`, `outputData`, `defectsData`, `workersData`.
- **Plan:** `monitor.controller.js → monitor.service.js → dashboard.repository.js` cho danh sách công khai; danh sách theo user đi qua `flowPlan.repository.js` để lọc bằng `kanban_flow`. Cả hai endpoint `PUT` đều đi tới `flowPlan.repository.js:updateFlowPlan`, thực hiện `UPDATE kanban_plan`. Nếu không có dòng nào được cập nhật, repository ném lỗi `Flow '<igm_dept>' not found`.
- **Efficiency:** `efficiency.service.js:getEfficiencyData` lấy work plan T8; lấy lệnh, đăng ký theo ticket và SMV từ MySQL; ghép SMV theo `style|orderNo`, gán đăng ký theo `WrkOrder` vào các khung giờ rồi xây `productionGroups` và `summary`. Giờ bắt đầu được mã hóa là `07:30`; khung giờ dựa trên `work_hr` và `break_time_fr`/`break_time_to`. `plannedUnitsToday = floor((60 / smv) * work_hr * worker_tg * num_eff)` khi các tham số hợp lệ. Hàm `getProductionSummary` trong `efficiency.repository.js` có truy vấn `pyregsum` nhưng lời gọi ở service hiện bị comment, nên không tham gia response hiện tại.
- **Login:** `auth.controller.js → auth.service.js → auth.repository.js`; tra `kanban_user`, ghi `kanban_login`, ký JWT chứa `user_no` dưới khóa `id`. Các API có JWT đọc `Authorization: Bearer ...` qua `auth.middleware.js`; các route cần kiểm tra flow đọc `kanban_flow` qua `flow.middleware.js`.

## 7. Điểm cần đối chiếu trước khi chỉnh sửa

- Phân biệt **route trang** `/pms/monitor/...` với **route API** `/api/monitor/...`. Trong nhiều file dashboard `v1`–`v5`, script đang `fetch('/pms/monitor/flowDashboard?flow=...')`, trong khi `server.js` chỉ khai báo đường trang có `/:flow` và API ở `/api/monitor/...`. Cần kiểm tra luồng thực tế của phiên bản định sửa; `v6` dùng API rõ ràng.
- Giao diện `public/ui/plan/line-plan.js` đọc `/api/monitor/private/flowPlan`, nhưng nút lưu gọi `/app/monitor/private/flowPlan`; không thấy route `/app/...` trong `server.js`. Đây là lệch đường dẫn trong source hiện tại.
- Script `public/ui_require_login/efficiency/line-efficiency.js` hiện khai báo `info`/`rows` mẫu ở đầu file; API `flowEfficiency` đang được gọi từ `public/ui/efficiency/line-efficiency.js`. Kiểm tra giao diện tương ứng trước khi sửa logic hiệu suất.
- `getFlowStyleInfo`, `getFlowStyleSMV` và các hàm dashboard xác định lệnh bằng `RegDate = CURDATE()`; API efficiency nhận `date` từ query. Vì vậy dashboard theo ngày hiện tại và efficiency theo ngày được truyền vào hoạt động khác nhau.
- Tài liệu này chỉ suy ra schema từ truy vấn. Muốn đổi field, kiểu dữ liệu, khóa, index hoặc ý nghĩa nghiệp vụ của `StepNo`, cần đối chiếu schema và dữ liệu thực tế của từng database.
