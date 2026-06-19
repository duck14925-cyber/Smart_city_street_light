"""Street light management APIs using existing Smart City DocTypes."""

import json
import math

import frappe


ASSET_DOCTYPE = "Tai Nguyen Ha Tang"
AREA_DOCTYPE = "Khu Vuc"
INCIDENT_DOCTYPE = "Bao Cao Van De"
ROUTE_DOCTYPE = "Tuyen Duong Den"
DATA_HISTORY_DOCTYPE = "Lich Su Du Lieu Den"
DEVICE_TYPE_DOCTYPE = "Loai Thiet Bi Chieu Sang"
INSPECTION_DOCTYPE = "Phieu Kiem Tra Den"
MAINTENANCE_PLAN_DOCTYPE = "Ke Hoach Bao Tri Den"
WORK_ORDER_DOCTYPE = "Phieu Cong Viec Den"
WORK_LOG_DOCTYPE = "Nhat Ky Thi Cong Den"
ACCEPTANCE_DOCTYPE = "Bien Ban Nghiem Thu Den"

STREET_LIGHT_ASSET_TYPE = "Đèn chiếu sáng"
STREET_LIGHT_INCIDENT_TYPE = "Đèn đường hỏng"

LIGHT_STATUS_OPTIONS = ("Hoạt động", "Hỏng", "Bảo trì")
INCIDENT_STATUS_OPTIONS = ("Mới", "Đang xử lý", "Đã giải quyết", "Đã đóng")
OPEN_INCIDENT_STATUSES = ("Mới", "Đang xử lý")
RESOLVED_INCIDENT_STATUSES = ("Đã giải quyết", "Đã đóng")
INSPECTION_STATUS_OPTIONS = ("Nháp", "Hoàn thành", "Đã tạo kế hoạch")
INSPECTION_SAFETY_OPTIONS = ("An toàn", "Cần theo dõi", "Nguy hiểm", "Rất nguy hiểm")
INSPECTION_RESULT_OPTIONS = ("Đạt", "Cần bảo trì", "Cần sửa chữa", "Cần thay thế")
PLAN_STATUS_OPTIONS = ("Lập kế hoạch", "Đang thực hiện", "Hoàn thành", "Hủy")
WORK_ORDER_STATUS_OPTIONS = ("Mới", "Đang thực hiện", "Hoàn thành", "Hủy")
ACCEPTANCE_STATUS_OPTIONS = ("Nháp", "Đã nghiệm thu", "Cần làm lại")

DEFAULT_DEVICE_TYPE_CODE = "DEN-LED-9M"
DEFAULT_DEVICE_TYPE = {
    "device_type": None,
    "device_type_code": DEFAULT_DEVICE_TYPE_CODE,
    "device_type_name": "Đèn LED cao áp 9m",
    "device_category": "Đèn chiếu sáng",
    "lamp_type": "LED",
    "power_w": 120,
    "pole_height_m": 9,
    "icon_2d_url": None,
    "model_3d_url": None,
    "model_scale": 1,
    "model_bearing": 0,
    "model_height": 0,
}

DEVICE_TYPE_FIELDS = [
    "name",
    "ma_loai",
    "ten_loai",
    "danh_muc",
    "loai_bong_den",
    "cong_suat_w",
    "chieu_cao_cot_m",
    "quang_thong_lumen",
    "nhiet_do_mau_k",
    "tuoi_tho_gio",
    "trang_thai",
    "icon_2d_url",
    "model_3d_url",
    "model_scale",
    "model_bearing",
    "model_height",
    "ghi_chu",
]

DEVICE_TYPE_WRITABLE_FIELDS = [
    "ma_loai",
    "ten_loai",
    "danh_muc",
    "loai_bong_den",
    "cong_suat_w",
    "chieu_cao_cot_m",
    "quang_thong_lumen",
    "nhiet_do_mau_k",
    "tuoi_tho_gio",
    "trang_thai",
    "icon_2d_url",
    "model_3d_url",
    "model_scale",
    "model_bearing",
    "model_height",
    "ghi_chu",
]


def parse_geolocation(value):
	"""Parse Frappe Geolocation values into latitude and longitude."""
	result = {"latitude": None, "longitude": None}
	if not value:
		return result

	try:
		if isinstance(value, str):
			value = value.strip()
			if not value:
				return result

			if "," in value and not value.startswith(("{", "[")):
				latitude, longitude = [part.strip() for part in value.split(",", 1)]
				return {"latitude": float(latitude), "longitude": float(longitude)}

			value = json.loads(value)

		if isinstance(value, dict):
			if value.get("type") == "Point":
				coordinates = value.get("coordinates")
				if isinstance(coordinates, (list, tuple)) and len(coordinates) >= 2:
					return {
						"latitude": float(coordinates[1]),
						"longitude": float(coordinates[0]),
					}

			latitude = value.get("latitude")
			if latitude is None:
				latitude = value.get("lat")

			longitude = value.get("longitude")
			if longitude is None:
				longitude = value.get("lng")

			if latitude is not None and longitude is not None:
				return {"latitude": float(latitude), "longitude": float(longitude)}
	except (TypeError, ValueError, json.JSONDecodeError):
		pass

	return result


def _parse_geojson_point(value):
    if value.get("type") != "Point":
        return None

    coordinates = value.get("coordinates")
    if not isinstance(coordinates, (list, tuple)) or len(coordinates) < 2:
        return None

    return {"latitude": coordinates[1], "longitude": coordinates[0]}


def _parse_payload(data):
    if isinstance(data, str):
        try:
            return json.loads(data) or {}
        except (TypeError, ValueError, json.JSONDecodeError):
            frappe.throw("Dữ liệu gửi lên không đúng định dạng JSON.")

    return data or {}


def _safe_limit(limit):
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        frappe.throw("Giới hạn số lượng bản ghi không hợp lệ.")

    if limit <= 0:
        frappe.throw("Giới hạn số lượng bản ghi phải lớn hơn 0.")

    return min(limit, 5000)


def _publish_update(event_type, doc_type=None, doc_name=None, payload=None):
    frappe.publish_realtime(
        "street_light_updated",
        message={
            "event_type": event_type,
            "doc_type": doc_type,
            "doc_name": doc_name,
            "payload": payload or {},
        },
    )


def _log_data_history(action, doc_type=None, doc_name=None, code=None, route_name=None, summary=None, payload=None):
    try:
        frappe.get_doc(
            {
                "doctype": DATA_HISTORY_DOCTYPE,
                "hanh_dong": action,
                "doi_tuong": doc_type,
                "ten_doi_tuong": doc_name,
                "ma_doi_tuong": code,
                "tuyen_duong": route_name,
                "noi_dung": summary,
                "payload_json": json.dumps(payload or {}, ensure_ascii=False, default=str),
            }
        ).insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Street Light Data History Log Error")


def _get_area_names(area_ids):
    area_ids = [area_id for area_id in set(area_ids) if area_id]
    if not area_ids:
        return {}

    areas = frappe.get_all(
        AREA_DOCTYPE,
        filters={"name": ["in", area_ids]},
        fields=["name", "ten_khu_vuc"],
    )
    return {area.name: area.ten_khu_vuc for area in areas}


def _format_device_type(row):
    if not row:
        return dict(DEFAULT_DEVICE_TYPE)

    return {
        "device_type": row.get("name"),
        "device_type_code": row.get("ma_loai") or DEFAULT_DEVICE_TYPE["device_type_code"],
        "device_type_name": row.get("ten_loai") or DEFAULT_DEVICE_TYPE["device_type_name"],
        "device_category": row.get("danh_muc") or DEFAULT_DEVICE_TYPE["device_category"],
        "lamp_type": row.get("loai_bong_den") or DEFAULT_DEVICE_TYPE["lamp_type"],
        "power_w": row.get("cong_suat_w") if row.get("cong_suat_w") is not None else DEFAULT_DEVICE_TYPE["power_w"],
        "pole_height_m": row.get("chieu_cao_cot_m")
        if row.get("chieu_cao_cot_m") is not None
        else DEFAULT_DEVICE_TYPE["pole_height_m"],
        "icon_2d_url": row.get("icon_2d_url"),
        "model_3d_url": row.get("model_3d_url"),
        "model_scale": row.get("model_scale")
        if row.get("model_scale") is not None
        else DEFAULT_DEVICE_TYPE["model_scale"],
        "model_bearing": row.get("model_bearing")
        if row.get("model_bearing") is not None
        else DEFAULT_DEVICE_TYPE["model_bearing"],
        "model_height": row.get("model_height")
        if row.get("model_height") is not None
        else DEFAULT_DEVICE_TYPE["model_height"],
    }


def _get_device_type_rows(device_type_names):
    device_type_names = [name for name in set(device_type_names) if name]
    if not device_type_names:
        return {}

    rows = frappe.get_all(
        DEVICE_TYPE_DOCTYPE,
        filters={"name": ["in", device_type_names]},
        fields=[
            "name",
            "ma_loai",
            "ten_loai",
            "danh_muc",
            "loai_bong_den",
            "cong_suat_w",
            "chieu_cao_cot_m",
            "icon_2d_url",
            "model_3d_url",
            "model_scale",
            "model_bearing",
            "model_height",
        ],
        limit_page_length=0,
    )
    return {row.name: row for row in rows}


def _resolve_device_type_name(data, default_code=DEFAULT_DEVICE_TYPE_CODE):
    device_type_name = data.get("loai_thiet_bi_chieu_sang")
    if device_type_name:
        if not frappe.db.exists(DEVICE_TYPE_DOCTYPE, device_type_name):
            frappe.throw("Loại thiết bị chiếu sáng không tồn tại: {0}".format(device_type_name))
        return device_type_name

    device_type_code = data.get("device_type_code") or default_code
    if not device_type_code:
        return None

    resolved_name = frappe.db.exists(DEVICE_TYPE_DOCTYPE, {"ma_loai": device_type_code})
    if not resolved_name:
        frappe.throw("Mã loại thiết bị chiếu sáng không tồn tại: {0}".format(device_type_code))

    return resolved_name


def _format_device_type_record(row):
    return {field: row.get(field) for field in DEVICE_TYPE_FIELDS if field != "name"}


def _get_device_type_docname_by_code(ma_loai):
    if not ma_loai:
        return None

    return frappe.db.exists(DEVICE_TYPE_DOCTYPE, {"ma_loai": ma_loai})


def _generate_inspection_code():
    return "PKTD-{0}".format(frappe.utils.now_datetime().strftime("%Y%m%d%H%M%S%f"))


def _format_inspection(row, area_names=None):
    area_names = area_names or {}
    
    related_lights = []
    rel_json = row.get("related_lights_json")
    if rel_json:
        try:
            related_lights = json.loads(rel_json)
            if not isinstance(related_lights, list):
                related_lights = []
        except Exception:
            related_lights = []

    rel_count = row.get("related_lights_count")
    if rel_count is None:
        rel_count = len(related_lights)

    return {
        "name": row.get("name"),
        "ma_phieu": row.get("ma_phieu"),
        "ngay_kiem_tra": row.get("ngay_kiem_tra"),
        "thiet_bi": row.get("thiet_bi"),
        "ma_tai_san": row.get("ma_tai_san"),
        "ten_tai_san": row.get("ten_tai_san"),
        "tuyen_duong": row.get("tuyen_duong"),
        "khu_vuc": row.get("khu_vuc"),
        "ten_khu_vuc": area_names.get(row.get("khu_vuc")),
        "tinh_trang_dien": row.get("tinh_trang_dien"),
        "tinh_trang_cot": row.get("tinh_trang_cot"),
        "tinh_trang_day": row.get("tinh_trang_day"),
        "muc_an_toan": row.get("muc_an_toan"),
        "ket_luan": row.get("ket_luan"),
        "mo_ta": row.get("mo_ta"),
        "nguoi_kiem_tra": row.get("nguoi_kiem_tra"),
        "trang_thai": row.get("trang_thai"),
        "hinh_anh": row.get("hinh_anh"),
        "creation": row.get("creation"),
        "modified": row.get("modified"),
        "scope_type": row.get("scope_type") or ("Nhiều đèn" if len(related_lights) > 1 else "Một đèn"),
        "related_lights_count": rel_count,
        "related_lights": related_lights,
    }


def _resolve_street_light_asset(data):
    asset_name = data.get("thiet_bi")
    asset_code = data.get("ma_tai_san")

    if not asset_name and asset_code:
        asset_name = frappe.db.exists(ASSET_DOCTYPE, {"ma_tai_san": asset_code})

    if not asset_name:
        return None

    asset = frappe.get_doc(ASSET_DOCTYPE, asset_name)
    if asset.loai_tai_san != STREET_LIGHT_ASSET_TYPE:
        frappe.throw("Thiết bị được chọn không phải đèn chiếu sáng.")

    return asset


def _fill_asset_values(values, asset):
    if not asset:
        return values

    values.update(
        {
            "thiet_bi": asset.name,
            "ma_tai_san": asset.ma_tai_san,
            "ten_tai_san": asset.ten_tai_san,
            "tuyen_duong": _extract_route_name(asset.ten_tai_san),
            "khu_vuc": asset.khu_vuc,
        }
    )
    return values


def _resolve_work_order(data):
    work_order_name = data.get("phieu_cong_viec")
    if not work_order_name:
        return None

    return frappe.get_doc(WORK_ORDER_DOCTYPE, work_order_name)


def _fill_from_work_order(values, work_order):
    if not work_order:
        return values

    values.update(
        {
            "phieu_cong_viec": work_order.name,
            "thiet_bi": work_order.thiet_bi,
            "ma_tai_san": work_order.ma_tai_san,
            "ten_tai_san": work_order.ten_tai_san,
            "tuyen_duong": work_order.tuyen_duong,
            "khu_vuc": work_order.khu_vuc,
        }
    )
    if "ke_hoach" in values and not values.get("ke_hoach"):
        values["ke_hoach"] = work_order.ke_hoach
    return values


def _format_plan(row, area_names=None):
    area_names = area_names or {}
    data = dict(row)
    data["ten_khu_vuc"] = area_names.get(row.get("khu_vuc"))
    
    related_lights = []
    rel_json = row.get("related_lights_json")
    if rel_json:
        try:
            related_lights = json.loads(rel_json)
            if not isinstance(related_lights, list):
                related_lights = []
        except Exception:
            related_lights = []

    rel_count = row.get("related_lights_count")
    if rel_count is None:
        rel_count = len(related_lights)

    data["scope_type"] = row.get("scope_type") or ("Nhiều đèn" if len(related_lights) > 1 else "Một đèn")
    data["related_lights_count"] = rel_count
    data["related_lights"] = related_lights
    return data


def _format_work_order(row, area_names=None):
    area_names = area_names or {}
    data = dict(row)
    data["ten_khu_vuc"] = area_names.get(row.get("khu_vuc"))
    return data


def _format_work_log(row, area_names=None):
    area_names = area_names or {}
    data = dict(row)
    data["ten_khu_vuc"] = area_names.get(row.get("khu_vuc"))
    return data


def _format_acceptance(row, area_names=None):
    area_names = area_names or {}
    data = dict(row)
    data["ten_khu_vuc"] = area_names.get(row.get("khu_vuc"))
    return data


def _generate_plan_code():
    return "KHBT-{0}".format(frappe.utils.now_datetime().strftime("%Y%m%d%H%M%S%f"))


def _generate_work_order_code():
    return "PCVD-{0}".format(frappe.utils.now_datetime().strftime("%Y%m%d%H%M%S%f"))


