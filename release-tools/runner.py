#!/usr/bin/env python3
"""Run and retain release checks without turning missing evidence into a pass."""
import argparse
import base64
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
from core import manifest, junit_counts, sha256, render_report, slug, validate_manifest

ROOT = Path.cwd()
OUT = ROOT / '.release-output'
STATE = OUT / 'release.json'

def load(): return json.loads(STATE.read_text())
def save(data): STATE.write_text(json.dumps(data, indent=2) + '\n')

def check(name, command, cwd=ROOT, required=True):
    log = OUT / 'logs' / (slug(name) + '.log')
    log.parent.mkdir(parents=True, exist_ok=True)
    start = time.monotonic()
    with log.open('w') as stream:
        try: code = subprocess.run(command, cwd=cwd, stdout=stream, stderr=subprocess.STDOUT, timeout=2100).returncode
        except (OSError, subprocess.TimeoutExpired): code = 125
    data = load()
    data['checks'].append({'name': name, 'status': 'passed' if code == 0 else 'failed', 'required': required,
                           'seconds': round(time.monotonic()-start, 1), 'summary': 'Completed successfully' if code == 0 else f'Exit {code}; inspect the retained Actions log'})
    save(data)
    print(f'{name}: {"passed" if code == 0 else "failed"} ({code})', flush=True)
    # Logs stay in private source-repository Actions artifacts, not in public HTML.
    return code

def missing(name, explanation):
    data=load(); data['checks'].append({'name':name,'status':'not_run','required':True,'summary':explanation});save(data)

def prepare(platform, tag):
    if STATE.exists():raise ValueError('Release output already exists; archive it before starting a fresh run')
    OUT.mkdir(exist_ok=True)
    save(manifest(ROOT, platform, tag))

def android_build():
    check('Localization', [sys.executable, 'scripts/check-localization.py'])
    check('HTML report contracts',[sys.executable,'-m','unittest','discover','-s','scripts/regression','-p','test_*.py'])
    check('Unit tests and release lint', ['./gradlew', ':app:testDebugUnitTest', ':app:lintRelease', '-PwithAgora=false', '-PotpBypass=false', '--console=plain'])
    data=load(); data['unit_tests']=junit_counts((ROOT/'app/build/test-results/testDebugUnitTest').glob('TEST-*.xml'));save(data)
    if not data['unit_tests']['total']:missing('Unit test evidence','No JUnit test cases were produced')
    names=('ANDROID_KEYSTORE_BASE64','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD')
    if not all(os.environ.get(n) for n in names):
        missing('Signed release APK', 'Android signing secrets are not configured')
        return
    keyfile=ROOT/'ci-release.jks'; props=ROOT/'keystore.properties'
    if keyfile.exists() or props.exists():raise ValueError('CI signing refuses to replace existing local signing files')
    try:
        keyfile.write_bytes(base64.b64decode(os.environ[names[0]], validate=True));keyfile.chmod(0o600)
        props.write_text('storeFile=ci-release.jks\nstorePassword='+os.environ[names[1]]+'\nkeyAlias='+os.environ[names[2]]+'\nkeyPassword='+os.environ[names[3]]+'\n');props.chmod(0o600)
        check('Signed release APK', ['./gradlew', ':app:assembleRelease', ':app:bundleRelease', '-PciRelease=true', '-PwithAgora=false', '-PotpBypass=false', '--console=plain'])
        apk=ROOT/'app/build/outputs/apk/release/app-release.apk'
        if apk.exists():
            sdk=Path(os.environ['ANDROID_HOME']); buildtools=sorted((sdk/'build-tools').iterdir())[-1]
            check('APK signature', [str(buildtools/'apksigner'),'verify','--verbose',str(apk)])
            badging=subprocess.check_output([str(buildtools/'aapt2'),'dump','badging',str(apk)],text=True)
            import re
            code=re.search(r"versionCode='(\d+)'",badging)[1]; version=re.search(r"versionName='([^']+)'",badging)[1]
            data=load()
            if code!=data['build'] or version!=data['version']: raise RuntimeError('APK version does not match tagged source')
            if 'native-code:' not in badging or "'x86_64'" not in badging: raise RuntimeError('CI APK lacks emulator ABI')
            bc=next((ROOT/'app/build/generated/source/buildConfig/release').rglob('BuildConfig.java')).read_text()
            if 'PHONE_OTP_BYPASS = false' not in bc or 'DEBUG = false' not in bc: raise RuntimeError('Release build is debug/bypassed')
            (OUT/'installers').mkdir(exist_ok=True)
            shutil.copy2(apk,OUT/'installers/aastroastra.apk')
            bundle=ROOT/'app/build/outputs/bundle/release/app-release.aab'
            if not bundle.exists():raise RuntimeError('Signed release bundle was not produced')
            (OUT/'bundles').mkdir(exist_ok=True)
            shutil.copy2(bundle,OUT/'bundles/aastroastra.aab')
            data=load();data['bundle']={'name':'aastroastra.aab','size':bundle.stat().st_size,'sha256':sha256(bundle)};save(data)
    finally:
        keyfile.unlink(missing_ok=True);props.unlink(missing_ok=True)

