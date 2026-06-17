## TÓM TẮT DỰ ÁN SMART_CITY (TÀI LIỆU DÀI CHI TIẾT)

### 1) Tổng quan
**Smart City Management System** là một hệ thống quản lý dữ liệu/giám sát theo mô hình “doctype-driven” của **Frappe** (backend) kết hợp **Frontend React + TypeScript** để hiển thị:
- **Dashboard** tổng hợp số liệu (đèn hoạt động/hỏng/bảo trì; sự cố mới/đang xử lý/đã giải quyết/đã đóng).
- **Bản đồ** hiển thị các điểm hạ tầng/đèn theo **lat/lng**.
- **Quản lý đèn đường**: tạo đèn mới, cập nhật trạng thái.
- **Quản lý tuyến đường (polyline)**: lưu tuyến, lấy danh sách tuyến, và **tự động sinh** nhiều đèn dọc theo tuyến.
- (Có nền tảng) **Báo cáo sự cố** và cập nhật trạng thái sự cố.

---

### 2) Kiến trúc hệ thống
#### Backend (Frappe)
- Dự án là một **Frappe app** tên: `smart_city`.
- Các chức năng chính được expose qua các **Frappe Whitelisted Method** dưới namespace:
  - `smart_city.smart_city.services.street_light_service`
- Backend sử dụng:
  - `frappe.get_all`, `frappe.db.count`, `frappe.get_doc`
  - `frappe.whitelist()` để tạo endpoint dạng `/api/method/...`
  - `frappe.publish_realtime` để đẩy realtime event (ví dụ: `street_light_updated`, `street_light_route_saved`, …)

#### Frontend (React + TS)
- Frontend dùng API client gọi endpoint Frappe (chuẩn `/api/method/...`).
- Module quan trọng:
  - `frontend/src/api/streetLightApi.ts` định nghĩa contract dữ liệu và các hàm gọi API:
    - `getStreetLightDashboard`
    - `getStreetLightMap`
    - `getStreetLights`
    - `updateStreetLightStatus`
    - `createStreetLight`
    - `getStreetLightRoutes`
    - `createStreetLightRoute`
    - `generateStreetLightsForRoute`
    - `getStreetLightAreas`

---

### 3) Data model (các thực thể chính)
Các dữ liệu trong hệ thống xoay quanh các DocType (Frappe):

1. **Khu Vuc** (`Khu Vuc`)
   - Danh mục khu vực/quận.
   - Field thể hiện trong code:
     - `name`, `ma_khu_vuc`, `ten_khu_vuc`
   - Dùng để lọc và hiển thị tên khu vực.

2. **Tai Nguyen Ha Tang** (`Tai Nguyen Ha Tang`)
   - DocType lưu nhiều loại tài nguyên hạ tầng.
   - Trong service này, hệ thống coi **đèn đường** là một nhóm tài sản:
     - `loai_tai_san = "Đèn chiếu sáng"`
   - Các field quan trọng (được query):
     - `ma_tai_san`, `ten_tai_san`
     - `khu_vuc`
     - `toa_do_gps` (có thể là string `"lat,lng"` hoặc JSON/Point)
     - `trang_thai` (Hoạt động/Hỏng/Bảo trì)
     - `chi_phi_bao_duong`, `ngay_lap_dat`

3. **Tuyen Duong Den** (`Tuyen Duong Den`)
   - Lưu tuyến đường đèn dưới dạng **polyline**.
   - Field quan trọng:
     - `ma_tuyen`, `ten_tuyen`
     - `khu_vuc`
     - `polyline_json` (chuỗi JSON chứa mảng điểm lat/lng)
     - `so_diem`, `ghi_chu`

4. **Bao Cao Van De** (`Bao Cao Van De`)
   - Lưu báo cáo sự cố.
   - Service dùng sự cố đèn đường:
     - `loai_van_de = "Đèn đường hỏng"`
   - Field query/return:
     - `tieu_de`, `khu_vuc`
     - `vi_tri_gps` (string/JSON/Point parse được)
     - `mo_ta_chi_tiet`, `hinh_anh_minh_hoa`
     - `muc_do_uu_tien`
     - `nguoi_bao_cao`, `sdt_lien_he`
     - `trang_thai` (Mới/Đang xử lý/Đã giải quyết/Đã đóng)
     - `creation`, `modified`

