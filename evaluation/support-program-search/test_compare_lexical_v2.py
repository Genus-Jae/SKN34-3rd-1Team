import copy
import json
import unittest
from unittest.mock import patch

import compare_lexical_v2 as comparison


class LexicalV2ComparisonTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture, cls.cases, _ = comparison.load_inputs()
        cls.report = json.loads((comparison.RUN / "report.json").read_text(encoding="utf-8"))

    def test_shared_report_recomputes_and_keeps_the_original_300_baseline(self):
        comparison.verify(self.report)

    def test_extra_cases_are_separate_ai_only_targets_with_exact_source_quotes(self):
        self.assertEqual(316, len(self.cases))
        self.assertEqual(316, len({case["targetId"] for case in self.cases}))
        self.assertEqual("N001", self.cases[300]["id"])
        _, _, provenance = comparison.load_inputs()
        self.assertIs(provenance["humanReviewed"], False)

    def test_rejects_changed_input_hash_or_human_review_claim(self):
        original = json.loads(comparison.ADDED.read_text(encoding="utf-8"))
        for field in ("hash", "human"):
            changed = copy.deepcopy(original)
            if field == "hash":
                changed["fixtureSha256"] = "0" * 64
            else:
                changed["provenance"]["humanReviewed"] = True
            with patch.object(comparison, "ADDED") as source:
                source.read_text.return_value = json.dumps(changed)
                with self.assertRaises(ValueError):
                    comparison.load_inputs()

    def test_rejects_target_reselection_and_invented_evidence(self):
        original = json.loads(comparison.ADDED.read_text(encoding="utf-8"))
        for field in ("target", "quote"):
            changed = copy.deepcopy(original)
            if field == "target":
                changed["cases"].reverse()
            else:
                changed["cases"][0]["evidenceQuote"] = "실제 공고에는 없는 임의의 증거 문장"
            with patch.object(comparison, "ADDED") as source:
                source.read_text.return_value = json.dumps(changed)
                with self.assertRaises(ValueError):
                    comparison.load_inputs()

    def test_rejects_missing_duplicate_and_unknown_candidates(self):
        for kind in ("missing", "duplicate", "unknown"):
            candidates = copy.deepcopy(self.report["candidateIds"])
            if kind == "missing":
                del candidates["v2"]["Q001"]
            elif kind == "duplicate":
                candidates["v2"]["Q001"][1] = candidates["v2"]["Q001"][0]
            else:
                candidates["v2"]["Q001"][0] = "OTHER:absent"
            with self.assertRaises(ValueError):
                comparison.summarize(self.fixture, self.cases, candidates, self.report["timings"])

    def test_rejects_missing_duplicate_or_invalid_timings(self):
        for kind in ("missing", "duplicate", "nan", "negative", "boolean"):
            timings = copy.deepcopy(self.report["timings"])
            if kind == "missing":
                timings.pop()
            elif kind == "duplicate":
                timings[1] = timings[0]
            else:
                timings[0]["httpMs"] = {"nan": float("nan"), "negative": -1, "boolean": True}[kind]
            with self.assertRaises(ValueError):
                comparison.summarize(self.fixture, self.cases, self.report["candidateIds"], timings)

    def test_rejects_fabricated_metrics_and_changed_source_configuration(self):
        for field in ("metrics", "config", "status"):
            report = copy.deepcopy(self.report)
            if field == "metrics":
                report["summaries"]["existing300"]["v2"]["hitCounts"]["20"] = 300
            elif field == "config":
                report["indexDefinitions"]["v2"]["settings"]["analysis"]["tokenizer"]["korean_words"]["decompound_mode"] = "mixed"
            else:
                report["status"] = "failed"
            with self.assertRaises(ValueError):
                comparison.verify(report)

    def test_network_guard_rejects_paid_remote_and_application_endpoints(self):
        for address in (("api.openai.com", 443), ("127.0.0.1", 8080), ("127.0.0.1", 6333)):
            with self.assertRaises(RuntimeError):
                comparison.base.restrict_network("socket.connect", (None, address))
        comparison.base.restrict_network("socket.connect", (None, ("127.0.0.1", 19200)))


if __name__ == "__main__":
    unittest.main()