def _generate_work_log_code():
    return "NKTC-{0}".format(frappe.utils.now_datetime().strftime("%Y%m%d%H%M%S%f"))


def _generate_acceptance_code():
    return "BBNT-{0}".format(frappe.utils.now_datetime().strftime("%Y%m%d%H%M%S%f"))


def _get_group_counts(doctype, filters, group_field):
	rows = frappe.get_all(
		doctype,
		filters=filters,
		fields=[group_field],
		limit_page_length=0,
	)

	counts = {}
	for row in rows:
		label = row.get(group_field) or "Chưa xác định"
		counts[label] = counts.get(label, 0) + 1

	return [{"label": label, "value": total} for label, total in sorted(counts.items())]


@frappe.whitelist()
def get_street_light_dashboard():
    """Return dashboard statistics for street lights and incidents."""
    try:
        light_filters = {"loai_tai_san": STREET_LIGHT_ASSET_TYPE}
        incident_filters = {"loai_van_de": STREET_LIGHT_INCIDENT_TYPE}

        return {
            "total_lights": frappe.db.count(ASSET_DOCTYPE, light_filters),
            "active_lights": frappe.db.count(
                ASSET_DOCTYPE, {**light_filters, "trang_thai": "Hoạt động"}
            ),
            "broken_lights": frappe.db.count(ASSET_DOCTYPE, {**light_filters, "trang_thai": "Hỏng"}),
            "maintenance_lights": frappe.db.count(
                ASSET_DOCTYPE, {**light_filters, "trang_thai": "Bảo trì"}
            ),
            "open_incidents": frappe.db.count(
                INCIDENT_DOCTYPE, {**incident_filters, "trang_thai": ["in", OPEN_INCIDENT_STATUSES]}
            ),
            "resolved_incidents": frappe.db.count(
                INCIDENT_DOCTYPE,
                {**incident_filters, "trang_thai": ["in", RESOLVED_INCIDENT_STATUSES]},
            ),
            "charts": {
                "lights_by_status": _get_group_counts(ASSET_DOCTYPE, light_filters, "trang_thai"),
                "incidents_by_status": _get_group_counts(
                    INCIDENT_DOCTYPE, incident_filters, "trang_thai"
                ),
                "lights_by_area": _get_lights_by_area(light_filters),
                "incidents_by_priority": _get_group_counts(
                    INCIDENT_DOCTYPE, incident_filters, "muc_do_uu_tien"
                ),
            },
        }
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Street Light Dashboard Error")
        frappe.throw("Không thể tải dữ liệu dashboard đèn đường.")


def _get_lights_by_area(filters):
	rows = frappe.get_all(
		ASSET_DOCTYPE,
		filters=filters,
		fields=["khu_vuc"],
		limit_page_length=0,
	)
	area_names = _get_area_names([row.khu_vuc for row in rows])
	counts = {}
	for row in rows:
		area = row.khu_vuc
		counts[area] = counts.get(area, 0) + 1

	return [
		{
			"label": area_names.get(area) or area or "Chưa xác định",
			"value": total,
			"khu_vuc": area,
		}
		for area, total in sorted(counts.items(), key=lambda item: item[0] or "")
	]


def _get_count(doctype, filters=None):
    return frappe.db.count(doctype, filters or {})


def _get_group_counts_with_area(doctype, filters, group_field):
    rows = frappe.get_all(
        doctype,
        filters=filters,
        fields=[group_field],
        limit_page_length=0,
    )
    area_names = _get_area_names([row.get(group_field) for row in rows])
    counts = {}
    for row in rows:
        key = row.get(group_field)
        counts[key] = counts.get(key, 0) + 1

    return [
        {
            "label": area_names.get(key) or key or "Chưa xác định",
            "value": total,
            "khu_vuc": key,
        }
        for key, total in sorted(counts.items(), key=lambda item: item[0] or "")
    ]


@frappe.whitelist()
def get_report_by_area():
    """Return aggregated light, incident, and work-order statistics by area."""
    try:
        areas = frappe.get_all(
            AREA_DOCTYPE,
            fields=["name", "ma_khu_vuc", "ten_khu_vuc"],
            limit_page_length=0,
            order_by="ten_khu_vuc asc",
        )
        light_filters = {"loai_tai_san": STREET_LIGHT_ASSET_TYPE}
        incident_filters = {"loai_van_de": STREET_LIGHT_INCIDENT_TYPE}

        return [
            {
                "khu_vuc": area.name,
                "ten_khu_vuc": area.ten_khu_vuc or area.ma_khu_vuc or area.name,
                "total_lights": _get_count(ASSET_DOCTYPE, {**light_filters, "khu_vuc": area.name}),
                "active_lights": _get_count(ASSET_DOCTYPE, {**light_filters, "khu_vuc": area.name, "trang_thai": "Hoạt động"}),
                "broken_lights": _get_count(ASSET_DOCTYPE, {**light_filters, "khu_vuc": area.name, "trang_thai": "Hỏng"}),
                "maintenance_lights": _get_count(ASSET_DOCTYPE, {**light_filters, "khu_vuc": area.name, "trang_thai": "Bảo trì"}),
                "total_incidents": _get_count(INCIDENT_DOCTYPE, {**incident_filters, "khu_vuc": area.name}),
                "open_incidents": _get_count(INCIDENT_DOCTYPE, {**incident_filters, "khu_vuc": area.name, "trang_thai": ["in", OPEN_INCIDENT_STATUSES]}),
                "total_work_orders": _get_count(WORK_ORDER_DOCTYPE, {"khu_vuc": area.name}),
                "completed_work_orders": _get_count(WORK_ORDER_DOCTYPE, {"khu_vuc": area.name, "trang_thai": "Hoàn thành"}),
            }
            for area in areas
        ]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Report By Area Error")
        frappe.throw("Không thể tải báo cáo theo khu vực.")


@frappe.whitelist()
def get_report_incidents():
    """Return incident report summary."""
    try:
        filters = {"loai_van_de": STREET_LIGHT_INCIDENT_TYPE}
        return {
            "total_incidents": _get_count(INCIDENT_DOCTYPE, filters),
            "by_status": _get_group_counts(INCIDENT_DOCTYPE, filters, "trang_thai"),
            "by_priority": _get_group_counts(INCIDENT_DOCTYPE, filters, "muc_do_uu_tien"),
            "by_area": _get_group_counts_with_area(INCIDENT_DOCTYPE, filters, "khu_vuc"),
            "recent_incidents": get_street_light_incidents(limit=8),
        }
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Report Incidents Error")
        frappe.throw("Không thể tải báo cáo sự cố.")


@frappe.whitelist()
def get_report_work_orders():
    """Return work-order report summary."""
    try:
        return {
            "total_work_orders": _get_count(WORK_ORDER_DOCTYPE),
            "by_status": _get_group_counts(WORK_ORDER_DOCTYPE, {}, "trang_thai"),
            "by_priority": _get_group_counts(WORK_ORDER_DOCTYPE, {}, "muc_uu_tien"),
            "by_type": _get_group_counts(WORK_ORDER_DOCTYPE, {}, "loai_cong_viec"),
            "recent_work_orders": get_work_orders({"limit": 8}),
        }
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Report Work Orders Error")
        frappe.throw("Không thể tải báo cáo phiếu công việc.")


@frappe.whitelist()
def get_report_unit_performance():
    """Return demo/aggregated performance by responsible staff or unit."""
    try:
        performance = {}

        def ensure_staff(name):
            staff = name or "Chưa phân công"
            performance.setdefault(
                staff,
                {
                    "unit_or_staff": staff,
                    "assigned_work_orders": 0,
                    "completed_work_orders": 0,
                    "pending_work_orders": 0,
                    "completion_rate": 0,
                },
            )
            return performance[staff]

        work_orders = frappe.get_all(
            WORK_ORDER_DOCTYPE,
            fields=["nhan_vien_thuc_hien", "trang_thai"],
            limit_page_length=0,
        )
        for row in work_orders:
            item = ensure_staff(row.get("nhan_vien_thuc_hien"))
            item["assigned_work_orders"] += 1
            if row.get("trang_thai") == "Hoàn thành":
                item["completed_work_orders"] += 1
            else:
                item["pending_work_orders"] += 1

        plans = frappe.get_all(
            MAINTENANCE_PLAN_DOCTYPE,
            fields=["nguoi_phu_trach", "trang_thai"],
            limit_page_length=0,
        )
        for row in plans:
            item = ensure_staff(row.get("nguoi_phu_trach"))
            item["assigned_work_orders"] += 1
            if row.get("trang_thai") == "Hoàn thành":
                item["completed_work_orders"] += 1
            else:
                item["pending_work_orders"] += 1

        inspections = frappe.get_all(
            INSPECTION_DOCTYPE,
            fields=["nguoi_kiem_tra", "trang_thai"],
            limit_page_length=0,
        )
        for row in inspections:
            item = ensure_staff(row.get("nguoi_kiem_tra"))
            item["assigned_work_orders"] += 1
            if row.get("trang_thai") == "Hoàn thành":
                item["completed_work_orders"] += 1
            else:
                item["pending_work_orders"] += 1

        for item in performance.values():
            total = item["assigned_work_orders"]
            item["completion_rate"] = round((item["completed_work_orders"] / total) * 100, 1) if total else 0

        return sorted(performance.values(), key=lambda item: item["assigned_work_orders"], reverse=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Report Unit Performance Error")
        frappe.throw("Không thể tải báo cáo hiệu suất đơn vị.")


@frappe.whitelist()
def get_street_light_overview_report():
    """Return full overview report for the street-light management dashboard."""
    try:
        light_filters = {"loai_tai_san": STREET_LIGHT_ASSET_TYPE}
        incident_filters = {"loai_van_de": STREET_LIGHT_INCIDENT_TYPE}
        return {
            "total_lights": _get_count(ASSET_DOCTYPE, light_filters),
            "active_lights": _get_count(ASSET_DOCTYPE, {**light_filters, "trang_thai": "Hoạt động"}),
            "broken_lights": _get_count(ASSET_DOCTYPE, {**light_filters, "trang_thai": "Hỏng"}),
            "maintenance_lights": _get_count(ASSET_DOCTYPE, {**light_filters, "trang_thai": "Bảo trì"}),
            "open_incidents": _get_count(INCIDENT_DOCTYPE, {**incident_filters, "trang_thai": ["in", OPEN_INCIDENT_STATUSES]}),
            "resolved_incidents": _get_count(INCIDENT_DOCTYPE, {**incident_filters, "trang_thai": ["in", RESOLVED_INCIDENT_STATUSES]}),
            "total_routes": _get_count(ROUTE_DOCTYPE),
            "total_incidents": _get_count(INCIDENT_DOCTYPE, incident_filters),
            "total_inspections": _get_count(INSPECTION_DOCTYPE),
            "total_plans": _get_count(MAINTENANCE_PLAN_DOCTYPE),
            "total_work_orders": _get_count(WORK_ORDER_DOCTYPE),
            "total_work_logs": _get_count(WORK_LOG_DOCTYPE),
            "total_acceptance_records": _get_count(ACCEPTANCE_DOCTYPE),
            "charts": {
                "lights_by_status": _get_group_counts(ASSET_DOCTYPE, light_filters, "trang_thai"),
                "incidents_by_status": _get_group_counts(INCIDENT_DOCTYPE, incident_filters, "trang_thai"),
                "lights_by_area": _get_lights_by_area(light_filters),
                "incidents_by_priority": _get_group_counts(INCIDENT_DOCTYPE, incident_filters, "muc_do_uu_tien"),
                "work_orders_by_status": _get_group_counts(WORK_ORDER_DOCTYPE, {}, "trang_thai"),
                "inspections_by_result": _get_group_counts(INSPECTION_DOCTYPE, {}, "ket_luan"),
                "plans_by_status": _get_group_counts(MAINTENANCE_PLAN_DOCTYPE, {}, "trang_thai"),
                "acceptance_by_result": _get_group_counts(ACCEPTANCE_DOCTYPE, {}, "ket_qua_nghiem_thu"),
            },
        }
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Street Light Overview Report Error")
        frappe.throw("Không thể tải báo cáo tổng quan đèn đường.")


@frappe.whitelist()
def get_street_light_areas():
    """Return available areas for street-light forms."""
    try:
        rows = frappe.get_all(
            AREA_DOCTYPE,
            fields=["name", "ma_khu_vuc", "ten_khu_vuc"],
            limit_page_length=0,
            order_by="ten_khu_vuc asc",
        )
        return [
            {
                "name": row.get("name"),
                "value": row.get("name"),
                "label": row.get("ten_khu_vuc") or row.get("ma_khu_vuc") or row.get("name"),
            }
            for row in rows
        ]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Street Light Areas Error")
        frappe.throw("Không thể tải danh sách khu vực.")


@frappe.whitelist()
def get_street_light_device_types():
    """Return street-light device type definitions for 2D/3D rendering."""
    try:
        rows = frappe.get_all(
            DEVICE_TYPE_DOCTYPE,
            fields=DEVICE_TYPE_FIELDS,
            limit_page_length=0,
            order_by="ma_loai asc",
        )
        return [_format_device_type_record(row) for row in rows]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Street Light Device Types Error")
        frappe.throw("Không thể tải danh sách loại thiết bị chiếu sáng.")


@frappe.whitelist()
def create_or_update_street_light_device_type(data=None):
    """Create or update a street-light device type definition."""
    try:
        data = _parse_payload(data)
        ma_loai = str(data.get("ma_loai") or "").strip()
        ten_loai = str(data.get("ten_loai") or "").strip()

        if not ma_loai:
            frappe.throw("Mã loại thiết bị là bắt buộc.")
        if not ten_loai:
            frappe.throw("Tên loại thiết bị là bắt buộc.")

        existing_name = _get_device_type_docname_by_code(ma_loai)
        if existing_name:
            doc = frappe.get_doc(DEVICE_TYPE_DOCTYPE, existing_name)
        else:
            doc = frappe.new_doc(DEVICE_TYPE_DOCTYPE)

        for field in DEVICE_TYPE_WRITABLE_FIELDS:
            if field in data:
                doc.set(field, data.get(field))

        doc.ma_loai = ma_loai
        doc.ten_loai = ten_loai

        if existing_name:
            doc.save(ignore_permissions=True)
            action = "Cập nhật loại thiết bị"
        else:
            doc.insert(ignore_permissions=True)
            action = "Tạo loại thiết bị"

        frappe.db.commit()
        result = _format_device_type_record(doc.as_dict())
        _log_data_history(
            action,
            DEVICE_TYPE_DOCTYPE,
            doc.name,
            doc.ma_loai,
            None,
            "{0} {1} - {2}.".format(action, doc.ma_loai, doc.ten_loai),
            result,
        )
        _publish_update("street_light_device_type_saved", DEVICE_TYPE_DOCTYPE, doc.name, result)
        return result
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Create Or Update Street Light Device Type Error")
        frappe.throw("Không thể lưu loại thiết bị chiếu sáng.")


@frappe.whitelist()
def delete_street_light_device_type(ma_loai=None):
    """Delete a device type if no street-light asset is using it."""
    try:
        ma_loai = str(ma_loai or "").strip()
        if not ma_loai:
            frappe.throw("Mã loại thiết bị là bắt buộc.")

        doc_name = _get_device_type_docname_by_code(ma_loai)
        if not doc_name:
            frappe.throw("Không tìm thấy loại thiết bị chiếu sáng: {0}".format(ma_loai))

        used_count = frappe.db.count(
            ASSET_DOCTYPE,
            filters={"loai_thiet_bi_chieu_sang": doc_name},
        )
        if used_count:
            frappe.throw(
                "Không thể xóa loại thiết bị {0} vì đang được sử dụng bởi {1} thiết bị.".format(
                    ma_loai, used_count
                )
            )

        doc = frappe.get_doc(DEVICE_TYPE_DOCTYPE, doc_name)
        snapshot = _format_device_type_record(doc.as_dict())
        previous_in_test = frappe.in_test
        frappe.in_test = True
        try:
            frappe.delete_doc(DEVICE_TYPE_DOCTYPE, doc_name, ignore_permissions=True)
        finally:
            frappe.in_test = previous_in_test
        frappe.db.commit()

        result = {
            "ma_loai": ma_loai,
            "message": "Đã xóa loại thiết bị chiếu sáng {0}.".format(ma_loai),
        }
        _log_data_history(
            "Xóa loại thiết bị",
            DEVICE_TYPE_DOCTYPE,
            doc_name,
            ma_loai,
            None,
            "Xóa loại thiết bị {0}.".format(ma_loai),
            snapshot,
        )
        _publish_update("street_light_device_type_deleted", DEVICE_TYPE_DOCTYPE, doc_name, result)
        return result
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Delete Street Light Device Type Error")
        frappe.throw("Không thể xóa loại thiết bị chiếu sáng.")


def _extract_route_name(asset_title):
    if not asset_title:
        return None

    parts = [part.strip() for part in asset_title.split(" - ")]
    if len(parts) >= 3 and parts[0] == "Đèn chiếu sáng":
        return " - ".join(parts[1:-1])

    return None


def _extract_marker_value(text, marker):
    if not text:
        return None

    for line in str(text).splitlines():
        line = line.strip()
        if line.startswith(marker):
            return line.replace(marker, "", 1).strip() or None

    return None


def _extract_incident_light_code(row):
    detail_value = _extract_marker_value(row.get("mo_ta_chi_tiet"), "Mã đèn:")
    if detail_value:
        return detail_value

    title = row.get("tieu_de") or ""
    parts = title.replace(":", " ").split()
    for part in parts:
        if part.upper().startswith(("DEN-", "TESTDEN", "DCS")):
            return part.strip()

    return None


def _extract_incident_route_name(row):
    return _extract_marker_value(row.get("mo_ta_chi_tiet"), "Tuyến đường:")


def _parse_route_points(value):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, ValueError, json.JSONDecodeError):
            frappe.throw("Dữ liệu tuyến đường không đúng định dạng JSON.")

    if not isinstance(value, list) or len(value) < 2:
        frappe.throw("Tuyến đường cần ít nhất 2 điểm.")

    points = []
    for point in value:
        if isinstance(point, dict):
            latitude = point.get("latitude") if point.get("latitude") is not None else point.get("lat")
            longitude = point.get("longitude") if point.get("longitude") is not None else point.get("lng")
        elif isinstance(point, (list, tuple)) and len(point) >= 2:
            latitude, longitude = point[0], point[1]
        else:
            frappe.throw("Điểm tuyến đường không hợp lệ.")

        points.append({"latitude": float(latitude), "longitude": float(longitude)})

    return points


