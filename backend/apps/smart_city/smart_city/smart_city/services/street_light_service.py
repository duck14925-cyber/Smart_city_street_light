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

STREET_LIGHT_ASSET_TYPE = "Đèn chiếu sáng"
STREET_LIGHT_INCIDENT_TYPE = "Đèn đường hỏng"

LIGHT_STATUS_OPTIONS = ("Hoạt động", "Hỏng", "Bảo trì")
INCIDENT_STATUS_OPTIONS = ("Mới", "Đang xử lý", "Đã giải quyết", "Đã đóng")
OPEN_INCIDENT_STATUSES = ("Mới", "Đang xử lý")
RESOLVED_INCIDENT_STATUSES = ("Đã giải quyết", "Đã đóng")

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

    return min(limit, 500)


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
            fields=[
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
                "trang_thai",
            ],
            limit_page_length=0,
            order_by="ma_loai asc",
        )
        return [dict(row) for row in rows]
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Street Light Device Types Error")
        frappe.throw("Không thể tải danh sách loại thiết bị chiếu sáng.")


def _extract_route_name(asset_title):
    if not asset_title:
        return None

    parts = [part.strip() for part in asset_title.split(" - ")]
    if len(parts) >= 3 and parts[0] == "Đèn chiếu sáng":
        return " - ".join(parts[1:-1])

    return None


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
        "name": row.get("name"),
        "ma_tuyen": row.get("ma_tuyen"),
        "ten_tuyen": row.get("ten_tuyen"),
        "khu_vuc": row.get("khu_vuc"),
        "ten_khu_vuc": area_names.get(row.get("khu_vuc")),
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

    return {
        "name": row.get("name"),
        "ma_tai_san": row.get("ma_tai_san"),
        "ten_tai_san": row.get("ten_tai_san"),
        "route_name": _extract_route_name(row.get("ten_tai_san")),
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
def get_street_light_map(khu_vuc=None, trang_thai=None):
    """Return street lights prepared for map display."""
    try:
        lights = get_street_lights(khu_vuc=khu_vuc, trang_thai=trang_thai, limit=500)
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
def get_street_light_incidents(khu_vuc=None, trang_thai=None, muc_do_uu_tien=None, limit=100):
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
            ],
            limit_page_length=_safe_limit(limit),
            order_by="modified desc",
        )
        area_names = _get_area_names([row.khu_vuc for row in rows])

        incidents = []
        for row in rows:
            location = parse_geolocation(row.get("vi_tri_gps"))
            incident = dict(row)
            incident["ten_khu_vuc"] = area_names.get(row.get("khu_vuc"))
            incident["latitude"] = location["latitude"]
            incident["longitude"] = location["longitude"]
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
        _require_fields(data, ("tieu_de", "khu_vuc", "vi_tri_gps", "mo_ta_chi_tiet", "nguoi_bao_cao"))

        doc = frappe.get_doc(
            {
                "doctype": INCIDENT_DOCTYPE,
                "loai_van_de": STREET_LIGHT_INCIDENT_TYPE,
                "tieu_de": data.get("tieu_de"),
                "khu_vuc": data.get("khu_vuc"),
                "vi_tri_gps": data.get("vi_tri_gps"),
                "mo_ta_chi_tiet": data.get("mo_ta_chi_tiet"),
                "hinh_anh_minh_hoa": data.get("hinh_anh_minh_hoa"),
                "muc_do_uu_tien": data.get("muc_do_uu_tien") or "Trung bình",
                "nguoi_bao_cao": data.get("nguoi_bao_cao"),
                "sdt_lien_he": data.get("sdt_lien_he"),
                "trang_thai": data.get("trang_thai") or "Mới",
            }
        )
        doc.insert()
        frappe.db.commit()

        result = doc.as_dict()
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
def generate_street_lights_for_route(data=None):
    """Generate multiple street lights along a saved route polyline."""
    try:
        data = _parse_payload(data)
        _require_fields(data, ("route", "ma_prefix", "count"))

        route_doc = frappe.get_doc(ROUTE_DOCTYPE, data.get("route"))
        polyline = _parse_route_points(route_doc.polyline_json)
        count = int(data.get("count"))
        if count <= 0 or count > 1000:
            frappe.throw("Số lượng đèn phải trong khoảng 1-1000.")

        status = data.get("trang_thai") or "Hoạt động"
        if status not in LIGHT_STATUS_OPTIONS:
            frappe.throw("Trạng thái đèn đường không hợp lệ.")

        prefix = str(data.get("ma_prefix")).strip()
        start_index = int(data.get("start_index") or 1)
        both_sides = bool(data.get("both_sides"))
        offset = float(data.get("offset") or 0.000035)
        points = _points_along_route(polyline, count, both_sides=both_sides, offset=offset)
        device_type_name = _resolve_device_type_name(data)

        created = []
        skipped = []
        for index, point in enumerate(points, start=start_index):
            code = f"{prefix}-{index:04d}"
            if frappe.db.exists(ASSET_DOCTYPE, {"ma_tai_san": code}):
                skipped.append(code)
                continue

            title = "Đèn chiếu sáng - {0} - {1:04d}".format(route_doc.ten_tuyen, index)
            doc = frappe.get_doc(
                {
                    "doctype": ASSET_DOCTYPE,
                    "ma_tai_san": code,
                    "ten_tai_san": title,
                    "loai_tai_san": STREET_LIGHT_ASSET_TYPE,
                    "loai_thiet_bi_chieu_sang": device_type_name,
                    "khu_vuc": route_doc.khu_vuc,
                    "toa_do_gps": "{0:.6f},{1:.6f}".format(point["latitude"], point["longitude"]),
                    "trang_thai": status,
                    "chi_phi_bao_duong": data.get("chi_phi_bao_duong") or 0,
                    "ngay_lap_dat": data.get("ngay_lap_dat"),
                }
            )
            doc.insert(ignore_permissions=True)
            created.append(doc.name)

        frappe.db.commit()
        result = {
            "created": len(created),
            "skipped": skipped,
            "route": route_doc.name,
            "device_type": device_type_name,
            "device_type_code": data.get("device_type_code") or DEFAULT_DEVICE_TYPE_CODE,
        }
        _log_data_history(
            "Tạo chuỗi đèn",
            ROUTE_DOCTYPE,
            route_doc.name,
            prefix,
            route_doc.ten_tuyen,
            "Tạo {0} đèn theo tuyến {1}, bỏ qua {2} mã trùng.".format(
                len(created), route_doc.ten_tuyen, len(skipped)
            ),
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
