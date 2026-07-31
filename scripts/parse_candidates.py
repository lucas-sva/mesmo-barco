#!/usr/bin/env python3
"""Parse Comunicado 166 + Edital 17 + chamadas -> data/candidates.json"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "raw"
DATA = ROOT / "data"


def strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def norm_name(s: str) -> str:
    s = strip_accents(s).lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_br_float(s: str) -> float:
    return float(s.replace(".", "").replace(",", ".")) if "," in s else float(s)


def clean_166_text(text: str) -> str:
    # keep only Anexo I body
    start = re.search(r"ANEXO I DO COMUNICADO Nº 166", text)
    if start:
        text = text[start.start() :]
    end = re.search(r"ANEXO II DO COMUNICADO", text)
    if end:
        text = text[: end.start()]
    text = re.sub(r"===== PAGE \d+ =====\n*", "\n", text)
    text = re.sub(
        r"Comunicado Nº 166/2026-CEV/UECE.*?Página \d+ de 110\s*",
        "\n",
        text,
        flags=re.S,
    )
    text = re.sub(
        r"Pedido Nome Condição Segmento Nasc.*?Geral PcD Negro\s*",
        "\n",
        text,
    )
    # skip legend / title dates so they don't swallow the first row
    m = re.search(r"(?m)^(\d{2,5})\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]", text)
    if m:
        text = text[m.start() :]
    return text


ROW_RE = re.compile(
    r"""
    (?P<pedido>\d{1,5})
    \s+
    (?P<head>.*?)
    (?P<nasc>\d{2}/\d{2}/\d{4})
    \s+
    (?P<lp>\d+)\s+(?P<inf>\d+)\s+(?P<rl>\d+)\s+(?P<dc>\d+)\s+(?P<da>\d+)\s+
    (?P<dp>\d+)\s+(?P<pp>\d+)\s+(?P<lep>\d+)\s+(?P<le>\d+)\s+(?P<cont>\d+)\s+
    (?P<cri>\d+)\s+(?P<ml>\d+)\s+(?P<est>\d+)\s+
    (?P<objetiva>\d+)\s+
    (?P<discursiva>\d+,\d{2})\s+
    (?P<total>\d+,\d{2})\s+
    (?P<taf>Apto|Gestante|Inapto)(?:\s*\([^)]*\))?
    \s+
    (?P<psico>Recomendado(?:\s*\(\s*sub\s*judice\s*\))?|Não\s+Recomendado|Nao\s+Recomendado)
    \s+
    (?P<invest>Apto|Inapto)
    \s+
    (?P<sexo>[MF])
    \s+
    (?P<geral>\d+)
    \s+
    (?P<pcd>---|\d+)
    \s+
    (?P<negro>---|\d+)
    \s+
    (?P<sit>Classificado\s*\([^)]+\)|Cadastro\s+de\s+reserva)
    """,
    re.S | re.X | re.I,
)


def parse_head(head: str) -> dict:
    head = re.sub(r"\s+", " ", head).strip()
    # condition
    cond = "Regular"
    if re.search(r"\bSub\s*judice\b", head, re.I):
        cond = "Sub judice"
        head = re.sub(r"\bSub\s*judice\b", " ", head, flags=re.I)
    # segment near the end before leftover junk
    seg = None
    for candidate in (
        "Negro e PcD",
        "PcD",
        "Negro",
        "Ampla",
    ):
        # allow Ampla (sub judice) already stripped
        pat = rf"\b{re.escape(candidate)}\b(?:\s*\([^)]*\))?\s*$"
        m = re.search(pat, head, re.I)
        if m:
            seg = candidate
            head = head[: m.start()].strip()
            break
    if not seg:
        # try anywhere
        m = re.search(
            r"\b(Negro e PcD|PcD|Negro|Ampla)(?:\s*\([^)]*\))?\b", head, re.I
        )
        if m:
            seg = m.group(1)
            head = (head[: m.start()] + head[m.end() :]).strip()
    head = re.sub(r"\b(Regular|Sub\s*judice)\b", " ", head, flags=re.I)
    name = re.sub(r"\s+", " ", head).strip(" -")
    return {"name": name, "condition": cond, "segment": seg or "Ampla"}


def parse_166(path: Path) -> list[dict]:
    text = clean_166_text(path.read_text(encoding="utf-8"))
    rows = []
    for m in ROW_RE.finditer(text):
        g = m.groupdict()
        head = parse_head(g["head"])
        name = head["name"]
        # reject preamble false positives
        if not name or len(name) < 5 or len(name) > 80:
            continue
        if any(
            bad in name.lower()
            for bad in (
                "dispõe",
                "comunicado",
                "edital",
                "concurso público",
                "anexo",
                "relação",
                "habilitados",
            )
        ):
            continue
        # real pedidos in this contest are typically >= 2 digits and names have spaces
        if int(g["pedido"]) < 10 and " " not in name:
            continue
        if not re.search(r"[A-Za-zÀ-ÿ]", name):
            continue

        sit_raw = re.sub(r"\s+", " ", g["sit"]).strip()
        if sit_raw.lower().startswith("classificado"):
            mm = re.search(r"\(([^)]+)\)", sit_raw)
            situation = "classificado"
            situation_list = mm.group(1).strip() if mm else "Ampla"
        else:
            situation = "cadastro_reserva"
            situation_list = None

        after = text[m.end() : m.end() + 40]
        conditional = bool(re.match(r"\s*\(condicional\)", after, re.I))

        scores = {
            "lp": int(g["lp"]),
            "inf": int(g["inf"]),
            "rl": int(g["rl"]),
            "dc": int(g["dc"]),
            "da": int(g["da"]),
            "dp": int(g["dp"]),
            "pp": int(g["pp"]),
            "lep": int(g["lep"]),
            "le": int(g["le"]),
            "cont": int(g["cont"]),
            "cri": int(g["cri"]),
            "ml": int(g["ml"]),
            "est": int(g["est"]),
            "objetiva": int(g["objetiva"]),
            "discursiva": parse_br_float(g["discursiva"]),
            "total": parse_br_float(g["total"]),
        }

        rows.append(
            {
                "pedido": int(g["pedido"]),
                "name": name,
                "name_norm": norm_name(name),
                "condition": head["condition"],
                "segment": head["segment"],
                "birth_date": g["nasc"],
                "scores": scores,
                "taf": "Gestante" if g["taf"].lower() == "gestante" else "Apto"
                if g["taf"].lower() == "apto"
                else g["taf"],
                "psychological": re.sub(r"\s+", " ", g["psico"]).strip(),
                "social_investigation": "Apto"
                if g["invest"].lower() == "apto"
                else g["invest"],
                "sex": g["sexo"],
                "rank_geral": int(g["geral"]),
                "rank_pcd": None if g["pcd"] == "---" else int(g["pcd"]),
                "rank_negro": None if g["negro"] == "---" else int(g["negro"]),
                "situation_prelim_166": situation,
                "classified_as_166": situation_list,
                "gestante_condicional": conditional
                or g["taf"].lower() == "gestante",
                "source_scores": "comunicado-166-2026",
            }
        )
    # dedupe by pedido keeping first
    by_p: dict[int, dict] = {}
    for r in rows:
        by_p.setdefault(r["pedido"], r)
    return list(by_p.values())


def parse_edital17(path: Path) -> dict[int, dict]:
    text = path.read_text(encoding="utf-8")
    m = re.search(r"ANEXO II DO EDITAL Nº17", text)
    if m:
        text = text[: m.start()]

    # Segment may be missing on some Sub judice OCR lines.
    pat = re.compile(
        r"^(?P<pedido>\d+)\s+(?P<nome>.+?)\s+"
        r"(?P<condicao>Regular|Sub judice)\s+"
        r"(?:(?P<segmento>Negro e PcD|Ampla|Negro|PcD)\s+)?"
        r"(?P<nota>\d+,\d+)\s+(?P<sexo>[MF])\s+"
        r"(?P<geral>\d+)\s+(?P<pcd>---|\d+)\s+(?P<negro>---|\d+)"
        r"(?:\s+(?P<sit>Classificado \([^)]+\)|Cadastro de reserva))?\s*$",
        re.M,
    )
    out: dict[int, dict] = {}
    for m in pat.finditer(text):
        g = m.groupdict()
        name = g["nome"].strip()
        if len(name) < 5 or len(name) > 80:
            continue
        sit = g.get("sit")
        if sit and sit.startswith("Classificado"):
            situation = "classificado"
            classified_as = re.search(r"\(([^)]+)\)", sit).group(1)
        elif sit:
            situation = "cadastro_reserva"
            classified_as = None
        else:
            # truncated gestante / conditional lines still belong to CR
            situation = "cadastro_reserva"
            classified_as = None

        out[int(g["pedido"])] = {
            "name": name,
            "condition": g["condicao"],
            "segment": g["segmento"],  # may be None
            "total": parse_br_float(g["nota"]),
            "sex": g["sexo"],
            "rank_geral": int(g["geral"]),
            "rank_pcd": None if g["pcd"] == "---" else int(g["pcd"]),
            "rank_negro": None if g["negro"] == "---" else int(g["negro"]),
            "situation": situation,
            "classified_as": classified_as,
        }
    return out


def parse_call_list(path: Path, stop_at_anexo_ii: bool = True) -> list[dict]:
    """Parse PC call schedules (T1 or complementar).

    Tables mix formats:
      | 01 Maria Silva |  | 1 |
      | 1  Maria Silva |  | 599 |
      86 Lucyola Nogueira Alencar 63
    """
    text = path.read_text(encoding="utf-8")
    if stop_at_anexo_ii:
        # Section header only (avoid "no ANEXO II," mid-sentence)
        cut = re.search(r"(?m)^\s*ANEXO\s+I\s*I\s*$", text)
        if not cut:
            cut = re.search(
                r"(?m)^\s*AGENDAMENTO DE ENTREGA DE EXAMES MÉDICOS",
                text,
                re.I,
            )
        if cut:
            text = text[: cut.start()]

    rows: list[dict] = []
    current_seg: str | None = None
    for line in text.splitlines():
        up = line.upper()
        if "CANDIDATOS DA AMPLA" in up or (
            "AMPLA CONCORR" in up and "CARGO" in up
        ):
            current_seg = "Ampla"
        elif (
            "CANDIDATOS CONSIDERADOS NEGROS" in up
            or "CANDIDATOS DO SEGMENTO NEGRO" in up
            or "SEGMENTO NEGRO" in up
        ):
            current_seg = "Negro"
        elif "PESSOA COM DEFICI" in up or "SEGMENTO PESSOA" in up or re.search(
            r"CANDIDATOS PCD", up
        ):
            current_seg = "PcD"
        elif "SUB JUDICE" in up and "DEFICI" in up:
            current_seg = "PcD"

        if not current_seg:
            continue

        candidates_on_line: list[tuple[str, int]] = []

        m = re.search(
            r"\|\s*\d+\s+([^|]+?)\s*\|\s*\|\s*(\d+)\s*\|",
            line,
        )
        if m:
            name = re.sub(r"\s+", " ", m.group(1)).strip()
            rank = int(m.group(2))
            candidates_on_line.append((name, rank))
        else:
            m2 = re.search(
                r"^\s*\d+\s+([A-Za-zÀ-ÿ].+?)\s+(\d+)\s*$",
                line,
            )
            if m2:
                name = re.sub(r"\s+", " ", m2.group(1)).strip()
                rank = int(m2.group(2))
                candidates_on_line.append((name, rank))
            else:
                # broken markdown rows: | Name | | 593 |
                m3 = re.search(
                    r"\|\s*([A-Za-zÀ-ÿ][^|]+?)\s*\|\s*(?:\|)?\s*(\d+)\s*\|",
                    line,
                )
                if m3 and "CANDIDATO" not in m3.group(1).upper():
                    name = re.sub(r"\s+", " ", m3.group(1)).strip()
                    rank = int(m3.group(2))
                    candidates_on_line.append((name, rank))

        for name, rank in candidates_on_line:
            if not name or name.lower() in ("candidato", "ord.", "classificação"):
                continue
            if re.fullmatch(r"[\d.\-]+", name):
                continue
            rows.append(
                {
                    "name": name,
                    "name_norm": norm_name(name),
                    "segment_call": current_seg,
                    "rank_in_segment_list": rank,
                }
            )

    uniq: dict[str, dict] = {}
    for r in rows:
        uniq.setdefault(r["name_norm"], r)
    return list(uniq.values())


def parse_complementar(path: Path) -> list[dict]:
    return parse_call_list(path, stop_at_anexo_ii=True)


def match_call_row(merged: list[dict], c: dict) -> dict | None:
    """Match a call-list row to a candidate.

    Prefer rank+segment (homônimos existem). Fall back to exact name_norm.
    """
    seg = c["segment_call"]
    rank = c["rank_in_segment_list"]
    first = c["name_norm"].split()[0] if c["name_norm"] else ""

    def first_ok(p: dict) -> bool:
        return bool(first) and norm_name(p["name"]).split()[0] == first

    by_rank: list[dict] = []
    if seg == "Ampla":
        by_rank = [p for p in merged if p["rank_geral"] == rank]
    elif seg == "Negro":
        by_rank = [p for p in merged if p.get("rank_negro") == rank]
    elif seg == "PcD":
        by_rank = [p for p in merged if p.get("rank_pcd") == rank]

    if len(by_rank) == 1:
        return by_rank[0]
    if len(by_rank) > 1:
        named = [p for p in by_rank if p["name_norm"] == c["name_norm"]]
        if len(named) == 1:
            return named[0]
        soft = [p for p in by_rank if first_ok(p)]
        if len(soft) == 1:
            return soft[0]
        return named[0] if named else by_rank[0]

    # fallback: unique exact name
    named = [p for p in merged if p["name_norm"] == c["name_norm"]]
    if len(named) == 1:
        return named[0]
    if len(named) > 1 and first:
        # disambiguate later ranks poorly; require first name already implied
        return None
    return named[0] if named else None


def apply_structural_t1_cr(merged: list[dict]) -> list[dict]:
    """Fallback: 250 CR seats = 187 ampla + 50 negro + 13 PcD after the 500 imediatas.

    Mirrors Edital 02 vacancy table (CR column).
    """
    already = {p["pedido"] for p in merged if p.get("situation") == "classificado"}
    pool = [p for p in merged if p["pedido"] not in already]

    cr_picked: list[dict] = []

    ampla_pool = sorted(pool, key=lambda p: p["rank_geral"])
    for p in ampla_pool:
        if len([x for x in cr_picked if x["_cr_list"] == "Ampla"]) >= 187:
            break
        p = dict(p)
        p["_cr_list"] = "Ampla"
        cr_picked.append(p)
        already.add(p["pedido"])

    negro_pool = sorted(
        [
            p
            for p in pool
            if p["pedido"] not in already
            and p["segment"] in ("Negro", "Negro e PcD")
            and p.get("rank_negro") is not None
        ],
        key=lambda p: p["rank_negro"] or 99999,
    )
    for p in negro_pool:
        if len([x for x in cr_picked if x["_cr_list"] == "Negro"]) >= 50:
            break
        p = dict(p)
        p["_cr_list"] = "Negro"
        cr_picked.append(p)
        already.add(p["pedido"])

    pcd_pool = sorted(
        [
            p
            for p in pool
            if p["pedido"] not in already
            and p["segment"] in ("PcD", "Negro e PcD")
            and p.get("rank_pcd") is not None
        ],
        key=lambda p: p["rank_pcd"] or 99999,
    )
    for p in pcd_pool:
        if len([x for x in cr_picked if x["_cr_list"] == "PcD"]) >= 13:
            break
        p = dict(p)
        p["_cr_list"] = "PcD"
        cr_picked.append(p)
        already.add(p["pedido"])

    return cr_picked


def reverse_engineer_t1_call_order(candidates: list[dict]) -> list[dict]:
    """T1 full call: 500 imediatas (Edital 17 Situação) + 250 CR."""
    t1 = [c for c in candidates if c.get("called_t1")]
    t1_sorted = sorted(
        t1,
        key=lambda c: (
            0 if c.get("called_t1_imediata") else 1,
            c["rank_geral"],
        ),
    )
    sequence = []
    for i, c in enumerate(t1_sorted, start=1):
        sequence.append(
            {
                "call_index": i,
                "pedido": c["pedido"],
                "name": c["name"],
                "filled_list": c.get("classified_as")
                or c.get("t1_cr_list")
                or "Ampla",
                "seat_type": "imediata" if c.get("called_t1_imediata") else "cr",
                "segment": c["segment"],
                "rank_geral": c["rank_geral"],
                "sex": c["sex"],
            }
        )
    return sequence

def infer_calls_from_complementar_gaps(merged: list[dict]) -> list[dict]:
    """If complementar called rank R, better ranks in that segment already left.

    Official lists sometimes skip contiguous ranks (ex.: Negro complementar
    starts at #216 while T1 Negro ended at #195). Juridically, a lower
    classification cannot pass a higher one on the same list. We mark the
    missing Regular/Apto names as already called, with an explicit caveat.
    Sub judice and gestante stay deferred (same skip pattern as T1).
    """
    specs = [
        ("Ampla", "rank_geral", lambda p: p.get("segment") == "Ampla"),
        (
            "Negro",
            "rank_negro",
            lambda p: p.get("rank_negro") is not None
            and p.get("segment") in ("Negro", "Negro e PcD"),
        ),
        (
            "PcD",
            "rank_pcd",
            lambda p: p.get("rank_pcd") is not None
            and p.get("segment") in ("PcD", "Negro e PcD"),
        ),
    ]
    inferred: list[dict] = []
    for seg, field, eligible in specs:
        comp = [
            p
            for p in merged
            if p.get("called_complementar")
            and (p.get("complementar_meta") or {}).get("segment_call") == seg
            and p.get(field) is not None
        ]
        if not comp:
            continue
        r_max = max(p[field] for p in comp)
        for p in merged:
            if not eligible(p):
                continue
            r = p.get(field)
            if r is None or r > r_max:
                continue
            if p.get("called_t1") or p.get("called_complementar") or p.get("called_override"):
                continue
            if p.get("condition") == "Sub judice":
                continue
            if (p.get("taf") or "").lower() == "gestante" or p.get("gestante_condicional"):
                continue
            p["called_inferred_gap"] = True
            p["gap_inference_meta"] = {
                "segment": seg,
                "rank_field": field,
                "rank": r,
                "evidence_max_rank": r_max,
                "caveat": (
                    f"Inferência: a complementar do segmento {seg} convocou até "
                    f"classificação {r_max}. Quem está à frente nessa fila e não "
                    f"é sub judice/gestante é tratado como já saído, mesmo sem "
                    f"constar no PDF da complementar (buraco documental)."
                ),
            }
            inferred.append(
                {
                    "pedido": p["pedido"],
                    "name": p["name"],
                    "segment": seg,
                    "rank_field": field,
                    "rank": r,
                    "score": p.get("scores", {}).get("total"),
                    "evidence_max_rank": r_max,
                }
            )
    return inferred


def _boundary_row(c: dict) -> dict:
    return {
        "pedido": c["pedido"],
        "name": c["name"],
        "rank_geral": c["rank_geral"],
        "segment": c["segment"],
        "score": c.get("scores", {}).get("total"),
    }


def assign_queue_status(p: dict) -> str:
    """App-facing status for filters: regular | sub_judice | gestante_fim_fila | inapto."""
    taf = (p.get("taf") or "").strip()
    if taf.lower() == "inapto":
        return "inapto"
    if taf.lower() == "gestante" or p.get("gestante_condicional"):
        return "gestante_fim_fila"
    if p.get("condition") == "Sub judice":
        return "sub_judice"
    return "regular"


def annotate_t1_call_skips(merged: list[dict]) -> list[dict]:
    """People whose geral rank sits inside a T1 call window but were not on that list.

    Observed Ampla pattern: Sub judice and Gestante were skipped on the
    inspeção/docs list; seats were filled by the next names (same seat count,
    deeper ranks). Hypothesis for gestantes: deferred TAF / fim de fila.
    We do NOT have a DOE saying 'fim de fila'; the skip is an observed fact.
    """
    last_by_seg: dict[str, int] = {}
    for p in merged:
        meta = p.get("t1_call_meta")
        if not meta:
            continue
        seg = meta["segment_call"]
        last_by_seg[seg] = max(last_by_seg.get(seg, 0), p["rank_geral"])

    skips: list[dict] = []
    for p in merged:
        p["queue_status"] = assign_queue_status(p)
        p["t1_call_skipped"] = False
        p["t1_call_skip_reason"] = None

        # Ampla-segment holes inside Ampla call window
        if p.get("segment") != "Ampla":
            continue
        last = last_by_seg.get("Ampla")
        if last is None or p["rank_geral"] > last:
            continue
        if p.get("t1_call_meta"):
            continue

        reason = None
        if p.get("queue_status") == "gestante_fim_fila":
            reason = "gestante"
        elif p.get("queue_status") == "sub_judice":
            reason = "sub_judice"
        if not reason:
            continue

        p["t1_call_skipped"] = True
        p["t1_call_skip_reason"] = reason
        skips.append(
            {
                **_boundary_row(p),
                "reason": reason,
                "queue_status": p["queue_status"],
                "situation": p.get("situation"),
                "already_called": p.get("already_called"),
                "taf": p.get("taf"),
                "condition": p.get("condition"),
            }
        )
    return skips


def _compute_t1_boundaries(
    merged: list[dict], t1_call: list[dict], ampla_skips: list[dict]
) -> dict:
    """Document observed last seats per segment on the T1 inspeção/docs call."""
    by_seg: dict[str, list[dict]] = {"Ampla": [], "Negro": [], "PcD": []}
    for p in merged:
        meta = p.get("t1_call_meta")
        if not meta:
            continue
        seg = meta.get("segment_call")
        if seg in by_seg:
            by_seg[seg].append(p)

    last = {}
    counts = {}
    for seg, xs in by_seg.items():
        xs = sorted(xs, key=lambda c: c["rank_geral"])
        counts[seg] = len(xs)
        last[seg] = _boundary_row(xs[-1]) if xs else None

    first_rem_ampla = next(
        (
            _boundary_row(p)
            for p in sorted(merged, key=lambda c: c["rank_geral"])
            if p.get("in_remaining_queue")
            and p.get("segment") == "Ampla"
            and p.get("queue_status") == "regular"
            and p.get("taf") == "Apto"
        ),
        None,
    )

    beatriz = next((p for p in merged if p["pedido"] == 6906), None)
    gest_remaining = sum(
        1 for p in merged if p.get("queue_status") == "gestante_fim_fila" and p.get("in_remaining_queue")
    )
    sj_remaining = sum(
        1 for p in merged if p.get("queue_status") == "sub_judice" and p.get("in_remaining_queue")
    )

    return {
        "t1_call_rows": len(t1_call),
        "counts_from_call_meta": counts,
        "last_from_call_meta": last,
        "first_remaining_ampla_regular_apto": first_rem_ampla,
        "ampla_skips_inside_t1_window": ampla_skips,
        "ampla_skips_summary": {
            "total": len(ampla_skips),
            "sub_judice": sum(1 for s in ampla_skips if s["reason"] == "sub_judice"),
            "gestante": sum(1 for s in ampla_skips if s["reason"] == "gestante"),
            "still_in_queue": sum(1 for s in ampla_skips if not s["already_called"]),
            "marked_called_via_edital_or_override": sum(
                1 for s in ampla_skips if s["already_called"]
            ),
        },
        "queue_status_remaining": {
            "gestante_fim_fila": gest_remaining,
            "sub_judice": sj_remaining,
        },
        "skip_hypothesis": (
            "Na lista Ampla da inspeção/docs, Sub judice e Gestante com rank dentro "
            "da janela preenchida (#1 até o último Ampla chamado) não aparecem. "
            "As vagas continuam as mesmas (562 Ampla); a lista só foi mais fundo. "
            "Gestante sem TAF completo é tratada no app como 'gestante/fim de fila' "
            "(hipótese operacional; sem DOE explícito de pedido de fim de fila)."
        ),
        "beatriz_carvalho_de_morais_6906": (
            {
                **_boundary_row(beatriz),
                "in_t1_call_list": bool(beatriz.get("t1_call_meta")),
                "already_called": beatriz.get("already_called"),
                "called_override": bool(beatriz.get("called_override")),
                "in_remaining_queue": beatriz.get("in_remaining_queue"),
                "situation": beatriz.get("situation"),
                "override_meta": beatriz.get("override_meta"),
            }
            if beatriz
            else None
        ),
        "note": (
            "Últimos da chamada de inspeção/docs (raw/chamada-T1-OIPCE.md). "
            "Não é lista de nomeação/matrícula no curso."
        ),
    }


def main() -> None:
    rows_166 = parse_166(RAW / "comunicado-166-oipce.md")
    e17 = parse_edital17(RAW / "chamada-T1-DOE-OIPCE.md")
    t1_call = parse_call_list(RAW / "chamada-T1-OIPCE.md", stop_at_anexo_ii=True)
    complementar = parse_complementar(RAW / "chamada-complementar-OIPCE.md")

    print("parsed 166:", len(rows_166))
    print("parsed e17:", len(e17))
    print("t1 call rows:", len(t1_call), Counter(r["segment_call"] for r in t1_call))
    print("complementar rows:", len(complementar))
    print("166 sit", Counter(r["situation_prelim_166"] for r in rows_166))
    print("166 seg", Counter(r["segment"] for r in rows_166))

    by_pedido_166 = {r["pedido"]: r for r in rows_166}

    merged = []
    missing_scores = []
    rank_mismatches = []

    all_pedidos = set(by_pedido_166) | set(e17)
    for pedido in sorted(all_pedidos):
        a = by_pedido_166.get(pedido)
        b = e17.get(pedido)
        if a and b:
            if a["rank_geral"] != b["rank_geral"]:
                rank_mismatches.append((pedido, a["rank_geral"], b["rank_geral"]))
            base = dict(a)
            base.update(
                {
                    "name": b["name"],
                    "name_norm": norm_name(b["name"]),
                    "condition": b["condition"],
                    "segment": b["segment"] or a["segment"],
                    "sex": b["sex"],
                    "rank_geral": b["rank_geral"],
                    "rank_pcd": b["rank_pcd"],
                    "rank_negro": b["rank_negro"],
                    "situation": b["situation"],
                    "classified_as": b["classified_as"],
                    "scores": {**a["scores"], "total": b["total"]},
                    "source_ranking": "edital-17-2026",
                }
            )
            if abs(a["scores"]["total"] - b["total"]) > 0.001:
                base["total_changed_after_resource"] = {
                    "from_166": a["scores"]["total"],
                    "to_17": b["total"],
                }
            merged.append(base)
        elif a and not b:
            base = dict(a)
            base["situation"] = a["situation_prelim_166"]
            base["classified_as"] = a["classified_as_166"]
            base["source_ranking"] = "comunicado-166-only"
            merged.append(base)
        else:
            missing_scores.append(pedido)
            b = e17[pedido]
            merged.append(
                {
                    "pedido": pedido,
                    "name": b["name"],
                    "name_norm": norm_name(b["name"]),
                    "condition": b["condition"],
                    "segment": b["segment"] or "Ampla",
                    "birth_date": None,
                    "scores": {
                        "lp": None,
                        "inf": None,
                        "rl": None,
                        "dc": None,
                        "da": None,
                        "dp": None,
                        "pp": None,
                        "lep": None,
                        "le": None,
                        "cont": None,
                        "cri": None,
                        "ml": None,
                        "est": None,
                        "objetiva": None,
                        "discursiva": None,
                        "total": b["total"],
                    },
                    "taf": None,
                    "psychological": None,
                    "social_investigation": None,
                    "sex": b["sex"],
                    "rank_geral": b["rank_geral"],
                    "rank_pcd": b["rank_pcd"],
                    "rank_negro": b["rank_negro"],
                    "situation": b["situation"],
                    "classified_as": b["classified_as"],
                    "gestante_condicional": False,
                    "source_scores": None,
                    "source_ranking": "edital-17-2026",
                }
            )

    e17_classificados = {
        p for p, row in e17.items() if row.get("situation") == "classificado"
    }
    if e17_classificados:
        for p in merged:
            if p["pedido"] not in e17 and p.get("situation") == "classificado":
                p["situation"] = "cadastro_reserva"
                p["classified_as"] = None
                p["note"] = (
                    "Presente no Comunicado 166 como classificado, "
                    "ausente no Edital 17 definitivo."
                )

    # --- Mark T1: 500 imediatas + 250 CR (+ complementar depois) ---
    for p in merged:
        p["called_t1_imediata"] = p.get("situation") == "classificado"
        p["called_t1_cr"] = False
        p["t1_cr_list"] = None
        p["called_t1"] = False
        p["called_complementar"] = False
        p["called_inferred_gap"] = False
        p.pop("complementar_meta", None)
        p.pop("t1_call_meta", None)
        p.pop("gap_inference_meta", None)
        p.pop("called_override", None)
        p.pop("override_meta", None)

    # 1) From official T1 medical/docs call list (~750)
    unmatched_t1 = []
    for c in t1_call:
        hit = match_call_row(merged, c)
        if not hit:
            unmatched_t1.append(c)
            continue
        hit["called_t1"] = True
        hit["t1_call_meta"] = c
        if not hit["called_t1_imediata"]:
            hit["called_t1_cr"] = True
            hit["t1_cr_list"] = c["segment_call"]

    # 2) Structural fallback ONLY if call list didn't reach ~750
    t1_now = sum(1 for p in merged if p["called_t1"])
    structural_applied = 0
    if t1_now < 740:
        structural_cr = apply_structural_t1_cr(merged)
        for sc in structural_cr:
            real = next(p for p in merged if p["pedido"] == sc["pedido"])
            if real["called_t1"]:
                continue
            real["called_t1"] = True
            real["called_t1_cr"] = True
            real["t1_cr_list"] = sc["_cr_list"]
            real["t1_cr_source"] = "structural-edital-02"
            structural_applied += 1

    # Ensure all imediatas are marked called_t1
    for p in merged:
        if p["called_t1_imediata"]:
            p["called_t1"] = True

    unmatched_comp = []
    for c in complementar:
        hit = match_call_row(merged, c)
        if not hit:
            unmatched_comp.append(c)
            continue
        hit["called_complementar"] = True
        hit["complementar_meta"] = c
        # complementar may call people already in T1 list (backfill) or next ones
        hit["called_t1"] = hit.get("called_t1", False)

    # 2b) Infer missing names ahead of complementar ranks (document gaps)
    gap_inferred = infer_calls_from_complementar_gaps(merged)

    # 3) Manual overrides (nomeação / matrícula no curso ainda sem MD no repo)
    overrides_path = RAW / "overrides-already-called.json"
    override_hits = []
    if overrides_path.exists():
        ov = json.loads(overrides_path.read_text(encoding="utf-8"))
        for entry in ov.get("entries") or []:
            pedido = int(entry["pedido"])
            hit = next((p for p in merged if p["pedido"] == pedido), None)
            if not hit:
                continue
            hit["called_override"] = True
            hit["override_meta"] = {
                "reason": entry.get("reason"),
                "source": entry.get("source"),
            }
            override_hits.append(pedido)

    for p in merged:
        p["already_called"] = bool(
            p["called_t1"]
            or p["called_complementar"]
            or p.get("called_override")
            or p.get("called_inferred_gap")
        )
        p["in_remaining_queue"] = not p["already_called"]

    ampla_skips = annotate_t1_call_skips(merged)

    call_order_t1 = reverse_engineer_t1_call_order(merged)

    intercalation = []
    counts = {"Ampla": 0, "Negro": 0, "PcD": 0, "F": 0, "total": 0, "cr": 0, "imediata": 0}
    for step in call_order_t1:
        counts["total"] += 1
        fl = step["filled_list"]
        if fl in counts:
            counts[fl] += 1
        if step.get("seat_type") == "cr":
            counts["cr"] += 1
        else:
            counts["imediata"] += 1
        if step["sex"] == "F":
            counts["F"] += 1
        intercalation.append(
            {
                **step,
                "cum_ampla": counts.get("Ampla", 0),
                "cum_negro": counts.get("Negro", 0),
                "cum_pcd": counts.get("PcD", 0),
                "cum_women": counts["F"],
                "women_pct": round(100 * counts["F"] / counts["total"], 2),
            }
        )

    meta = {
        "contest": "OIPCE - Oficial Investigador de Polícia Civil do Ceará",
        "sources": [
            {
                "id": "edital-01",
                "title": "Edital nº 1 – PC/CE (abertura)",
                "file": "raw/edital-OIPCE.md",
            },
            {
                "id": "edital-02",
                "title": "Edital nº 2 – PC/CE (vagas: 500 imediatas + 250 CR)",
                "file": "raw/edital-alt-OIPCE.md",
            },
            {
                "id": "edital-16",
                "title": "Edital nº 16/2026 – PC/CE (cadastro de reserva ampliado)",
                "file": "raw/edital-16-OIPCE.md",
            },
            {
                "id": "lei-19706",
                "title": "Lei nº 19.706/2026",
                "file": "raw/lei-19706.md",
            },
            {
                "id": "comunicado-166",
                "title": "Comunicado nº 166/2026-CEV/UECE (notas + classificação preliminar)",
                "file": "raw/comunicado-166-oipce.md",
            },
            {
                "id": "edital-17",
                "title": "Edital nº 17 – PC/CE (resultado 1ª turma / Situação)",
                "file": "raw/chamada-T1-DOE-OIPCE.md",
            },
            {
                "id": "chamada-t1",
                "title": "Comunicado inspeção/docs T1 (500 imediatas + 250 CR ≈ 750)",
                "file": "raw/chamada-T1-OIPCE.md",
            },
            {
                "id": "chamada-complementar",
                "title": "Chamada complementar (~54 remanescentes por desistência)",
                "file": "raw/chamada-complementar-OIPCE.md",
            },
            {
                "id": "overrides-called",
                "title": "Overrides manuais (nomeação/curso) com fonte citada",
                "file": "raw/overrides-already-called.json",
            },
        ],
        "rules": {
            "ranking": {
                "summary": "Ordem decrescente da nota final (objetiva + discursiva).",
                "cite": "Edital 17, itens 5 e 6; Comunicado 166, itens 2 e 3",
            },
            "tiebreak": {
                "order": [
                    "60+ anos (Estatuto do Idoso)",
                    "maior nota na prova objetiva",
                    "maior nota na prova discursiva",
                    "maior nota em Língua Portuguesa",
                    "maior nota em Raciocínio Lógico",
                    "maior nota em Legislação Estadual",
                    "função de jurado (comprovada na inscrição)",
                    "maior idade",
                ],
                "cite": "Edital 17, item 7; Comunicado 166, item 4",
            },
            "quotas": {
                "pcd_pct": 5,
                "negro_pct": 20,
                "women_floor_pct": 15,
                "negro_in_ampla": (
                    "Negro com nota suficiente para ampla entra pela ampla "
                    "e não consome vaga da cota racial."
                ),
                "cite_negro_ampla": "Edital nº 1, subitens 5.2.5 a 5.2.5.2",
                "cite_women": (
                    "Edital nº 1, subitem 5.3; Lei 16.826/2019 art. 2º; "
                    "Edital 17 item 11"
                ),
                "cite_alternancia": (
                    "Edital nº 1, subitem 5.2.7 (alternância e proporcionalidade)"
                ),
            },
            "t1_vacancies": {
                "imediata": {"ampla": 375, "pcd": 25, "negro": 100, "total": 500},
                "cr": {"ampla": 187, "pcd": 13, "negro": 50, "total": 250},
                "turma1_total": 750,
            },
            "calling_model": {
                "summary": (
                    "A T1 reuniu 500 vagas imediatas + 250 do cadastro de reserva "
                    "(Edital 02). Quem está como Classificado no Edital 17 são as "
                    "imediatas; os 250 CR constam no comunicado de inspeção/docs da T1. "
                    "A complementar (~54) só repôs desistência/vaga não preenchida. "
                    "A simulação de T2 parte de quem sobrou DEPOIS disso."
                ),
                "caveat": (
                    "Sem lista pública de quem da T1/complementar ficou inapto ou "
                    "desistiu de fato, a fila restante é a do papel. "
                    "Quando a complementar convoca alguém mais atrás e deixa um "
                    "buraco à frente, o app infere que esses nomes já saíram "
                    "(ressalva: falta o documento intermediário). "
                    "Sub judice e gestante não entram nessa inferência. "
                    "Overrides manuais ficam em raw/overrides-already-called.json."
                ),
            },
        },
        "stats": {
            "total_candidates": len(merged),
            "parsed_166": len(rows_166),
            "parsed_edital17": len(e17),
            "missing_detailed_scores": len(missing_scores),
            "rank_mismatches_166_vs_17": len(rank_mismatches),
            "t1_call_list_parsed": len(t1_call),
            "t1_imediata": sum(1 for p in merged if p["called_t1_imediata"]),
            "t1_cr": sum(1 for p in merged if p["called_t1_cr"]),
            "t1_total": sum(1 for p in merged if p["called_t1"]),
            "complementar_matched": sum(1 for p in merged if p["called_complementar"]),
            "complementar_unmatched": unmatched_comp,
            "t1_call_unmatched": unmatched_t1[:20],
            "t1_call_unmatched_count": len(unmatched_t1),
            "t1_structural_cr_added": structural_applied,
            "already_called": sum(1 for p in merged if p["already_called"]),
            "remaining": sum(1 for p in merged if p["in_remaining_queue"]),
            "women_in_t1": sum(
                1 for p in merged if p["called_t1"] and p["sex"] == "F"
            ),
            "override_called": len(override_hits),
            "gap_inferred_called": len(gap_inferred),
        },
        "gap_inference": {
            "description": (
                "Se a complementar de um segmento convocou até a classificação R, "
                "candidatos regulares/apto com classificação <= R nesse segmento "
                "que não aparecem nas listas oficiais são marcados como já saídos. "
                "Premissa: classificação pior não passa na frente de classificação "
                "melhor na mesma fila. Sub judice e gestante ficam de fora da "
                "inferência. Falta documento intermediário; tratamos como ressalva."
            ),
            "inferred": gap_inferred,
            "by_segment": {
                seg: sum(1 for x in gap_inferred if x["segment"] == seg)
                for seg in ("Ampla", "Negro", "PcD")
            },
        },
        "t1_boundaries": _compute_t1_boundaries(merged, t1_call, ampla_skips),
        "calling_model_observed": {
            "description": (
                "T1 = 500 imediatas (Situação Classificado no Edital 17: "
                "375 ampla + 100 negro + 25 PcD) + 250 CR (187 ampla + 50 negro + "
                "13 PcD, conforme Edital 02), convocados no comunicado de "
                "inspeção/entrega de documentos. A complementar puxou ~54 nomes "
                "seguintes por segmento para cobrir buraco. Simular T2 usa só quem "
                "ainda não entrou nessas listas."
            ),
            "cite": (
                "Edital 02 (tabela de vagas); Edital 17 Anexo I; "
                "comunicado de convocação T1; chamada complementar"
            ),
            "t1_ampla_rule": "imediatas: Classificado (Ampla); CR ampla: próximos por rank_geral",
            "t1_negro_rule": "imediatas Classificado (Negro) + CR pelos próximos rank_negro",
            "t1_pcd_rule": "imediatas Classificado (PcD) + CR pelos próximos rank_pcd",
            "complementar": "Listas oficiais por segmento no comunicado complementar.",
            "women_floor_pct": 15,
        },
        "rank_mismatch_samples": rank_mismatches[:20],
        "missing_score_pedidos": missing_scores[:50],
    }

    # women pct for observed
    t1n = meta["stats"]["t1_total"] or 1
    meta["calling_model_observed"]["women_t1_pct"] = round(
        100 * meta["stats"]["women_in_t1"] / t1n, 1
    )

    DATA.mkdir(exist_ok=True)
    (DATA / "candidates.json").write_text(
        json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DATA / "t1_call_order.json").write_text(
        json.dumps(intercalation, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DATA / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DATA / "t1_call_raw.json").write_text(
        json.dumps(t1_call, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DATA / "complementar_raw.json").write_text(
        json.dumps(complementar, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("=== MERGE STATS ===")
    print(json.dumps(meta["stats"], ensure_ascii=False, indent=2))
    rem = sorted(
        [p for p in merged if p["in_remaining_queue"]],
        key=lambda p: p["rank_geral"],
    )[:5]
    print("first remaining:")
    for p in rem:
        print(" ", p["rank_geral"], p["name"], p["segment"])


if __name__ == "__main__":
    main()