def _format_route(row, area_names=None):
    points = _parse_route_points(row.get("polyline_json") or "[]")
    area_names = area_names or {}
    return {
        "route_id": row.get("name"),
        "name": row.get("name"),
        "ma_tuyen": row.get("ma_tuyen"),
        "ten_tuyen": row.get("ten_tuyen"),
        "khu_vuc": row.get("khu_vuc"),
        "ten_khu_vuc": area_names.get(row.get("khu_vuc")),
        "polyline_json": row.get("polyline_json"),
        "polyline": points,
        "so_diem": row.get("so_diem") or len(points),
        "ghi_chu": row.get("ghi_chu"),
    }


def _distance_between_route_points(start, end):
    lat_distance = end["latitude"] - start["latitude"]
    lng_distance = end["longitude"] - start["longitude"]
    return (lat_distance * lat_distance + lng_distance * lng_distance) ** 0.5


def _interpolate_route_point(start, end, ratio):
    return {
        "latitude": start["latitude"] + (end["latitude"] - start["latitude"]) * ratio,
        "longitude": start["longitude"] + (end["longitude"] - start["longitude"]) * ratio,
    }


def _offset_route_point(start, end, side, offset):
    lat_delta = end["latitude"] - start["latitude"]
    lng_delta = end["longitude"] - start["longitude"]
    length = math.sqrt(lat_delta * lat_delta + lng_delta * lng_delta) or 1
    return {
        "latitude": side * (-lng_delta / length) * offset,
        "longitude": side * (lat_delta / length) * offset,
    }


def calculate_bearing(lat1, lon1, lat2, lon2):
    lat1, lon1 = math.radians(lat1), math.radians(lon1)
    lat2, lon2 = math.radians(lat2), math.radians(lon2)
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    bearing = math.atan2(y, x)
    return (math.degrees(bearing) + 360) % 360


def _get_coords(p):
    if isinstance(p, dict):
        lat = p.get("latitude") if p.get("latitude") is not None else p.get("lat")
        lng = p.get("longitude") if p.get("longitude") is not None else p.get("lng")
        return float(lat), float(lng)
    return float(p[0]), float(p[1])


def _distance_between_coords_m(lat1, lon1, lat2, lon2):
    radius_m = 6371000.0
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)
    delta_lat = lat2_r - lat1_r
    delta_lon = lon2_r - lon1_r
    value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(delta_lon / 2) ** 2
    )
    return radius_m * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def _build_polyline_cumulative(points):
    normalized_points = [{"lat": _get_coords(point)[0], "lng": _get_coords(point)[1]} for point in points]
    cumulative_lengths = [0.0]

    for index in range(len(normalized_points) - 1):
        start = normalized_points[index]
        end = normalized_points[index + 1]
        segment_length = _distance_between_coords_m(
            start["lat"],
            start["lng"],
            end["lat"],
            end["lng"],
        )
        cumulative_lengths.append(cumulative_lengths[-1] + segment_length)

    return normalized_points, cumulative_lengths


def calculate_polyline_length(points):
    """Calculate total polyline length in meters."""
    if not points or len(points) < 2:
        return 0.0

    _, cumulative_lengths = _build_polyline_cumulative(points)
    return cumulative_lengths[-1]


def get_point_and_heading_at_distance(polyline_points, cumulative_lengths, target_distance):
    """Return point and heading sampled by arclength across the whole polyline."""
    if not polyline_points:
        return {"lat": 0.0, "lng": 0.0, "segment_index": 0, "heading_degrees": 0.0}
    if len(polyline_points) == 1:
        point = polyline_points[0]
        return {"lat": point["lat"], "lng": point["lng"], "segment_index": 0, "heading_degrees": 0.0}

    total_length = cumulative_lengths[-1]
    target_distance = max(0.0, min(float(target_distance), total_length))

    for index in range(len(polyline_points) - 1):
        segment_start = cumulative_lengths[index]
        segment_end = cumulative_lengths[index + 1]
        is_last_segment = index == len(polyline_points) - 2
        if target_distance <= segment_end or is_last_segment:
            start = polyline_points[index]
            end = polyline_points[index + 1]
            segment_length = segment_end - segment_start
            ratio = 0.0 if segment_length <= 0 else (target_distance - segment_start) / segment_length
            ratio = max(0.0, min(1.0, ratio))
            lat = start["lat"] + (end["lat"] - start["lat"]) * ratio
            lng = start["lng"] + (end["lng"] - start["lng"]) * ratio
            heading = calculate_bearing(start["lat"], start["lng"], end["lat"], end["lng"])
            return {"lat": lat, "lng": lng, "segment_index": index, "heading_degrees": heading}

    point = polyline_points[-1]
    previous = polyline_points[-2]
    heading = calculate_bearing(previous["lat"], previous["lng"], point["lat"], point["lng"])
    return {"lat": point["lat"], "lng": point["lng"], "segment_index": len(polyline_points) - 2, "heading_degrees": heading}


def interpolate_point_along_polyline(points, distance_m):
    """Interpolate latitude, longitude, segment index, and heading at distance_m."""
    polyline_points, cumulative_lengths = _build_polyline_cumulative(points)
    return get_point_and_heading_at_distance(polyline_points, cumulative_lengths, distance_m)


def offset_point(lat, lng, heading_degrees, offset_m, side):
    """Offset a point by offset_m meters to the left or right of heading."""
    if side == "left":
        bearing = heading_degrees - 90
    elif side == "right":
        bearing = heading_degrees + 90
    else:
        bearing = heading_degrees
        
    bearing_r = math.radians(bearing)
    R = 6371000.0
    dist_r = offset_m / R
    
    lat_r = math.radians(lat)
    lon_r = math.radians(lng)
    
    new_lat_r = math.asin(
        math.sin(lat_r) * math.cos(dist_r) +
        math.cos(lat_r) * math.sin(dist_r) * math.cos(bearing_r)
    )
    new_lon_r = lon_r + math.atan2(
        math.sin(bearing_r) * math.sin(dist_r) * math.cos(lat_r),
        math.cos(dist_r) - math.sin(lat_r) * math.sin(new_lat_r)
    )
    
    return {
        "lat": math.degrees(new_lat_r),
        "lng": (math.degrees(new_lon_r) + 180) % 360 - 180
    }


def _allocate_light_code_group(prefix, start_index, side_suffixes, reserved_codes=None):
    reserved_codes = reserved_codes or set()
    code_index = max(1, int(start_index))

    while True:
        codes = {suffix: f"{prefix}-{code_index:04d}-{suffix}" for suffix in side_suffixes}
        has_collision = any(
            code in reserved_codes or frappe.db.exists(ASSET_DOCTYPE, {"ma_tai_san": code})
            for code in codes.values()
        )
        if not has_collision:
            reserved_codes.update(codes.values())
            return codes, code_index + 1
        code_index += 1


@frappe.whitelist()
def debug_sample_route_positions(route_id, count_positions, start_margin_m=0, end_margin_m=0):
    route_doc = frappe.get_doc(ROUTE_DOCTYPE, route_id)
    raw_polyline = _parse_route_points(route_doc.polyline_json)
    polyline_coords = [[point["latitude"], point["longitude"]] for point in raw_polyline]
    polyline_points, cumulative_lengths = _build_polyline_cumulative(polyline_coords)
    total_length_m = cumulative_lengths[-1]
    requested_positions = int(count_positions)
    start_margin_m = float(start_margin_m or 0)
    end_margin_m = float(end_margin_m or 0)
    usable_length_m = total_length_m - start_margin_m - end_margin_m
    if usable_length_m < 0:
        frappe.throw("Khoảng chừa đầu/cuối lớn hơn chiều dài tuyến.")

    if requested_positions == 1:
        distances = [start_margin_m + usable_length_m / 2.0]
    else:
        spacing = usable_length_m / (requested_positions - 1) if usable_length_m > 0 else 0.0
        distances = [start_margin_m + index * spacing for index in range(requested_positions)]

    sampled = [
        get_point_and_heading_at_distance(polyline_points, cumulative_lengths, distance)
        for distance in distances
    ]

    return {
        "route_id": route_doc.name,
        "route_name": route_doc.ten_tuyen,
        "total_length_m": round(total_length_m, 3),
        "usable_length_m": round(usable_length_m, 3),
        "requested_positions": requested_positions,
        "generated_base_positions_count": len(sampled),
        "spacing_m": round((usable_length_m / (requested_positions - 1)) if requested_positions > 1 and usable_length_m > 0 else 0.0, 3),
        "first_distance_m": round(distances[0], 3) if distances else None,
        "last_distance_m": round(distances[-1], 3) if distances else None,
    }


@frappe.whitelist()
def debug_sample_route_positions_matrix(route_id=None):
    if not route_id:
        route_id = frappe.db.get_value(ROUTE_DOCTYPE, {}, "name")
    if not route_id:
        frappe.throw("Chưa có tuyến đường để test sampling.")

    cases = [1, 2, 10, 200, 300]
    result = {
        "route_id": route_id,
        "single_side": [debug_sample_route_positions(route_id, count) for count in cases],
        "both_sides": [
            {
                **debug_sample_route_positions(route_id, count),
                "expected_total_lights": count * 2,
            }
            for count in (10, 100)
        ],
    }
    return result


_routes_cache = None
_route_title_to_id = None


def _get_route_polyline(route_name):
    global _routes_cache
    if _routes_cache is None:
        try:
            routes = frappe.get_all(ROUTE_DOCTYPE, fields=["name", "polyline_json"])
            _routes_cache = {}
            for r in routes:
                try:
                    _routes_cache[r.name] = _parse_route_points(r.polyline_json)
                except Exception:
                    _routes_cache[r.name] = []
        except Exception:
            _routes_cache = {}
    return _routes_cache.get(route_name)


def _normalize_title(text):
    if not text:
        return ""
    text = str(text).strip().upper()
    if text.startswith("ĐƯỜNG "):
        text = text[6:].strip()
    elif text.startswith("ĐƯỜNG"):
        text = text[5:].strip()
    return text


def _get_route_id_by_title(title):
    global _route_title_to_id
    if _route_title_to_id is None:
        try:
            routes = frappe.get_all(ROUTE_DOCTYPE, fields=["name", "ten_tuyen"])
            _route_title_to_id = {
                _normalize_title(r.ten_tuyen): r.name for r in routes if r.ten_tuyen
            }
        except Exception:
            _route_title_to_id = {}
    return _route_title_to_id.get(_normalize_title(title))


def get_light_bearing_from_route(polyline, lat, lng, is_left=False, is_right=False):
    if not polyline or len(polyline) < 2:
        return 0.0
        
    closest_dist = float('inf')
    best_bearing = 0.0
    
    for i in range(len(polyline) - 1):
        lat1, lon1 = polyline[i]["latitude"], polyline[i]["longitude"]
        lat2, lon2 = polyline[i+1]["latitude"], polyline[i+1]["longitude"]
        
        bearing = calculate_bearing(lat1, lon1, lat2, lon2)
        d = ((lat - lat1)**2 + (lng - lon1)**2)**0.5
        if d < closest_dist:
            closest_dist = d
            best_bearing = bearing
            
    if is_left:
        best_bearing = (best_bearing + 90) % 360
    elif is_right:
        best_bearing = (best_bearing - 90) % 360
        
    return best_bearing


def _points_along_route(polyline, count, both_sides=False, offset=0.000035):
    pair_count = max(1, math.ceil(count / 2)) if both_sides else count
    segment_lengths = [
        _distance_between_route_points(polyline[index], polyline[index + 1])
        for index in range(len(polyline) - 1)
    ]
    total_length = sum(segment_lengths)
    if total_length == 0:
        frappe.throw("Tuyến đường không có chiều dài hợp lệ.")

    center_points = []
    for point_index in range(pair_count):
        target_distance = 0 if pair_count == 1 else (total_length * point_index) / (pair_count - 1)
        walked_distance = 0
        for segment_index, segment_length in enumerate(segment_lengths):
            is_last_segment = segment_index == len(segment_lengths) - 1
            if target_distance <= walked_distance + segment_length or is_last_segment:
                start = polyline[segment_index]
                end = polyline[segment_index + 1]
                ratio = 0 if segment_length == 0 else (target_distance - walked_distance) / segment_length
                center_points.append((_interpolate_route_point(start, end, max(0, min(1, ratio))), start, end))
                break
            walked_distance += segment_length

    points = []
    for center, start, end in center_points:
        sides = (-1, 1) if both_sides else (0,)
        for side in sides:
            if len(points) >= count:
                break
            delta = {"latitude": 0, "longitude": 0} if side == 0 else _offset_route_point(start, end, side, offset)
            points.append({
                "latitude": center["latitude"] + delta["latitude"],
                "longitude": center["longitude"] + delta["longitude"],
            })

    return points


