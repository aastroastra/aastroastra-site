import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import urllib.request
import zipfile
from core import extract_report, manifest, render_report, sha256, slug, validate_manifest, release_order
from github_api import SafeRedirect
from sync_releases import process
from build_site import build

def record():
    return {'schema':1,'id':'android:v1.0.9','platform':'android','repo':'aastroastra/aastroastra-android',
        'sha':'a'*40,'tag':'v1.0.9','version':'1.0.9','build':'197','date':'2026-09-18T00:00:00Z',
        'status':'passed','kind':'tag','checks':[{'name':'End-to-end','status':'passed','required':True}],
        'changes':[{'sha':'b'*40,'subject':'<script>alert("x")</script>'}], 'downloads':[]}

class ManifestTests(unittest.TestCase):
    def test_manifest_is_not_published_until_every_asset_upload_finishes(self):
        import runner
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp);state=out/'release.json';state.write_text(json.dumps(record()))
            for fail_assets in (False,True):
                calls=[]
                def command(args,**kwargs):
                    calls.append(args)
                    if args[1:3]==['release','upload'] and str(state) not in args and fail_assets:
                        raise subprocess.CalledProcessError(1,args)
                    return subprocess.CompletedProcess(args,0)
                with patch.object(runner,'OUT',out),patch.object(runner,'STATE',state),patch.object(runner.subprocess,'run',side_effect=command):
                    if fail_assets:
                        with self.assertRaises(subprocess.CalledProcessError):runner.publish()
                    else:runner.publish()
                uploads=[a for a in calls if a[1:3]==['release','upload']]
                self.assertEqual(len(uploads),1 if fail_assets else 2)
                self.assertNotIn(str(state),uploads[0])
                self.assertIn(str(out/'release-report.zip'),uploads[0])
                if not fail_assets:self.assertEqual(uploads[1][-1],str(state))

    def test_git_and_github_dates_sort_by_actual_time_across_timezones(self):
        earlier={'id':'earlier','date':'2026-09-18T00:15:00+05:30'}
        later={'id':'later','date':'2026-09-17T21:00:00Z'}
        self.assertGreater(release_order(later),release_order(earlier))

    def test_mismatched_source_and_failed_evidence_cannot_pass(self):
        data=record();validate_manifest(data,sha='a'*40)
        for key,value in [('sha','b'*40),('repo','aastroastra/aastroastra-ios'),('tag','v2')]:
            with self.assertRaises(ValueError):validate_manifest(data,**{key:value})
        data['checks'][0]['status']='failed'
        with self.assertRaises(ValueError):validate_manifest(data)
        data['status']='incomplete';data['downloads']=[{'name':'app.apk'}]
        with self.assertRaises(ValueError):validate_manifest(data)

    def test_only_optional_checks_cannot_establish_a_pass(self):
        data=record();data['checks'][0]['required']=False
        with self.assertRaises(ValueError):validate_manifest(data)

    def test_tag_must_be_checked_out_and_changes_are_since_previous_tag(self):
        with tempfile.TemporaryDirectory() as tmp:
            def git(*args):return subprocess.check_output(['git','-C',tmp,*args],stderr=subprocess.DEVNULL,text=True).strip()
            git('init');git('config','user.email','fixture@example.test');git('config','user.name','Fixture')
            git('commit','--allow-empty','-m','First');git('tag','v1')
            git('commit','--allow-empty','-m','Second');git('tag','v2')
            data=manifest(tmp,'backend','v2');self.assertEqual(data['previous_tag'],'v1');self.assertEqual([c['subject'] for c in data['changes']],['Second'])
            with self.assertRaises(ValueError):manifest(tmp,'backend','v1')

    def test_html_escapes_git_and_check_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'index.html';render_report(record(),path)
            html=path.read_text();self.assertNotIn('<script>',html);self.assertIn('&lt;script&gt;',html)
            self.assertIn('197',html);self.assertNotIn('@@',html)