def android_ui():
    apk=OUT/'installers/aastroastra.apk'
    if not apk.exists(): missing('Android end-to-end', 'No signed APK was produced'); return
    out=OUT/'android';out.mkdir(exist_ok=True)
    if check('Install exact release APK',['adb','install','-r',str(apk)]) != 0:
        missing('Android end-to-end','APK installation failed'); return
    check('Android end-to-end',[sys.executable,'scripts/regression/run_android_regression.py','--serial',os.environ.get('ANDROID_SERIAL','emulator-5554'),'--out',str(out)])
    check('Backend endpoint probes',[sys.executable,'scripts/regression/endpoint_latency.py','--out',str(out)])

def backend():
    import yaml
    workflow=yaml.safe_load((ROOT/'.github/workflows/security-regressions.yml').read_text())
    count=0
    for job in workflow['jobs'].values():
        cwd=ROOT/job.get('defaults',{}).get('run',{}).get('working-directory','.')
        for step in job['steps']:
            if 'run' in step:
                count+=1
                check(step.get('name',step['run'][:65]),['bash','-e','-o','pipefail','-c',step['run']],cwd)
    if not count:raise ValueError('Backend workflow contains no checks')

def web(platform):
    if platform in ('admin','web'):
        check('Install locked dependencies',['npm','ci','--no-audit','--no-fund'])
        if platform=='admin':
            check('Role access regressions',['npm','run','check:roles'])
            check('TypeScript',['npx','tsc','--noEmit'])
        check('Production build',['npm','run','build'])
    else:
        check('Release publishing contracts',[sys.executable,'-m','unittest','discover','-s','release-tools','-p','test_*.py'])
        check('APK publisher contracts',[sys.executable,'-m','unittest','discover','-s','.','-p','test_publish_storage.py'])
        check('Authentication links',['node','--test','test_auth_link.mjs'])

def ios():
    available=json.loads(subprocess.check_output(['xcrun','simctl','list','devices','available','--json']))['devices']
    devices=[d for runtime,items in sorted(available.items()) if 'iOS' in runtime for d in items if d.get('isAvailable') and d['name'].startswith('iPhone')]
    if not devices: missing('iOS simulator tests','No compatible iPhone simulator'); return
    host=os.environ.get('SUPABASE_HOST','placeholder.supabase.co');key=os.environ.get('SUPABASE_ANON_KEY','placeholder')
    config=ROOT/'Config/Secrets.xcconfig'
    if config.exists():raise ValueError('CI runner refuses to overwrite local iOS configuration')
    config.write_text(f'SUPABASE_HOST = {host}\nSUPABASE_ANON_KEY = {key}\nASTROLOGY_API_KEY = unused\nASTROLOGY_PDF_API_KEY = unused\nASTROLOGY_USER_ID = 0\n');config.chmod(0o600)
    try:
        check('iOS simulator unit and UI tests',['xcodebuild','test','-project','Aastroastra.xcodeproj','-scheme','Aastroastra','-destination','id='+devices[-1]['udid'],'-configuration','Debug','-skipPackagePluginValidation','-only-testing:AastroastraTests','-only-testing:AastroastraUITests','-resultBundlePath',str(OUT/'TestResults.xcresult'),'CODE_SIGNING_ALLOWED=NO'])
        if all(os.environ.get(n) for n in ('APPLE_CERTIFICATE_P12_BASE64','APPLE_CERTIFICATE_PASSWORD','APPLE_ADHOC_PROFILE_BASE64','APPLE_TEAM_ID')):
            check('Signed ad-hoc IPA',[sys.executable,str(Path(__file__).with_name('sign_ios.py')),str(OUT)])
        else: missing('Signed ad-hoc IPA','Configure the Apple distribution certificate, ad-hoc profile and team ID; an App Store IPA cannot be directly installed')
    finally: config.unlink(missing_ok=True)