@frappe.whitelist()
def get_street_lights(khu_vuc=None, trang_thai=None, limit=100):
    """Return street light asset records."""
    try:
        global _routes_cache, _route_title_to_id
        _routes_cache = None
        _route_title_to_id = None

        filters = {"loai_tai_san": STREET_LIGHT_ASSET_TYPE}
        if khu_vuc:
            filters["khu_vuc"] = khu_vuc
        if trang_thai:
            filters["trang_thai"] = trang_thai

        rows = frappe.get_all(
            ASSET_DOCTYPE,
            filters=filters,
            fields=[
                "name",
                "ma_tai_san",
                "ten_tai_san",
                "loai_thiet_bi_chieu_sang",
                "khu_vuc",
                "toa_do_gps",
                "trang_thai",
                "chi_phi_bao_duong",
                "ngay_lap_dat",
            ],
            limit_page_length=_safe_limit(limit),
            order_by="modified desc",
        )
        area_names = _get_area_names([row.khu_vuc for row in rows])
        device_type_rows = _get_device_type_rows(
            [row.get("loai_thiet_bi_chieu_sang") for row in rows]
        )

        return [_format_street_light(row, area_names, device_type_rows) for row in rows]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Street Lights Error")
        frappe.throw("Không thể tải danh sách đèn đường.")


def _format_street_light(row, area_names, device_type_rows=None):
    location = parse_geolocation(row.get("toa_do_gps"))
    device_type_rows = device_type_rows or {}
    device_info = _format_device_type(device_type_rows.get(row.get("loai_thiet_bi_chieu_sang")))

    asset_title = row.get("ten_tai_san")
    route_name = _extract_route_name(asset_title)
    
    code = row.get("ma_tai_san") or ""
    is_left = code.endswith("-L")
    is_right = code.endswith("-R")
    
    if route_name and location["latitude"] is not None and location["longitude"] is not None:
        route_id = _get_route_id_by_title(route_name)
        if route_id:
            polyline = _get_route_polyline(route_id)
            if polyline:
                calculated_bearing = get_light_bearing_from_route(
                    polyline,
                    location["latitude"],
                    location["longitude"],
                    is_left=is_left,
                    is_right=is_right or (not is_left and "-R" in code)
                )
                device_info["model_bearing"] = calculated_bearing

    return {
        "name": row.get("name"),
        "ma_tai_san": row.get("ma_tai_san"),
        "ten_tai_san": row.get("ten_tai_san"),
        "route_name": route_name,
        "khu_vuc": row.get("khu_vuc"),
        "ten_khu_vuc": area_names.get(row.get("khu_vuc")),
        "toa_do_gps": row.get("toa_do_gps"),
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "trang_thai": row.get("trang_thai"),
        "chi_phi_bao_duong": row.get("chi_phi_bao_duong"),
        "ngay_lap_dat": row.get("ngay_lap_dat"),
        **device_info,
    }


@frappe.whitelist()
def get_street_light_map(khu_vuc=None, trang_thai=None, limit=5000):
    """Return street lights prepared for map display."""
    try:
        global _routes_cache, _route_title_to_id
        _routes_cache = None
        _route_title_to_id = None

        lights = get_street_lights(khu_vuc=khu_vuc, trang_thai=trang_thai, limit=limit or 5000)
        return [
            {
                "name": light["name"],
                "ma_tai_san": light["ma_tai_san"],
                "ten_tai_san": light["ten_tai_san"],
                "route_name": light.get("route_name"),
                "khu_vuc": light["khu_vuc"],
                "ten_khu_vuc": light["ten_khu_vuc"],
                "latitude": light["latitude"],
                "longitude": light["longitude"],
                "trang_thai": light["trang_thai"],
                "device_type": light.get("device_type"),
                "device_type_code": light.get("device_type_code"),
                "device_type_name": light.get("device_type_name"),
                "device_category": light.get("device_category"),
                "lamp_type": light.get("lamp_type"),
                "power_w": light.get("power_w"),
                "pole_height_m": light.get("pole_height_m"),
                "icon_2d_url": light.get("icon_2d_url"),
                "model_3d_url": light.get("model_3d_url"),
                "model_scale": light.get("model_scale"),
                "model_bearing": light.get("model_bearing"),
                "model_height": light.get("model_height"),
            }
            for light in lights
            if light["latitude"] is not None and light["longitude"] is not None
        ]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Street Light Map Error")
        frappe.throw("Không thể tải dữ liệu bản đồ đèn đường.")


@frappe.whitelist()
def get_street_light_routes(khu_vuc=None):
    """Return saved street-light route polylines."""
    try:
        filters = {}
        if khu_vuc:
            filters["khu_vuc"] = khu_vuc

        rows = frappe.get_all(
            ROUTE_DOCTYPE,
            filters=filters,
            fields=["name", "ma_tuyen", "ten_tuyen", "khu_vuc", "polyline_json", "so_diem", "ghi_chu"],
            limit_page_length=0,
            order_by="modified desc",
        )
        area_names = _get_area_names([row.khu_vuc for row in rows])
        return [_format_route(row, area_names) for row in rows]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Street Light Routes Error")
        frappe.throw("Không thể tải danh sách tuyến đường đèn.")


@frappe.whitelist()
def create_street_light_route(data=None):
    """Create or update a street-light route polyline."""
    try:
        data = _parse_payload(data)
        _require_fields(data, ("ma_tuyen", "ten_tuyen", "khu_vuc", "polyline"))

        points = _parse_route_points(data.get("polyline"))
        code = str(data.get("ma_tuyen")).strip()
        values = {
            "ma_tuyen": code,
            "ten_tuyen": str(data.get("ten_tuyen")).strip(),
            "khu_vuc": data.get("khu_vuc"),
            "polyline_json": json.dumps(points, ensure_ascii=False),
            "so_diem": len(points),
            "ghi_chu": data.get("ghi_chu"),
        }

        existing_name = frappe.db.exists(ROUTE_DOCTYPE, {"ma_tuyen": code})
        if existing_name:
            doc = frappe.get_doc(ROUTE_DOCTYPE, existing_name)
            for fieldname, value in values.items():
                doc.set(fieldname, value)
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.get_doc({"doctype": ROUTE_DOCTYPE, **values})
            doc.insert(ignore_permissions=True)

        frappe.db.commit()
        area_names = _get_area_names([doc.khu_vuc])
        result = _format_route(doc.as_dict(), area_names)
        _log_data_history(
            "Tạo tuyến",
            ROUTE_DOCTYPE,
            doc.name,
            code,
            doc.ten_tuyen,
            "Lưu tuyến đường {0} với {1} điểm.".format(doc.ten_tuyen, len(points)),
            result,
        )
        _publish_update("street_light_route_saved", ROUTE_DOCTYPE, doc.name, result)
        return result
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Create Street Light Route Error")
        frappe.throw("Không thể lưu tuyến đường đèn.")


@frappe.whitelist()
def get_maintenance_plans(params=None, **kwargs):
    try:
        filters_data = _parse_payload(params) if params else {}
        filters_data.update({key: value for key, value in kwargs.items() if value not in (None, "")})
        filters = {key: filters_data[key] for key in ("loai_ke_hoach", "muc_uu_tien", "trang_thai", "khu_vuc", "tuyen_duong") if filters_data.get(key)}
        rows = frappe.get_all(
            MAINTENANCE_PLAN_DOCTYPE,
            filters=filters,
            fields=["name", "ma_ke_hoach", "ten_ke_hoach", "loai_ke_hoach", "muc_uu_tien", "thiet_bi", "ma_tai_san", "ten_tai_san", "tuyen_duong", "khu_vuc", "ngay_bat_dau", "ngay_ket_thuc", "noi_dung", "nguoi_phu_trach", "trang_thai", "creation", "modified", "scope_type", "related_lights_count", "related_lights_json"],
            limit_page_length=_safe_limit(filters_data.get("limit") or 100),
            order_by="modified desc",
        )
        area_names = _get_area_names([row.khu_vuc for row in rows])
        return [_format_plan(row, area_names) for row in rows]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Maintenance Plans Error")
        frappe.throw("Không thể tải danh sách kế hoạch bảo trì.")


@frappe.whitelist()
def create_maintenance_plan(data=None):
    try:
        data = _parse_payload(data)
        _require_fields(data, ("ten_ke_hoach",))
        affected_lights = data.get("related_lights") or data.get("affected_lights") or []

        # Determine scope and resolve values
        if len(affected_lights) > 1:
            scope_type = "Nhiều đèn"
            related_count = len(affected_lights)
            related_lights_json = json.dumps(affected_lights, ensure_ascii=False)
            ma_tai_san = "{0} đèn".format(related_count)
            ten_tai_san = "Nhóm {0} đèn".format(related_count)
            thiet_bi = None
            
            # Find common route
            routes = {item.get("route_name") or item.get("tuyen_duong") for item in affected_lights if item.get("route_name") or item.get("tuyen_duong")}
            if len(routes) == 1:
                tuyen_duong = list(routes)[0]
            elif len(routes) > 1:
                tuyen_duong = "Nhiều tuyến"
            else:
                tuyen_duong = data.get("tuyen_duong") or ""
                
            # Find common area
            areas = {item.get("khu_vuc") for item in affected_lights if item.get("khu_vuc")}
            if len(areas) == 1:
                khu_vuc = list(areas)[0]
            elif len(areas) > 1:
                khu_vuc = "Nhiều khu vực"
            else:
                khu_vuc = data.get("khu_vuc") or ""
        else:
            scope_type = "Một đèn"
            related_count = 1
            
            asset_name = data.get("thiet_bi")
            asset_code = data.get("ma_tai_san")
            
            if not asset_name and not asset_code and len(affected_lights) == 1:
                single_light = affected_lights[0]
                asset_name = single_light.get("name") or single_light.get("thiet_bi")
                asset_code = single_light.get("ma_tai_san")
                
            if not asset_name and asset_code:
                asset_name = frappe.db.exists(ASSET_DOCTYPE, {"ma_tai_san": asset_code})

            if not asset_name:
                frappe.throw("Vui lòng chọn thiết bị đèn đường cần bảo trì.")

            asset = frappe.get_doc(ASSET_DOCTYPE, asset_name)
            if asset.loai_tai_san != STREET_LIGHT_ASSET_TYPE:
                frappe.throw("Thiết bị được chọn không phải đèn chiếu sáng.")
                
            thiet_bi = asset.name
            ma_tai_san = asset.ma_tai_san
            ten_tai_san = asset.ten_tai_san
            tuyen_duong = data.get("tuyen_duong") or _extract_route_name(asset.ten_tai_san)
            khu_vuc = data.get("khu_vuc") or asset.khu_vuc
            
            # format as array for related_lights_json
            single_light_info = {
                "thiet_bi": asset.name,
                "ma_tai_san": asset.ma_tai_san,
                "ten_tai_san": asset.ten_tai_san,
                "tuyen_duong": tuyen_duong,
                "khu_vuc": asset.khu_vuc
            }
            related_lights_json = json.dumps([single_light_info], ensure_ascii=False)

        doc = frappe.get_doc(
            {
                "doctype": MAINTENANCE_PLAN_DOCTYPE,
                "ma_ke_hoach": data.get("ma_ke_hoach") or _generate_plan_code(),
                "ten_ke_hoach": data.get("ten_ke_hoach"),
                "loai_ke_hoach": data.get("loai_ke_hoach") or "Bảo trì định kỳ",
                "muc_uu_tien": data.get("muc_uu_tien") or "Trung bình",
                "thiet_bi": thiet_bi,
                "ma_tai_san": ma_tai_san,
                "ten_tai_san": ten_tai_san,
                "tuyen_duong": tuyen_duong,
                "khu_vuc": khu_vuc,
                "ngay_bat_dau": data.get("ngay_bat_dau"),
                "ngay_ket_thuc": data.get("ngay_ket_thuc"),
                "noi_dung": data.get("noi_dung"),
                "nguoi_phu_trach": data.get("nguoi_phu_trach"),
                "trang_thai": data.get("trang_thai") or "Lập kế hoạch",
                "scope_type": scope_type,
                "related_lights_count": related_count,
                "related_lights_json": related_lights_json
            }
        )
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        area_names = _get_area_names([doc.khu_vuc])
        result = _format_plan(doc.as_dict(), area_names)
        _log_data_history("Tạo kế hoạch bảo trì", MAINTENANCE_PLAN_DOCTYPE, doc.name, doc.ma_tai_san, doc.tuyen_duong, "Tạo kế hoạch {0}.".format(doc.ma_ke_hoach), result)
        _publish_update("maintenance_plan_created", MAINTENANCE_PLAN_DOCTYPE, doc.name, result)
        return {"name": doc.name, "data": result}
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Create Maintenance Plan Error")
        frappe.throw("Không thể tạo kế hoạch bảo trì.")


@frappe.whitelist()
def update_maintenance_plan_status(name, trang_thai):
    try:
        if trang_thai not in PLAN_STATUS_OPTIONS:
            frappe.throw("Trạng thái kế hoạch không hợp lệ.")
        doc = frappe.get_doc(MAINTENANCE_PLAN_DOCTYPE, name)
        doc.trang_thai = trang_thai
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        result = {"name": doc.name, "trang_thai": doc.trang_thai}
        _publish_update("maintenance_plan_status_updated", MAINTENANCE_PLAN_DOCTYPE, doc.name, result)
        return result
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Update Maintenance Plan Status Error")
        frappe.throw("Không thể cập nhật trạng thái kế hoạch.")


@frappe.whitelist()
def get_work_orders(params=None, **kwargs):
    try:
        filters_data = _parse_payload(params) if params else {}
        filters_data.update({key: value for key, value in kwargs.items() if value not in (None, "")})
        filters = {key: filters_data[key] for key in ("loai_cong_viec", "muc_uu_tien", "trang_thai", "khu_vuc", "tuyen_duong", "ke_hoach") if filters_data.get(key)}
        rows = frappe.get_all(
            WORK_ORDER_DOCTYPE,
            filters=filters,
            fields=["name", "ma_phieu", "tieu_de", "ke_hoach", "thiet_bi", "ma_tai_san", "ten_tai_san", "tuyen_duong", "khu_vuc", "loai_cong_viec", "muc_uu_tien", "ngay_thuc_hien", "nhan_vien_thuc_hien", "mo_ta_cong_viec", "ket_qua", "trang_thai", "creation", "modified"],
            limit_page_length=_safe_limit(filters_data.get("limit") or 100),
            order_by="modified desc",
        )
        area_names = _get_area_names([row.khu_vuc for row in rows])
        return [_format_work_order(row, area_names) for row in rows]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Work Orders Error")
        frappe.throw("Không thể tải danh sách phiếu công việc.")


