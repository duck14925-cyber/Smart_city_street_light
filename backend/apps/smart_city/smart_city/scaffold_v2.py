import frappe

def run():
    """Create or update all 6 core Smart City DocTypes per SRD v2."""

    doctypes = [
        # 1. Khu Vuc
        {
            "doctype": "DocType",
            "name": "Khu Vuc",
            "module": "Smart City",
            "custom": 0,
            "autoname": "field:ma_khu_vuc",
            "fields": [
                {"fieldname": "ten_khu_vuc", "fieldtype": "Data", "label": "Tên khu vực", "reqd": 1, "unique": 1},
                {"fieldname": "ma_khu_vuc", "fieldtype": "Data", "label": "Mã khu vực", "reqd": 1, "unique": 1},
                {"fieldname": "toa_do_trung_tam", "fieldtype": "Geolocation", "label": "Tọa độ trung tâm"},
                {"fieldname": "ranh_gioi_khu_vuc", "fieldtype": "Code", "label": "Ranh giới khu vực", "options": "JSON"},
                {"fieldname": "dan_so", "fieldtype": "Int", "label": "Dân số"},
                {"fieldname": "ghi_chu", "fieldtype": "Text Editor", "label": "Ghi chú"},
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}],
        },
        # 2. Ho Gia Dinh
        {
            "doctype": "DocType",
            "name": "Ho Gia Dinh",
            "module": "Smart City",
            "custom": 0,
            "autoname": "field:ma_ho",
            "fields": [
                {"fieldname": "ma_ho", "fieldtype": "Data", "label": "Mã hộ", "reqd": 1},
                {"fieldname": "chu_ho", "fieldtype": "Data", "label": "Chủ hộ", "reqd": 1},
                {"fieldname": "khu_vuc", "fieldtype": "Link", "label": "Khu vực", "options": "Khu Vuc", "reqd": 1},
                {"fieldname": "dia_chi", "fieldtype": "Data", "label": "Địa chỉ", "reqd": 1},
                {"fieldname": "toa_do_gps", "fieldtype": "Geolocation", "label": "Tọa độ GPS"},
                {"fieldname": "so_dien_thoai", "fieldtype": "Data", "label": "Số điện thoại"},
                {"fieldname": "email", "fieldtype": "Data", "label": "Email", "options": "Email"},
                {"fieldname": "tong_nhan_khau", "fieldtype": "Int", "label": "Tổng nhân khẩu"},
                {"fieldname": "trang_thai", "fieldtype": "Select", "label": "Trạng thái",
                 "options": "Hoạt động\nBỏ trống\nHủy bỏ", "default": "Hoạt động"},
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}],
        },
        # 3. Nhan Khau
        {
            "doctype": "DocType",
            "name": "Nhan Khau",
            "module": "Smart City",
            "custom": 0,
            "autoname": "field:cccd_cmt",
            "fields": [
                {"fieldname": "ho_ten", "fieldtype": "Data", "label": "Họ tên", "reqd": 1},
                {"fieldname": "ngay_sinh", "fieldtype": "Date", "label": "Ngày sinh"},
                {"fieldname": "gioi_tinh", "fieldtype": "Select", "label": "Giới tính",
                 "options": "Nam\nNữ\nKhác"},
                {"fieldname": "cccd_cmt", "fieldtype": "Data", "label": "CCCD/CMT", "reqd": 1, "unique": 1},
                {"fieldname": "ho_gia_dinh", "fieldtype": "Link", "label": "Hộ gia đình",
                 "options": "Ho Gia Dinh", "reqd": 1},
                {"fieldname": "quan_he", "fieldtype": "Select", "label": "Quan hệ",
                 "options": "Chủ hộ\nVợ\nChồng\nCon\nCha\nMẹ\nAnh/Chị/Em\nKhác"},
                {"fieldname": "nghe_nghiep", "fieldtype": "Data", "label": "Nghề nghiệp"},
                {"fieldname": "trang_thai", "fieldtype": "Select", "label": "Trạng thái",
                 "options": "Đang sống\nTạm cư\nChuyển đi\nMất", "default": "Đang sống"},
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}],
        },
        # 4. Su Kien Dan Cu  (is_submittable)
        {
            "doctype": "DocType",
            "name": "Su Kien Dan Cu",
            "module": "Smart City",
            "custom": 0,
            "is_submittable": 1,
            "autoname": "naming_series:SKDC-.#####",
            "fields": [
                {"fieldname": "naming_series", "fieldtype": "Select", "label": "Naming Series",
                 "options": "SKDC-.#####", "default": "SKDC-.#####", "hidden": 1},
                {"fieldname": "loai_su_kien", "fieldtype": "Select", "label": "Loại sự kiện",
                 "options": "Sinh\nTử\nChuyển đến\nChuyển đi\nKết hôn\nLy hôn\nKhác", "reqd": 1},
                {"fieldname": "nhan_khau", "fieldtype": "Link", "label": "Nhân khẩu",
                 "options": "Nhan Khau", "reqd": 1},
                {"fieldname": "ngay_su_kien", "fieldtype": "Date", "label": "Ngày sự kiện", "reqd": 1},
                {"fieldname": "chi_tiet", "fieldtype": "Small Text", "label": "Chi tiết"},
                {"fieldname": "ghi_chu", "fieldtype": "Text Editor", "label": "Ghi chú"},
                {"fieldname": "amended_from", "fieldtype": "Link", "label": "Amended From",
                 "options": "Su Kien Dan Cu", "read_only": 1, "no_copy": 1, "print_hide": 1},
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "submit": 1, "cancel": 1, "amend": 1},
            ],
        },
        # 5. Tai Nguyen Ha Tang
        {
            "doctype": "DocType",
            "name": "Tai Nguyen Ha Tang",
            "module": "Smart City",
            "custom": 0,
            "autoname": "field:ma_tai_san",
            "fields": [
                {"fieldname": "loai_tai_san", "fieldtype": "Select", "label": "Loại tài sản",
                 "options": "Camera an ninh\nĐèn chiếu sáng\nCây xanh\nNhà sơ tán\nTrạm biến áp\nTrạm bơm\nKhác", "reqd": 1},
                {"fieldname": "ten_tai_san", "fieldtype": "Data", "label": "Tên tài sản", "reqd": 1},
                {"fieldname": "ma_tai_san", "fieldtype": "Data", "label": "Mã tài sản", "reqd": 1, "unique": 1},
                {"fieldname": "khu_vuc", "fieldtype": "Link", "label": "Khu vực",
                 "options": "Khu Vuc", "reqd": 1},
                {"fieldname": "toa_do_gps", "fieldtype": "Geolocation", "label": "Tọa độ GPS", "reqd": 1},
                {"fieldname": "trang_thai", "fieldtype": "Select", "label": "Trạng thái",
                 "options": "Hoạt động\nHỏng\nBảo trì", "default": "Hoạt động"},
                {"fieldname": "chi_phi_bao_duong", "fieldtype": "Currency", "label": "Chi phí bảo dưỡng"},
                {"fieldname": "ngay_lap_dat", "fieldtype": "Date", "label": "Ngày lắp đặt"},
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}],
        },
        # 6. Bao Cao Van De
        {
            "doctype": "DocType",
            "name": "Bao Cao Van De",
            "module": "Smart City",
            "custom": 0,
            "autoname": "naming_series:BCVD-.#####",
            "fields": [
                {"fieldname": "naming_series", "fieldtype": "Select", "label": "Naming Series",
                 "options": "BCVD-.#####", "default": "BCVD-.#####", "hidden": 1},
                {"fieldname": "tieu_de", "fieldtype": "Data", "label": "Tiêu đề", "reqd": 1},
                {"fieldname": "loai_van_de", "fieldtype": "Select", "label": "Loại vấn đề",
                 "options": "Vệ sinh môi trường\nAn toàn giao thông\nCây xanh hư hỏng\nĐèn đường hỏng\nNgập nước\nTiếng ồn\nKhác", "reqd": 1},
                {"fieldname": "khu_vuc", "fieldtype": "Link", "label": "Khu vực",
                 "options": "Khu Vuc", "reqd": 1},
                {"fieldname": "vi_tri_gps", "fieldtype": "Geolocation", "label": "Vị trí GPS", "reqd": 1},
                {"fieldname": "mo_ta_chi_tiet", "fieldtype": "Text Editor", "label": "Mô tả chi tiết", "reqd": 1},
                {"fieldname": "hinh_anh_minh_hoa", "fieldtype": "Attach", "label": "Hình ảnh minh họa"},
                {"fieldname": "muc_do_uu_tien", "fieldtype": "Select", "label": "Mức độ ưu tiên",
                 "options": "Thấp\nTrung bình\nCao\nRất cấp tính", "default": "Trung bình"},
                {"fieldname": "nguoi_bao_cao", "fieldtype": "Data", "label": "Người báo cáo", "reqd": 1},
                {"fieldname": "sdt_lien_he", "fieldtype": "Data", "label": "SĐT liên hệ"},
                {"fieldname": "trang_thai", "fieldtype": "Select", "label": "Trạng thái",
                 "options": "Mới\nĐang xử lý\nĐã giải quyết\nĐã đóng", "default": "Mới"},
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}],
        },
    ]

    for dt_def in doctypes:
        name = dt_def["name"]
        if frappe.db.exists("DocType", name):
            print(f"  ⏭  DocType '{name}' already exists – deleting & recreating...")
            frappe.delete_doc("DocType", name, force=True, ignore_permissions=True)
            frappe.db.commit()

        doc = frappe.get_doc(dt_def)
        doc.insert(ignore_permissions=True)
        print(f"  ✅ Created DocType: {name}")

    frappe.db.commit()
    print("\n🎉 All 6 core Smart City DocTypes created successfully!")
