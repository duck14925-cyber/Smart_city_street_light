"""Seed demo street light data using existing Smart City DocTypes."""

from datetime import date, timedelta
import random

import frappe


AREA_DOCTYPE = "Khu Vuc"
ASSET_DOCTYPE = "Tai Nguyen Ha Tang"
INCIDENT_DOCTYPE = "Bao Cao Van De"

STREET_LIGHT_ASSET_TYPE = "Đèn chiếu sáng"
STREET_LIGHT_INCIDENT_TYPE = "Đèn đường hỏng"

AREAS = [
	{
		"ma_khu_vuc": "KV-DEN-01",
		"ten_khu_vuc": "Trung tâm hành chính",
		"lat": 16.0544,
		"lng": 108.2022,
		"dan_so": 18500,
	},
	{
		"ma_khu_vuc": "KV-DEN-02",
		"ten_khu_vuc": "Khu dân cư phía Bắc",
		"lat": 16.0858,
		"lng": 108.1548,
		"dan_so": 32400,
	},
	{
		"ma_khu_vuc": "KV-DEN-03",
		"ten_khu_vuc": "Khu dân cư phía Nam",
		"lat": 16.0128,
		"lng": 108.2234,
		"dan_so": 28700,
	},
	{
		"ma_khu_vuc": "KV-DEN-04",
		"ten_khu_vuc": "Tuyến ven sông",
		"lat": 16.0676,
		"lng": 108.2207,
		"dan_so": 14200,
	},
	{
		"ma_khu_vuc": "KV-DEN-05",
		"ten_khu_vuc": "Khu công cộng",
		"lat": 16.4621,
		"lng": 107.5789,
		"dan_so": 9600,
	},
]

LIGHT_STATUSES = (
	["Hoạt động"] * 75
	+ ["Hỏng"] * 15
	+ ["Bảo trì"] * 10
)
INCIDENT_PRIORITIES = ["Thấp", "Trung bình", "Cao", "Rất cấp tính"]
INCIDENT_STATUSES = ["Mới", "Đang xử lý", "Đã giải quyết", "Đã đóng"]
REPORTERS = [
	("Nguyễn Văn An", "0901000001"),
	("Trần Thị Bình", "0901000002"),
	("Lê Minh Châu", "0901000003"),
	("Phạm Quốc Dũng", "0901000004"),
	("Hoàng Thị Hà", "0901000005"),
]

STREET_LIGHT_ROUTES = [
	{
		"route_name": "Đường Tô Hiệu",
		"area_code": "KV-DEN-02",
		"light_count": 80,
		"polyline": [
			[16.076750, 108.157200],
			[16.080250, 108.161950],
			[16.084800, 108.168400],
			[16.089200, 108.174900],
		],
	},
	{
		"route_name": "Đường Nguyễn Văn Linh",
		"area_code": "KV-DEN-01",
		"light_count": 80,
		"polyline": [
			[16.061850, 108.214300],
			[16.063250, 108.220600],
			[16.064700, 108.226900],
			[16.066150, 108.233700],
		],
	},
	{
		"route_name": "Đường Điện Biên Phủ",
		"area_code": "KV-DEN-03",
		"light_count": 80,
		"polyline": [
			[16.070200, 108.183500],
			[16.073900, 108.191000],
			[16.077600, 108.199200],
			[16.081350, 108.207800],
		],
	},
	{
		"route_name": "Đường Nguyễn Tất Thành",
		"area_code": "KV-DEN-04",
		"light_count": 80,
		"polyline": [
			[16.070950, 108.186700],
			[16.072150, 108.195500],
			[16.073350, 108.204600],
			[16.074600, 108.214000],
			[16.075750, 108.224000],
		],
	},
	{
		"route_name": "Đường ven sông Hương Trà",
		"area_code": "KV-DEN-05",
		"light_count": 80,
		"polyline": [
			[16.463500, 107.568200],
			[16.468200, 107.573900],
			[16.473800, 107.579600],
			[16.478250, 107.586900],
			[16.482700, 107.594200],
		],
	},
]


def upsert_doc(doctype, filters, values):
	"""Create or update a document and return created/updated status."""
	name = frappe.db.exists(doctype, filters)

	if name:
		doc = frappe.get_doc(doctype, name)
		for fieldname, value in values.items():
			doc.set(fieldname, value)
		doc.save(ignore_permissions=True)
		return doc, "updated"

	doc = frappe.get_doc({"doctype": doctype, **values})
	doc.insert(ignore_permissions=True)
	return doc, "created"


def random_date(start_year, end_year):
	start = date(start_year, 1, 1)
	end = date(end_year, 12, 31)
	days = (end - start).days
	return start + timedelta(days=random.randint(0, days))


def _format_location(lat, lng):
	return f"{lat:.6f},{lng:.6f}"


def _distance_between_points(start, end):
	lat_distance = end[0] - start[0]
	lng_distance = end[1] - start[1]
	return (lat_distance * lat_distance + lng_distance * lng_distance) ** 0.5


def _interpolate_segment(start, end, ratio):
	return (
		start[0] + (end[0] - start[0]) * ratio,
		start[1] + (end[1] - start[1]) * ratio,
	)


def _offset_from_direction(start, end, side, offset=0.000045):
	lat_delta = end[0] - start[0]
	lng_delta = end[1] - start[1]
	length = (lat_delta * lat_delta + lng_delta * lng_delta) ** 0.5 or 1
	return side * (-lng_delta / length) * offset, side * (lat_delta / length) * offset


