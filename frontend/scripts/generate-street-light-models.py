import base64
import json
import struct
from pathlib import Path


OUT_DIR = Path(__file__).resolve().parents[1] / "public" / "models" / "street-lights"


CUBE_POSITIONS = [
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
]
CUBE_INDICES = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0,
]


MATERIALS = {
    "metal": [0.55, 0.60, 0.66, 1],
    "dark_metal": [0.20, 0.24, 0.30, 1],
    "blue": [0.12, 0.38, 0.95, 1],
    "green": [0.10, 0.65, 0.32, 1],
    "orange": [0.95, 0.45, 0.08, 1],
    "yellow": [1.0, 0.70, 0.15, 1],
    "purple": [0.55, 0.20, 0.90, 1],
    "pink": [0.92, 0.20, 0.55, 1],
    "cabinet": [0.40, 0.45, 0.55, 1],
    "panel": [0.78, 0.70, 1.0, 1],
}


def pack_floats(values):
    return struct.pack("<" + "f" * len(values), *values)


def pack_indices(values):
    return struct.pack("<" + "H" * len(values), *values)


def pad4(data):
    return data + b"\x00" * ((4 - len(data) % 4) % 4)


def make_gltf(parts, filename):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    position_bytes = pack_floats(CUBE_POSITIONS)
    index_bytes = pack_indices(CUBE_INDICES)
    buffer = pad4(position_bytes) + pad4(index_bytes)
    position_offset = 0
    index_offset = len(pad4(position_bytes))
    encoded = base64.b64encode(buffer).decode("ascii")

    material_names = list(MATERIALS.keys())
    material_index = {name: index for index, name in enumerate(material_names)}
    meshes = []
    for name in material_names:
      meshes.append({
          "name": f"cube_{name}",
          "primitives": [{
              "attributes": {"POSITION": 0},
              "indices": 1,
              "material": material_index[name],
          }],
      })

    nodes = []
    for part in parts:
        nodes.append({
            "name": part["name"],
            "mesh": material_index[part["material"]],
            "translation": part["translation"],
            "scale": part["scale"],
        })

    gltf = {
        "asset": {"version": "2.0", "generator": "Smart City street light generator"},
        "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": [
            {
                "name": name,
                "pbrMetallicRoughness": {
                    "baseColorFactor": color,
                    "metallicFactor": 0.25 if "metal" in name or name == "cabinet" else 0.0,
                    "roughnessFactor": 0.55,
                },
            }
            for name, color in MATERIALS.items()
        ],
        "buffers": [{"uri": f"data:application/octet-stream;base64,{encoded}", "byteLength": len(buffer)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": position_offset, "byteLength": len(position_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": index_offset, "byteLength": len(index_bytes), "target": 34963},
        ],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": 8,
                "type": "VEC3",
                "min": [-0.5, -0.5, -0.5],
                "max": [0.5, 0.5, 0.5],
            },
            {"bufferView": 1, "componentType": 5123, "count": len(CUBE_INDICES), "type": "SCALAR"},
        ],
    }
    (OUT_DIR / filename).write_text(json.dumps(gltf, separators=(",", ":")), encoding="utf-8")


def part(name, material, translation, scale):
    return {"name": name, "material": material, "translation": translation, "scale": scale}


MODELS = {
    "den-led-12m.gltf": [
        part("base", "dark_metal", [0, 0, 0.1], [0.9, 0.9, 0.2]),
        part("pole_12m", "metal", [0, 0, 6], [0.18, 0.18, 12]),
        part("arm_long", "metal", [1.25, 0, 11.75], [2.6, 0.16, 0.16]),
        part("head_blue", "blue", [2.7, 0, 11.55], [0.95, 0.42, 0.32]),
        part("glow_blue", "blue", [2.7, 0, 11.25], [0.45, 0.5, 0.08]),
    ],
    "den-led-9m.gltf": [
        part("base", "dark_metal", [0, 0, 0.1], [0.8, 0.8, 0.2]),
        part("pole_9m", "metal", [0, 0, 4.5], [0.16, 0.16, 9]),
        part("arm_short", "metal", [0.95, 0, 8.75], [1.9, 0.14, 0.14]),
        part("head_green", "green", [2.0, 0, 8.55], [0.8, 0.35, 0.28]),
        part("glow_green", "green", [2.0, 0, 8.25], [0.38, 0.42, 0.08]),
    ],
    "den-solar-6m.gltf": [
        part("base", "dark_metal", [0, 0, 0.1], [0.72, 0.72, 0.2]),
        part("pole_6m", "metal", [0, 0, 3], [0.14, 0.14, 6]),
        part("solar_panel", "yellow", [0, 0, 6.35], [1.8, 0.12, 0.7]),
        part("arm_solar", "metal", [0.7, 0, 5.55], [1.35, 0.12, 0.12]),
        part("head_orange", "orange", [1.45, 0, 5.35], [0.55, 0.3, 0.24]),
    ],
    "den-trang-tri.gltf": [
        part("base", "purple", [0, 0, 0.15], [0.82, 0.82, 0.3]),
        part("decor_pole", "purple", [0, 0, 2.2], [0.16, 0.16, 4.4]),
        part("lantern_body", "pink", [0, 0, 4.75], [0.82, 0.82, 0.9]),
        part("lantern_cap", "purple", [0, 0, 5.35], [1.0, 1.0, 0.18]),
        part("glow_pink", "pink", [0, 0, 4.75], [0.95, 0.95, 0.18]),
    ],
    "tu-dieu-khien.gltf": [
        part("base", "dark_metal", [0, 0, 0.1], [1.25, 0.8, 0.2]),
        part("cabinet_box", "cabinet", [0, 0, 0.95], [1.05, 0.55, 1.65]),
        part("front_panel", "panel", [0, -0.29, 1.02], [0.78, 0.05, 1.28]),
        part("door_line", "purple", [0.18, -0.325, 1.02], [0.04, 0.04, 1.2]),
        part("handle", "purple", [0.35, -0.35, 1.05], [0.08, 0.05, 0.18]),
    ],
}


def main():
    for filename, parts in MODELS.items():
        make_gltf(parts, filename)
    print(f"Generated {len(MODELS)} glTF models in {OUT_DIR}")


if __name__ == "__main__":
    main()