def finalize():
    data=load(); platform=data['platform']
    required={'android':['Localization','Unit tests and release lint','Signed release APK','APK signature','Android end-to-end','Backend endpoint probes'],
              'ios':['iOS simulator unit and UI tests','Signed ad-hoc IPA'],
              'backend':[], 'admin':['Role access regressions','TypeScript','Production build'], 'web':['Production build'],
              'site':['Release publishing contracts','APK publisher contracts','Authentication links']}[platform]
    seen={c['name'] for c in data['checks']}
    for name in required:
        if name not in seen: data['checks'].append({'name':name,'status':'not_run','required':True,'summary':'The workflow did not reach this check'})
    statuses=[c['status'] for c in data['checks'] if c.get('required',True)]
    data['status']='failed' if 'failed' in statuses else 'incomplete' if not statuses or any(s!='passed' for s in statuses) else 'passed'
    data['downloads']=[]
    report=OUT/'report'
    if report.exists():shutil.rmtree(report)
    report.mkdir()
    if platform=='android':
        source=OUT/'android';source.mkdir(exist_ok=True)
        for file,empty in [('ui-regression.json',{'started_utc':data['date'],'version':f"{data['version']} ({data['build']})",'device':'CI emulator','steps':[]}),('endpoint-latency.json',{'results':[]})]:
            if not (source/file).exists():(source/file).write_text(json.dumps(empty))
        # Protect QA credentials both in the public JSON and in generated screenshots.
        ui=json.loads((source/'ui-regression.json').read_text())
        for step in ui['steps']:
            if step.get('area')=='Onboarding': step.pop('screenshot',None);step['note']=''
            for secret_name in ('QA_PHONE','QA_OTP','QA_API_PHONE','QA_API_OTP'):
                secret=os.environ.get(secret_name)
                if secret and len(secret)>3: step['note']=step.get('note','').replace(secret,'[redacted]')
        (source/'ui-regression.json').write_text(json.dumps(ui,indent=2))
        if (source/'web').exists():shutil.rmtree(source/'web')
        command=[sys.executable,'scripts/regression/build_report.py',str(source)]
        code=subprocess.run(command).returncode
        if code: raise RuntimeError('Android report renderer failed')
        detail=report/'android';detail.mkdir(exist_ok=True)
        for name in ('index.html','web','ui-regression.json','endpoint-latency.json'):
            p=source/name
            if p.is_dir():shutil.copytree(p,detail/name,dirs_exist_ok=True)
            elif p.exists():shutil.copy2(p,detail/name)
        for key,file,rows in [('ui','ui-regression.json','steps'),('endpoints','endpoint-latency.json','results')]:
            values=json.loads((source/file).read_text())[rows]
            data[key]={'passed':sum(bool(r['ok']) for r in values),'total':len(values)}
    for path in sorted((OUT/'installers').glob('*')):
        if path.suffix not in ('.apk','.ipa'):continue
        if data['status']=='passed':data['downloads'].append({'kind':path.suffix[1:],'name':path.name,'size':path.stat().st_size,'sha256':sha256(path)})
    if platform in ('android','ios') and data['status']=='passed' and not data['downloads']:
        data['status']='incomplete';data['checks'].append({'name':'Install artifact','status':'not_run','summary':'No signed installer retained','required':True})
    render_report(data,report/'index.html',platform=='android')
    (report/'release.json').write_text(json.dumps(data,indent=2))
    with zipfile.ZipFile(OUT/'release-report.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in report.rglob('*'):
            if p.is_file():z.write(p,p.relative_to(report))
    data['report_sha256']=sha256(OUT/'release-report.zip');save(data);validate_manifest(data)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write(f"### {data['platform']} {data['tag']}: {data['status']}\n\nBuild {data.get('build')} · `{data['sha']}`\n\nHTML report: release-report artifact and GitHub Release.\n")

def publish():
    data=load();validate_manifest(data)
    repo=data['repo'];tag=data['tag']
    existing=subprocess.run(['gh','release','view',tag,'--repo',repo],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    notes=OUT/'notes.md';notes.write_text(f"Validation: **{data['status']}**. Build: {data.get('build') or 'not applicable'}.\n\nSource: `{data['sha']}`. HTML evidence is in release-report.zip.\n\n"+'\n'.join('- '+c['subject'] for c in data['changes']))
    if existing.returncode:
        subprocess.run(['gh','release','create',tag,'--verify-tag','--repo',repo,'--title',f"{data.get('version') or tag} ({data.get('build') or data['sha'][:8]})",'--notes-file',str(notes),'--latest=false'],check=True)
    else:
        subprocess.run(['gh','release','edit',tag,'--repo',repo,'--notes-file',str(notes),'--latest=false'],check=True)
    files=[str(STATE),str(OUT/'release-report.zip')]+[str(OUT/'installers'/x['name']) for x in data['downloads']]
    if data.get('bundle') and data['status']=='passed':files.append(str(OUT/'bundles'/data['bundle']['name']))
    # Upload metadata last, so the collector never sees a new manifest with old evidence.
    subprocess.run(['gh','release','upload',tag,'--repo',repo,'--clobber',*files[1:],files[0]],check=True)

def validate():
    try:
        platform=load()['platform']
        if platform=='android':android_build()
        elif platform=='ios':ios()
        elif platform=='backend':backend()
        else:web(platform)
    except Exception as error:
        data=load();data['checks'].append({'name':'Release execution','status':'failed','required':True,
            'summary':type(error).__name__+' during release validation. Inspect the private runner configuration.'});save(data)
        print('Release execution failed: '+type(error).__name__)
        return 1
    return 0

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('phase',choices=['prepare','validate','android-ui','finalize','publish','gate']);p.add_argument('--platform');p.add_argument('--tag');args=p.parse_args()
    if args.phase=='prepare':prepare(args.platform,args.tag)
    elif args.phase=='validate':sys.exit(validate())
    elif args.phase=='android-ui':android_ui()
    elif args.phase=='finalize':finalize()
    elif args.phase=='publish':publish()
    elif args.phase=='gate':sys.exit(0 if load()['status']=='passed' else 1)
