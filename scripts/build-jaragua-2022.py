#!/usr/bin/env python3
"""Build complete 2022 Jaraguá do Sul presidential locality aggregates from TSE.

Authoritative inputs
--------------------
- TSE Boletim de Urna (BU) for Santa Catarina, 1st and 2nd rounds of 2022.
- TSE Eleitorado por local de votação 2022.

The pipeline joins each effective BU section to its TSE voting-place record and
aggregates by NM_BAIRRO. It intentionally keeps "bairro do local de votação"
semantics: this is not the voter's home neighborhood.

The build fails if:
- the official TSE archives cannot be parsed;
- too many BU sections cannot be mapped to a TSE locality;
- municipality-level candidate/valid-vote totals do not reconcile exactly with
  known official Jaraguá do Sul totals.
"""

from __future__ import annotations

import csv
import io
import json
import math
import tempfile
import unicodedata
import urllib.request
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

TSE_MUNICIPALITY_CODE = "81752"
MUNICIPALITY_NAME = "JARAGUA DO SUL"
OUT_PATH = Path("public/jaragua-atlas/data/election-2022-local.json")

LOCATION_URL = (
    "https://cdn.tse.jus.br/estatistica/sead/odsele/"
    "eleitorado_locais_votacao/eleitorado_local_votacao_2022.zip"
)
BU_URLS = {
    1: (
        "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/"
        "buweb/bweb_1t_SC_051020221321.zip"
    ),
    2: (
        "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/"
        "buweb/bweb_2t_SC_311020221535.zip"
    ),
}

# Reconciliation anchors: official municipal totals already published by TSE.
EXPECTED = {
    1: {
        "valid": 102563,
        "blue": 71810,
        "red": 22389,
    },
    2: {
        "valid": 104007,
        "blue": 80164,
        "red": 23843,
    },
}

SPECIAL_VOTE_NUMBERS = {95, 96, 97, 98}


def norm_text(value: object) -> str:
    text = "" if value is None else str(value)
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return " ".join(text.strip().upper().split())


def norm_number(value: object) -> str:
    text = str(value or "").strip()
    if not text or text in {"-1", "-3", "#NULO", "#NE"}:
        return ""
    try:
        return str(int(float(text.replace(",", "."))))
    except ValueError:
        return text.lstrip("0") or "0"


def int_value(value: object) -> int:
    text = str(value or "").strip()
    if not text or text in {"#NULO", "#NE", "-1", "-3"}:
        return 0
    return int(float(text.replace(",", ".")))


def download(url: str, destination: Path) -> None:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "JaraguaElectoralAtlas/2.0 (+GitHub Actions)"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        destination.write_bytes(response.read())


def csv_members(zip_path: Path) -> list[str]:
    with zipfile.ZipFile(zip_path) as archive:
        members = [
            info.filename
            for info in archive.infolist()
            if info.filename.lower().endswith(".csv") and not info.is_dir()
        ]
    if not members:
        raise RuntimeError(f"No CSV found in {zip_path.name}")
    return members


def iter_zip_rows(zip_path: Path):
    members = csv_members(zip_path)
    with zipfile.ZipFile(zip_path) as archive:
        for member in members:
            with archive.open(member) as raw:
                text = io.TextIOWrapper(raw, encoding="latin-1", newline="")
                reader = csv.DictReader(text, delimiter=";")
                if reader.fieldnames is None:
                    continue
                for row in reader:
                    yield row


def is_target_municipality(row: dict[str, str]) -> bool:
    code = norm_number(row.get("CD_MUNICIPIO"))
    name = norm_text(row.get("NM_MUNICIPIO"))
    return code == TSE_MUNICIPALITY_CODE or name == MUNICIPALITY_NAME


def locality_key(row: dict[str, str], round_number: int) -> tuple[str, str, str, str]:
    return (
        str(round_number),
        norm_number(row.get("NR_ZONA")),
        norm_number(row.get("NR_SECAO")),
        norm_number(row.get("NR_LOCAL_VOTACAO")),
    )


def section_key(row: dict[str, str], round_number: int) -> tuple[str, str, str]:
    return (
        str(round_number),
        norm_number(row.get("NR_ZONA")),
        norm_number(row.get("NR_SECAO")),
    )


