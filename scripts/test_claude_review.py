"""Exercise real workflow steps without contacting GitHub."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / '.github/workflows/claude-review.yml'


def step(name):
    ruby = os.environ.get('RUBY', 'ruby')
    script = "require 'yaml'; require 'json'; w=YAML.load_file(ARGV[0]); s=w['jobs'].values.flat_map{|j| j['steps'] || []}.find{|x| x['name']==ARGV[1]}; abort 'missing step' unless s; puts JSON.generate(s.fetch('run'))"
    return json.loads(subprocess.check_output([ruby, '-e', script, str(WORKFLOW), name], text=True))


class TransportTest(unittest.TestCase):
    def test_prompt_tool_permissions_and_artifact_paths(self):
        ruby=os.environ.get('RUBY','ruby')
        command="require 'yaml'; require 'json'; puts JSON.generate(YAML.load_file(ARGV[0]))"
        workflow=json.loads(subprocess.check_output([ruby,'-e',command,str(WORKFLOW)],text=True))
        review=workflow['jobs']['review']
        agent=next(s for s in review['steps'] if s.get('id')=='claude')
        settings=agent['with']
        self.assertIn('review-actions.json',settings['prompt'])
        for key in ('schema_version','review_source_id','previous_findings','defer_decision'):
            self.assertIn(key,settings['prompt'])
        for name in ('Edit','Write'):
            self.assertIn(name+'(./.auto-review/review-actions.json)',settings['claude_args'])
        self.assertIn('--disallowedTools "Bash,',settings['claude_args'])
        upload=next(s for s in review['steps'] if str(s.get('uses','')).startswith('actions/upload-artifact@'))
        self.assertIn('.auto-review/review-actions.json',upload['with']['path'])
        self.assertEqual(workflow['jobs']['publish']['env']['ACTIONS_FILE'],'review-out/review-actions.json')
        self.assertFalse(any(str(s.get('uses','')).startswith('actions/checkout@') for s in workflow['jobs']['publish']['steps']))

class ResolverBoundaryTest(unittest.TestCase):
    def test_isolated_job_permissions_and_transport(self):
        ruby=os.environ.get('RUBY','ruby')
        script="require 'yaml'; require 'json'; puts JSON.generate(YAML.load_file(ARGV[0]))"
        jobs=json.loads(subprocess.check_output([ruby,'-e',script,str(WORKFLOW)],text=True))['jobs']
        self.assertEqual([name for name,j in jobs.items() if j.get('permissions',{}).get('contents')=='write'], ['resolve_threads'])
        resolver=jobs['resolve_threads']
        self.assertEqual(resolver['permissions'],{'contents':'write','pull-requests':'write'})
        self.assertEqual(jobs['publish']['permissions'],{'pull-requests':'read','statuses':'write'})
        self.assertEqual(jobs['complete']['permissions'],jobs['publish']['permissions'])
        encoded=json.dumps(resolver)
        for forbidden in ('secrets.', 'actions/checkout', 'download-artifact', 'review-actions.json', 'claude-review-ledger', 'SO_UPSTARS'):
            self.assertNotIn(forbidden, encoded)
        self.assertIn('resolveReviewThread',encoded)
        self.assertNotIn('resolveReviewThread',step('Publish review actions'))
        self.assertIn('resolve_threads',jobs['complete']['needs'])
        self.assertEqual(step('Publish review actions'),step('Complete review actions'))


class PrepareThreadsTest(unittest.TestCase):
    def test_both_connection_levels_are_paginated(self):
        run = step('Prepare review threads')
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / '.auto-review/target').mkdir(parents=True)
            fake = root / 'gh'
            fake.write_text('''#!/usr/bin/env python3
import json, sys
args = sys.argv
query = args[args.index('-f') + 1]
def val(prefix):
    return next((s.split('=', 1)[1] for s in args if s.startswith(prefix + '=')), None)
def comment(i):
    return {'databaseId': i, 'author': {'login':'host'}, 'authorAssociation':'MEMBER', 'body': 'proposal', 'createdAt':'2026-01-01T00:00:00Z', 'updatedAt':'2026-01-01T00:00:00Z', 'pullRequestReview': {'databaseId': 101}}
def conn(nodes, more=False, cursor=None): return {'nodes': nodes, 'pageInfo': {'hasNextPage':more, 'endCursor':cursor}}
if 'node(id:' in query:
    result = {'data': {'node': {'comments': conn([comment(2)])}}}
elif val('cursor') == 'threads-2':
    result = {'data': {'repository': {'pullRequest': {'reviewThreads': conn([{'id':'t2','path':'b.py','isResolved':False,'comments':conn([comment(3)])}])}}}}
else:
    result = {'data': {'repository': {'pullRequest': {'reviewThreads': conn([{'id':'t1','path':'a.py','isResolved':False,'comments':conn([comment(1)],True,'comments-2')}], True, 'threads-2')}}}}
print(json.dumps(result))
''')
            fake.chmod(0o755)
            env = {**os.environ, 'PATH': str(root) + os.pathsep + os.environ['PATH'], 'GITHUB_REPOSITORY':'owner/repo', 'NUMBER':'42'}
            subprocess.run(['bash', '-eo', 'pipefail', '-c', run], cwd=root, env=env, check=True)
            threads = json.loads((root / '.auto-review/target/threads.json').read_text())
            self.assertEqual([t['thread_id'] for t in threads], ['t1', 't2'])
            self.assertEqual([c['databaseId'] for c in threads[0]['comments']], [1, 2])
            self.assertEqual(threads[0]['comments'][1]['authorAssociation'], 'MEMBER')


if __name__ == '__main__':
    unittest.main()

class DraftTest(unittest.TestCase):
    def run_draft(self, change=None):
        run = step('Validate review actions')
        draft = {'schema_version':1, 'repository':'owner/repo', 'pr_number':42,
                 'head_sha':'a'*40, 'review_source_id':None,
                 'findings':[{'origin_review_id':None, 'original_id':'R2-F1', 'path':'src/a.py', 'severity':'Minor'}],
                 'previous_findings':[]}
        if change: change(draft)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'actions.json').write_text(json.dumps(draft))
            (root/'body.md').write_text('| Intent | System | Craft | Critical | Important | Minor |\n| --- | --- | --- | --- | --- | --- |\n| PASS | PASS | FINDINGS | 0 | 0 | 1 |\n- **Minor** R2-F1 [`src/a.py:1`](url) issue\n')
            (root/'comments.json').write_text(json.dumps([{'path':'src/a.py','line':1,'body':'**Minor** R2-F1 - issue'}]))
            env = {**os.environ, 'REPO':'owner/repo', 'NUMBER':'42', 'HEAD_SHA':'a'*40,
                   'ACTIONS_FILE':str(root/'actions.json'), 'BODY_FILE':str(root/'body.md'), 'COMMENTS_FILE':str(root/'comments.json')}
            return subprocess.run(['bash','-eo','pipefail','-c',run], env=env, capture_output=True, text=True)

    def test_missing_legacy_draft_is_explicit_gap(self):
        run=step('Validate review actions')
        with tempfile.TemporaryDirectory() as tmp:
            env={**os.environ,'ACTIONS_FILE':str(Path(tmp)/'missing')}
            p=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
            self.assertEqual(p.returncode,0,p.stderr)
            self.assertIn('evidence gaps',p.stdout)

    def test_current_null_identity_and_report_match(self):
        self.assertEqual(self.run_draft().returncode, 0)

    def test_boolean_version_rejected(self):
        self.assertNotEqual(self.run_draft(lambda d: d.update(schema_version=True)).returncode, 0)

    def test_unknown_fields_rejected(self):
        self.assertNotEqual(self.run_draft(lambda d: d.update(extra='x')).returncode, 0)

    def test_mismatched_inline_identity_rejected(self):
        self.assertNotEqual(self.run_draft(lambda d: d['findings'][0].update(original_id='R2-F2')).returncode, 0)

    def test_bool_number_and_path_traversal_rejected(self):
        self.assertNotEqual(self.run_draft(lambda d: d.update(pr_number=True)).returncode,0)
        self.assertNotEqual(self.run_draft(lambda d: d['findings'][0].update(path='../secret')).returncode,0)

    def test_critical_defer_rejected(self):
        finding={'origin_review_id':101,'original_id':'R1-F1','path':'a.py','severity':'Critical',
                 'status':'NOT_ADDRESSED','defer_decision':'ACCEPTED','reason':'Later','owner':'alice'}
        self.assertNotEqual(self.run_draft(lambda d: d['previous_findings'].append(finding)).returncode,0)

class LedgerTest(unittest.TestCase):
    def run_ledger(self, **override):
        run=step('Publish review actions')
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            os.symlink(ROOT/'scripts/fixtures/claude-review/gh',root/'gh')
            actions={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':'a'*40,
                     'review_source_id':None,'findings':[{'origin_review_id':None,'original_id':'R2-F1','path':'a.py','severity':'Minor'}],
                     'previous_findings':[]}
            (root/'actions.json').write_text(json.dumps(actions))
            (root/'post.md').write_text('<!-- claude-review sha='+('a'*40)+' -->\n\nReviewed with: `/cr-request` 0.0.11 skill · In 1 min 3 sec\nNext step: `/verify`\n')
            env={**os.environ,'PATH':str(root)+os.pathsep+os.environ['PATH'],'FIXTURE_DIR':str(root),
                 'REPO':'owner/repo','NUMBER':'42','HEAD_SHA':'a'*40,'REVIEW_ID':'202','GITHUB_RUN_ID':'303',
                 'REVIEWER':'so-upstars','ACTIONS_FILE':str(root/'actions.json'),'POST_FILE':str(root/'post.md'),**override}
            result=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
            trace=[json.loads(x) for x in (root/'trace.jsonl').read_text().splitlines()]
            body=(root/'body').read_text() if (root/'body').exists() else ''
            return result,trace,body

    def test_canonical_nulls_and_put_readback(self):
        result,trace,body=self.run_ledger()
        self.assertEqual(result.returncode,0,result.stderr)
        marker=body.split('<!-- claude-review-ledger:v1 ',1)[1].split(' -->',1)[0]
        ledger=json.loads(marker)
        self.assertEqual((ledger['review_source_id'],ledger['findings'][0]['origin_review_id'],ledger['duration_seconds']),(202,202,63))
        ops=[(x['method'],x['endpoint']) for x in trace]
        self.assertIn(('PUT','repos/owner/repo/pulls/42/reviews/202'),ops)
        index=ops.index(('PUT','repos/owner/repo/pulls/42/reviews/202'))
        self.assertEqual(ops[index+1],('GET','repos/owner/repo/pulls/42/reviews/202'))

    def test_stale_head_has_no_write(self):
        result,trace,_=self.run_ledger(FIXTURE_HEAD='b'*40)
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(any(x['method']!='GET' for x in trace))

    def test_missing_ledger_write_rights_stops_before_actions(self):
        result,trace,_=self.run_ledger(FAIL_PUT='1')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual([x['method'] for x in trace].count('PUT'),1)
        self.assertFalse(any('/issues' in x['endpoint'] or '/comments' in x['endpoint'] for x in trace))

    def test_failed_readback_fails_closed(self):
        result,trace,_=self.run_ledger(FAIL_READBACK='1')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual([x['method'] for x in trace].count('PUT'),1)
        self.assertFalse(any('/issues' in x['endpoint'] or '/comments' in x['endpoint'] for x in trace))

def pipeline_script():
    """Run the actual jobs with distinct fake credentials and output boundaries."""
    import shlex
    prepare=shlex.quote(step('Publish review actions'))
    resolve=shlex.quote(step('Resolve verified thread metadata'))
    complete=shlex.quote(step('Complete review actions'))
    return f'''
set +e
: > "$GITHUB_OUTPUT"
export GH_TOKEN=fixture-publisher PHASE=PREPARE STAGE=prepare
bash -eo pipefail -c {prepare}
prepare_rc=$?
export REQUESTS=$(python3 -c 'import os,pathlib; p=pathlib.Path(os.environ["GITHUB_OUTPUT"]); rows=[x.split("=",1)[1] for x in p.read_text().splitlines() if x.startswith("requests=")]; print(rows[-1] if rows else "[]")')
export GH_TOKEN=fixture-resolver STAGE=resolve
bash -eo pipefail -c {resolve}
resolve_rc=$?
export GH_TOKEN=fixture-publisher PHASE=COMPLETE STAGE=complete
bash -eo pipefail -c {complete}
complete_rc=$?
[ "$prepare_rc" = 0 ] && [ "$resolve_rc" = 0 ] && [ "$complete_rc" = 0 ]
'''


class DeferTest(unittest.TestCase):
    def test_success_and_recovery_after_reply_failure(self):
        run=pipeline_script()
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            os.symlink(ROOT/'scripts/fixtures/claude-review/gh_defer',root/'gh')
            sha='a'*40
            finding={'origin_review_id':101,'original_id':'R1-F1','path':'a.py','severity':'Important'}
            proposal={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':sha,**{k:finding[k] for k in ('origin_review_id','original_id','path')},'disposition':'DEFER','reason':'Can wait','owner':'alice'}
            prev={**finding,'status':'NOT_ADDRESSED','defer_decision':'ACCEPTED','reason':'Can wait','owner':'alice'}
            ledger={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':'b'*40,'review_source_id':101,'findings':[finding],'previous_findings':[], 'envelope_version':1,'published_review_id':101,'run_id':200,'duration_seconds':20,'action_progress':[],'disposition_events':[]}
            origin={'id':101,'user':{'login':'so-upstars'},'commit_id':'b'*40,'body':'<!-- claude-review-ledger:v1 '+json.dumps(ledger)+' -->'}
            comment=lambda i,author,body,review: {'databaseId':i,'author':{'login':author},'authorAssociation':'MEMBER','body':body,'createdAt':'2026-10-30T00:00:00Z','updatedAt':'2026-10-30T00:00:00Z','pullRequestReview':review}
            thread={'id':'thread1','path':'a.py','isResolved':False,'comments':[comment(1001,'so-upstars','**Important** R1-F1 - issue',{'databaseId':101}),comment(1002,'alice','<!-- cr-received-disposition:v1 '+json.dumps(proposal)+' -->',None)]}
            (root/'state.json').write_text(json.dumps({'origin':origin,'thread':thread}))
            (root/'actions.json').write_text(json.dumps({'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':sha,'review_source_id':None,'findings':[],'previous_findings':[prev]}))
            (root/'post.md').write_text('| Intent | System | Craft | Critical | Important | Minor |\n| --- | --- | --- | --- | --- | --- |\n| PASS | PASS | PASS | 0 | 0 | 0 |\n**Readiness:** ready with fixes\n\nReviewed with: `/cr-request` 0.0.11 skill · In 0 min 2 sec\nNext step: `/cr-received PR #42`\n')
            (root/'output').touch()
            env={**os.environ,'PATH':str(root)+os.pathsep+os.environ['PATH'],'FIXTURE_DIR':str(root),'REPO':'owner/repo','NUMBER':'42','HEAD_SHA':sha,'REVIEW_ID':'202','GITHUB_RUN_ID':'303','GITHUB_OUTPUT':str(root/'output'),'REVIEWER':'so-upstars','ACTIONS_FILE':str(root/'actions.json'),'POST_FILE':str(root/'post.md')}
            first=subprocess.run(['bash','-eo','pipefail','-c',run],env={**env,'FAIL_REPLY':'1'},capture_output=True,text=True)
            self.assertNotEqual(first.returncode,0,first.stderr)
            state=json.loads((root/'state.json').read_text())
            self.assertIsNotNone(state.get('issue'))
            self.assertFalse(state['thread']['isResolved'])
            self.assertIn('WRITE_FAILED',state['body'])
            self.assertIn('ready with fixes',state['body'])
            # A closed durable issue cannot authorize a retry's dependent writes.
            state['issue']['state']='closed'
            (root/'state.json').write_text(json.dumps(state))
            closed=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
            self.assertNotEqual(closed.returncode,0,closed.stderr)
            closed_state=json.loads((root/'state.json').read_text())
            self.assertFalse(closed_state['thread']['isResolved'])
            self.assertEqual(len(closed_state['thread']['comments']),2)
            self.assertIn('WRITE_FAILED',closed_state['body'])
            state['issue']['state']='open'
            (root/'state.json').write_text(json.dumps(state))
            second=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
            self.assertEqual(second.returncode,0,second.stderr)
            state=json.loads((root/'state.json').read_text())
            self.assertTrue(state['thread']['isResolved'])
            self.assertIn('Next step: `/verify` -> `/finalize` squash',state['body'])
            self.assertIn('**Readiness:** ready',state['body'])
            trace=[json.loads(x) for x in (root/'trace.jsonl').read_text().splitlines()]
            self.assertEqual(sum(x['method']=='POST' and x['endpoint']=='repos/owner/repo/issues' for x in trace),1)
            self.assertEqual(sum(x['method']=='POST' and x['endpoint'].endswith('/replies') for x in trace),2)
            # Completed actions do not erase an unassessed axis or a separate not-ready gap.
            for readiness,axis in [('not ready','PASS'),('not ready','UNASSESSED'),('ready with fixes','UNASSESSED')]:
                with self.subTest(readiness=readiness,axis=axis):
                    table=('| Intent | System | Craft | Critical | Important | Minor |\n'
                           '| --- | --- | --- | --- | --- | --- |\n'
                           f'| PASS | {axis} | PASS | 0 | 0 | 0 |\n')
                    (root/'state.json').write_text(json.dumps({'origin':origin,'thread':thread}))
                    (root/'output').write_text('')
                    (root/'post.md').write_text(table+f'**Readiness:** {readiness}\n\nReviewed with: `/cr-request` 0.0.11 skill · In 0 min 2 sec\nNext step: `/cr-received PR #42`\n')
                    result=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
                    self.assertEqual(result.returncode,0,result.stderr)
                    completed=json.loads((root/'state.json').read_text())
                    self.assertTrue(completed['thread']['isResolved'])
                    self.assertIn(f'**Readiness:** {readiness}',completed['body'])
                    self.assertNotIn('WRITE_FAILED',completed['body'])
                    self.assertNotIn('deferred_complete=true',(root/'output').read_text())
            # A body-only source cannot authorize issue, reply or resolve; it remains visible as a gap.
            (root/'state.json').write_text(json.dumps({'origin':origin,'thread':{'id':'thread1','path':'other.py','isResolved':False,'comments':thread['comments']}}))
            (root/'trace.jsonl').write_text('')
            (root/'post.md').write_text('| Intent | System | Craft | Critical | Important | Minor |\n| --- | --- | --- | --- | --- | --- |\n| PASS | PASS | PASS | 0 | 0 | 0 |\n**Readiness:** ready with fixes\n\nReviewed with: `/cr-request` 0.0.11 skill · In 0 min 2 sec\nNext step: `/cr-received PR #42`\n')
            missing=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
            self.assertNotEqual(missing.returncode,0)
            missing_state=json.loads((root/'state.json').read_text())
            self.assertIn('Source thread missing or ambiguous',missing_state['body'])
            trace=[json.loads(x) for x in (root/'trace.jsonl').read_text().splitlines()]
            self.assertFalse(any(x['endpoint']=='repos/owner/repo/issues' or x['endpoint'].endswith('/replies') for x in trace))
            self.assertFalse(missing_state['thread']['isResolved'])
            for case in ('wrong_author', 'duplicate_disposition', 'conflicting_disposition', 'stale_proposal', 'bad_origin', 'missing_rights'):
                with self.subTest(case=case):
                    case_thread=json.loads(json.dumps(thread))
                    case_origin=json.loads(json.dumps(origin))
                    if case=='wrong_author': case_thread['comments'][0]['author']['login']='intruder'
                    if case=='duplicate_disposition': case_thread['comments'].append(dict(case_thread['comments'][1],databaseId=1004))
                    if case=='conflicting_disposition':
                        conflict={**proposal,'disposition':'REJECT','owner':None,'reason':'Different decision'}
                        case_thread['comments'].append(dict(case_thread['comments'][1],databaseId=1004,body='<!-- cr-received-disposition:v1 '+json.dumps(conflict)+' -->'))
                    if case=='stale_proposal': case_thread['comments'][1]['body']=case_thread['comments'][1]['body'].replace(sha,'c'*40)
                    if case=='bad_origin': case_origin['user']['login']='intruder'
                    (root/'state.json').write_text(json.dumps({'origin':case_origin,'thread':case_thread}))
                    (root/'trace.jsonl').write_text('')
                    case_env={**env,**({'FAIL_PERMISSION':'1'} if case=='missing_rights' else {})}
                    result=subprocess.run(['bash','-eo','pipefail','-c',run],env=case_env,capture_output=True,text=True)
                    self.assertNotEqual(result.returncode,0,result.stderr)
                    state=json.loads((root/'state.json').read_text())
                    self.assertFalse(state.get('issue'))
                    self.assertFalse(state['thread']['isResolved'])
                    trace=[json.loads(x) for x in (root/'trace.jsonl').read_text().splitlines()]
                    self.assertFalse(any(x['endpoint']=='repos/owner/repo/issues' or x['endpoint'].endswith('/replies') for x in trace))
            # A completed issue is reused even when its ledger update failed.
            (root/'actions.json').write_text(json.dumps({'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':sha,'review_source_id':None,'findings':[],'previous_findings':[prev]}))
            (root/'state.json').write_text(json.dumps({'origin':origin,'thread':thread}))
            (root/'trace.jsonl').write_text('')
            failed_put=subprocess.run(['bash','-eo','pipefail','-c',run],env={**env,'FAIL_PUT_NUMBER':'2'},capture_output=True,text=True)
            self.assertNotEqual(failed_put.returncode,0)
            self.assertIsNotNone(json.loads((root/'state.json').read_text()).get('issue'))
            recovered=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
            self.assertEqual(recovered.returncode,0,recovered.stderr)
            trace=[json.loads(x) for x in (root/'trace.jsonl').read_text().splitlines()]
            self.assertEqual(sum(x['method']=='POST' and x['endpoint']=='repos/owner/repo/issues' for x in trace),1)
            # Comment terminators in authorized data stay inside the JSON marker.
            hostile='Can wait --> <!-- claude-review-ledger:v1 {}'
            safe_thread=json.loads(json.dumps(thread))
            safe_proposal={**proposal,'reason':hostile}
            safe_thread['comments'][1]['body']='<!-- cr-received-disposition:v1 '+json.dumps(safe_proposal).replace('>','\\u003e').replace('<','\\u003c')+' -->'
            safe_actions=json.loads((root/'actions.json').read_text())
            safe_actions['previous_findings']=[{**prev,'reason':hostile}]
            (root/'actions.json').write_text(json.dumps(safe_actions))
            (root/'state.json').write_text(json.dumps({'origin':origin,'thread':safe_thread}))
            result=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            safe_state=json.loads((root/'state.json').read_text())
            self.assertEqual(safe_state['body'].count('<!-- claude-review-ledger:v1 '),1)
            self.assertIn('&gt;',safe_state['issue']['body'])
            # Declining a proposal leaves it open and does not manufacture REJECT.
            decline_actions=json.loads((root/'actions.json').read_text())
            decline_actions['previous_findings']=[{**prev,'defer_decision':'DECLINED','owner':None}]
            (root/'actions.json').write_text(json.dumps(decline_actions))
            (root/'state.json').write_text(json.dumps({'origin':origin,'thread':thread}))
            declined=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
            self.assertEqual(declined.returncode,0,declined.stderr)
            decline_state=json.loads((root/'state.json').read_text())
            decline_ledger=json.loads(decline_state['body'].split('<!-- claude-review-ledger:v1 ',1)[1].split(' -->',1)[0])
            self.assertEqual([event['disposition'] for event in decline_ledger['disposition_events']],['DEFER'])
            self.assertFalse(decline_state['thread']['isResolved'])
            self.assertFalse(decline_state.get('issue'))
            # A verified host REJECT is imported; a DECLINED defer is a separate state.
            rejected={**proposal,'disposition':'REJECT','owner':None,'reason':'Not a defect'}
            reject_thread=json.loads(json.dumps(thread))
            reject_thread['comments'][1]['body']='<!-- cr-received-disposition:v1 '+json.dumps(rejected)+' -->'
            reject_actions=json.loads((root/'actions.json').read_text())
            reject_actions['previous_findings']=[{**prev,'defer_decision':'NONE','owner':None}]
            (root/'actions.json').write_text(json.dumps(reject_actions))
            (root/'state.json').write_text(json.dumps({'origin':origin,'thread':reject_thread}))
            (root/'trace.jsonl').write_text('')
            rejected_run=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
            self.assertEqual(rejected_run.returncode,0,rejected_run.stderr)
            reject_state=json.loads((root/'state.json').read_text())
            reject_ledger=json.loads(reject_state['body'].split('<!-- claude-review-ledger:v1 ',1)[1].split(' -->',1)[0])
            self.assertEqual([x['disposition'] for x in reject_ledger['disposition_events']],['REJECT'])
            self.assertFalse(reject_state['thread']['isResolved'])
            self.assertFalse(reject_state.get('issue'))
            # A related ID in prose cannot claim the first finding's root; valid work still proceeds.
            second_finding={**finding,'original_id':'R1-F2'}
            origin_ledger={**ledger,'findings':[finding,second_finding]}
            two_origin={**origin,'body':'<!-- claude-review-ledger:v1 '+json.dumps(origin_ledger)+' -->'}
            two_thread=json.loads(json.dumps(thread))
            two_thread['comments'][0]['body']+='; related R1-F2'
            second_prev={**second_finding,'status':'ADDRESSED','defer_decision':'NONE','reason':'Fixed','owner':None}
            actions=json.loads((root/'actions.json').read_text())
            actions['previous_findings']=[prev,second_prev]
            (root/'actions.json').write_text(json.dumps(actions))
            (root/'state.json').write_text(json.dumps({'origin':two_origin,'thread':two_thread}))
            (root/'trace.jsonl').write_text('')
            result=subprocess.run(['bash','-eo','pipefail','-c',run],env=env,capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            state=json.loads((root/'state.json').read_text())
            self.assertIsNotNone(state.get('issue'))
            self.assertTrue(state['thread']['isResolved'])
            envelope=json.loads(state['body'].split('<!-- claude-review-ledger:v1 ',1)[1].split(' -->',1)[0])
            self.assertEqual(envelope['action_progress'][1]['resolve']['state'],'PENDING')
            self.assertIsNone(envelope['action_progress'][1]['resolve']['thread_id'])

class ResolverRunTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        os.symlink(ROOT/'scripts/fixtures/claude-review/gh_defer',self.root/'gh')
        sha='a'*40
        self.finding={'origin_review_id':101,'original_id':'R1-F1','path':'a.py','severity':'Important'}
        f=self.finding
        ledger={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':'b'*40,
                'review_source_id':101,'findings':[f],'previous_findings':[],'envelope_version':1,
                'published_review_id':101,'run_id':200,'duration_seconds':20,'action_progress':[],'disposition_events':[]}
        proposal={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':sha,
                  **{k:f[k] for k in ('origin_review_id','original_id','path')},
                  'disposition':'DEFER','reason':'Can wait','owner':'alice'}
        def comment(i,author,body,review):
            return {'databaseId':i,'author':{'login':author},'authorAssociation':'MEMBER','body':body,
                    'createdAt':'2026-10-30T00:00:00Z','updatedAt':'2026-10-30T00:00:00Z','pullRequestReview':review}
        self.initial={'origin':{'id':101,'user':{'login':'so-upstars'},'commit_id':'b'*40,
                              'body':'<!-- claude-review-ledger:v1 '+json.dumps(ledger)+' -->'},
                      'thread':{'id':'api-thread-id','path':'a.py','isResolved':False,'comments':[
                          comment(1001,'so-upstars','**Important** R1-F1 - issue',{'databaseId':101}),
                          comment(1002,'alice','<!-- cr-received-disposition:v1 '+json.dumps(proposal)+' -->',None)]}}
        self.actions={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':sha,
                      'review_source_id':None,'findings':[],'previous_findings':[
                          {**f,'status':'NOT_ADDRESSED','defer_decision':'ACCEPTED','reason':'Can wait','owner':'alice'}]}
        self.env={**os.environ,'PATH':str(self.root)+os.pathsep+os.environ['PATH'],
                  'FIXTURE_DIR':str(self.root),'REPO':'owner/repo','NUMBER':'42','HEAD_SHA':sha,
                  'REVIEW_ID':'202','GITHUB_RUN_ID':'303','GITHUB_OUTPUT':str(self.root/'output'),
                  'REVIEWER':'so-upstars','ACTIONS_FILE':str(self.root/'actions.json'),'POST_FILE':str(self.root/'post.md')}
        self.reset()

    def reset(self, addressed=False):
        (self.root/'state.json').write_text(json.dumps(self.initial))
        actions=json.loads(json.dumps(self.actions))
        if addressed: actions['previous_findings'][0].update(status='ADDRESSED',defer_decision='NONE',owner=None)
        (self.root/'actions.json').write_text(json.dumps(actions))
        (self.root/'post.md').write_text('<!-- claude-review sha='+('a'*40)+' -->\n'
            '| Intent | System | Craft | Critical | Important | Minor |\n'
            '| --- | --- | --- | --- | --- | --- |\n| PASS | PASS | PASS | 0 | 0 | 0 |\n'
            '**Readiness:** ready with fixes\n\nReviewed with: `/cr-request` 0.0.11 skill · In 0 min 2 sec\n'
            'Next step: `/cr-received PR #42`\n')
        (self.root/'output').write_text(''); (self.root/'trace.jsonl').write_text('')

    def run_step(self,name,**extra):
        return subprocess.run(['bash','-eo','pipefail','-c',step(name)],env={**self.env,**extra},capture_output=True,text=True)

    def prepare(self,addressed=False):
        self.reset(addressed)
        result=self.run_step('Publish review actions',GH_TOKEN='fixture-publisher',PHASE='PREPARE',STAGE='prepare')
        self.assertEqual(result.returncode,0,result.stderr)
        self.request=json.loads(next(x.split('=',1)[1] for x in (self.root/'output').read_text().splitlines() if x.startswith('requests=')))
        state=self.state()
        self.assertFalse(state['thread']['isResolved'])
        self.assertNotIn('deferred_complete=true',(self.root/'output').read_text())
        self.assertIn('"state":"PENDING"',state['body'])

    def state(self): return json.loads((self.root/'state.json').read_text())
    def resolve(self,**extra):
        return self.run_step('Resolve verified thread metadata',GH_TOKEN='fixture-resolver',STAGE='resolve',REQUESTS=json.dumps(self.request),**extra)
    def complete(self,**extra):
        return self.run_step('Complete review actions',GH_TOKEN='fixture-publisher',PHASE='COMPLETE',STAGE='complete',**extra)
    def mutations(self):
        return [x for x in map(json.loads,(self.root/'trace.jsonl').read_text().splitlines()) if x.get('mutation')]

    def test_success_api_identity_bot_actor_and_idempotent_completion(self):
        self.prepare()
        # An untrusted artifact cannot supply the mutation ID.
        actions=json.loads((self.root/'actions.json').read_text()); actions['thread_id']='forged-artifact-id'
        (self.root/'actions.json').write_text(json.dumps(actions))
        result=self.resolve(); self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(self.state()['thread']['resolvedBy']['login'],'github-actions[bot]')
        self.assertNotIn('deferred_complete=true',(self.root/'output').read_text())
        result=self.complete(); self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('deferred_complete=true',(self.root/'output').read_text())
        self.assertEqual([x['id'] for x in self.mutations()],['api-thread-id'])
        self.assertTrue(all(x['token']=='fixture-resolver' for x in self.mutations()))
        result=self.resolve(); self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(len(self.mutations()),1)

    def test_addressed_and_already_resolved_any_actor(self):
        for actor in (None,'so-upstars','github-actions[bot]','other-human'):
            with self.subTest(actor=actor):
                self.prepare(addressed=True)
                if actor:
                    state=self.state(); state['thread'].update(isResolved=True,resolvedBy={'login':actor})
                    (self.root/'state.json').write_text(json.dumps(state))
                result=self.resolve(); self.assertEqual(result.returncode,0,result.stderr)
                result=self.complete(); self.assertEqual(result.returncode,0,result.stderr)
                self.assertEqual(len(self.mutations()),0 if actor else 1)
                self.assertNotIn('WRITE_FAILED',self.state()['body'])

    def test_resolver_reads_all_thread_pages(self):
        self.prepare()
        state=self.state(); state['paginated']=True
        (self.root/'state.json').write_text(json.dumps(state))
        result=self.resolve(); self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual([x['id'] for x in self.mutations()],['api-thread-id'])

    def test_gap_issue_closed_or_reply_unreadable_has_zero_mutations(self):
        for knob in ('CLOSE_ISSUE_AFTER_PREPARE','FAIL_REPLY_READ','CHANGE_HEAD_DURING_ISSUE'):
            with self.subTest(knob=knob):
                self.prepare()
                result=self.resolve(**{knob:'1'})
                self.assertNotEqual(result.returncode,0,result.stderr)
                self.assertFalse(self.state()['thread']['isResolved'])
                self.assertEqual(self.mutations(),[])
                result=self.complete()
                self.assertNotEqual(result.returncode,0,result.stderr)
                self.assertTrue(any(x in self.state()['body'] for x in ('WRITE_FAILED','PENDING')))
                self.assertNotIn('deferred_complete=true',(self.root/'output').read_text())

    def test_denial_and_completion_readback_failure_remain_pending(self):
        for knob in ('FAIL_RESOLVE','FAIL_RESOLVE_READBACK'):
            with self.subTest(knob=knob):
                self.prepare()
                result=self.resolve(**{knob:'1'})
                if knob=='FAIL_RESOLVE': self.assertNotEqual(result.returncode,0)
                result=self.complete(**{knob:'1'})
                self.assertNotEqual(result.returncode,0)
                self.assertTrue(any(x in self.state()['body'] for x in ('WRITE_FAILED','PENDING')))
                self.assertNotIn('deferred_complete=true',(self.root/'output').read_text())

    def test_canonical_completion_readback_failure_never_claims_success(self):
        self.prepare()
        result=self.resolve(); self.assertEqual(result.returncode,0,result.stderr)
        result=self.complete(FAIL_FINAL_READBACK='1')
        self.assertNotEqual(result.returncode,0)
        self.assertNotIn('deferred_complete=true',(self.root/'output').read_text())
        result=self.complete(); self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('deferred_complete=true',(self.root/'output').read_text())
        self.assertEqual(len(self.mutations()),1)

    def test_untrusted_handoff_and_changed_metadata_never_mutate(self):
        cases=('repository','pr_number','head_sha','origin_review_id','root_id','thread_id',
               'root_author','origin_author','wrong_path','ambiguous','stale_head','wrong_pr_link','wrong_reply_root')
        for case in cases:
            with self.subTest(case=case):
                self.prepare()
                if case in self.request[0]:
                    self.request[0][case]=999 if type(self.request[0][case]) is int else 'wrong'
                elif case=='thread_id': self.request[0]['thread_id']='forged'
                else:
                    state=self.state()
                    if case=='root_author': state['thread']['comments'][0]['author']['login']='intruder'
                    elif case=='origin_author': state['origin']['user']['login']='intruder'
                    elif case=='wrong_path': state['thread']['path']='wrong.py'
                    elif case=='ambiguous': state['ambiguous']=True
                    elif case=='stale_head': state['head']='c'*40
                    elif case=='wrong_pr_link': state['wrong_pr_link']=True
                    elif case=='wrong_reply_root': state['wrong_reply_root']=True
                    (self.root/'state.json').write_text(json.dumps(state))
                result=self.resolve()
                self.assertNotEqual(result.returncode,0,result.stderr)
                self.assertEqual(self.mutations(),[])

    def test_actual_status_waits_for_completion_and_readback(self):
        self.prepare()
        extra={'GH_TOKEN':'fixture-status','POST_OUTCOME':'success','LEDGER_OUTCOME':'skipped',
               'DEFERRED_COMPLETE':'','SIGNATURE':'Reviewed with: `/cr-request`','SUMMARY':'pending actions',
               'STATE':'failure','VALIDATED_AT':'2026-10-30T00:00:00Z','JOB_STATUS':'success',
               'CONTEXT':'Claude review','RUN_URL':'https://github.com/owner/repo/actions/runs/303',
               'MARKER':'<!-- claude-review sha='+('a'*40)+' -->'}
        result=self.run_step('Report review status',**extra)
        self.assertNotEqual(result.returncode,0,result.stderr)
        self.assertEqual(self.state()['status']['state'],'failure')
        result=self.resolve(); self.assertEqual(result.returncode,0,result.stderr)
        # Resolver success alone cannot turn the final status green.
        result=self.run_step('Report review status',**extra)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.state()['status']['state'],'failure')
        result=self.complete(); self.assertEqual(result.returncode,0,result.stderr)
        extra.update(LEDGER_OUTCOME='success',DEFERRED_COMPLETE='true')
        result=self.run_step('Report review status',**extra)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(self.state()['status']['state'],'success')
        # A newer run's pending status is left untouched by the old completion.
        result=self.run_step('Report review status',**{**extra,'STATUS_OWNER':'newer-run'})
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('Status owned by another run',result.stdout)
        self.assertEqual(self.state()['status']['state'],'success')
        # Cancelled completion never uses a preexisting resolved thread as a substitute.
        extra.update(LEDGER_OUTCOME='cancelled',DEFERRED_COMPLETE='')
        result=self.run_step('Report review status',**extra)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.state()['status']['state'],'failure')

    def test_low_tokens_cannot_resolve_and_resolver_cannot_publish(self):
        self.prepare()
        mutation={'query':'mutation($id:ID!) { resolveReviewThread(input:{threadId:$id}) { thread { id } } }','variables':{'id':'api-thread-id'}}
        for role,endpoint,method,payload in (
            ('fixture-publisher','graphql','POST',mutation),
            ('fixture-resolver','repos/owner/repo/issues','POST',{'body':'forbidden'}),
            ('fixture-resolver','repos/owner/repo/pulls/42/comments/1001/replies','POST',{'body':'forbidden'}),
            ('fixture-resolver','repos/owner/repo/pulls/42/reviews/202','PUT',{'body':'forbidden'})):
            result=subprocess.run(['gh','api',endpoint,'--method',method,'--input','-'],
                input=json.dumps(payload),env={**self.env,'GH_TOKEN':role},text=True,capture_output=True)
            self.assertNotEqual(result.returncode,0)
        self.assertFalse(self.state()['thread']['isResolved'])


class FooterTest(unittest.TestCase):
    def test_footer_grammar_from_workflow(self):
        script=step('Validate review body')
        start=script.index("tail2=$(tr -d")
        end=script.index('          # The Next step line loses') if '          # The Next step line loses' in script else script.index('# The Next step line loses')
        fragment=script[start:end]
        signature='Reviewed with: `/cr-request` 0.0.11 skill · In 3 min 12 sec'
        accepts=['Next step: `/cr-received` · 4 findings to rule on','Next step: none','Next step: none · nothing to rule on','Next step: `/verify docs/plans/x.md` -> `/finalize` squash','Next step: `/verify` -> `/finalize` squash','Next step: `/cr-received PR #16`']
        rejects=['Next step: cr-received - 4 findings','Next step: ','Next step: `/cr-received` - 4 findings','Next step: none - nothing to rule on','Next step: `/verify` - `/finalize` squash']
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'body'
            for nextline in accepts+rejects:
                with self.subTest(nextline=nextline):
                    path.write_text(signature+'\n'+nextline+'\n')
                    env={**os.environ,'BODY_FILE':str(path),'VERSION':'0.0.11'}
                    result=subprocess.run(['bash','-c','fail() { exit 1; }\n'+fragment],env=env,capture_output=True,text=True)
                    self.assertEqual(result.returncode==0,nextline in accepts,result.stderr)
            for body in [signature+'\r\n'+accepts[0]+'\r\n',signature+'\n\n'+accepts[0]+'\n',accepts[0]+'\n'+signature+'\n']:
                path.write_bytes(body.encode())
                result=subprocess.run(['bash','-c','fail() { exit 1; }\n'+fragment],env={**os.environ,'BODY_FILE':str(path),'VERSION':'0.0.11'},capture_output=True,text=True)
                self.assertEqual(result.returncode,0,result.stderr)
            for body in [signature.replace('skill ·','skill·')+'\n'+accepts[0]+'\n',signature+'\nextra\n'+accepts[0]+'\n']:
                path.write_text(body)
                result=subprocess.run(['bash','-c','fail() { exit 1; }\n'+fragment],env={**os.environ,'BODY_FILE':str(path),'VERSION':'0.0.11'},capture_output=True,text=True)
                self.assertNotEqual(result.returncode,0)

class TokenFilterTest(unittest.TestCase):
    def test_atlassian_prefix_is_blocked_in_every_transport(self):
        script=step('Validate review body')
        start=script.index("if grep -qE '")
        end=script.index('\nfi',start)+len('\nfi')
        fragment='fail() { exit 1; }\n'+script[start:end]
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            paths={name:root/name for name in ('POST_FILE','COMMENTS_FILE','ACTIONS_FILE')}
            env={**os.environ,**{name:str(path) for name,path in paths.items()}}
            for name in paths:
                with self.subTest(transport=name):
                    for path in paths.values(): path.write_text('safe synthetic text')
                    paths[name].write_text('ATATT'+'SyntheticFixtureOnly123')
                    result=subprocess.run(['bash','-c',fragment],env=env,capture_output=True,text=True)
                    self.assertNotEqual(result.returncode,0,result.stderr)
            for path in paths.values(): path.write_text('safe synthetic text')
            result=subprocess.run(['bash','-c',fragment],env=env,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)


class SummaryParserTest(unittest.TestCase):
    def test_gate_understands_all_three_summary_layouts(self):
        script=step('Review gate decision')
        start=script.index("blocking=$(awk -F'|'")
        end=script.index('[ "$last_sha"',start)
        fragment=script[start:end]+'\nprintf "%s" "$blocking"\n'
        cases=[('| Intent | System | Craft | Critical | Important | Minor |\n| --- | --- | --- | --- | --- | --- |\n| PASS | FINDINGS | PASS | 1 | 2 | 9 |',3),
               ('| Critical | Important | Minor |\n| --- | --- | --- |\n| 2 | 4 | 8 |',6),
               ('| Severity | Count |\n| --- | --- |\n| Critical | 3 |\n| Important | 5 |\n| Minor | 6 |',8)]
        for table,expected in cases:
            with self.subTest(table=table):
                p=subprocess.run(['bash','-c',fragment],env={**os.environ,'last_summary':table},capture_output=True,text=True)
                self.assertEqual(p.returncode,0,p.stderr)
                self.assertEqual(int(p.stdout),expected)

class GateTest(unittest.TestCase):
    def run_gate(self, reviews=(), labels=(), action='', event='pull_request', requested=False, ci='success', jobs=None, author='author'):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            pr={'head':{'sha':'a'*40,'repo':{'full_name':'owner/repo'}}, 'base':{'sha':'b'*40},
                'state':'open','draft':False,'user':{'type':'User','login':author},
                'labels':[{'name':x} for x in labels], 'requested_reviewers':[{'login':'so-upstars'}] if requested else []}
            (root/'data.json').write_text(json.dumps({'pr':pr,'reviews':reviews,'ci':ci,'jobs':jobs if jobs is not None else [{'name':n,'conclusion':'success'} for n in ['Lint','Typecheck','Unit tests','Build','Public pages load']]}))
            fake=root/'gh'
            fake.write_text('''#!/usr/bin/env python3
import json, os, subprocess, sys
args=sys.argv[1:]
d=json.load(open(os.environ['DATA']))
endpoint=next((x for x in args if x.startswith('repos/')), '')
if '/statuses/' in endpoint: sys.exit(0)
if '/commits/' in endpoint and '/status?' in endpoint: print('false'); sys.exit(0)
if '/actions/workflows/ci.yml/runs?' in endpoint:
    if 'event=pull_request' not in endpoint: sys.exit(2)
    print('900' if d['ci']=='success' else d['ci']); sys.exit(0)
if '/actions/runs/900/jobs?' in endpoint:
    for item in d['jobs']: print(json.dumps(item))
    sys.exit(0)
if endpoint.endswith('/reviews'):
    source=json.dumps(d['reviews'])
    result=subprocess.run(['jq','-r',args[args.index('--jq')+1]],input=source,text=True,capture_output=True)
    sys.stdout.write(result.stdout); sys.stderr.write(result.stderr); sys.exit(result.returncode)
if endpoint.endswith('/pulls/42'): print(json.dumps(d['pr'])); sys.exit(0)
sys.exit(2)
''')
            fake.chmod(0o755)
            env={**os.environ,'PATH':str(root)+os.pathsep+os.environ['PATH'],'DATA':str(root/'data.json'),
                 'REPO':'owner/repo','REVIEWER':'so-upstars','RUN_SHA':'','RUN_HEAD_REPO':'',
                 'REQUIRED_JOBS':json.dumps(['Lint','Typecheck','Unit tests','Build','Public pages load']),
                 'EVENT_PR':'42','EVENT_NAME':event,'EVENT_ACTION':action,'CONTEXT':'Claude review',
                 'RUN_URL':'url','GITHUB_OUTPUT':str(root/'output'),'GITHUB_STEP_SUMMARY':str(root/'summary')}
            result=subprocess.run(['bash','-eo','pipefail','-c',step('Review gate decision')],env=env,capture_output=True,text=True)
            output=(root/'output').read_text() if (root/'output').exists() else ''
            return result,output

    @staticmethod
    def reviews(manual, auto, *, clean=False, samehead=False):
        reviews=[{'user':{'login':'so-upstars'},'body':'manual','submitted_at':f'2026-01-01T00:00:{i:02}Z'} for i in range(manual)]
        for i in range(auto):
            sha=('a' if samehead and i==auto-1 else 'c')*40
            count=0 if clean and i==auto-1 else 1
            body=f'<!-- claude-review sha={sha} -->\n| Critical | Important | Minor |\n| --- | --- | --- |\n| {count} | 0 | 0 |'
            reviews.append({'user':{'login':'so-upstars'},'body':body,'submitted_at':f'2026-01-02T00:00:{i:02}Z'})
        return reviews

    def test_storypoker_required_jobs_and_self_review_guard(self):
        required=['Lint','Typecheck','Unit tests','Build','Public pages load']
        for name in required:
            for conclusion in ('failure','missing'):
                with self.subTest(name=name, conclusion=conclusion):
                    jobs=[{'name':n,'conclusion':conclusion if n==name else 'success'} for n in required if n!=name or conclusion!='missing']
                    result,output=self.run_gate(jobs=jobs)
                    self.assertEqual(result.returncode,0,result.stderr)
                    self.assertIn('review=false',output)
                    self.assertIn('CI on ',result.stdout)
        result,output=self.run_gate(author='so-upstars')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('review=false',output)
        self.assertIn('is by so-upstars',result.stdout)

    def test_limits_and_manual_counts(self):
        for manual,auto,limit,allow in [(0,4,5,True),(0,5,5,False),(1,3,5,True),(2,3,5,False),(0,1,1,False),(0,9,10,True),(0,10,10,False)]:
            with self.subTest(manual=manual,auto=auto,limit=limit):
                labels=[] if limit==5 else [f'auto-review-rounds-{limit}']
                result,output=self.run_gate(self.reviews(manual,auto),labels)
                self.assertEqual(result.returncode,0,result.stderr)
                self.assertIn(f'review={str(allow).lower()}',output)
                if not allow:
                    self.assertRegex(result.stdout, rf'\b{manual+auto} reviews from so-upstars\b')
                    self.assertRegex(result.stdout, rf'\blimit {limit}\b')
                    self.assertTrue('auto-review-rounds-' in result.stdout or 'request so-upstars' in result.stdout)

    def test_manual_only_and_latest_usable_summary(self):
        # Manual reviews count even with no marked summary; another author does not count.
        others={'user':{'login':'someone'},'body':'manual','submitted_at':'2026-02-01T00:00:00Z'}
        result,output=self.run_gate(self.reviews(5,0)+[others])
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('review=false',output)
        self.assertIn('5 reviews from so-upstars; limit 5',result.stdout)
        reviews=self.reviews(0,1,clean=True)+self.reviews(1,0)
        reviews[-1]['submitted_at']='2026-03-01T00:00:00Z'
        result,output=self.run_gate(reviews)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('review=false',output)
        self.assertIn('no Critical or Important findings',result.stdout)

    def test_invalid_labels_fail_closed_even_on_request(self):
        for labels in [['auto-review-rounds-0'],['auto-review-rounds--1'],['auto-review-rounds-x'],['auto-review-rounds-1','auto-review-rounds-10']]:
            with self.subTest(labels=labels):
                result,output=self.run_gate(labels=labels,action='review_requested')
                self.assertNotEqual(result.returncode,0)
                self.assertIn('error',result.stdout.lower())
                self.assertNotIn('review=true',output)

    def test_existing_guards_and_bypasses(self):
        for kwargs,allow in [({'labels':['skip-auto-review'],'action':'review_requested'},False),
                             ({'reviews':self.reviews(0,1,clean=True),'labels':['auto-review-rounds-10']},False),
                             ({'reviews':self.reviews(0,1,samehead=True)},False),
                             ({'reviews':self.reviews(2,3),'action':'review_requested'},True),
                             ({'reviews':self.reviews(2,3),'event':'workflow_dispatch'},True),
                             ({'reviews':self.reviews(2,3),'requested':True},True),
                             ({'action':'review_requested','ci':'failure'},False)]:
            with self.subTest(kwargs=kwargs):
                result,output=self.run_gate(**kwargs)
                self.assertEqual(result.returncode,0,result.stderr)
                self.assertIn(f'review={str(allow).lower()}',output)

    def test_workflow_settings(self):
        ruby=os.environ.get('RUBY','ruby')
        workflow=json.loads(subprocess.check_output([ruby,'-e',"require 'yaml'; require 'json'; puts JSON.generate(YAML.load_file(ARGV[0]))",str(WORKFLOW)],text=True))
        review=workflow['jobs']['review']
        agent=next(s for s in review['steps'] if s.get('id')=='claude')
        self.assertIn("vars.CLAUDE_REVIEW_MODEL || 'claude-sonnet-5-5'",agent['with']['claude_args'])
        self.assertIn('--effort medium',agent['with']['claude_args'])
        self.assertEqual(workflow['permissions'],{})
        self.assertEqual(review['permissions'],{'contents':'read','pull-requests':'read'})
        self.assertTrue(workflow['concurrency']['cancel-in-progress'])
        self.assertTrue(review['concurrency']['cancel-in-progress'])
        triggers=workflow.get('on',workflow.get('true',{}))
        self.assertNotIn('labeled',triggers['pull_request']['types'])
        install=step('Install cr-request skill')
        self.assertIn('REVIEW_SKILLS_REF',install)
        self.assertIn('v[0-9]',install)

class MergedSummaryTest(unittest.TestCase):
    def test_summary_job_is_isolated_and_closed_only(self):
        ruby = os.environ.get('RUBY', 'ruby')
        workflow = json.loads(subprocess.check_output([ruby, '-e', "require 'yaml'; require 'json'; puts JSON.generate(YAML.load_file(ARGV[0]))", str(WORKFLOW)], text=True))
        job = workflow['jobs']['merged_summary']
        self.assertIn('closed', job['if'])
        self.assertIn('merged', job['if'])
        self.assertFalse(any('checkout' in str(s.get('uses', '')) for s in job['steps']))
        self.assertIn("github.event.action != 'closed'", workflow['jobs']['gate']['if'])
        self.assertIn('closed', workflow['concurrency']['group'])
        self.assertIn('Gather merged review summary', [s.get('name') for s in job['steps']])
        self.assertIn('Publish merged review summary', [s.get('name') for s in job['steps']])

class SummaryRunTest(unittest.TestCase):
    def run_summary(self, state, repeat=False):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            os.symlink(ROOT/'scripts/fixtures/claude-review/gh_summary',root/'gh')
            (root/'state.json').write_text(json.dumps(state))
            env={**os.environ,'PATH':str(root)+os.pathsep+os.environ['PATH'], 'FIXTURE_DIR':str(root),'REPO':'owner/repo','NUMBER':'42'}
            def invoke(name):
                return subprocess.run(['bash','-eo','pipefail','-c',step(name)],cwd=root,env=env,capture_output=True,text=True)
            gather=invoke('Gather merged review summary')
            self.assertEqual(gather.returncode,0,gather.stderr)
            publish=invoke('Publish merged review summary')
            self.assertEqual(publish.returncode,0,publish.stderr)
            if repeat:
                self.assertEqual(invoke('Gather merged review summary').returncode,0)
                self.assertEqual(invoke('Publish merged review summary').returncode,0)
            return json.loads((root/'state.json').read_text()), [json.loads(x) for x in (root/'trace.jsonl').read_text().splitlines()]

    @staticmethod
    def review(ident=101, duration=20):
        finding={'origin_review_id':ident,'original_id':'R1-F1','path':'a.py','severity':'Important'}
        d={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':'a'*40,'review_source_id':ident,'findings':[finding],'previous_findings':[], 'envelope_version':1,'published_review_id':ident,'run_id':200,'duration_seconds':duration,'action_progress':[],'disposition_events':[]}
        return {'id':ident,'user':{'login':'so-upstars'},'commit_id':'a'*40,'body':'<!-- claude-review-ledger:v1 '+json.dumps(d)+' -->'}

    def test_no_reviews_and_legacy_duration(self):
        state,trace=self.run_summary({'reviews':[]})
        self.assertFalse(state.get('comments'))
        review={'id':1,'user':{'login':'so-upstars'},'body':'Reviewed with: `/cr-request` 1.0 skill · In 1 min 3 sec'}
        state,trace=self.run_summary({'reviews':[review]},repeat=True)
        self.assertEqual(len(state['comments']),1)
        body=state['comments'][0]['body']
        self.assertIn('Findings: 0 + unknown',body)
        self.assertIn('Duration total: 63 sec',body)
        self.assertEqual(sum(x['method']=='POST' and '/issues/42/comments' in x['endpoint'] for x in trace),1)

    def test_forged_marker_and_last_host_reply(self):
        review=self.review()
        marker={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':'a'*40,'origin_review_id':101,'original_id':'R1-F1','path':'a.py','disposition':'REJECT','reason':'invalid','owner':None}
        comment=lambda i,author,body,review: {'databaseId':i,'author':{'login':author},'authorAssociation':'MEMBER','body':body,'updatedAt':'2026-10-30T00:00:00Z','pullRequestReview':review}
        thread={'id':'t','path':'a.py','isResolved':False,'comments':[comment(1,'so-upstars','**Important** R1-F1 - finding',{'databaseId':101}),comment(2,'alice','<!-- cr-received-disposition:v1 '+json.dumps(marker)+' -->',None)]}
        fake={'id':88,'user':{'login':'mallory'},'body':'<!-- claude-review summary -->'}
        state,_=self.run_summary({'reviews':[review], 'threads':[thread], 'comments':[fake]},repeat=True)
        self.assertEqual(len(state['comments']),2)
        self.assertIn('Rejected: 1',state['comments'][1]['body'])
        self.assertIn('Duration mean: 20.00 sec',state['comments'][1]['body'])

    def test_paginated_reviews_and_unknown_duration(self):
        reviews=[{'id':n,'user':{'login':'so-upstars'},'body':'legacy'} for n in range(1,102)]
        state,trace=self.run_summary({'reviews':reviews})
        self.assertIn('Reviews: 101',state['comments'][0]['body'])
        self.assertIn('Duration total: unknown',state['comments'][0]['body'])
        self.assertTrue(any('page=2' in x['endpoint'] for x in trace))

    def test_malformed_ledger_is_unknown_not_zero(self):
        review=self.review()
        review['body']=review['body'].replace('"envelope_version": 1','"envelope_version": true')
        state,_=self.run_summary({'reviews':[review]})
        body=state['comments'][0]['body']
        self.assertIn('Findings: 0 + unknown',body)
        self.assertIn('Rejected: 0 + unknown',body)
        self.assertIn('Duration measured: 0/1',body)

    def test_later_explicit_disposition_wins(self):
        review=self.review()
        def marker(disposition):
            return '<!-- cr-received-disposition:v1 '+json.dumps({'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':'a'*40,'origin_review_id':101,'original_id':'R1-F1','path':'a.py','disposition':disposition,'reason':'reason','owner':None})+' -->'
        def c(i,body,stamp,author='alice',review=None): return {'databaseId':i,'author':{'login':author},'authorAssociation':'MEMBER','body':body,'updatedAt':stamp,'pullRequestReview':review}
        thread={'id':'t','path':'a.py','isResolved':False,'comments':[c(1,'**Important** R1-F1 - finding','2026-10-30T00:00:00Z','so-upstars',{'databaseId':101}),c(2,marker('REJECT'),'2026-10-30T00:00:01Z'),c(3,marker('ACCEPT'),'2026-10-30T00:00:02Z')]}
        state,_=self.run_summary({'reviews':[review],'threads':[thread]})
        self.assertIn('Rejected: 0',state['comments'][0]['body'])

    def test_declined_defer_does_not_erase_reject_or_duplicate_finding(self):
        origin=self.review()
        d=json.loads(origin['body'].split('v1 ',1)[1].split(' -->')[0])
        finding=d['findings'][0]
        prev={**finding,'status':'NOT_ADDRESSED','defer_decision':'DECLINED','reason':'still required','owner':None}
        d.update(head_sha='b'*40,review_source_id=202,published_review_id=202,findings=[],previous_findings=[prev],duration_seconds=40)
        carry={'id':202,'user':{'login':'so-upstars'},'commit_id':'b'*40,'submitted_at':'2026-10-30T00:00:02Z','body':'<!-- claude-review-ledger:v1 '+json.dumps(d)+' -->'}
        marker={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':'a'*40,'origin_review_id':101,'original_id':'R1-F1','path':'a.py','disposition':'REJECT','reason':'no defect','owner':None}
        def c(i,author,body,review): return {'databaseId':i,'author':{'login':author},'authorAssociation':'MEMBER','body':body,'updatedAt':'2026-10-30T00:00:00Z','pullRequestReview':review}
        thread={'id':'t','path':'a.py','isResolved':False,'comments':[c(1,'so-upstars','**Important** R1-F1 - finding',{'databaseId':101}),c(2,'alice','<!-- cr-received-disposition:v1 '+json.dumps(marker)+' -->',None)]}
        state,_=self.run_summary({'reviews':[origin,carry],'threads':[thread]})
        body=state['comments'][0]['body']
        self.assertIn('Findings: 1\n',body)
        self.assertIn('Important: 1\n',body)
        self.assertIn('Undetermined: 0\n',body)
        self.assertIn('Rejected: 1\n',body)
        self.assertIn('Duration total: 60 sec',body)
        self.assertIn('Duration mean: 30.00 sec',body)

    def defer_fixture(self):
        origin=self.review()
        d=json.loads(origin['body'].split('v1 ',1)[1].split(' -->')[0]); finding=d['findings'][0]
        prev={**finding,'status':'NOT_ADDRESSED','defer_decision':'ACCEPTED','reason':'Later','owner':'alice'}
        progress={'origin_review_id':101,'original_id':'R1-F1','path':'a.py','issue':{'state':'SUCCEEDED','number':57,'url':'https://github.com/owner/repo/issues/57'},'reply':{'state':'SUCCEEDED','comment_id':3},'resolve':{'state':'SUCCEEDED','thread_id':'t'},'error':None}
        d.update(head_sha='b'*40,review_source_id=202,published_review_id=202,findings=[],previous_findings=[prev],action_progress=[progress])
        carry={'id':202,'user':{'login':'so-upstars'},'commit_id':'b'*40,'submitted_at':'2026-10-30T00:00:02Z','body':'<!-- claude-review-ledger:v1 '+json.dumps(d)+' -->'}
        payload={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':'b'*40,'origin_review_id':101,'original_id':'R1-F1','path':'a.py','disposition':'DEFER','reason':'Later','owner':'alice'}
        deferred='<!-- claude-review-deferred:v1 '+json.dumps({k:payload[k] for k in ('repository','pr_number','origin_review_id','original_id','path')},separators=(',',':'))+' -->'
        def c(i,author,body,review): return {'databaseId':i,'author':{'login':author},'authorAssociation':'MEMBER','body':body,'updatedAt':'2026-10-30T00:00:00Z','pullRequestReview':review}
        thread={'id':'t','path':'a.py','isResolved':True,'comments':[c(1,'so-upstars','**Important** R1-F1 - finding',{'databaseId':101}),c(2,'alice','<!-- cr-received-disposition:v1 '+json.dumps(payload)+' -->',None),c(3,'so-upstars','https://github.com/owner/repo/issues/57\n'+deferred,None)]}
        issue={'number':57,'state':'open','user':{'login':'so-upstars'},'html_url':'https://github.com/owner/repo/issues/57','body':'R1-F1 Important #discussion_r1 alice Later\n'+deferred}
        d['disposition_events']=[{'origin_review_id':101,'original_id':'R1-F1','path':'a.py',
            'disposition':'DEFER','reason':'Later','source_comment_id':2,'source_author':'alice',
            'source_updated_at':'2026-10-30T00:00:00Z'}]
        carry['body']='<!-- claude-review-ledger:v1 '+json.dumps(d)+' -->'
        return {'reviews':[origin,carry],'threads':[thread],'issue':issue}

    def test_defer_requires_all_readbacks(self):
        data=self.defer_fixture()
        thread=data['threads'][0]
        state,_=self.run_summary(data)
        self.assertIn('Deferred: 1\n',state['comments'][0]['body'])
        thread['isResolved']=False
        state,_=self.run_summary(data)
        self.assertIn('Deferred: 0 + unknown',state['comments'][0]['body'])

    def test_acceptance_reason_can_differ_from_proposal(self):
        data=self.defer_fixture()
        carry=data['reviews'][1]
        d=json.loads(carry['body'].split('v1 ',1)[1].split(' -->')[0])
        d['previous_findings'][0]['reason']='Reviewer confirms later work'
        carry['body']='<!-- claude-review-ledger:v1 '+json.dumps(d)+' -->'
        data['issue']['body']=data['issue']['body'].replace('alice Later','alice Reviewer confirms later work')
        state,_=self.run_summary(data)
        self.assertIn('Deferred: 1\n',state['comments'][0]['body'])

    def test_closed_deferred_issue_is_incomplete(self):
        data=self.defer_fixture()
        data['issue']['state']='closed'
        state,_=self.run_summary(data)
        self.assertIn('Deferred: 0 + unknown',state['comments'][0]['body'])

    def test_latest_defer_decision_controls_completion(self):
        for decision in ('DECLINED','NONE'):
            for reverse in (False,True):
                with self.subTest(decision=decision,reverse=reverse):
                    data=self.defer_fixture()
                    later=json.loads(json.dumps(data['reviews'][1]))
                    d=json.loads(later['body'].split('v1 ',1)[1].split(' -->')[0])
                    d.update(review_source_id=303,published_review_id=303,action_progress=[])
                    d['previous_findings'][0].update(defer_decision=decision,owner=None)
                    later.update(id=303,submitted_at='2026-10-30T00:00:03Z',body='<!-- claude-review-ledger:v1 '+json.dumps(d)+' -->')
                    data['reviews'].append(later)
                    if reverse: data['reviews'].reverse()
                    state,_=self.run_summary(data)
                    self.assertIn('Deferred: 0 + unknown',state['comments'][0]['body'])
                    self.assertIn('Rejected: 0 + unknown',state['comments'][0]['body'])

    def test_new_host_defer_requires_fresh_matching_acceptance(self):
        for change in ('head','reason'):
            data=self.defer_fixture()
            marker=data['threads'][0]['comments'][1]
            payload=json.loads(marker['body'].split('v1 ',1)[1].split(' -->')[0])
            payload['head_sha' if change=='head' else 'reason']='c'*40 if change=='head' else 'New reason'
            marker.update(updatedAt='2026-10-30T00:00:04Z',body='<!-- cr-received-disposition:v1 '+json.dumps(payload)+' -->')
            data['head_sha']='c'*40
            state,_=self.run_summary(data)
            self.assertIn('Deferred: 0 + unknown',state['comments'][0]['body'])

    def test_thread_and_reply_pagination(self):
        review=self.review()
        marker={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':'a'*40,'origin_review_id':101,'original_id':'R1-F1','path':'a.py','disposition':'REJECT','reason':'invalid','owner':None}
        def c(i,author,body,review=None): return {'databaseId':i,'author':{'login':author},'authorAssociation':'MEMBER','body':body,'updatedAt':'2026-10-30T00:00:00Z','pullRequestReview':review}
        comments=[c(1,'so-upstars','**Important** R1-F1 - finding',{'databaseId':101})]+[c(i,'alice','unstructured') for i in range(2,101)]+[c(101,'alice','<!-- cr-received-disposition:v1 '+json.dumps(marker)+' -->')]
        threads=[{'id':'other'+str(i),'path':'other','isResolved':False,'comments':[]} for i in range(100)]
        threads.append({'id':'target','path':'a.py','isResolved':False,'comments':comments})
        state,trace=self.run_summary({'reviews':[review],'threads':threads})
        self.assertIn('Rejected: 1',state['comments'][0]['body'])
        self.assertGreaterEqual(sum(x['endpoint']=='graphql' for x in trace),3)

    def test_unmerged_rejected_before_write_and_existing_comment_updated(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); os.symlink(ROOT/'scripts/fixtures/claude-review/gh_summary',root/'gh')
            (root/'state.json').write_text(json.dumps({'merged':False,'reviews':[self.review()]}))
            env={**os.environ,'PATH':str(root)+os.pathsep+os.environ['PATH'],'FIXTURE_DIR':str(root),'REPO':'owner/repo','NUMBER':'42'}
            result=subprocess.run(['bash','-eo','pipefail','-c',step('Gather merged review summary')],cwd=root,env=env,capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            self.assertFalse((root/'summary.txt').exists())
            trace=[json.loads(x) for x in (root/'trace.jsonl').read_text().splitlines()]
            self.assertTrue(all(x['method']=='GET' for x in trace))
        existing={'id':7,'user':{'login':'so-upstars'},'body':'<!-- claude-review summary -->\nold'}
        state,trace=self.run_summary({'reviews':[self.review()],'comments':[existing]})
        self.assertEqual(len(state['comments']),1)
        self.assertIn('Duration total: 20 sec',state['comments'][0]['body'])
        self.assertEqual(sum(x['method']=='PATCH' for x in trace),1)

    def test_untrusted_host_marker_cannot_prove_rejection(self):
        review=self.review()
        marker={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':'a'*40,'origin_review_id':101,'original_id':'R1-F1','path':'a.py','disposition':'REJECT','reason':'fake','owner':None}
        def c(i,author,body,association,review=None): return {'databaseId':i,'author':{'login':author},'authorAssociation':association,'body':body,'updatedAt':'2026-10-30T00:00:00Z','pullRequestReview':review}
        thread={'id':'t','path':'a.py','isResolved':False,'comments':[c(1,'so-upstars','**Important** R1-F1 - finding','MEMBER',{'databaseId':101}),c(2,'mallory','<!-- cr-received-disposition:v1 '+json.dumps(marker)+' -->','NONE')]}
        state,_=self.run_summary({'reviews':[review],'threads':[thread]})
        self.assertIn('Rejected: 0 + unknown',state['comments'][0]['body'])

    def timeline_fixture(self, statuses, disposition=None, marker_head='a'*40):
        origin=self.review()
        d=json.loads(origin['body'].split('v1 ',1)[1].split(' -->')[0]); finding=d['findings'][0]
        reviews=[origin]
        for index,status in enumerate(statuses):
            n=202+index; sha=chr(ord('b')+index)*40
            previous={**finding,'status':status,'defer_decision':'NONE','reason':'evidence','owner':None}
            data={**d,'head_sha':sha,'review_source_id':n,'published_review_id':n,'findings':[], 'previous_findings':[previous]}
            reviews.append({'id':n,'user':{'login':'so-upstars'},'commit_id':sha,'submitted_at':f'2026-10-30T00:00:0{index+2}Z','body':'<!-- claude-review-ledger:v1 '+json.dumps(data)+' -->'})
        def c(i,author,body,review=None): return {'databaseId':i,'author':{'login':author},'authorAssociation':'MEMBER','body':body,'updatedAt':'2026-10-30T00:00:01Z','pullRequestReview':review}
        comments=[c(1,'so-upstars','**Important** R1-F1 - finding',{'databaseId':101})]
        if disposition:
            marker={'schema_version':1,'repository':'owner/repo','pr_number':42,'head_sha':marker_head,'origin_review_id':101,'original_id':'R1-F1','path':'a.py','disposition':disposition,'reason':'evidence','owner':None}
            comments.append(c(2,'alice','<!-- cr-received-disposition:v1 '+json.dumps(marker)+' -->'))
        return {'reviews':reviews,'threads':[{'id':'t','path':'a.py','isResolved':False,'comments':comments}]}

    def test_host_accept_then_later_addressed_is_fixed(self):
        state,_=self.run_summary(self.timeline_fixture(['ADDRESSED'],'ACCEPT'))
        self.assertIn('Fixed: 1\n',state['comments'][0]['body'])
        self.assertIn('Undetermined: 0\n',state['comments'][0]['body'])

    def test_addressed_without_marker_is_known_fixed(self):
        state,_=self.run_summary(self.timeline_fixture(['ADDRESSED']))
        self.assertIn('Fixed: 1\n',state['comments'][0]['body'])

    def test_later_not_addressed_resets_fixed_but_not_reject(self):
        state,_=self.run_summary(self.timeline_fixture(['ADDRESSED','NOT_ADDRESSED']))
        self.assertIn('Fixed: 0 + unknown',state['comments'][0]['body'])
        state,_=self.run_summary(self.timeline_fixture(['NOT_ADDRESSED'],'REJECT'))
        self.assertIn('Rejected: 1\n',state['comments'][0]['body'])

    def test_unrelated_head_cannot_supply_reject(self):
        state,_=self.run_summary(self.timeline_fixture(['ADDRESSED'],'REJECT','f'*40))
        self.assertNotIn('Rejected: 1',state['comments'][0]['body'])
        self.assertIn('Rejected: 0 + unknown',state['comments'][0]['body'])

    def test_host_disposition_equal_timestamp_uses_comment_id(self):
        fixture=self.timeline_fixture([],'REJECT')
        original=fixture['threads'][0]['comments'][1]
        marker=json.loads(original['body'].split('v1 ',1)[1].split(' -->')[0]); marker['disposition']='ACCEPT'
        later={**original,'databaseId':3,'body':'<!-- cr-received-disposition:v1 '+json.dumps(marker)+' -->'}
        fixture['threads'][0]['comments']=[fixture['threads'][0]['comments'][0],later,original]
        state,_=self.run_summary(fixture)
        self.assertIn('Rejected: 0\n',state['comments'][0]['body'])