@frappe.whitelist()
def create_work_order(data=None):
    try:
        data = _parse_payload(data)
        _require_fields(data, ("tieu_de",))
        asset = _resolve_street_light_asset(data)
        values = _fill_asset_values(
            {
                "doctype": WORK_ORDER_DOCTYPE,
                "ma_phieu": data.get("ma_phieu") or _generate_work_order_code(),
                "tieu_de": data.get("tieu_de"),
                "ke_hoach": data.get("ke_hoach"),
                "loai_cong_viec": data.get("loai_cong_viec") or "Bảo trì",
                "muc_uu_tien": data.get("muc_uu_tien") or "Trung bình",
                "ngay_thuc_hien": data.get("ngay_thuc_hien"),
                "nhan_vien_thuc_hien": data.get("nhan_vien_thuc_hien"),
                "mo_ta_cong_viec": data.get("mo_ta_cong_viec"),
                "ket_qua": data.get("ket_qua") or "Chưa thực hiện",
                "trang_thai": data.get("trang_thai") or "Mới",
            },
            asset,
        )
        doc = frappe.get_doc(values)
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        area_names = _get_area_names([doc.khu_vuc])
        result = _format_work_order(doc.as_dict(), area_names)
        _log_data_history("Tạo phiếu công việc", WORK_ORDER_DOCTYPE, doc.name, doc.ma_tai_san, doc.tuyen_duong, "Tạo phiếu công việc {0}.".format(doc.ma_phieu), result)
        _publish_update("work_order_created", WORK_ORDER_DOCTYPE, doc.name, result)
        return {"name": doc.name, "data": result}
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Create Work Order Error")
        frappe.throw("Không thể tạo phiếu công việc.")


@frappe.whitelist()
def update_work_order_status(name, trang_thai):
    try:
        if trang_thai not in WORK_ORDER_STATUS_OPTIONS:
            frappe.throw("Trạng thái phiếu công việc không hợp lệ.")
        doc = frappe.get_doc(WORK_ORDER_DOCTYPE, name)
        doc.trang_thai = trang_thai
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        result = {"name": doc.name, "trang_thai": doc.trang_thai}
        _publish_update("work_order_status_updated", WORK_ORDER_DOCTYPE, doc.name, result)
        return result
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Update Work Order Status Error")
        frappe.throw("Không thể cập nhật trạng thái phiếu công việc.")


@frappe.whitelist()
def get_work_logs(params=None, **kwargs):
    try:
        filters_data = _parse_payload(params) if params else {}
        filters_data.update({key: value for key, value in kwargs.items() if value not in (None, "")})
        filters = {
            key: filters_data[key]
            for key in ("phieu_cong_viec", "thiet_bi", "ma_tai_san", "loai_hanh_dong", "ket_qua", "khu_vuc", "tuyen_duong")
            if filters_data.get(key)
        }
        rows = frappe.get_all(
            WORK_LOG_DOCTYPE,
            filters=filters,
            fields=[
                "name",
                "ma_nhat_ky",
                "phieu_cong_viec",
                "thiet_bi",
                "ma_tai_san",
                "ten_tai_san",
                "tuyen_duong",
                "khu_vuc",
                "ngay_thi_cong",
                "loai_hanh_dong",
                "noi_dung_thuc_hien",
                "vat_tu_su_dung",
                "nhan_su_thuc_hien",
                "thoi_gian_bat_dau",
                "thoi_gian_ket_thuc",
                "ket_qua",
                "ghi_chu",
                "hinh_anh",
                "creation",
                "modified",
            ],
            limit_page_length=_safe_limit(filters_data.get("limit") or 100),
            order_by="modified desc",
        )
        area_names = _get_area_names([row.khu_vuc for row in rows])
        return [_format_work_log(row, area_names) for row in rows]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Work Logs Error")
        frappe.throw("Không thể tải danh sách nhật ký thi công.")


@frappe.whitelist()
def create_work_log(data=None):
    try:
        data = _parse_payload(data)
        work_order = _resolve_work_order(data)
        asset = None if work_order else _resolve_street_light_asset(data)
        values = {
            "doctype": WORK_LOG_DOCTYPE,
            "ma_nhat_ky": data.get("ma_nhat_ky") or _generate_work_log_code(),
            "ngay_thi_cong": data.get("ngay_thi_cong") or frappe.utils.today(),
            "loai_hanh_dong": data.get("loai_hanh_dong") or "Bảo trì",
            "noi_dung_thuc_hien": data.get("noi_dung_thuc_hien"),
            "vat_tu_su_dung": data.get("vat_tu_su_dung"),
            "nhan_su_thuc_hien": data.get("nhan_su_thuc_hien"),
            "thoi_gian_bat_dau": data.get("thoi_gian_bat_dau"),
            "thoi_gian_ket_thuc": data.get("thoi_gian_ket_thuc"),
            "ket_qua": data.get("ket_qua") or "Đạt",
            "ghi_chu": data.get("ghi_chu"),
            "hinh_anh": data.get("hinh_anh"),
        }
        values = _fill_from_work_order(values, work_order)
        values = _fill_asset_values(values, asset)
        doc = frappe.get_doc(values)
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        area_names = _get_area_names([doc.khu_vuc])
        result = _format_work_log(doc.as_dict(), area_names)
        _log_data_history("Tạo nhật ký thi công", WORK_LOG_DOCTYPE, doc.name, doc.ma_tai_san, doc.tuyen_duong, "Tạo nhật ký thi công {0}.".format(doc.ma_nhat_ky), result)
        _publish_update("work_log_created", WORK_LOG_DOCTYPE, doc.name, result)
        return {"name": doc.name, "data": result}
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Create Work Log Error")
        frappe.throw("Không thể tạo nhật ký thi công.")


@frappe.whitelist()
def get_acceptance_records(params=None, **kwargs):
    try:
        filters_data = _parse_payload(params) if params else {}
        filters_data.update({key: value for key, value in kwargs.items() if value not in (None, "")})
        filters = {
            key: filters_data[key]
            for key in ("phieu_cong_viec", "ke_hoach", "thiet_bi", "ma_tai_san", "ket_qua_nghiem_thu", "trang_thai", "khu_vuc", "tuyen_duong")
            if filters_data.get(key)
        }
        rows = frappe.get_all(
            ACCEPTANCE_DOCTYPE,
            filters=filters,
            fields=[
                "name",
                "ma_bien_ban",
                "phieu_cong_viec",
                "ke_hoach",
                "thiet_bi",
                "ma_tai_san",
                "ten_tai_san",
                "tuyen_duong",
                "khu_vuc",
                "ngay_nghiem_thu",
                "nguoi_nghiem_thu",
                "don_vi_thuc_hien",
                "ket_qua_nghiem_thu",
                "noi_dung_nghiem_thu",
                "kien_nghi",
                "trang_thai",
                "hinh_anh",
                "creation",
                "modified",
            ],
            limit_page_length=_safe_limit(filters_data.get("limit") or 100),
            order_by="modified desc",
        )
        area_names = _get_area_names([row.khu_vuc for row in rows])
        return [_format_acceptance(row, area_names) for row in rows]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Acceptance Records Error")
        frappe.throw("Không thể tải danh sách biên bản nghiệm thu.")


@frappe.whitelist()
def create_acceptance_record(data=None):
    try:
        data = _parse_payload(data)
        work_order = _resolve_work_order(data)
        asset = None if work_order else _resolve_street_light_asset(data)
        values = {
            "doctype": ACCEPTANCE_DOCTYPE,
            "ma_bien_ban": data.get("ma_bien_ban") or _generate_acceptance_code(),
            "ke_hoach": data.get("ke_hoach"),
            "ngay_nghiem_thu": data.get("ngay_nghiem_thu") or frappe.utils.today(),
            "nguoi_nghiem_thu": data.get("nguoi_nghiem_thu"),
            "don_vi_thuc_hien": data.get("don_vi_thuc_hien"),
            "ket_qua_nghiem_thu": data.get("ket_qua_nghiem_thu") or "Đạt",
            "noi_dung_nghiem_thu": data.get("noi_dung_nghiem_thu"),
            "kien_nghi": data.get("kien_nghi"),
            "trang_thai": data.get("trang_thai") or "Nháp",
            "hinh_anh": data.get("hinh_anh"),
        }
        values = _fill_from_work_order(values, work_order)
        values = _fill_asset_values(values, asset)
        doc = frappe.get_doc(values)
        doc.insert(ignore_permissions=True)

        if work_order and doc.ket_qua_nghiem_thu == "Đạt":
            work_order.trang_thai = "Hoàn thành"
            work_order.ket_qua = "Đạt"
            work_order.save(ignore_permissions=True)

        frappe.db.commit()
        area_names = _get_area_names([doc.khu_vuc])
        result = _format_acceptance(doc.as_dict(), area_names)
        _log_data_history("Tạo biên bản nghiệm thu", ACCEPTANCE_DOCTYPE, doc.name, doc.ma_tai_san, doc.tuyen_duong, "Tạo biên bản nghiệm thu {0}.".format(doc.ma_bien_ban), result)
        _publish_update("acceptance_created", ACCEPTANCE_DOCTYPE, doc.name, result)
        return {"name": doc.name, "data": result}
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Create Acceptance Record Error")
        frappe.throw("Không thể tạo biên bản nghiệm thu.")


@frappe.whitelist()
def update_acceptance_status(name, trang_thai):
    try:
        if trang_thai not in ACCEPTANCE_STATUS_OPTIONS:
            frappe.throw("Trạng thái nghiệm thu không hợp lệ.")
        doc = frappe.get_doc(ACCEPTANCE_DOCTYPE, name)
        doc.trang_thai = trang_thai
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        result = {"name": doc.name, "trang_thai": doc.trang_thai}
        _publish_update("acceptance_status_updated", ACCEPTANCE_DOCTYPE, doc.name, result)
        return result
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Update Acceptance Status Error")
        frappe.throw("Không thể cập nhật trạng thái nghiệm thu.")


@frappe.whitelist()
def get_street_light_inspections(params=None, **kwargs):
    """Return technical inspection tickets for street lights."""
    try:
        filters_data = _parse_payload(params) if params else {}
        filters_data.update({key: value for key, value in kwargs.items() if value not in (None, "")})
        filters = {}

        if filters_data.get("thiet_bi"):
            filters["thiet_bi"] = filters_data.get("thiet_bi")
        if filters_data.get("ma_tai_san"):
            filters["ma_tai_san"] = filters_data.get("ma_tai_san")
        if filters_data.get("khu_vuc"):
            filters["khu_vuc"] = filters_data.get("khu_vuc")
        if filters_data.get("tuyen_duong"):
            filters["tuyen_duong"] = filters_data.get("tuyen_duong")
        if filters_data.get("ket_luan"):
            filters["ket_luan"] = filters_data.get("ket_luan")
        if filters_data.get("muc_an_toan"):
            filters["muc_an_toan"] = filters_data.get("muc_an_toan")
        if filters_data.get("trang_thai"):
            filters["trang_thai"] = filters_data.get("trang_thai")

        rows = frappe.get_all(
            INSPECTION_DOCTYPE,
            filters=filters,
            fields=[
                "name",
                "ma_phieu",
                "ngay_kiem_tra",
                "thiet_bi",
                "ma_tai_san",
                "ten_tai_san",
                "tuyen_duong",
                "khu_vuc",
                "tinh_trang_dien",
                "tinh_trang_cot",
                "tinh_trang_day",
                "muc_an_toan",
                "ket_luan",
                "mo_ta",
                "nguoi_kiem_tra",
                "trang_thai",
                "hinh_anh",
                "creation",
                "modified",
                "scope_type",
                "related_lights_count",
                "related_lights_json",
            ],
            limit_page_length=_safe_limit(filters_data.get("limit") or 100),
            order_by="modified desc",
        )
        area_names = _get_area_names([row.khu_vuc for row in rows])
        return [_format_inspection(row, area_names) for row in rows]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Street Light Inspections Error")
        frappe.throw("Không thể tải danh sách phiếu kiểm tra đèn đường.")


@frappe.whitelist()
def create_street_light_inspection(data=None):
    """Create a technical inspection ticket for a street light."""
    try:
        data = _parse_payload(data)
        affected_lights = data.get("related_lights") or data.get("affected_lights") or []
        
        status = data.get("trang_thai") or "Hoàn thành"
        if status not in INSPECTION_STATUS_OPTIONS:
            frappe.throw("Trạng thái phiếu kiểm tra không hợp lệ.")

        safety = data.get("muc_an_toan") or "An toàn"
        if safety not in INSPECTION_SAFETY_OPTIONS:
            frappe.throw("Mức an toàn không hợp lệ.")

        result = data.get("ket_luan") or "Đạt"
        if result not in INSPECTION_RESULT_OPTIONS:
            frappe.throw("Kết luận kiểm tra không hợp lệ.")

        # Determine scope and resolve values
        if len(affected_lights) > 1:
            scope_type = "Nhiều đèn"
            related_count = len(affected_lights)
            related_lights_json = json.dumps(affected_lights, ensure_ascii=False)
            ma_tai_san = "{0} đèn".format(related_count)
            ten_tai_san = "Nhóm {0} đèn".format(related_count)
            thiet_bi = None
            
            # Find common route
            routes = {item.get("route_name") or item.get("tuyen_duong") for item in affected_lights if item.get("route_name") or item.get("tuyen_duong")}
            if len(routes) == 1:
                tuyen_duong = list(routes)[0]
            elif len(routes) > 1:
                tuyen_duong = "Nhiều tuyến"
            else:
                tuyen_duong = data.get("tuyen_duong") or ""
                
            # Find common area
            areas = {item.get("khu_vuc") for item in affected_lights if item.get("khu_vuc")}
            if len(areas) == 1:
                khu_vuc = list(areas)[0]
            else:
                khu_vuc = data.get("khu_vuc") or ""
        else:
            scope_type = "Một đèn"
            related_count = 1
            
            asset_name = data.get("thiet_bi")
            asset_code = data.get("ma_tai_san")
            
            if not asset_name and not asset_code and len(affected_lights) == 1:
                single_light = affected_lights[0]
                asset_name = single_light.get("name") or single_light.get("thiet_bi")
                asset_code = single_light.get("ma_tai_san")
                
            if not asset_name and asset_code:
                asset_name = frappe.db.exists(ASSET_DOCTYPE, {"ma_tai_san": asset_code})

            if not asset_name:
                frappe.throw("Vui lòng chọn thiết bị đèn đường cần kiểm tra.")

            asset = frappe.get_doc(ASSET_DOCTYPE, asset_name)
            if asset.loai_tai_san != STREET_LIGHT_ASSET_TYPE:
                frappe.throw("Thiết bị được chọn không phải đèn chiếu sáng.")
                
            thiet_bi = asset.name
            ma_tai_san = asset.ma_tai_san
            ten_tai_san = asset.ten_tai_san
            tuyen_duong = data.get("tuyen_duong") or _extract_route_name(asset.ten_tai_san)
            khu_vuc = data.get("khu_vuc") or asset.khu_vuc
            
            # format as array for related_lights_json
            single_light_info = {
                "thiet_bi": asset.name,
                "ma_tai_san": asset.ma_tai_san,
                "ten_tai_san": asset.ten_tai_san,
                "tuyen_duong": tuyen_duong,
                "khu_vuc": asset.khu_vuc
            }
            related_lights_json = json.dumps([single_light_info], ensure_ascii=False)

        doc = frappe.get_doc(
            {
                "doctype": INSPECTION_DOCTYPE,
                "ma_phieu": data.get("ma_phieu") or _generate_inspection_code(),
                "ngay_kiem_tra": data.get("ngay_kiem_tra") or frappe.utils.nowdate(),
                "thiet_bi": thiet_bi,
                "ma_tai_san": ma_tai_san,
                "ten_tai_san": ten_tai_san,
                "tuyen_duong": tuyen_duong,
                "khu_vuc": khu_vuc,
                "tinh_trang_dien": data.get("tinh_trang_dien") or "Bình thường",
                "tinh_trang_cot": data.get("tinh_trang_cot") or "Tốt",
                "tinh_trang_day": data.get("tinh_trang_day") or "Tốt",
                "muc_an_toan": safety,
                "ket_luan": result,
                "mo_ta": data.get("mo_ta"),
                "nguoi_kiem_tra": data.get("nguoi_kiem_tra"),
                "trang_thai": status,
                "hinh_anh": data.get("hinh_anh"),
                "scope_type": scope_type,
                "related_lights_count": related_count,
                "related_lights_json": related_lights_json
            }
        )
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        area_names = _get_area_names([doc.khu_vuc])
        formatted = _format_inspection(doc.as_dict(), area_names)
        _log_data_history(
            "Tạo phiếu kiểm tra",
            INSPECTION_DOCTYPE,
            doc.name,
            doc.ma_tai_san,
            doc.tuyen_duong,
            "Tạo phiếu kiểm tra {0} cho đèn {1}.".format(doc.ma_phieu, doc.ma_tai_san),
            formatted,
        )
        _publish_update("street_light_inspection_created", INSPECTION_DOCTYPE, doc.name, formatted)
        return {"name": doc.name, "data": formatted}
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Create Street Light Inspection Error")
        frappe.throw("Không thể tạo phiếu kiểm tra đèn đường.")