def _interpolate_centerline_points(polyline, count):
	"""Return evenly distributed points on the road centerline with segment direction."""
	if not polyline or count <= 0:
		return []
	if len(polyline) == 1:
		lat, lng = polyline[0]
		return [(lat, lng, polyline[0], polyline[0]) for _ in range(count)]

	segment_lengths = [
		_distance_between_points(polyline[index], polyline[index + 1])
		for index in range(len(polyline) - 1)
	]
	total_length = sum(segment_lengths)
	if total_length == 0:
		lat, lng = polyline[0]
		return [(lat, lng) for _ in range(count)]

	points = []
	for point_index in range(count):
		target_distance = 0 if count == 1 else (total_length * point_index) / (count - 1)
		walked_distance = 0
		for segment_index, segment_length in enumerate(segment_lengths):
			is_last_segment = segment_index == len(segment_lengths) - 1
			if target_distance <= walked_distance + segment_length or is_last_segment:
				start = polyline[segment_index]
				end = polyline[segment_index + 1]
				ratio = 0 if segment_length == 0 else (target_distance - walked_distance) / segment_length
				ratio = max(0, min(1, ratio))
				lat, lng = _interpolate_segment(start, end, ratio)
				points.append((lat, lng, start, end))
				break
			walked_distance += segment_length

	return points


def interpolate_points(polyline, count):
	"""Return paired street lights on both road sides, distributed along the centerline."""
	if count <= 0:
		return []

	pair_count = max(1, count // 2)
	center_points = _interpolate_centerline_points(polyline, pair_count)
	points = []

	for center_index, (lat, lng, start, end) in enumerate(center_points):
		for side in (-1, 1):
			if len(points) >= count:
				break
			lat_offset, lng_offset = _offset_from_direction(start, end, side)
			points.append((lat + lat_offset, lng + lng_offset))

	return points


def _seed_areas(summary):
	for area in AREAS:
		values = {
			"ma_khu_vuc": area["ma_khu_vuc"],
			"ten_khu_vuc": area["ten_khu_vuc"],
			"toa_do_trung_tam": _format_location(area["lat"], area["lng"]),
			"dan_so": area["dan_so"],
			"ghi_chu": "Dữ liệu mẫu phục vụ demo dashboard đèn đường.",
		}
		_, status = upsert_doc(AREA_DOCTYPE, {"ma_khu_vuc": area["ma_khu_vuc"]}, values)
		summary["areas"][status] += 1


def _seed_lights(summary):
	lights = []
	number = 1
	for route in STREET_LIGHT_ROUTES:
		points = interpolate_points(route["polyline"], route["light_count"])
		for route_index, (lat, lng) in enumerate(points, start=1):
			code = f"DEN-{number:04d}"
			status_index = (number - 1) % len(LIGHT_STATUSES)
			values = {
				"ma_tai_san": code,
				"ten_tai_san": f"Đèn chiếu sáng - {route['route_name']} - {route_index:03d}",
				"loai_tai_san": STREET_LIGHT_ASSET_TYPE,
				"khu_vuc": route["area_code"],
				"toa_do_gps": _format_location(lat, lng),
				"trang_thai": LIGHT_STATUSES[status_index],
				"chi_phi_bao_duong": 350000 + ((number * 137000) % 4200000),
				"ngay_lap_dat": random_date(2023, 2025),
			}
			_, status = upsert_doc(ASSET_DOCTYPE, {"ma_tai_san": code}, values)
			summary["lights"][status] += 1
			lights.append({**values, "lat": lat, "lng": lng, "route_name": route["route_name"]})
			number += 1

	return lights


def _seed_incidents(summary, lights):
	for index, light in enumerate(lights[:20], start=1):
		reporter, phone = REPORTERS[(index - 1) % len(REPORTERS)]
		lat = light["lat"] + 0.00025
		lng = light["lng"] - 0.00018
		values = {
			"naming_series": "BCVD-.#####",
			"tieu_de": f"Báo hỏng đèn đường {light['ma_tai_san']}",
			"loai_van_de": STREET_LIGHT_INCIDENT_TYPE,
			"khu_vuc": light["khu_vuc"],
			"vi_tri_gps": _format_location(lat, lng),
			"mo_ta_chi_tiet": (
				f"Đèn {light['ma_tai_san']} chập chờn hoặc không sáng vào buổi tối, "
				"cần kiểm tra bóng, nguồn cấp và tủ điều khiển gần nhất."
			),
			"muc_do_uu_tien": INCIDENT_PRIORITIES[(index - 1) % len(INCIDENT_PRIORITIES)],
			"nguoi_bao_cao": reporter,
			"sdt_lien_he": phone,
			"trang_thai": INCIDENT_STATUSES[(index - 1) % len(INCIDENT_STATUSES)],
		}
		_, status = upsert_doc(
			INCIDENT_DOCTYPE,
			{
				"tieu_de": values["tieu_de"],
				"loai_van_de": STREET_LIGHT_INCIDENT_TYPE,
			},
			values,
		)
		summary["incidents"][status] += 1


def seed_street_light_data():
	random.seed(20260613)
	summary = {
		"areas": {"created": 0, "updated": 0},
		"lights": {"created": 0, "updated": 0},
		"incidents": {"created": 0, "updated": 0},
	}

	_seed_areas(summary)
	lights = _seed_lights(summary)
	_seed_incidents(summary, lights)

	frappe.db.commit()

	message = (
		"Street light seed completed: "
		f"areas created={summary['areas']['created']}, updated={summary['areas']['updated']}; "
		f"lights created={summary['lights']['created']}, updated={summary['lights']['updated']}; "
		f"incidents created={summary['incidents']['created']}, updated={summary['incidents']['updated']}; "
		f"routes={len(STREET_LIGHT_ROUTES)}"
	)
	print(message)
	return summary