---

### 4) Seed dữ liệu demo (backend/seed)
Trong `backend/seed_data.py`, hệ thống seed một bộ dữ liệu mẫu phục vụ demo:
- **Khu Vực** (5 khu vực trong Liên Chiểu)
- **Hộ Gia Đình** (20)
- **Nhân Khẩu** (40)
- **Tài nguyên hạ tầng** (một số điểm có lat/lng thật quanh khu vực Liên Chiểu), mỗi bản ghi thuộc các type như:
  - “Camera”, “Đèn đường”, “Điện lưới”, “Cây xanh”, “Nhà văn hóa”
  - kèm `trang_thai` ngẫu nhiên giữa “Hoạt động” và “Bảo trì”

> Lưu ý: Seed này tập trung dữ liệu nền, còn phần “đèn đường theo tuyến” và “sinh đèn theo polyline” được điều phối trong `street_light_service.py`.

---

### 5) Luồng nghiệp vụ & API contract
Toàn bộ endpoint là dạng **Frappe method** (whitelisted), frontend gọi qua `/api/method/...`.

#### 5.1 Dashboard (tổng hợp số liệu)
**Endpoint**
- `get_street_light_dashboard`

**Kết quả (shape)**
- `total_lights`
- `active_lights`
- `broken_lights`
- `maintenance_lights`
- `open_incidents`
- `resolved_incidents`
- `charts`:
  - `lights_by_status` (label/value)
  - `incidents_by_status` (label/value)
  - `lights_by_area` (label/value/khu_vuc)
  - `incidents_by_priority` (label/value)

**Logic chính**
- Count theo `loai_tai_san = "Đèn chiếu sáng"` và `trang_thai`.
- Count sự cố theo `loai_van_de = "Đèn đường hỏng"` và `trang_thai`.

---

#### 5.2 Map đèn (điểm lat/lng)
**Endpoint**
- `get_street_light_map(khu_vuc?, trang_thai?)`

**Return**
- Mảng các record có:
  - `name`, `ma_tai_san`, `ten_tai_san`
  - `route_name` (được suy ra từ `ten_tai_san` theo format)
  - `khu_vuc`, `ten_khu_vuc`
  - `latitude`, `longitude`
  - `trang_thai`

**Điểm đáng chú ý**
- Service có hàm `parse_geolocation` để parse `toa_do_gps` / `vi_tri_gps` từ:
  - chuỗi `"lat,lng"`
  - JSON kiểu `Point` (GeoJSON)
  - dict chứa `latitude/longitude` hoặc `lat/lng`

---

#### 5.3 Danh sách đèn (CRUD view)
**Endpoint**
- `get_street_lights(khu_vuc?, trang_thai?, limit=100)`
**Return**
- Mảng record giống map nhưng có thể kèm:
  - `chi_phi_bao_duong`, `ngay_lap_dat`

---

#### 5.4 Tạo đèn đường (create_street_light)
**Endpoint**
- `create_street_light(data)`

**Yêu cầu payload (bắt buộc)**
- `ma_tai_san`
- `route_name`
- `khu_vuc`
- `latitude`
- `longitude`

**Optional**
- `ten_tai_san`, `trang_thai` (mặc định “Hoạt động”)
- `chi_phi_bao_duong`, `ngay_lap_dat`

**Logic**
- Validate `trang_thai` thuộc `("Hoạt động", "Hỏng", "Bảo trì")`
- Check trùng `ma_tai_san`
- Tạo doc ở `Tai Nguyen Ha Tang` với:
  - `loai_tai_san = "Đèn chiếu sáng"`
  - `toa_do_gps = "{lat},{lng}"` (format 6 chữ số thập phân)

---

#### 5.5 Cập nhật trạng thái đèn
**Endpoint**
- `update_street_light_status(name, trang_thai)`

**Logic**
- Validate `trang_thai` thuộc các option
- Kiểm tra doc thuộc loại `"Đèn chiếu sáng"`
- Update `doc.trang_thai`, save, commit
- Publish realtime event: `street_light_status_updated`

---

### 5.6 Quản lý tuyến đường (Routes)
#### Lấy tuyến
**Endpoint**
- `get_street_light_routes(khu_vuc?)`