@frappe.whitelist()
def update_street_light_inspection_status(name, trang_thai):
    """Update status for a technical inspection ticket."""
    try:
        if trang_thai not in INSPECTION_STATUS_OPTIONS:
            frappe.throw("Trạng thái phiếu kiểm tra không hợp lệ.")

        doc = frappe.get_doc(INSPECTION_DOCTYPE, name)
        doc.trang_thai = trang_thai
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        result = {"name": doc.name, "trang_thai": doc.trang_thai}
        _publish_update("street_light_inspection_status_updated", INSPECTION_DOCTYPE, doc.name, result)
        return result
    except frappe.ValidationError:
        raise
    except frappe.DoesNotExistError:
        frappe.throw("Không tìm thấy phiếu kiểm tra cần cập nhật.")
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Update Street Light Inspection Status Error")
        frappe.throw("Không thể cập nhật trạng thái phiếu kiểm tra.")


@frappe.whitelist()
def get_street_light_incidents(
    khu_vuc=None,
    trang_thai=None,
    muc_do_uu_tien=None,
    route_name=None,
    light=None,
    limit=100,
):
    """Return street light incident reports."""
    try:
        filters = {"loai_van_de": STREET_LIGHT_INCIDENT_TYPE}
        if khu_vuc:
            filters["khu_vuc"] = khu_vuc
        if trang_thai:
            filters["trang_thai"] = trang_thai
        if muc_do_uu_tien:
            filters["muc_do_uu_tien"] = muc_do_uu_tien

        rows = frappe.get_all(
            INCIDENT_DOCTYPE,
            filters=filters,
            fields=[
                "name",
                "tieu_de",
                "loai_van_de",
                "khu_vuc",
                "vi_tri_gps",
                "mo_ta_chi_tiet",
                "hinh_anh_minh_hoa",
                "muc_do_uu_tien",
                "nguoi_bao_cao",
                "sdt_lien_he",
                "trang_thai",
                "creation",
                "modified",
                "scope_type",
                "related_lights_count",
                "related_lights_json",
            ],
            limit_page_length=_safe_limit(limit),
            order_by="modified desc",
        )
        area_names = _get_area_names([row.khu_vuc for row in rows])

        incidents = []
        for row in rows:
            location = parse_geolocation(row.get("vi_tri_gps"))
            incident = dict(row)
            incident["route_name"] = _extract_incident_route_name(row)
            incident["ma_tai_san"] = _extract_incident_light_code(row)
            incident["ten_khu_vuc"] = area_names.get(row.get("khu_vuc"))
            incident["latitude"] = location["latitude"]
            incident["longitude"] = location["longitude"]

            related_lights = []
            rel_json = row.get("related_lights_json")
            if rel_json:
                try:
                    related_lights = json.loads(rel_json)
                    if not isinstance(related_lights, list):
                        related_lights = []
                except Exception:
                    related_lights = []

            rel_count = row.get("related_lights_count")
            if rel_count is None:
                rel_count = len(related_lights)

            incident["related_lights"] = related_lights
            incident["related_lights_count"] = rel_count
            incident["scope_type"] = row.get("scope_type") or ("Nhiều đèn" if len(related_lights) > 1 else "Một đèn")

            if route_name and incident.get("route_name") != route_name:
                continue
            if light and light not in (incident.get("ma_tai_san"), incident.get("tieu_de"), incident.get("name")):
                continue
            incidents.append(incident)

        return incidents
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Street Light Incidents Error")
        frappe.throw("Không thể tải danh sách sự cố đèn đường.")


@frappe.whitelist()
def create_street_light_incident(data=None):
    """Create a street light incident report."""
    try:
        data = _parse_payload(data)
        _require_fields(data, ("tieu_de", "khu_vuc", "mo_ta_chi_tiet", "nguoi_bao_cao"))

        latitude = data.get("latitude")
        longitude = data.get("longitude")
        gps_value = data.get("vi_tri_gps")
        if not gps_value and latitude is not None and longitude is not None:
            gps_value = "{0:.6f},{1:.6f}".format(float(latitude), float(longitude))
        if not gps_value:
            frappe.throw("Thiếu thông tin vị trí sự cố.")

        light_code = data.get("ma_tai_san") or data.get("street_light")
        route_name = data.get("route_name")

        affected_lights = data.get("affected_lights") or []
        related_count = len(affected_lights)

        detail_lines = []
        if related_count > 1:
            codes = [item.get("ma_tai_san") for item in affected_lights if item.get("ma_tai_san")]
            detail_lines.append("Danh sách đèn bị ảnh hưởng: {0}".format(", ".join(codes)))
            if route_name:
                detail_lines.append("Tuyến đường: {0}".format(route_name))
            
            related_lights_json = json.dumps(affected_lights, ensure_ascii=False)
            related_lights_count = related_count
            scope_type = "Nhiều đèn"
        else:
            if light_code:
                detail_lines.append("Mã đèn: {0}".format(light_code))
            if route_name:
                detail_lines.append("Tuyến đường: {0}".format(route_name))
            
            if related_count == 1:
                related_lights_json = json.dumps(affected_lights, ensure_ascii=False)
            else:
                single_light_info = [{
                    "name": data.get("street_light") or "",
                    "ma_tai_san": data.get("ma_tai_san") or "",
                    "route_name": data.get("route_name") or "",
                    "khu_vuc": data.get("khu_vuc") or "",
                    "latitude": latitude,
                    "longitude": longitude
                }]
                related_lights_json = json.dumps(single_light_info, ensure_ascii=False)
            
            related_lights_count = 1
            scope_type = "Một đèn"

        detail_lines.append(str(data.get("mo_ta_chi_tiet")))
        detail = "\n".join(detail_lines)

        doc = frappe.get_doc(
            {
                "doctype": INCIDENT_DOCTYPE,
                "loai_van_de": STREET_LIGHT_INCIDENT_TYPE,
                "tieu_de": data.get("tieu_de"),
                "khu_vuc": data.get("khu_vuc"),
                "vi_tri_gps": gps_value,
                "mo_ta_chi_tiet": detail,
                "hinh_anh_minh_hoa": data.get("hinh_anh_minh_hoa"),
                "muc_do_uu_tien": data.get("muc_do_uu_tien") or "Trung bình",
                "nguoi_bao_cao": data.get("nguoi_bao_cao"),
                "sdt_lien_he": data.get("sdt_lien_he"),
                "trang_thai": data.get("trang_thai") or "Mới",
                "scope_type": scope_type,
                "related_lights_count": related_lights_count,
                "related_lights_json": related_lights_json,
            }
        )
        doc.insert()
        frappe.db.commit()

        location = parse_geolocation(doc.vi_tri_gps)
        result = doc.as_dict()
        result["route_name"] = route_name
        result["ma_tai_san"] = light_code
        result["latitude"] = location["latitude"]
        result["longitude"] = location["longitude"]
        _publish_update("incident_created", INCIDENT_DOCTYPE, doc.name, result)
        return {"name": doc.name, "data": result}
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Create Street Light Incident Error")
        frappe.throw("Không thể tạo sự cố đèn đường.")


def _require_fields(data, fields):
    missing_fields = [field for field in fields if not data.get(field)]
    if missing_fields:
        frappe.throw("Thiếu thông tin bắt buộc: {0}".format(", ".join(missing_fields)))


@frappe.whitelist()
def create_street_light(data=None):
    """Create a street light asset using the existing infrastructure asset DocType."""
    try:
        data = _parse_payload(data)
        _require_fields(data, ("ma_tai_san", "route_name", "khu_vuc", "latitude", "longitude"))

        status = data.get("trang_thai") or "Hoạt động"
        if status not in LIGHT_STATUS_OPTIONS:
            frappe.throw("Trạng thái đèn đường không hợp lệ.")

        code = str(data.get("ma_tai_san")).strip()
        if frappe.db.exists(ASSET_DOCTYPE, {"ma_tai_san": code}):
            frappe.throw("Mã đèn đã tồn tại: {0}".format(code))

        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))
        route_name = str(data.get("route_name")).strip()
        matched_id = _get_route_id_by_title(route_name)
        if matched_id:
            db_ten_tuyen = frappe.db.get_value(ROUTE_DOCTYPE, matched_id, "ten_tuyen")
            if db_ten_tuyen:
                route_name = db_ten_tuyen

        title = data.get("ten_tai_san") or "Đèn chiếu sáng - {0} - {1}".format(route_name, code)
        device_type_name = _resolve_device_type_name(data)

        doc = frappe.get_doc(
            {
                "doctype": ASSET_DOCTYPE,
                "ma_tai_san": code,
                "ten_tai_san": title,
                "loai_tai_san": STREET_LIGHT_ASSET_TYPE,
                "loai_thiet_bi_chieu_sang": device_type_name,
                "khu_vuc": data.get("khu_vuc"),
                "toa_do_gps": "{0:.6f},{1:.6f}".format(latitude, longitude),
                "trang_thai": status,
                "chi_phi_bao_duong": data.get("chi_phi_bao_duong") or 0,
                "ngay_lap_dat": data.get("ngay_lap_dat"),
            }
        )
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        area_names = _get_area_names([doc.khu_vuc])
        device_type_rows = _get_device_type_rows([doc.loai_thiet_bi_chieu_sang])
        result = _format_street_light(doc.as_dict(), area_names, device_type_rows)
        _log_data_history(
            "Tạo đèn",
            ASSET_DOCTYPE,
            doc.name,
            doc.ma_tai_san,
            route_name,
            "Tạo đèn {0} trên tuyến {1}.".format(doc.ma_tai_san, route_name),
            result,
        )
        _publish_update("street_light_created", ASSET_DOCTYPE, doc.name, result)
        return {"name": doc.name, "data": result}
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Create Street Light Error")
        frappe.throw("Không thể tạo đèn đường.")


@frappe.whitelist()
def create_batch_street_lights(data=None):
    """Create a batch of street light assets from a list of coordinates."""
    try:
        data = _parse_payload(data)
        _require_fields(data, ("coordinates", "ma_prefix", "khu_vuc"))

        coordinates = data.get("coordinates")
        if not isinstance(coordinates, list) or not coordinates:
            frappe.throw("Danh sách tọa độ không hợp lệ hoặc trống.")

        status = data.get("trang_thai") or "Hoạt động"
        if status not in LIGHT_STATUS_OPTIONS:
            frappe.throw("Trạng thái đèn đường không hợp lệ.")

        prefix = str(data.get("ma_prefix")).strip()
        start_index = int(data.get("start_index") or 1)
        route_name = str(data.get("route_name") or "Đường tự do").strip()
        matched_id = _get_route_id_by_title(route_name)
        if matched_id:
            db_ten_tuyen = frappe.db.get_value(ROUTE_DOCTYPE, matched_id, "ten_tuyen")
            if db_ten_tuyen:
                route_name = db_ten_tuyen

        device_type_name = _resolve_device_type_name(data)

        created = []
        skipped = []
        
        for idx, coord in enumerate(coordinates, start=start_index):
            code = f"{prefix}-{idx:04d}"
            if frappe.db.exists(ASSET_DOCTYPE, {"ma_tai_san": code}):
                skipped.append(code)
                continue

            lat, lng = _get_coords(coord)
            title = f"Đèn chiếu sáng - {route_name} - {code}"
            doc = frappe.get_doc(
                {
                    "doctype": ASSET_DOCTYPE,
                    "ma_tai_san": code,
                    "ten_tai_san": title,
                    "loai_tai_san": STREET_LIGHT_ASSET_TYPE,
                    "loai_thiet_bi_chieu_sang": device_type_name,
                    "khu_vuc": data.get("khu_vuc"),
                    "toa_do_gps": "{0:.6f},{1:.6f}".format(lat, lng),
                    "trang_thai": status,
                    "chi_phi_bao_duong": data.get("chi_phi_bao_duong") or 0,
                    "ngay_lap_dat": data.get("ngay_lap_dat"),
                }
            )
            doc.insert(ignore_permissions=True)
            created.append(doc.name)

        frappe.db.commit()

        result = {
            "total_created": len(created),
            "skipped": skipped,
            "created": created,
        }

        _log_data_history(
            "Tạo chuỗi đèn",
            ASSET_DOCTYPE,
            prefix,
            prefix,
            route_name,
            "Tạo hàng loạt {0} đèn trên tuyến {1}, bỏ qua {2} mã trùng.".format(
                len(created), route_name, len(skipped)
            ),
            result,
        )
        _publish_update("street_lights_generated", ASSET_DOCTYPE, prefix, result)
        return result
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Create Batch Street Lights Error")
        frappe.throw("Không thể tạo hàng loạt đèn đường.")


