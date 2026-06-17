import frappe


DEVICE_TYPE_DOCTYPE = "Loai Thiet Bi Chieu Sang"


DEVICE_TYPES = [
    {
        "ma_loai": "DEN-LED-9M",
        "ten_loai": "Đèn LED cao áp 9m",
        "danh_muc": "Đèn chiếu sáng",
        "loai_bong_den": "LED",
        "cong_suat_w": 120,
        "chieu_cao_cot_m": 9,
        "quang_thong_lumen": 15000,
        "nhiet_do_mau_k": 4000,
        "tuoi_tho_gio": 50000,
        "trang_thai": "Hoạt động",
        "icon_2d_url": "",
        "model_3d_url": "",
        "model_scale": 1,
        "model_bearing": 0,
        "model_height": 0,
        "ghi_chu": "Loại đèn LED phổ biến cho tuyến đường đô thị.",
    },
    {
        "ma_loai": "DEN-LED-12M",
        "ten_loai": "Đèn LED cao áp 12m",
        "danh_muc": "Đèn chiếu sáng",
        "loai_bong_den": "LED",
        "cong_suat_w": 180,
        "chieu_cao_cot_m": 12,
        "quang_thong_lumen": 23000,
        "nhiet_do_mau_k": 4000,
        "tuoi_tho_gio": 50000,
        "trang_thai": "Hoạt động",
        "icon_2d_url": "",
        "model_3d_url": "",
        "model_scale": 1,
        "model_bearing": 0,
        "model_height": 0,
        "ghi_chu": "Phù hợp tuyến trục chính và đường lớn.",
    },
    {
        "ma_loai": "DEN-SOLAR-6M",
        "ten_loai": "Đèn năng lượng mặt trời 6m",
        "danh_muc": "Đèn chiếu sáng",
        "loai_bong_den": "Solar LED",
        "cong_suat_w": 80,
        "chieu_cao_cot_m": 6,
        "quang_thong_lumen": 9000,
        "nhiet_do_mau_k": 4500,
        "tuoi_tho_gio": 40000,
        "trang_thai": "Hoạt động",
        "icon_2d_url": "",
        "model_3d_url": "",
        "model_scale": 1,
        "model_bearing": 0,
        "model_height": 0,
        "ghi_chu": "Dùng cho khu vực công cộng hoặc đường nhánh.",
    },
    {
        "ma_loai": "TU-DIEU-KHIEN",
        "ten_loai": "Tủ điều khiển chiếu sáng",
        "danh_muc": "Tủ điều khiển",
        "loai_bong_den": "Khác",
        "cong_suat_w": 0,
        "chieu_cao_cot_m": 1.6,
        "quang_thong_lumen": 0,
        "nhiet_do_mau_k": 0,
        "tuoi_tho_gio": 0,
        "trang_thai": "Hoạt động",
        "icon_2d_url": "",
        "model_3d_url": "",
        "model_scale": 1,
        "model_bearing": 0,
        "model_height": 0,
        "ghi_chu": "Thiết bị điều khiển cụm/tuyến đèn.",
    },
    {
        "ma_loai": "DEN-TRANG-TRI",
        "ten_loai": "Đèn trang trí công viên",
        "danh_muc": "Đèn trang trí",
        "loai_bong_den": "LED",
        "cong_suat_w": 60,
        "chieu_cao_cot_m": 4,
        "quang_thong_lumen": 5000,
        "nhiet_do_mau_k": 3000,
        "tuoi_tho_gio": 35000,
        "trang_thai": "Hoạt động",
        "icon_2d_url": "",
        "model_3d_url": "",
        "model_scale": 1,
        "model_bearing": 0,
        "model_height": 0,
        "ghi_chu": "Đèn trang trí cho công viên, quảng trường và lối đi bộ.",
    },
]


def upsert_device_type(values):
    existing_name = frappe.db.exists(DEVICE_TYPE_DOCTYPE, {"ma_loai": values["ma_loai"]})
    if existing_name:
        doc = frappe.get_doc(DEVICE_TYPE_DOCTYPE, existing_name)
        for fieldname, value in values.items():
            doc.set(fieldname, value)
        doc.save(ignore_permissions=True)
        return "updated"

    doc = frappe.get_doc({"doctype": DEVICE_TYPE_DOCTYPE, **values})
    doc.insert(ignore_permissions=True)
    return "created"


def seed_street_light_device_types():
    created = 0
    updated = 0

    for values in DEVICE_TYPES:
        action = upsert_device_type(values)
        if action == "created":
            created += 1
        else:
            updated += 1

    frappe.db.commit()
    summary = {
        "doctype": DEVICE_TYPE_DOCTYPE,
        "created": created,
        "updated": updated,
        "total": len(DEVICE_TYPES),
    }
    print(summary)
    return summary
