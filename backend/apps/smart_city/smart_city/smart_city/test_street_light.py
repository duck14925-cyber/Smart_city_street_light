import frappe
from smart_city.smart_city.services.street_light_service import (
    create_street_light_route,
    generate_street_lights_for_route,
    get_street_light_map,
    get_street_light_data_history,
)

def run_test():
    print("--- START TEST ---")
    
    # 1. Create Route
    route_data = {
        "ma_tuyen": "TEST-TUYEN-MAP-3D",
        "ten_tuyen": "TEST-TUYEN-MAP-3D",
        "khu_vuc": "KV-DEN-01",
        "polyline": [
            [16.4800, 107.5900],
            [16.4810, 107.5910],
            [16.4820, 107.5920],
            [16.4830, 107.5930]
        ],
        "ghi_chu": "Test script runtime"
    }
    print("Creating route...")
    try:
        route_res = create_street_light_route(route_data)
        route_name = route_res.get("name")
        print(f"Created route: {route_name}")
    except Exception as e:
        print(f"Error creating route: {e}")
        return

    # 2. Generate lights
    print("Generating lights...")
    light_data = {
        "route": route_name,
        "ma_prefix": "TESTDEN",
        "count": 10,
        "trang_thai": "Hoạt động",
        "both_sides": True,
        "offset": 0.000035
    }
    try:
        light_res = generate_street_lights_for_route(light_data)
        print(f"Generate lights result: {light_res}")
    except Exception as e:
        print(f"Error generating lights: {e}")
        return

    # 3. Check get_street_light_map
    print("Checking map data...")
    try:
        map_data = get_street_light_map()
        test_lights = [l for l in map_data if l.get("ma_tai_san", "").startswith("TESTDEN")]
        print(f"Found {len(test_lights)} TESTDEN lights on map.")
    except Exception as e:
        print(f"Error getting map data: {e}")

    # 4. Check data history
    print("Checking history logs...")
    try:
        history = get_street_light_data_history(limit=10)
        test_logs = [h for h in history if "TEST-TUYEN-MAP-3D" in str(h) or "TESTDEN" in str(h)]
        for log in test_logs:
            print(f"Log: {log.get('hanh_dong')} - {log.get('noi_dung')}")
    except Exception as e:
        print(f"Error checking history logs: {e}")

    print("--- END TEST ---")