class ArchiveTests(unittest.TestCase):
    def test_traversal_executable_and_symlinks_are_rejected(self):
        for name in ('../outside.html','/absolute.html','nested/../../outside.html','bad\\file.html','bad.js'):
            with self.subTest(name=name),tempfile.TemporaryDirectory() as tmp:
                path=Path(tmp)/'report.zip'
                with zipfile.ZipFile(path,'w') as z:z.writestr('index.html','ok');z.writestr(name,'bad')
                with self.assertRaises(ValueError):extract_report(path,Path(tmp)/'out')
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'report.zip'
            with zipfile.ZipFile(path,'w') as z:
                z.writestr('index.html','ok');info=zipfile.ZipInfo('link.html');info.external_attr=0o120777<<16;z.writestr(info,'/etc/passwd')
            with self.assertRaises(ValueError):extract_report(path,Path(tmp)/'out')

    def test_report_entry_point_required(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'report.zip'
            with zipfile.ZipFile(path,'w') as z:z.writestr('photo.jpg',b'photo')
            with self.assertRaises(ValueError):extract_report(path,Path(tmp)/'out')

    def test_redirect_drops_token_on_asset_host(self):
        request=urllib.request.Request('https://api.github.com/asset',headers={'Authorization':'Bearer fixture'})
        new=SafeRedirect().redirect_request(request,None,302,'',{},'https://release-assets.githubusercontent.com/bytes')
        self.assertIsNone(new.get_header('Authorization'))

class MirrorTests(unittest.TestCase):
    def test_missing_android_renderer_still_retains_an_honest_failure_report(self):
        import runner
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp);state=out/'release.json';state.write_text(json.dumps(record()))
            with patch.object(runner,'ROOT',out),patch.object(runner,'OUT',out),patch.object(runner,'STATE',state),patch.object(runner.subprocess,'run',return_value=type('Result',(),{'returncode':2})()):
                runner.finalize()
            data=json.loads(state.read_text());self.assertEqual(data['status'],'failed');self.assertEqual(data['downloads'],[])
            self.assertTrue((out/'release-report.zip').exists());self.assertNotIn('href="android/index.html"',(out/'report/index.html').read_text())

    def test_failed_report_is_retained_and_unchanged_run_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp=Path(tmp);data=record();data['status']='failed';data['checks'][0]['status']='failed'
            archive=tmp/'archive.zip'
            with zipfile.ZipFile(archive,'w') as z:z.writestr('index.html','Report');z.writestr('release.json',json.dumps(data))
            data['report_sha256']=sha256(archive)
            payload={'release.json':json.dumps(data).encode(),'release-report.zip':archive.read_bytes()}
            release={'tag_name':data['tag'],'assets':[{'name':n,'size':len(v),'id':n} for n,v in payload.items()],
                'html_url':'https://github.com/example/release','published_at':data['date']}
            class Source:
                calls=[]
                def download(self,repo,asset,path,limit):self.calls.append(asset['name']);Path(path).write_bytes(payload[asset['name']])
                def tag_sha(self,repo,tag):return data['sha']
            source=Source();out=tmp/'data'
            first=process(source,None,data['repo'],release,{},out)
            self.assertEqual(first['status'],'failed');self.assertEqual(first['downloads'],[])
            self.assertTrue((out/'reports'/slug(data['id'])/'index.html').exists())
            process(source,None,data['repo'],release,{first['id']:first},out)
            self.assertEqual(source.calls.count('release-report.zip'),1)
            data['report_sha256']='0'*64;payload['release.json']=json.dumps(data).encode()
            with self.assertRaises(ValueError):process(source,None,data['repo'],release,{},out)
            self.assertEqual((out/'reports'/slug(data['id'])/'index.html').read_text(),'Report')

    def test_build_preserves_history_and_omits_development_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'site';data=Path(tmp)/'data';out=Path(tmp)/'out'
            (root/'release').mkdir(parents=True);data.mkdir()
            (root/'release/history.json').write_text(json.dumps([record()]))
            newer=record();newer['status']='failed';(data/'records.json').write_text(json.dumps([newer]))
            (root/'.secret').write_text('must not ship');(root/'release-tools').mkdir();(root/'release-tools/token.py').write_text('private')
            (root/'presskit.zip').write_bytes(b'public site asset')
            (root/'.well-known').mkdir();(root/'.well-known/apple-app-site-association').write_text('{}')
            (root/'.well-known/assetlinks.json').write_text('[]')
            build(root,data,out)
            result=json.loads((out/'release/releases.json').read_text())
            self.assertEqual(len(result['releases']),1);self.assertEqual(result['releases'][0]['status'],'failed')
            self.assertFalse((out/'.secret').exists());self.assertFalse((out/'release-tools').exists())
            self.assertTrue((out/'presskit.zip').exists())
            self.assertTrue((out/'.well-known/apple-app-site-association').exists())
            self.assertTrue((out/'.well-known/assetlinks.json').exists())

if __name__=='__main__':unittest.main()
