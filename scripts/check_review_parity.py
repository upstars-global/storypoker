#!/usr/bin/env python3
"""Verify the shared review package with a closed set of repository adapters."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SP_JOBS = ['Lint', 'Typecheck', 'Unit tests', 'Build', 'Public pages load', 'Review workflow fixtures']
ADAPTERS = {
    'storypoker': dict(reviewer='so-upstars', secret='SO_UPSTARS_PR_TOKEN',
                      workflow='.github/workflows/claude-review.yml', name='Claude review',
                      dispatch='pr_number', jobs=SP_JOBS, events=['pull_request'], skippable_jobs=[],
                      ci_description='Lint, Typecheck, Unit tests, Build, Public pages load, and review-workflow fixtures'),
    'agentic-workflow': dict(reviewer='yngwald', secret='YNGWALD_PR_TOKEN',
                           workflow='.github/workflows/claude-review.yml', name='Claude review',
                           dispatch='pr_number', jobs=['validate'], events=['push', 'workflow_dispatch'], skippable_jobs=[],
                           ci_description='validate'),
    'soundcloud-catalog': dict(reviewer='yngwald', secret='YNGWALD_PR_TOKEN',
                             workflow='.github/workflows/claude-review.yml', name='Claude review',
                             dispatch='pr_number', jobs=['check'], events=['push', 'workflow_dispatch'], skippable_jobs=[],
                             ci_description='check'),
    'agilecharts': dict(reviewer='so-upstars', secret='SO_UPSTARS_PR_TOKEN',
                        workflow='.github/workflows/auto-review.yml', name='Auto review',
                        dispatch='pr', jobs=[x for x in SP_JOBS if x != 'Public pages load'],
                        events=['push', 'workflow_dispatch'],
                        skippable_jobs=['Lint', 'Typecheck', 'Unit tests', 'Build'],
                        ci_description='Lint, Typecheck, Unit tests, Build, and review-workflow fixtures'),
}
PACKAGE_FILES = (
    'scripts/check_review_parity.py', 'scripts/test_review_parity.py',
    'scripts/test_claude_review.py',
    'scripts/fixtures/claude-review/gh', 'scripts/fixtures/claude-review/gh_defer',
    'scripts/fixtures/claude-review/gh_summary',
)


def compact(value):
    return json.dumps(value, separators=(',', ':'))


def slots(adapter):
    return (
        (adapter['reviewer'], '@@REVIEWER@@', 17),
        (adapter['secret'], '@@REVIEWER_SECRET@@', 6),
        ('name: ' + adapter['name'] + '\n\n', 'name: @@WORKFLOW_NAME@@\n\n', 1),
        ('inputs.' + adapter['dispatch'], 'inputs.@@DISPATCH@@', 2),
        ('      ' + adapter['dispatch'] + ':\n', '      @@DISPATCH_KEY@@:\n', 1),
        ("          REQUIRED_JOBS: '" + compact(adapter['jobs']) + "'\n",
         '          REQUIRED_JOBS: @@CI_JOBS@@\n', 1),
        ("          CI_EVENTS: '" + compact(adapter['events']) + "'\n",
         '          CI_EVENTS: @@CI_EVENTS@@\n', 1),
        ("          SKIPPABLE_JOBS: '" + compact(adapter['skippable_jobs']) + "'\n",
         '          SKIPPABLE_JOBS: @@SKIPPABLE_JOBS@@\n', 1),
        ('            CI (' + adapter['ci_description'] + ') is green on HEAD SHA;',
         '            CI (@@CI_DESCRIPTION@@) is green on HEAD SHA;', 1),
    )


def normalize_workflow(source, adapter):
    for literal, replacement, count in slots(adapter):
        if source.count(literal) != count:
            raise ValueError(f'adapter slot {replacement.strip()}: expected {count} occurrences')
        source = source.replace(literal, replacement)
    return source


def render_workflow(source, current, target):
    source = normalize_workflow(source, current)
    for literal, replacement, count in slots(target):
        if source.count(replacement) != count:
            raise ValueError('invalid common workflow slot')
        source = source.replace(replacement, literal)
    return source


def load_manifest(root):
    manifest = json.loads((root / 'scripts/review-parity.json').read_text())
    if set(manifest) != {'schema_version', 'adapter', 'common'} or manifest['schema_version'] != 1:
        raise ValueError('invalid parity manifest schema')
    adapter = manifest['adapter']
    if not isinstance(adapter, dict) or adapter not in ADAPTERS.values():
        raise ValueError('adapter must exactly match one of the four allowed profiles')
    return manifest


def fingerprints(root, adapter):
    workflow = root / adapter['workflow']
    source = normalize_workflow(workflow.read_text(), adapter)
    actual = {'workflow': hashlib.sha256(source.encode()).hexdigest()}
    for path in PACKAGE_FILES:
        actual[path] = hashlib.sha256((root / path).read_bytes()).hexdigest()
    fixtures = root / 'scripts/fixtures/claude-review'
    if sorted(str(p.relative_to(root)) for p in fixtures.rglob('*') if p.is_file()) != sorted(
            p for p in PACKAGE_FILES if '/fixtures/' in p):
        raise ValueError('fixture inventory differs from the shared package')
    return actual


def check(root):
    manifest = load_manifest(root)
    actual = fingerprints(root, manifest['adapter'])
    if actual != manifest['common']:
        changed = sorted(k for k in actual.keys() | manifest['common'].keys()
                         if actual.get(k) != manifest['common'].get(k))
        raise ValueError('shared review package drift: ' + ', '.join(changed))
    return actual


def copy_package(root, target):
    manifest = load_manifest(root)
    for path in (*PACKAGE_FILES, 'scripts/review-parity.json', manifest['adapter']['workflow']):
        destination = target / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / path, destination)


def self_test(root):
    check(root)
    with tempfile.TemporaryDirectory(prefix='review-parity-') as tmp:
        scratch = Path(tmp)
        copy_package(root, scratch)
        manifest = load_manifest(scratch)
        workflow = scratch / manifest['adapter']['workflow']
        original = workflow.read_text()
        needle = 'then "5" else'
        if original.count(needle) != 1:
            raise ValueError('self-test cannot locate the review limit')
        workflow.write_text(original.replace(needle, 'then "6" else'))
        try:
            check(scratch)
        except ValueError as error:
            if 'drift' not in str(error):
                raise
        else:
            raise ValueError('self-test failed: review-limit drift was accepted')
    print('Review parity self-test: rejected real review-limit drift')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    try:
        result = check(args.root)
        if args.self_test:
            self_test(args.root)
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(1, f'Review parity: {error}\n')
    print('Review parity PASS: ' + result['workflow'])


if __name__ == '__main__':
    main()