@frappe.whitelist()
def update_street_light(data=None):
    """Update a street light asset and return the refreshed map/list record."""
    try:
        data = _parse_payload(data)
        name = data.get("name")
        code = str(data.get("ma_tai_san") or "").strip()

        if name:
            doc_name = name
        elif code:
            doc_name = frappe.db.exists(ASSET_DOCTYPE, {"ma_tai_san": code})
        else:
            frappe.throw("Cần truyền name hoặc ma_tai_san để cập nhật đèn.")

        if not doc_name:
            frappe.throw("Không tìm thấy đèn đường cần cập nhật.")

        doc = frappe.get_doc(ASSET_DOCTYPE, doc_name)
        if doc.loai_tai_san != STREET_LIGHT_ASSET_TYPE:
            frappe.throw("Tài sản này không phải là đèn chiếu sáng.")

        status = data.get("trang_thai")
        if status:
            if status not in LIGHT_STATUS_OPTIONS:
                frappe.throw("Trạng thái đèn đường không hợp lệ.")
            doc.trang_thai = status

        route_name = str(data.get("route_name") or "").strip()
        if route_name:
            matched_id = _get_route_id_by_title(route_name)
            if matched_id:
                db_ten_tuyen = frappe.db.get_value(ROUTE_DOCTYPE, matched_id, "ten_tuyen")
                if db_ten_tuyen:
                    route_name = db_ten_tuyen

        if data.get("ten_tai_san") and not route_name:
            doc.ten_tai_san = data.get("ten_tai_san")
        if route_name:
            doc.ten_tai_san = "Đèn chiếu sáng - {0} - {1}".format(route_name, doc.ma_tai_san)

        if data.get("khu_vuc") is not None:
            doc.khu_vuc = data.get("khu_vuc")
        if data.get("ngay_lap_dat") is not None:
            doc.ngay_lap_dat = data.get("ngay_lap_dat")
        if data.get("chi_phi_bao_duong") is not None:
            doc.chi_phi_bao_duong = data.get("chi_phi_bao_duong") or 0

        if data.get("latitude") is not None and data.get("longitude") is not None:
            latitude = float(data.get("latitude"))
            longitude = float(data.get("longitude"))
            doc.toa_do_gps = "{0:.6f},{1:.6f}".format(latitude, longitude)

        if data.get("device_type_code") or data.get("loai_thiet_bi_chieu_sang"):
            doc.loai_thiet_bi_chieu_sang = _resolve_device_type_name(data)

        doc.save(ignore_permissions=True)
        frappe.db.commit()

        area_names = _get_area_names([doc.khu_vuc])
        device_type_rows = _get_device_type_rows([doc.loai_thiet_bi_chieu_sang])
        result = _format_street_light(doc.as_dict(), area_names, device_type_rows)
        _log_data_history(
            "Cập nhật đèn",
            ASSET_DOCTYPE,
            doc.name,
            doc.ma_tai_san,
            result.get("route_name"),
            "Cập nhật đèn {0}.".format(doc.ma_tai_san),
            result,
        )
        _publish_update("street_light_updated", ASSET_DOCTYPE, doc.name, result)
        return {"name": doc.name, "data": result}
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Update Street Light Error")
        frappe.throw("Không thể cập nhật đèn đường.")


@frappe.whitelist()
def generate_street_lights_for_route(data=None):
    """Generate multiple street lights along a saved route polyline."""
    try:
        data = _parse_payload(data)
        route_id = data.get("route_id")
        if not route_id:
            frappe.throw("Thiếu thông tin tuyến đường đã chọn (route_id).")
        if not frappe.db.exists(ROUTE_DOCTYPE, route_id):
            frappe.throw("Không tìm thấy tuyến đường đã chọn")

        route_doc = frappe.get_doc(ROUTE_DOCTYPE, route_id)
        raw_polyline = _parse_route_points(route_doc.polyline_json)
        if not raw_polyline or len(raw_polyline) < 2:
            frappe.throw("Tuyến đường phải có ít nhất 2 điểm.")

        deleted_existing = []
        if data.get("replace_existing"):
            def _route_name_from_title(title):
                parts = [part.strip() for part in str(title or "").split(" - ") if part.strip()]
                if len(parts) >= 3 and parts[0] == "Đèn chiếu sáng":
                    return " - ".join(parts[1:-1]).strip()
                return ""

            existing_lights = frappe.get_all(
                ASSET_DOCTYPE,
                filters={"loai_tai_san": STREET_LIGHT_ASSET_TYPE},
                fields=["name", "ten_tai_san"],
                limit_page_length=5000,
            )
            for light in existing_lights:
                if _route_name_from_title(light.ten_tai_san) == route_doc.ten_tuyen:
                    frappe.delete_doc(ASSET_DOCTYPE, light.name, ignore_permissions=True)
                    deleted_existing.append(light.name)
            
        polyline_coords = [[p["latitude"], p["longitude"]] for p in raw_polyline]
        polyline_points, cumulative_lengths = _build_polyline_cumulative(polyline_coords)

        count_positions = data.get("count_positions") or data.get("count")
        if count_positions is None:
            frappe.throw("Thiếu số vị trí/số lượng đèn.")
        count_positions = int(count_positions)
        if count_positions <= 0 or count_positions > 1000:
            frappe.throw("Số lượng vị trí phải trong khoảng 1-1000.")

        placement_mode = data.get("placement_mode")
        if not placement_mode:
            if data.get("both_sides") is not None:
                placement_mode = "both_sides" if bool(data.get("both_sides")) else "single_side"
            else:
                placement_mode = "both_sides"
                
        side = data.get("side") or "left"
        if side not in ("left", "right"):
            side = "left"

        offset_m = data.get("offset_m")
        if offset_m is None:
            old_offset = data.get("offset")
            if old_offset is not None:
                old_offset = float(old_offset)
                if old_offset < 0.01:
                    offset_m = old_offset * 111320.0
                else:
                    offset_m = old_offset
            else:
                offset_m = 6.0
        else:
            offset_m = float(offset_m)

        start_margin_m = float(data.get("start_margin_m") or 0.0)
        end_margin_m = float(data.get("end_margin_m") or 0.0)

        prefix = data.get("prefix") or data.get("ma_prefix") or "DEN"
        prefix = str(prefix).strip()
        start_index = int(data.get("start_index") or 1)

        status = data.get("trang_thai") or "Hoạt động"
        if status not in LIGHT_STATUS_OPTIONS:
            frappe.throw("Trạng thái đèn đường không hợp lệ.")

        device_type_code = data.get("device_type_code")
        if not device_type_code:
            device_type_name = _resolve_device_type_name(data)
        else:
            device_type_name = device_type_code

        route_length_m = cumulative_lengths[-1]
        usable_length = route_length_m - start_margin_m - end_margin_m
        if usable_length < 0:
            frappe.throw("Khoảng chừa đầu/cuối lớn hơn chiều dài tuyến.")

        positions_distances = []
        if count_positions == 1:
            positions_distances.append(start_margin_m + usable_length / 2.0)
        elif count_positions > 1:
            spacing = usable_length / (count_positions - 1) if usable_length > 0 else 0.0
            for i in range(count_positions):
                positions_distances.append(start_margin_m + i * spacing)
        spacing_m = usable_length / (count_positions - 1) if (count_positions > 1 and usable_length > 0) else 0.0

        points_to_create = []
        generated_base_positions = []
        reserved_codes = set()
        next_code_index = start_index
        side_suffixes = ["L", "R"] if placement_mode == "both_sides" else (["L"] if side == "left" else ["R"])

        if placement_mode not in ("single_side", "both_sides"):
            frappe.throw("Kiểu bố trí đèn không hợp lệ.")

        for position_order, dist_m in enumerate(positions_distances, start=1):
            pt_info = get_point_and_heading_at_distance(polyline_points, cumulative_lengths, dist_m)
            heading = pt_info["heading_degrees"]
            generated_base_positions.append({
                "order": position_order,
                "distance_m": round(dist_m, 3),
                "lat": pt_info["lat"],
                "lng": pt_info["lng"],
                "heading_degrees": heading,
                "segment_index": pt_info["segment_index"],
            })
            allocated_codes, next_code_index = _allocate_light_code_group(
                prefix,
                next_code_index,
                side_suffixes,
                reserved_codes,
            )
            
            if placement_mode == "single_side":
                offset_pt = offset_point(pt_info["lat"], pt_info["lng"], heading, offset_m, side)
                model_bearing = (heading + 90) % 360 if side == "left" else (heading - 90) % 360
                side_suffix = "L" if side == "left" else "R"
                points_to_create.append({
                    "lat": offset_pt["lat"],
                    "lng": offset_pt["lng"],
                    "code": allocated_codes[side_suffix],
                    "bearing": model_bearing,
                    "base_distance_m": round(dist_m, 3),
                    "side": side,
                })
            elif placement_mode == "both_sides":
                offset_pt_l = offset_point(pt_info["lat"], pt_info["lng"], heading, offset_m, "left")
                bearing_l = (heading + 90) % 360
                points_to_create.append({
                    "lat": offset_pt_l["lat"],
                    "lng": offset_pt_l["lng"],
                    "code": allocated_codes["L"],
                    "bearing": bearing_l,
                    "base_distance_m": round(dist_m, 3),
                    "side": "left",
                })
                offset_pt_r = offset_point(pt_info["lat"], pt_info["lng"], heading, offset_m, "right")
                bearing_r = (heading - 90) % 360
                points_to_create.append({
                    "lat": offset_pt_r["lat"],
                    "lng": offset_pt_r["lng"],
                    "code": allocated_codes["R"],
                    "bearing": bearing_r,
                    "base_distance_m": round(dist_m, 3),
                    "side": "right",
                })

        created = []
        skipped = []
        generated_points = []
        for item in points_to_create:
            code = item["code"]
            if frappe.db.exists(ASSET_DOCTYPE, {"ma_tai_san": code}):
                skipped.append(code)
                continue

            title = f"Đèn chiếu sáng - {route_doc.ten_tuyen} - {code}"
            doc = frappe.get_doc(
                {
                    "doctype": ASSET_DOCTYPE,
                    "ma_tai_san": code,
                    "ten_tai_san": title,
                    "loai_tai_san": STREET_LIGHT_ASSET_TYPE,
                    "loai_thiet_bi_chieu_sang": device_type_name,
                    "khu_vuc": route_doc.khu_vuc,
                    "toa_do_gps": "{0:.6f},{1:.6f}".format(item["lat"], item["lng"]),
                    "trang_thai": status,
                    "chi_phi_bao_duong": data.get("chi_phi_bao_duong") or 0,
                    "ngay_lap_dat": data.get("ngay_lap_dat"),
                }
            )
            doc.insert(ignore_permissions=True)
            created.append(doc.name)
            generated_points.append({
                "name": doc.name,
                "ma_tai_san": code,
                "latitude": item["lat"],
                "longitude": item["lng"],
                "base_distance_m": item.get("base_distance_m"),
                "side": item.get("side"),
                "bearing": item.get("bearing"),
            })

        frappe.db.commit()

        result = {
            "route_id": route_doc.name,
            "route_name": route_doc.ten_tuyen,
            "route_length_m": round(route_length_m, 2),
            "total_length_m": round(route_length_m, 2),
            "usable_length_m": round(usable_length, 2),
            "requested_positions": count_positions,
            "count_positions": count_positions,
            "placement_mode": placement_mode,
            "total_created": len(created),
            "spacing_m": round(spacing_m, 2),
            "offset_m": offset_m,
            "generated_base_positions_count": len(generated_base_positions),
            "generated_points": generated_points,
            "created": created,
            "skipped": skipped,
            "deleted_existing": deleted_existing,
        }

        frappe.logger("street_light_service").info(
            "GENERATE_STREET_LIGHTS_DEBUG {0}".format(
                json.dumps(
                    {
                        "route_id": route_doc.name,
                        "total_length_m": round(route_length_m, 3),
                        "usable_length_m": round(usable_length, 3),
                        "requested_positions": count_positions,
                        "placement_mode": placement_mode,
                        "spacing": round(spacing_m, 3),
                        "generated_base_positions_count": len(generated_base_positions),
                        "total_created": len(created),
                        "deleted_existing": len(deleted_existing),
                    },
                    ensure_ascii=False,
                )
            )
        )
        
        history_desc = (
            f"Tạo chuỗi đèn theo tuyến {route_doc.ten_tuyen}: "
            f"Chế độ: {placement_mode}, "
            f"Số vị trí: {count_positions}, "
            f"Tổng số đèn tạo: {len(created)}, "
            f"Đèn cũ đã thay thế: {len(deleted_existing)}, "
            f"Khoảng cách đèn: {round(spacing_m, 2)}m."
        )

        _log_data_history(
            "Tạo chuỗi đèn",
            ROUTE_DOCTYPE,
            route_doc.name,
            prefix,
            route_doc.ten_tuyen,
            history_desc,
            result,
        )
        _publish_update("street_lights_generated", ROUTE_DOCTYPE, route_doc.name, result)
        return result
    except frappe.ValidationError:
        raise
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Generate Street Lights Error")
        frappe.throw("Không thể tạo chuỗi đèn theo tuyến.")


@frappe.whitelist()
def delete_street_light(name):
    """Delete one street light asset."""
    try:
        doc = frappe.get_doc(ASSET_DOCTYPE, name)
        if doc.loai_tai_san != STREET_LIGHT_ASSET_TYPE:
            frappe.throw("Tài sản này không phải là đèn chiếu sáng.")

        snapshot = _format_street_light(doc.as_dict(), _get_area_names([doc.khu_vuc]))
        route_name = snapshot.get("route_name")
        code = doc.ma_tai_san
        title = doc.ten_tai_san
        frappe.delete_doc(ASSET_DOCTYPE, doc.name, ignore_permissions=True)
        frappe.db.commit()

        result = {"name": name, "ma_tai_san": code}
        _log_data_history(
            "Xóa đèn",
            ASSET_DOCTYPE,
            name,
            code,
            route_name,
            "Xóa đèn {0} - {1}.".format(code, title),
            snapshot,
        )
        _publish_update("street_light_deleted", ASSET_DOCTYPE, name, result)
        return result
    except frappe.ValidationError:
        raise
    except frappe.DoesNotExistError:
        frappe.throw("Không tìm thấy đèn đường cần xóa.")
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Delete Street Light Error")
        frappe.throw("Không thể xóa đèn đường.")


@frappe.whitelist()
def get_street_light_data_history(limit=50):
    """Return recent street-light data operations."""
    try:
        rows = frappe.get_all(
            DATA_HISTORY_DOCTYPE,
            fields=[
                "name",
                "creation",
                "owner",
                "hanh_dong",
                "doi_tuong",
                "ten_doi_tuong",
                "ma_doi_tuong",
                "tuyen_duong",
                "noi_dung",
            ],
            limit_page_length=_safe_limit(limit),
            order_by="creation desc",
        )
        return [dict(row) for row in rows]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Street Light Data History Error")
        frappe.throw("Không thể tải lịch sử dữ liệu đèn đường.")


@frappe.whitelist()
def update_street_light_status(name, trang_thai):
    """Update status for a street light asset."""
    try:
        if trang_thai not in LIGHT_STATUS_OPTIONS:
            frappe.throw("Trạng thái đèn đường không hợp lệ.")

        doc = frappe.get_doc(ASSET_DOCTYPE, name)
        if doc.loai_tai_san != STREET_LIGHT_ASSET_TYPE:
            frappe.throw("Tài sản này không phải là đèn chiếu sáng.")

        doc.trang_thai = trang_thai
        doc.save()
        frappe.db.commit()

        result = {"name": doc.name, "trang_thai": doc.trang_thai}
        _log_data_history(
            "Cập nhật trạng thái",
            ASSET_DOCTYPE,
            doc.name,
            doc.ma_tai_san,
            _extract_route_name(doc.ten_tai_san),
            "Cập nhật {0} thành {1}.".format(doc.ma_tai_san, doc.trang_thai),
            result,
        )
        _publish_update("street_light_status_updated", ASSET_DOCTYPE, doc.name, result)
        return result
    except frappe.ValidationError:
        raise
    except frappe.DoesNotExistError:
        frappe.throw("Không tìm thấy đèn đường cần cập nhật.")
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Update Street Light Status Error")
        frappe.throw("Không thể cập nhật trạng thái đèn đường.")


@frappe.whitelist()
def update_incident_status(name, trang_thai):
    """Update status for a street light incident."""
    try:
        if trang_thai not in INCIDENT_STATUS_OPTIONS:
            frappe.throw("Trạng thái sự cố không hợp lệ.")

        doc = frappe.get_doc(INCIDENT_DOCTYPE, name)
        if doc.loai_van_de != STREET_LIGHT_INCIDENT_TYPE:
            frappe.throw("Báo cáo này không phải là sự cố đèn đường.")

        doc.trang_thai = trang_thai
        doc.save()
        frappe.db.commit()

        result = {"name": doc.name, "trang_thai": doc.trang_thai}
        _publish_update("incident_status_updated", INCIDENT_DOCTYPE, doc.name, result)
        return result
    except frappe.ValidationError:
        raise
    except frappe.DoesNotExistError:
        frappe.throw("Không tìm thấy sự cố cần cập nhật.")
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Update Street Light Incident Status Error")
        frappe.throw("Không thể cập nhật trạng thái sự cố đèn đường.")