def build_location_index(location_zip: Path):
    by_full_key: dict[tuple[str, str, str, str], dict] = {}
    by_section: dict[tuple[str, str, str], dict] = {}
    candidate_rows = 0

    for row in iter_zip_rows(location_zip):
        if not is_target_municipality(row):
            continue
        round_number = int_value(row.get("NR_TURNO"))
        if round_number not in (1, 2):
            continue

        neighborhood = str(row.get("NM_BAIRRO") or "").strip()
        if not neighborhood or neighborhood in {"#NULO", "#NE"}:
            neighborhood = "SEM BAIRRO INFORMADO"

        location = {
            "neighborhood": neighborhood,
            "neighborhoodKey": norm_text(neighborhood),
            "locationName": str(row.get("NM_LOCAL_VOTACAO") or "").strip(),
            "address": str(row.get("DS_ENDERECO") or "").strip(),
            "latitude": str(row.get("NR_LATITUDE") or "").strip(),
            "longitude": str(row.get("NR_LONGITUDE") or "").strip(),
            "zone": norm_number(row.get("NR_ZONA")),
            "section": norm_number(row.get("NR_SECAO")),
            "localNumber": norm_number(row.get("NR_LOCAL_VOTACAO")),
            "sectionType": str(row.get("DS_TIPO_SECAO_AGREGADA") or "").strip(),
            "principalSection": norm_number(row.get("NR_SECAO_PRINCIPAL")),
        }

        full_key = locality_key(row, round_number)
        section = section_key(row, round_number)

        # Prefer conventional/active rows if duplicate records ever occur.
        by_full_key.setdefault(full_key, location)
        by_section.setdefault(section, location)
        candidate_rows += 1

    if candidate_rows < 200:
        raise RuntimeError(
            f"Suspiciously small voting-location coverage for Jaraguá do Sul: {candidate_rows}"
        )
    return by_full_key, by_section


