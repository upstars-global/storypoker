"""The parity boundary rejects logic, adapter, and fixture drift."""
import json
from pathlib import Path
import tempfile
import unittest

import check_review_parity as parity


class ReviewParityTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='test-review-parity-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        parity.copy_package(parity.ROOT, self.root)
        self.manifest = parity.load_manifest(self.root)

    def write_manifest(self):
        (self.root / 'scripts/review-parity.json').write_text(json.dumps(self.manifest))

    def test_package_and_self_test(self):
        parity.check(self.root)
        parity.self_test(self.root)

    def test_all_four_exact_adapters_preserve_common_fingerprints(self):
        source = (self.root / self.manifest['adapter']['workflow']).read_text()
        original = self.manifest['adapter']
        for adapter in parity.ADAPTERS.values():
            with self.subTest(adapter=adapter):
                target = self.root / adapter['workflow']
                target.write_text(parity.render_workflow(source, original, adapter))
                self.manifest['adapter'] = adapter
                self.write_manifest()
                self.assertEqual(parity.check(self.root), self.manifest['common'])

    def test_invalid_or_overbroad_adapter_is_rejected(self):
        for key, value in [('reviewer', 'attacker'), ('events', ['push', 'pull_request']),
                           ('workflow', '../outside.yml'), ('jobs', []),
                           ('normalizations', ['.*']), ('dispatch', 'any')]:
            with self.subTest(key=key):
                original = dict(self.manifest['adapter'])
                self.manifest['adapter'][key] = value
                self.write_manifest()
                with self.assertRaisesRegex(ValueError, 'adapter'):
                    parity.check(self.root)
                self.manifest['adapter'] = original

    def test_skip_allowlist_cannot_expand_for_any_profile(self):
        for name,adapter in parity.ADAPTERS.items():
            for expanded in (adapter['skippable_jobs']+['Review workflow fixtures'],
                             adapter['skippable_jobs']+['unknown job']):
                with self.subTest(profile=name,expanded=expanded):
                    self.manifest['adapter']={**adapter,'skippable_jobs':expanded}
                    self.write_manifest()
                    with self.assertRaisesRegex(ValueError, 'adapter'):
                        parity.check(self.root)

    def test_logic_and_adapter_slot_drift_is_rejected(self):
        workflow = self.root / self.manifest['adapter']['workflow']
        original = workflow.read_text()
        for before, after in [('then "5" else', 'then "6" else'),
                              ('--effort medium', '--effort high'),
                              ('CI_EVENTS:', 'CI_OTHER_EVENTS:'),
                              ('Invalid auto-review-rounds-N labels', 'label validation removed')]:
            with self.subTest(before=before):
                self.assertEqual(original.count(before), 1)
                workflow.write_text(original.replace(before, after))
                with self.assertRaises(ValueError):
                    parity.check(self.root)
        workflow.write_text(original)

    def test_every_test_and_fixture_is_pinned(self):
        for path in parity.PACKAGE_FILES:
            with self.subTest(path=path):
                target = self.root / path
                original = target.read_bytes()
                target.write_bytes(original + b'\n# drift\n')
                with self.assertRaisesRegex(ValueError, 'drift'):
                    parity.check(self.root)
                target.write_bytes(original)

    def test_extra_fixture_and_missing_fingerprint_are_rejected(self):
        extra = self.root / 'scripts/fixtures/claude-review/extra'
        extra.write_text('untracked fixture')
        with self.assertRaisesRegex(ValueError, 'inventory'):
            parity.check(self.root)
        extra.unlink()
        del self.manifest['common']['scripts/test_claude_review.py']
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, 'drift'):
            parity.check(self.root)


if __name__ == '__main__':
    unittest.main()
