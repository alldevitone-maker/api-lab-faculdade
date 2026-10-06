#!/usr/bin/env python3
"""Build authoritative Jaraguá do Sul vector layers for the electoral atlas.

Sources:
- IBGE Censo 2022 neighborhood mesh for Santa Catarina
- IBGE 2024 municipal mesh for Santa Catarina

The script intentionally fails hard if source geometry cannot be validated.
It writes compact GeoJSON plus provenance metadata into public/jaragua-atlas/data/.
"""

from __future__ import annotations

import json
import math
import os
import tempfile
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import shapefile

TARGET_MUNICIPALITY = "4208906"
TARGET_NAME = "Jaraguá do Sul"
OUT_DIR = Path("public/jaragua-atlas/data")
BAIRROS_URL = (
    "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/"
    "Agregados_por_Setores_Censitarios/malha_com_atributos/"
    "bairros/shp/UF/SC/SC_bairros_CD2022.zip"
)
MUNICIPIOS_URL = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/"
    "malhas_municipais/municipio_2024/UFs/SC/SC_Municipios_2024.zip"
)


def download(url: str, destination: Path) -> None:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "JaraguaElectoralAtlas/1.0 (+GitHub Actions)"},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        destination.write_bytes(response.read())


def unpack(zip_path: Path, destination: Path) -> Path:
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(destination)
    shp_files = list(destination.rglob("*.shp"))
    if not shp_files:
        raise RuntimeError(f"No .shp found inside {zip_path.name}")
    return shp_files[0]


def normalize_value(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def record_matches_municipality(props: dict) -> bool:
    for key, value in props.items():
        text = normalize_value(value)
        key_upper = key.upper()
        if text == TARGET_MUNICIPALITY:
            return True
        if "CD_MUN" in key_upper and text.startswith(TARGET_MUNICIPALITY):
            return True
    return False


def pick_name(props: dict) -> str:
    preferred = ("NM_BAIRRO", "NM_MUN", "NM_MUNICIP", "NOME")
    for preferred_key in preferred:
        for key, value in props.items():
            if key.upper() == preferred_key and normalize_value(value):
                return normalize_value(value)
    for key, value in props.items():
        upper = key.upper()
        if ("BAIRRO" in upper or "NM_" in upper) and normalize_value(value):
            return normalize_value(value)
    return "Sem nome"


def geometry_bounds(geometry: dict) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []

    def walk(node):
        if isinstance(node, (list, tuple)):
            if (
                len(node) >= 2
                and isinstance(node[0], (int, float))
                and isinstance(node[1], (int, float))
            ):
                xs.append(float(node[0]))
                ys.append(float(node[1]))
            else:
                for child in node:
                    walk(child)

    walk(geometry.get("coordinates", []))
    if not xs or not ys:
        raise RuntimeError("Geometry has no coordinate pairs")
    return min(xs), min(ys), max(xs), max(ys)


def validate_lonlat(geometry: dict) -> None:
    minx, miny, maxx, maxy = geometry_bounds(geometry)
    values = (minx, miny, maxx, maxy)
    if not all(math.isfinite(v) for v in values):
        raise RuntimeError("Geometry contains non-finite coordinates")
    if minx < -180 or maxx > 180 or miny < -90 or maxy > 90:
        raise RuntimeError(
            "IBGE layer is not geographic lon/lat; explicit reprojection is required"
        )


def read_filtered(shp_path: Path, layer_kind: str) -> dict:
    reader = shapefile.Reader(str(shp_path), encodingErrors="replace")
    field_names = [field[0] for field in reader.fields[1:]]
    features = []

    for shape_record in reader.iterShapeRecords():
        props = dict(zip(field_names, shape_record.record))
        if not record_matches_municipality(props):
            continue

        geometry = shape_record.shape.__geo_interface__
        validate_lonlat(geometry)
        name = pick_name(props)

        compact_props = {
            "name": name,
            "municipality_code": TARGET_MUNICIPALITY,
            "layer": layer_kind,
        }

        for key, value in props.items():
            upper = key.upper()
            if "CD_" in upper and normalize_value(value):
                compact_props[key.lower()] = normalize_value(value)

        features.append(
            {
                "type": "Feature",
                "properties": compact_props,
                "geometry": geometry,
            }
        )

    if not features:
        raise RuntimeError(
            f"No {layer_kind} feature matched municipality {TARGET_MUNICIPALITY}"
        )

    return {"type": "FeatureCollection", "features": features}


def write_geojson(path: Path, payload: dict) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="jaragua-atlas-") as temp:
        temp_dir = Path(temp)

        bairros_zip = temp_dir / "bairros.zip"
        municipios_zip = temp_dir / "municipios.zip"

        print("Downloading IBGE neighborhood mesh...")
        download(BAIRROS_URL, bairros_zip)
        print("Downloading IBGE municipal mesh...")
        download(MUNICIPIOS_URL, municipios_zip)

        bairros_shp = unpack(bairros_zip, temp_dir / "bairros")
        municipios_shp = unpack(municipios_zip, temp_dir / "municipios")

        bairros = read_filtered(bairros_shp, "neighborhood")
        municipio = read_filtered(municipios_shp, "municipality")

        if len(municipio["features"]) != 1:
            raise RuntimeError(
                f"Expected one municipal geometry, found {len(municipio['features'])}"
            )
        if len(bairros["features"]) < 20:
            raise RuntimeError(
                f"Suspiciously small neighborhood count: {len(bairros['features'])}"
            )

        write_geojson(OUT_DIR / "bairros.geojson", bairros)
        write_geojson(OUT_DIR / "municipio.geojson", municipio)

        metadata = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "municipality": TARGET_NAME,
            "municipalityCode": TARGET_MUNICIPALITY,
            "neighborhoodFeatures": len(bairros["features"]),
            "municipalityFeatures": len(municipio["features"]),
            "sources": {
                "neighborhoods": BAIRROS_URL,
                "municipality": MUNICIPIOS_URL,
            },
            "validation": {
                "coordinateSystemAssumption": "geographic lon/lat (validated by coordinate range)",
                "minimumNeighborhoodCount": 20,
                "generatedInCI": True,
            },
        }
        (OUT_DIR / "geodata-meta.json").write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        print(
            f"Built {len(bairros['features'])} neighborhood features and "
            f"{len(municipio['features'])} municipal feature."
        )


if __name__ == "__main__":
    main()
