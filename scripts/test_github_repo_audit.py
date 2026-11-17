"""Offline safety tests for github_repo_audit.py (stdlib unittest only)."""
import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).with_name("github_repo_audit.py")
SPEC = importlib.util.spec_from_file_location("github_repo_audit", MODULE)
auditor = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(auditor)


class ClassificationSafetyTests(unittest.TestCase):
    def test_real_products_named_punctuation_are_protected(self):
        for name in ("-", "---", "TradingAgents", "russian-monopoly-local"):
            self.assertEqual(
                auditor.disposition(name, False, None, 1, False, 100),
                "PROTECT",
            )

    def test_unknown_name_never_becomes_auto_delete(self):
        self.assertEqual(
            auditor.disposition("12345", False, None, 1, False, 4),
            "REVIEW_ORIGINAL_OR_IMPORT",
        )

    def test_empty_repository_still_requires_review(self):
        self.assertEqual(
            auditor.disposition("ai-core", False, None, 0, False, 0),
            "REVIEW_EMPTY",
        )

    def test_clean_default_branch_with_other_branches_is_not_pure(self):
        self.assertEqual(
            auditor.disposition("anthropic-quickstarts", True, 0, 12, False, 20),
            "REVIEW_FORK_BRANCHES",
        )

    def test_fork_with_single_branch_is_only_review_candidate(self):
        self.assertEqual(
            auditor.disposition("flux", True, 0, 1, False, 10),
            "REVIEW_SINGLE_BRANCH_UPSTREAM_COPY",
        )

    def test_unique_fork_preserved(self):
        self.assertEqual(
            auditor.disposition("Wan2.2", True, 17, 1, False, 20),
            "PRESERVE_OR_REVIEW_UNIQUE_FORK",
        )

    def test_archived_repo_is_never_action_target(self):
        self.assertEqual(
            auditor.disposition("flux", True, 0, 1, True, 10),
            "ALREADY_ARCHIVED",
        )


if __name__ == "__main__":
    unittest.main()