@frappe.whitelist()
def get_my_work_items():
    """Return consolidated work items: work orders, plans, inspections, open incidents."""
    try:
        user = frappe.session.user
        items = []

        def get_valid_fields(doctype, desired_fields):
            if not frappe.db.exists("DocType", doctype):
                return None
            meta = frappe.get_meta(doctype)
            valid_fields = ["name", "creation", "modified", "owner"]
            for f in desired_fields:
                if f in valid_fields or meta.has_field(f):
                    valid_fields.append(f)
            return valid_fields

        # 1. Phieu Cong Viec Den
        try:
            fields = ["tieu_de", "ma_tai_san", "ten_tai_san", "tuyen_duong", "khu_vuc", "muc_uu_tien", "trang_thai", "ngay_thuc_hien"]
            valid_fields = get_valid_fields(WORK_ORDER_DOCTYPE, fields)
            if valid_fields:
                work_orders = frappe.get_all(WORK_ORDER_DOCTYPE, filters={"nhan_vien_thuc_hien": user}, fields=valid_fields)
                for w in work_orders:
                    items.append({
                        "type": "Phiếu công việc",
                        "title": w.get("tieu_de") or w.name,
                        "reference_name": w.name,
                        "ma_tai_san": w.get("ma_tai_san"),
                        "ten_tai_san": w.get("ten_tai_san"),
                        "tuyen_duong": w.get("tuyen_duong"),
                        "khu_vuc": w.get("khu_vuc"),
                        "priority": w.get("muc_uu_tien"),
                        "status": w.get("trang_thai"),
                        "date": w.get("ngay_thuc_hien"),
                        "action_url": f"/street-lights/work-orders?name={w.name}"
                    })
        except Exception as e:
            frappe.log_error(f"Error fetching work orders: {str(e)}", "Get My Work Items")

        # 2. Ke Hoach Bao Tri Den
        try:
            fields = ["ten_ke_hoach", "ma_tai_san", "ten_tai_san", "tuyen_duong", "khu_vuc", "muc_uu_tien", "trang_thai", "ngay_ket_thuc"]
            valid_fields = get_valid_fields(MAINTENANCE_PLAN_DOCTYPE, fields)
            if valid_fields:
                plans = frappe.get_all(MAINTENANCE_PLAN_DOCTYPE, filters={"nguoi_phu_trach": user}, fields=valid_fields)
                for p in plans:
                    items.append({
                        "type": "Kế hoạch bảo trì",
                        "title": p.get("ten_ke_hoach") or p.name,
                        "reference_name": p.name,
                        "ma_tai_san": p.get("ma_tai_san"),
                        "ten_tai_san": p.get("ten_tai_san"),
                        "tuyen_duong": p.get("tuyen_duong"),
                        "khu_vuc": p.get("khu_vuc"),
                        "priority": p.get("muc_uu_tien"),
                        "status": p.get("trang_thai"),
                        "date": p.get("ngay_ket_thuc"),
                        "action_url": f"/street-lights/plans?name={p.name}"
                    })
        except Exception as e:
            frappe.log_error(f"Error fetching maintenance plans: {str(e)}", "Get My Work Items")

        # 3. Phieu Kiem Tra Den
        try:
            fields = ["ma_phieu", "ma_tai_san", "ten_tai_san", "tuyen_duong", "khu_vuc", "muc_an_toan", "trang_thai", "ngay_kiem_tra"]
            valid_fields = get_valid_fields(INSPECTION_DOCTYPE, fields)
            if valid_fields:
                inspections = frappe.get_all(INSPECTION_DOCTYPE, filters={"nguoi_kiem_tra": user}, fields=valid_fields)
                for i in inspections:
                    items.append({
                        "type": "Phiếu kiểm tra",
                        "title": i.get("ma_phieu") or i.name,
                        "reference_name": i.name,
                        "ma_tai_san": i.get("ma_tai_san"),
                        "ten_tai_san": i.get("ten_tai_san"),
                        "tuyen_duong": i.get("tuyen_duong"),
                        "khu_vuc": i.get("khu_vuc"),
                        "priority": i.get("muc_an_toan"),
                        "status": i.get("trang_thai"),
                        "date": i.get("ngay_kiem_tra"),
                        "action_url": f"/street-lights/inspections?name={i.name}"
                    })
        except Exception as e:
            frappe.log_error(f"Error fetching inspections: {str(e)}", "Get My Work Items")

        # 4. Bao Cao Van De (Open)
        try:
            fields = ["tieu_de", "mo_ta_chi_tiet", "khu_vuc", "muc_do_uu_tien", "trang_thai", "creation"]
            valid_fields = get_valid_fields(INCIDENT_DOCTYPE, fields)
            if valid_fields:
                incidents = frappe.get_all(INCIDENT_DOCTYPE, filters={"nguoi_bao_cao": user, "trang_thai": ["in", OPEN_INCIDENT_STATUSES]}, fields=valid_fields)
                for ind in incidents:
                    items.append({
                        "type": "Sự cố",
                        "title": ind.get("tieu_de") or ind.name,
                        "reference_name": ind.name,
                        "ma_tai_san": _extract_incident_light_code(ind),
                        "ten_tai_san": ind.get("tieu_de"),
                        "tuyen_duong": _extract_incident_route_name(ind) or "",
                        "khu_vuc": ind.get("khu_vuc"),
                        "priority": ind.get("muc_do_uu_tien"),
                        "status": ind.get("trang_thai"),
                        "date": ind.get("creation"),
                        "action_url": f"/street-lights/incidents?name={ind.name}"
                    })
        except Exception as e:
            frappe.log_error(f"Error fetching incidents: {str(e)}", "Get My Work Items")

        return sorted(items, key=lambda x: str(x.get("date") or ""), reverse=True)
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get My Work Items Error")
        return []


@frappe.whitelist()
def get_street_light_notifications():
    """Return consolidated notifications."""
    try:
        notifications = []
        
        # New and In-progress Incidents
        new_incidents = frappe.get_all(
            INCIDENT_DOCTYPE,
            filters={"trang_thai": ["in", ["Mới", "Đang xử lý"]]},
            fields=["name", "tieu_de", "creation", "muc_do_uu_tien", "trang_thai"]
        )
        for ind in new_incidents:
            level = "error" if ind.muc_do_uu_tien in ["Cao", "Rất cấp tính"] else "warning"
            title = "Sự cố mới" if ind.trang_thai == "Mới" else "Sự cố đang xử lý"
            msg = f"Sự cố mới được báo cáo: {ind.tieu_de or ind.name}" if ind.trang_thai == "Mới" else f"Sự cố đang được xử lý: {ind.tieu_de or ind.name}"
            notifications.append({
                "id": f"inc-{ind.name}",
                "title": title,
                "message": msg,
                "type": "Sự cố",
                "level": level,
                "created_at": ind.creation,
                "action_url": f"/street-lights/incidents?name={ind.name}",
                "is_read": False
            })
            
        # New Work Orders
        new_wo = frappe.get_all(
            WORK_ORDER_DOCTYPE,
            filters={"trang_thai": "Mới"},
            fields=["name", "tieu_de", "creation"]
        )
        for wo in new_wo:
            notifications.append({
                "id": f"wo-{wo.name}",
                "title": "Phiếu công việc mới",
                "message": f"Bạn có phiếu công việc mới: {wo.tieu_de or wo.name}",
                "type": "Công việc",
                "level": "info",
                "created_at": wo.creation,
                "action_url": f"/street-lights/work-orders?name={wo.name}",
                "is_read": False
            })
            
        # Needs Acceptance
        draft_acceptances = frappe.get_all(
            ACCEPTANCE_DOCTYPE,
            filters={"trang_thai": "Nháp"},
            fields=["name", "ma_bien_ban", "creation"]
        )
        for acc in draft_acceptances:
            notifications.append({
                "id": f"acc-{acc.name}",
                "title": "Nghiệm thu chờ xử lý",
                "message": f"Biên bản nghiệm thu {acc.ma_bien_ban or acc.name} đang chờ xử lý.",
                "type": "Nghiệm thu",
                "level": "info",
                "created_at": acc.creation,
                "action_url": f"/street-lights/acceptance?name={acc.name}",
                "is_read": False
            })
            
        return sorted(notifications, key=lambda x: str(x.get("created_at") or ""), reverse=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Notifications Error")
        frappe.throw("Không thể tải thông báo.")


@frappe.whitelist()
def get_street_light_categories():
    """Return static category definitions."""
    return {
        "severity": [
            {"code": "thap", "name": "Thấp", "description": "Sự cố nhỏ, không ảnh hưởng lớn", "color": "bg-slate-50 text-slate-700", "usage_count": _get_count(INCIDENT_DOCTYPE, {"muc_do_uu_tien": "Thấp"})},
            {"code": "trung-binh", "name": "Trung bình", "description": "Sự cố cần xử lý trong 24h", "color": "bg-blue-50 text-blue-700", "usage_count": _get_count(INCIDENT_DOCTYPE, {"muc_do_uu_tien": "Trung bình"})},
            {"code": "cao", "name": "Cao", "description": "Sự cố ảnh hưởng diện rộng", "color": "bg-orange-50 text-orange-700", "usage_count": _get_count(INCIDENT_DOCTYPE, {"muc_do_uu_tien": "Cao"})},
            {"code": "rat-cap-tinh", "name": "Rất cấp tính", "description": "Nguy hiểm, cần xử lý ngay lập tức", "color": "bg-red-50 text-red-700", "usage_count": _get_count(INCIDENT_DOCTYPE, {"muc_do_uu_tien": "Rất cấp tính"})}
        ],
        "report_sources": [
            {"code": "nguoi-dan", "name": "Người dân", "description": "Thông báo từ app công dân", "color": "bg-blue-50 text-blue-700", "usage_count": 0},
            {"code": "nhan-vien", "name": "Nhân viên kỹ thuật", "description": "Phát hiện trong quá trình tuần tra", "color": "bg-emerald-50 text-emerald-700", "usage_count": 0},
            {"code": "dieu-hanh", "name": "Trung tâm điều hành", "description": "Từ trung tâm điều hành", "color": "bg-indigo-50 text-indigo-700", "usage_count": 0},
            {"code": "giam-sat", "name": "Hệ thống giám sát", "description": "Cảnh báo tự động", "color": "bg-amber-50 text-amber-700", "usage_count": 0},
            {"code": "khac", "name": "Khác", "description": "Nguồn khác", "color": "bg-slate-50 text-slate-700", "usage_count": 0}
        ],
        "fault_types": [
            {"code": "khong-sang", "name": "Đèn không sáng", "description": "Bóng đèn bị cháy hoặc mất nguồn", "color": "bg-red-50 text-red-700", "usage_count": 0},
            {"code": "chap-chon", "name": "Đèn chập chờn", "description": "Sáng tối không ổn định", "color": "bg-orange-50 text-orange-700", "usage_count": 0},
            {"code": "cot-hong", "name": "Cột nghiêng/gãy", "description": "Hư hỏng vật lý phần cột", "color": "bg-rose-50 text-rose-700", "usage_count": 0},
            {"code": "day-dut", "name": "Dây điện hở/đứt", "description": "Sự cố về đường dây", "color": "bg-red-50 text-red-700", "usage_count": 0},
            {"code": "tu-loi", "name": "Tủ điều khiển lỗi", "description": "Tủ điện mất kết nối hoặc hỏng", "color": "bg-amber-50 text-amber-700", "usage_count": 0},
            {"code": "khac", "name": "Khác", "description": "Các lỗi khác", "color": "bg-slate-50 text-slate-700", "usage_count": 0}
        ],
        "electrical_conditions": [
            {"code": "binh-thuong", "name": "Bình thường", "description": "Hệ thống điện ổn định", "color": "bg-emerald-50 text-emerald-700", "usage_count": 0},
            {"code": "chap-chon", "name": "Chập chờn", "description": "Điện áp không ổn định", "color": "bg-orange-50 text-orange-700", "usage_count": 0},
            {"code": "mat-dien", "name": "Mất điện", "description": "Không có nguồn điện", "color": "bg-red-50 text-red-700", "usage_count": 0},
            {"code": "qua-tai", "name": "Quá tải", "description": "Aptomat nhảy do quá dòng", "color": "bg-rose-50 text-rose-700", "usage_count": 0},
            {"code": "khac", "name": "Khác", "description": "Tình trạng điện khác", "color": "bg-slate-50 text-slate-700", "usage_count": 0}
        ],
        "pole_conditions": [
            {"code": "tot", "name": "Tốt", "description": "Cột đứng thẳng, kết cấu vững chắc", "color": "bg-emerald-50 text-emerald-700", "usage_count": 0},
            {"code": "nghieng", "name": "Nghiêng", "description": "Cột bị nghiêng cần chỉnh lại", "color": "bg-orange-50 text-orange-700", "usage_count": 0},
            {"code": "gi-set", "name": "Gỉ sét", "description": "Cột thép bị gỉ sét", "color": "bg-amber-50 text-amber-700", "usage_count": 0},
            {"code": "nut-gay", "name": "Nứt gãy", "description": "Cột bê tông bị nứt", "color": "bg-red-50 text-red-700", "usage_count": 0},
            {"code": "thay-the", "name": "Cần thay thế", "description": "Hỏng nặng, cần thay mới", "color": "bg-rose-50 text-rose-700", "usage_count": 0}
        ],
        "wire_conditions": [
            {"code": "tot", "name": "Tốt", "description": "Dây dẫn đảm bảo an toàn", "color": "bg-emerald-50 text-emerald-700", "usage_count": 0},
            {"code": "chung", "name": "Chùng dây", "description": "Dây bị chùng cần kéo căng", "color": "bg-orange-50 text-orange-700", "usage_count": 0},
            {"code": "dut", "name": "Đứt dây", "description": "Dây bị đứt", "color": "bg-red-50 text-red-700", "usage_count": 0},
            {"code": "ho", "name": "Hở dây", "description": "Vỏ cách điện bị hỏng", "color": "bg-rose-50 text-rose-700", "usage_count": 0},
            {"code": "thay-the", "name": "Cần thay thế", "description": "Dây cũ nát cần thay mới", "color": "bg-rose-50 text-rose-700", "usage_count": 0}
        ],
        "safety_levels": [
            {"code": "an-toan", "name": "An toàn", "description": "Đảm bảo điều kiện vận hành", "color": "bg-emerald-50 text-emerald-700", "usage_count": 0},
            {"code": "theo-doi", "name": "Cần theo dõi", "description": "Có nguy cơ nhỏ, cần chú ý", "color": "bg-blue-50 text-blue-700", "usage_count": 0},
            {"code": "nguy-hiem", "name": "Nguy hiểm", "description": "Đe dọa an toàn, cần xử lý", "color": "bg-orange-50 text-orange-700", "usage_count": 0},
            {"code": "rat-nguy-hiem", "name": "Rất nguy hiểm", "description": "Nguy cơ cao về tai nạn, cần ngắt điện", "color": "bg-red-50 text-red-700", "usage_count": 0}
        ]
    }
