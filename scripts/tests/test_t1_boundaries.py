#!/usr/bin/env python3
"""Regression tests for T1 marking + queue integrity.

Run: .venv/bin/python -m unittest scripts.tests.test_t1_boundaries -v
Or:  npm test
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
RAW = ROOT / "raw"


def load_candidates():
    return json.loads((DATA / "candidates.json").read_text(encoding="utf-8"))


def load_meta():
    return json.loads((DATA / "meta.json").read_text(encoding="utf-8"))


class TestT1CallBoundaries(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cands = load_candidates()
        cls.meta = load_meta()
        cls.by_pedido = {c["pedido"]: c for c in cls.cands}
        cls.call_meta = [c for c in cls.cands if c.get("t1_call_meta")]

    def test_t1_call_list_has_750_rows(self):
        self.assertEqual(self.meta["stats"]["t1_call_list_parsed"], 750)
        self.assertEqual(len(self.call_meta), 750)

    def test_t1_call_segment_counts(self):
        from collections import Counter

        counts = Counter(c["t1_call_meta"]["segment_call"] for c in self.call_meta)
        self.assertEqual(counts["Ampla"], 562)
        self.assertEqual(counts["Negro"], 150)
        self.assertEqual(counts["PcD"], 38)

    def test_last_ampla_is_ana_carolina_596(self):
        ampla = [
            c for c in self.call_meta if c["t1_call_meta"]["segment_call"] == "Ampla"
        ]
        last = max(ampla, key=lambda c: c["rank_geral"])
        self.assertEqual(last["rank_geral"], 596)
        self.assertEqual(last["pedido"], 12877)
        self.assertIn("Ana Carolina Ferreira", last["name"])

    def test_last_negro_and_pcd_ranks(self):
        negro = [
            c for c in self.call_meta if c["t1_call_meta"]["segment_call"] == "Negro"
        ]
        pcd = [c for c in self.call_meta if c["t1_call_meta"]["segment_call"] == "PcD"]
        last_n = max(negro, key=lambda c: c["rank_geral"])
        last_p = max(pcd, key=lambda c: c["rank_geral"])
        self.assertEqual(last_n["rank_geral"], 1461)
        self.assertEqual(last_n["pedido"], 5559)
        self.assertEqual(last_p["rank_geral"], 2131)
        self.assertEqual(last_p["pedido"], 610)

    def test_beatriz_6906_override_called(self):
        """Community-confirmed: in formação. Not on inspeção/docs list."""
        b = self.by_pedido[6906]
        self.assertEqual(b["rank_geral"], 597)
        self.assertEqual(b["name"], "Beatriz Carvalho de Morais")
        self.assertIsNone(b.get("t1_call_meta"))
        self.assertTrue(b.get("called_override"))
        self.assertTrue(b["already_called"])
        self.assertFalse(b["in_remaining_queue"])

        t1_md = (RAW / "chamada-T1-OIPCE.md").read_text(encoding="utf-8")
        self.assertNotIn("Beatriz Carvalho de Morais", t1_md)

    def test_dayara_gestante_skipped_in_t1_ampla_window(self):
        d = next(c for c in self.cands if c["rank_geral"] == 583)
        self.assertIn("Dayara Kelly", d["name"])
        self.assertEqual(d["queue_status"], "gestante_fim_fila")
        self.assertTrue(d["t1_call_skipped"])
        self.assertEqual(d["t1_call_skip_reason"], "gestante")
        self.assertTrue(d["in_remaining_queue"])

    def test_ampla_skips_counts(self):
        summary = self.meta["t1_boundaries"]["ampla_skips_summary"]
        self.assertGreaterEqual(summary["gestante"], 1)
        self.assertGreaterEqual(summary["sub_judice"], 3)
        self.assertEqual(
            summary["total"], summary["sub_judice"] + summary["gestante"]
        )

    def test_danilo_cr_is_called_not_first_remaining(self):
        for c in self.cands:
            if c.get("situation") == "classificado" or c.get("t1_call_meta"):
                self.assertTrue(
                    c["already_called"],
                    f"should be called: {c['rank_geral']} {c['name']}",
                )

    def test_no_already_called_in_remaining_queue(self):
        for c in self.cands:
            self.assertEqual(
                c["in_remaining_queue"],
                not c["already_called"],
                f"inconsistent flags pedido={c['pedido']}",
            )

    def test_simulate_never_picks_already_called(self):
        remaining = [c for c in self.cands if c["in_remaining_queue"]]
        called = {c["pedido"] for c in self.cands if c["already_called"]}
        ampla = sorted(remaining, key=lambda c: c["rank_geral"])[:375]
        for c in ampla:
            self.assertNotIn(c["pedido"], called)
            self.assertFalse(c["already_called"])

        first_regular = next(
            c
            for c in sorted(remaining, key=lambda x: x["rank_geral"])
            if c["segment"] == "Ampla"
            and c.get("queue_status") == "regular"
            and c.get("taf") == "Apto"
        )
        # João Marcelo #616 is first Ampla Regular Apto remaining after Beatriz override
        self.assertEqual(first_regular["rank_geral"], 616)
        self.assertIn("Joao Marcelo", first_regular["name"])

    def test_meta_boundaries_exported(self):
        b = self.meta["t1_boundaries"]
        self.assertEqual(b["counts_from_call_meta"]["Ampla"], 562)
        self.assertEqual(b["last_from_call_meta"]["Ampla"]["rank_geral"], 596)
        self.assertTrue(b["beatriz_carvalho_de_morais_6906"]["already_called"])
        self.assertTrue(b["beatriz_carvalho_de_morais_6906"]["called_override"])

    def test_zero_unmatched_t1_rows(self):
        self.assertEqual(self.meta["stats"]["t1_call_unmatched_count"], 0)

    def test_skipped_subjudice_ahead_still_remaining(self):
        for rank in (392, 518, 547):
            c = next(x for x in self.cands if x["rank_geral"] == rank)
            self.assertEqual(c["condition"], "Sub judice")
            self.assertEqual(c["queue_status"], "sub_judice")
            self.assertTrue(c["t1_call_skipped"])
            self.assertTrue(c["in_remaining_queue"], c["name"])


class TestSimulateTsParity(unittest.TestCase):
    def test_first_remaining_starts_with_deferred_then_regular(self):
        cands = load_candidates()
        rem = sorted(
            [c for c in cands if c["in_remaining_queue"]],
            key=lambda c: c["rank_geral"],
        )
        self.assertEqual(rem[0]["rank_geral"], 392)
        self.assertNotIn(6906, [c["pedido"] for c in rem[:20]])
        statuses = {c["queue_status"] for c in rem[:5]}
        self.assertIn("sub_judice", statuses)
        self.assertIn("gestante_fim_fila", statuses)


if __name__ == "__main__":
    unittest.main()