def candidate_number(row: dict[str, str]) -> int | None:
    raw = norm_number(row.get("NR_VOTAVEL"))
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def process_round(
    round_number: int,
    bu_zip: Path,
    by_full_key: dict,
    by_section: dict,
) -> dict:
    sections: dict[tuple[str, str, str], dict] = {}
    candidate_totals: dict[int, int] = defaultdict(int)
    missing_location_keys: set[tuple[str, str, str]] = set()
    president_rows = 0

    for row in iter_zip_rows(bu_zip):
        if not is_target_municipality(row):
            continue
        if int_value(row.get("NR_TURNO")) != round_number:
            continue
        if norm_text(row.get("DS_CARGO_PERGUNTA")) != "PRESIDENTE":
            continue

        president_rows += 1
        s_key = section_key(row, round_number)
        full_key = locality_key(row, round_number)
        location = by_full_key.get(full_key) or by_section.get(s_key)
        if location is None:
            missing_location_keys.add(s_key)
            neighborhood = "SEM BAIRRO INFORMADO"
            location_name = ""
            local_number = norm_number(row.get("NR_LOCAL_VOTACAO"))
        else:
            neighborhood = location["neighborhood"]
            location_name = location["locationName"]
            local_number = location["localNumber"]

        section = sections.setdefault(
            s_key,
            {
                "round": round_number,
                "zone": norm_number(row.get("NR_ZONA")),
                "section": norm_number(row.get("NR_SECAO")),
                "localNumber": local_number,
                "locationName": location_name,
                "neighborhood": neighborhood,
                "neighborhoodKey": norm_text(neighborhood),
                "apt": int_value(row.get("QT_APTOS")),
                "turnout": int_value(row.get("QT_COMPARECIMENTO")),
                "abstention": int_value(row.get("QT_ABSTENCOES")),
                "valid": 0,
                "blank": 0,
                "null": 0,
                "candidates": defaultdict(int),
            },
        )

        # Participation fields repeat on every votable row. Validate consistency.
        for field, source in (
            ("apt", "QT_APTOS"),
            ("turnout", "QT_COMPARECIMENTO"),
            ("abstention", "QT_ABSTENCOES"),
        ):
            current = int_value(row.get(source))
            if current and section[field] and current != section[field]:
                raise RuntimeError(
                    f"Inconsistent {source} in round {round_number}, "
                    f"zone {section['zone']} section {section['section']}"
                )
            if current:
                section[field] = current

        nr = candidate_number(row)
        votes = int_value(row.get("QT_VOTOS"))
        if nr is None:
            continue
        if nr == 95:
            section["blank"] += votes
        elif nr in {96, 97, 98}:
            section["null"] += votes
        else:
            section["valid"] += votes
            section["candidates"][nr] += votes
            candidate_totals[nr] += votes

    if president_rows == 0 or not sections:
        raise RuntimeError(f"No presidential BU rows found for round {round_number}")

    localities: dict[str, dict] = {}
    for section in sections.values():
        key = section["neighborhoodKey"]
        item = localities.setdefault(
            key,
            {
                "name": section["neighborhood"],
                "sections": 0,
                "locations": set(),
                "apt": 0,
                "turnout": 0,
                "abstention": 0,
                "valid": 0,
                "blank": 0,
                "nullVotes": 0,
                "candidates": defaultdict(int),
            },
        )
        item["sections"] += 1
        if section["localNumber"]:
            item["locations"].add(section["localNumber"])
        item["apt"] += section["apt"]
        item["turnout"] += section["turnout"]
        item["abstention"] += section["abstention"]
        item["valid"] += section["valid"]
        item["blank"] += section["blank"]
        item["nullVotes"] += section["null"]
        for nr, votes in section["candidates"].items():
            item["candidates"][nr] += votes

    output_localities = []
    for item in localities.values():
        blue = item["candidates"].get(22, 0)
        red = item["candidates"].get(13, 0)
        valid = item["valid"]
        apt = item["apt"]
        output_localities.append(
            {
                "name": item["name"],
                "sections": item["sections"],
                "locations": len(item["locations"]),
                "apt": apt,
                "turnout": item["turnout"],
                "turnoutPct": round(item["turnout"] / apt * 100, 4) if apt else None,
                "abstention": item["abstention"],
                "abstentionPct": round(item["abstention"] / apt * 100, 4) if apt else None,
                "valid": valid,
                "blank": item["blank"],
                "nullVotes": item["nullVotes"],
                "blueVotes": blue,
                "blueShare": round(blue / valid * 100, 4) if valid else None,
                "redVotes": red,
                "redShare": round(red / valid * 100, 4) if valid else None,
                "otherVotes": valid - blue - red,
                "candidateVotes": {
                    str(number): votes
                    for number, votes in sorted(item["candidates"].items())
                },
            }
        )

    output_localities.sort(key=lambda row: norm_text(row["name"]))

    city = {
        "sections": len(sections),
        "localities": len(output_localities),
        "apt": sum(section["apt"] for section in sections.values()),
        "turnout": sum(section["turnout"] for section in sections.values()),
        "abstention": sum(section["abstention"] for section in sections.values()),
        "valid": sum(section["valid"] for section in sections.values()),
        "blank": sum(section["blank"] for section in sections.values()),
        "nullVotes": sum(section["null"] for section in sections.values()),
        "blueVotes": candidate_totals.get(22, 0),
        "redVotes": candidate_totals.get(13, 0),
        "candidateVotes": {
            str(number): votes for number, votes in sorted(candidate_totals.items())
        },
    }
    city["turnoutPct"] = round(city["turnout"] / city["apt"] * 100, 4) if city["apt"] else None
    city["abstentionPct"] = round(city["abstention"] / city["apt"] * 100, 4) if city["apt"] else None
    city["blueShare"] = round(city["blueVotes"] / city["valid"] * 100, 4)
    city["redShare"] = round(city["redVotes"] / city["valid"] * 100, 4)

    expected = EXPECTED[round_number]
    checks = {
        "valid": city["valid"],
        "blue": city["blueVotes"],
        "red": city["redVotes"],
    }
    for key, actual in checks.items():
        if actual != expected[key]:
            raise RuntimeError(
                f"Round {round_number} reconciliation failed for {key}: "
                f"expected {expected[key]}, got {actual}"
            )

    missing_ratio = len(missing_location_keys) / len(sections)
    if missing_ratio > 0.02:
        raise RuntimeError(
            f"Round {round_number} has {len(missing_location_keys)}/{len(sections)} "
            f"sections without locality mapping ({missing_ratio:.2%})"
        )

    return {
        "city": city,
        "localities": output_localities,
        "quality": {
            "presidentRows": president_rows,
            "mappedSections": len(sections) - len(missing_location_keys),
            "unmappedSections": len(missing_location_keys),
            "mappingCoveragePct": round((1 - missing_ratio) * 100, 4),
            "reconciledExactly": True,
        },
    }


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="jaragua-2022-") as temp:
        temp_dir = Path(temp)
        location_zip = temp_dir / "locations.zip"
        bu_zips = {
            1: temp_dir / "bu-1t.zip",
            2: temp_dir / "bu-2t.zip",
        }

        print("Downloading TSE 2022 voting-place registry...")
        download(LOCATION_URL, location_zip)
        for round_number, url in BU_URLS.items():
            print(f"Downloading TSE 2022 SC BU, round {round_number}...")
            download(url, bu_zips[round_number])

        by_full_key, by_section = build_location_index(location_zip)
        results = {
            str(round_number): process_round(
                round_number,
                bu_zips[round_number],
                by_full_key,
                by_section,
            )
            for round_number in (1, 2)
        }

        payload = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "municipality": "Jaraguá do Sul",
            "municipalityCodeTSE": TSE_MUNICIPALITY_CODE,
            "semantics": (
                "Aggregated by NM_BAIRRO of the TSE voting place, not by voter residence."
            ),
            "sources": {
                "locations": LOCATION_URL,
                "buRound1": BU_URLS[1],
                "buRound2": BU_URLS[2],
            },
            "round1": results["1"],
            "round2": results["2"],
        }

        OUT_PATH.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        for round_number in (1, 2):
            quality = results[str(round_number)]["quality"]
            city = results[str(round_number)]["city"]
            print(
                f"Round {round_number}: {city['sections']} sections, "
                f"{city['localities']} localities, "
                f"{quality['mappingCoveragePct']}% mapped; "
                f"valid={city['valid']}, 22={city['blueVotes']}, 13={city['redVotes']}"
            )


if __name__ == "__main__":
    main()