**Return**
- Mảng tuyến:
  - `name`
  - `ma_tuyen`, `ten_tuyen`
  - `khu_vuc`, `ten_khu_vuc`
  - `polyline`: mảng `{latitude, longitude}`
  - `so_diem`, `ghi_chu`

#### Tạo/Lưu tuyến polyline
**Endpoint**
- `create_street_light_route(data)`

**Payload (bắt buộc)**
- `ma_tuyen`
- `ten_tuyen`
- `khu_vuc`
- `polyline` (mảng điểm)

**Logic**
- Parse polyline thành list điểm `{latitude, longitude}`
- Upsert theo `ma_tuyen`:
  - tồn tại → cập nhật `polyline_json`, `so_diem`, ...
  - chưa tồn tại → insert mới
- Publish realtime: `street_light_route_saved`

---

### 5.7 Sinh đèn theo tuyến (auto-generate)
**Endpoint**
- `generate_street_lights_for_route(data)`

**Payload (bắt buộc)**
- `route` (name của `Tuyen Duong Den`)
- `ma_prefix` (prefix cho mã đèn)
- `count` (số lượng đèn cần tạo)

**Optional**
- `start_index` (mặc định 1)
- `both_sides` (boolean) – nếu true sẽ tạo 2 phía tuyến
- `offset` (default 0.000035) – khoảng lệch giữa 2 bên
- `trang_thai`, `chi_phi_bao_duong`, `ngay_lap_dat` (nếu truyền)

**Logic thuật toán (high-level)**
- Lấy polyline từ `route_doc.polyline_json`
- Tính tổng chiều dài tuyến, nội suy điểm theo “tỷ lệ khoảng cách” để đặt đèn đều dọc tuyến.
- Nếu `both_sides = true`:
  - mỗi “điểm tâm” tạo 2 đèn lệch hai bên bằng vector pháp tuyến đơn giản dựa theo hướng segment.
- Tạo doc `Tai Nguyen Ha Tang` cho mỗi đèn với:
  - `ma_tai_san = f"{prefix}-{index:04d}"`
  - `ten_tai_san = "Đèn chiếu sáng - {ten_tuyen} - {index:04d}"`
  - `loaị_tai_san = "Đèn chiếu sáng"`
- Tránh trùng: nếu `ma_tai_san` tồn tại → bỏ qua và cộng vào `skipped`
- Commit và publish realtime: `street_lights_generated`

---

### 6) Realtime (event push)
Service phát realtime qua channel:
- `"street_light_updated"` với message chứa:
  - `event_type`, `doc_type`, `doc_name`, `payload`
- Các event_type nổi bật:
  - `street_light_route_saved`
  - `street_light_created`
  - `street_lights_generated`
  - `street_light_status_updated`
  - (tương ứng tương tự cho incident)

---

### 7) Đầu vào/đầu ra dữ liệu (frontend-facing)
Frontend xác định kiểu dữ liệu trong `frontend/src/api/streetLightApi.ts`, trong đó:
- `StreetLightDashboardData` khớp với dashboard return (tổng + charts)
- `StreetLightRecord` khớp với map/list đèn (lat/lng + trạng thái + tên khu vực)
- `StreetLightRouteRecord` khớp với routes (polyline + so_diem + ghi_chu)

---

## 8) Gợi ý cấu trúc dự án để AI tạo “đề bài tương tự” (template)
Nếu AI muốn tạo dự án tương tự Smart City cho ngành khác (ví dụ: rác thải, cấp nước, giao thông):
1. **Chọn 3 lớp dữ liệu**:
   - Domain “đơn vị bản đồ” (điểm lat/lng)
   - Domain “tuyến/polyline” (route)
   - Domain “sự cố/báo cáo” (incident) + trạng thái
2. **Thiết kế 3 API nhóm**:
   - Dashboard aggregations (counts + charts)
   - Map query (lọc theo khu_vực/trạng_thái, parse geo)
   - CRUD + Generate theo route (nội suy và sinh nhiều record)
3. **Chuẩn hóa parse địa lý** (string/GeoJSON/dict → lat/lng)
4. **Upsert theo mã** (ma_tuyen, ma_tai_san)
5. **Realtime event** cho cập nhật UI.

