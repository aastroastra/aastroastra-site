import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import parity

class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.repo=Path(self.temp.name)/'source'; self.repo.mkdir()
        parity.git(self.repo,'init','-b','main'); parity.git(self.repo,'config','user.name','Test'); parity.git(self.repo,'config','user.email','test@example.invalid')
        self.src=self.repo/'Aastroastra/Chat.swift'; self.src.parent.mkdir(); self.src.write_text('let x = 1\n')
        self.commit('Initial implementation')
        self.defs={'features':[{'id':'chat','title':'Chat','area':'AstroAI','expected':'Shared contract'}]}
        self.m={'schema':1,'platform':'ios','features':[{'id':'chat','assessment':'aligned','behavior':'One chart','difference':'None in reviewed scope','next':'Test devices','validation':'Unit tests only','reviewed_on':'2026-09-23','paths':['Aastroastra/*.swift'],'reviewed_fingerprint':parity.fingerprint(parity.tree(self.repo),['Aastroastra/Chat.swift'])}]}
        parity.write(self.repo/'.parity/features.json',self.m);self.commit('Record review')
        self.patcher=patch.object(parity,'catalog',return_value=self.defs);self.patcher.start();self.addCleanup(self.patcher.stop)
    def commit(self,title):
        parity.git(self.repo,'add','.');parity.git(self.repo,'commit','-m',title)
    def snap(self):return parity.snapshot(self.repo)
    def test_review_is_current_and_evidence_points_at_code_commit(self):
        f=self.snap()['features'][0];self.assertTrue(f['review_current']);self.assertEqual(f['status'],'aligned');self.assertEqual(f['commits'][0]['title'],'Initial implementation')
    def test_source_change_invalidates_but_preserves_previous_notes(self):
        self.src.write_text('let x = 2\n');self.commit('Change behavior');f=self.snap()['features'][0]
        self.assertEqual(f['status'],'review');self.assertFalse(f['review_current']);self.assertEqual(f['assessment'],'aligned');self.assertEqual(f['behavior'],'One chart')
    def test_new_matching_file_invalidates(self):
        (self.src.parent/'New.swift').write_text('let y = 1');self.commit('New related file');self.assertFalse(self.snap()['features'][0]['review_current'])
    def test_delete_file_invalidates(self):
        self.src.unlink();self.commit('Remove implementation');self.assertEqual(self.snap()['features'][0]['status'],'review')
    def test_uncommitted_work_does_not_claim_pushed_functionality(self):
        self.src.write_text('unfinished');self.assertEqual(self.snap()['features'][0]['status'],'aligned')
    def test_unmapped_new_source_is_visible(self):
        d=self.src.parent/'Other';d.mkdir();(d/'new.kt').write_text('class New');self.commit('New unsupported area');self.assertIn('Aastroastra/Other/new.kt',self.snap()['unmapped_paths'])
    def test_stamping_review_requires_explicit_ids(self):
        self.src.write_text('new');self.commit('Change');parity.stamp(self.repo,['chat']);self.commit('Re-reviewed');self.assertTrue(self.snap()['features'][0]['review_current'])
        with self.assertRaises(AssertionError):parity.stamp(self.repo,['invented'])
    def test_invalid_manifest_and_duplicate_ids_rejected(self):
        for key,value in [('assessment','perfect'),('reviewed_fingerprint','fake'),('paths',['../secret'])]:
            m=json.loads(json.dumps(self.m));m['features'][0][key]=value
            with self.assertRaises(AssertionError):parity.validate(m)
        self.m['features']*=2
        with self.assertRaises(AssertionError):parity.validate(self.m)
    def test_missing_platform_cannot_be_aligned(self):
        rows=parity.combine({'ios':self.snap()},self.defs);self.assertEqual(rows[0]['status'],'review')
    def test_branch_names_cannot_escape_or_overwrite_main(self):
        s=self.snap();s['branch']='../../main';p=parity.snapshot_path(s);self.assertTrue(p.startswith('branches/ios/'));self.assertNotIn('..',p)
        s['branch']='main';self.assertEqual(parity.snapshot_path(s),'snapshots/ios.json')
    def test_build_only_uses_main_snapshots(self):
        data=Path(self.temp.name)/'data';out=Path(self.temp.name)/'out';s=self.snap()
        parity.write(data/'snapshots/ios.json',s);branch={**s,'branch':'feature/chat'};parity.write(data/parity.snapshot_path(branch),branch)
        result=parity.build(data,out);self.assertEqual(result['platforms']['ios']['branch'],'main');self.assertEqual(result['branches'][0]['branch'],'feature/chat')
    def test_public_output_does_not_contain_source_bodies(self):
        self.assertNotIn('let x =',json.dumps(self.snap()))
    def test_late_source_job_cannot_overwrite_newer_snapshot(self):
        s=self.snap();path=Path(self.temp.name)/'snapshot.json';parity.write(path,s)
        calls=[]
        def fake(repo,*args):
            calls.append(args)
            if args[0]=='ls-remote':return 'b'*40+'\trefs/heads/main'
            return ''
        with patch.object(parity,'git',side_effect=fake),patch.dict(os.environ,{'SOURCE_REPO':str(self.repo)}):parity.publish('/tmp/not-written',path)
        self.assertFalse(any(a[0]=='add' for a in calls))
    def test_simultaneous_data_push_retries_on_fresh_remote(self):
        s=self.snap();path=Path(self.temp.name)/'snapshot.json';parity.write(path,s);dest=Path(self.temp.name)/'publish';calls=[]
        def fake(repo,*args):
            calls.append(args)
            if args[0]=='ls-remote':return s['head']+'\trefs/heads/main'
            if args[:3]==('diff','--cached','--name-only'):return 'snapshots/ios.json'
            return ''
        fail=subprocess.CompletedProcess([],1);ok=subprocess.CompletedProcess([],0)
        with patch.object(parity,'git',side_effect=fake),patch.object(parity.subprocess,'run',side_effect=[fail,ok]),patch.dict(os.environ,{'SOURCE_REPO':str(self.repo)}):parity.publish(dest,path)
        self.assertEqual(sum(a[0]=='fetch' for a in calls),2)

if __name__=='__main__':unittest.main()
