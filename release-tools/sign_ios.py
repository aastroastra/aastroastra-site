#!/usr/bin/env python3
"""Export a device-installable IPA using only the CI signing identity."""
import base64
import datetime
import json
import os
from pathlib import Path
import plistlib
import secrets
import shutil
import subprocess
import sys
import tempfile
import zipfile

def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT)

def main(out):
    state = json.loads((out/'release.json').read_text())
    original = run('security','list-keychains','-d','user').decode()
    import shlex
    original = shlex.split(original)
    installed = None
    with tempfile.TemporaryDirectory(prefix='release-signing-') as directory:
        tmp = Path(directory)
        keychain = tmp/'release.keychain-db'
        password = secrets.token_hex(24)
        try:
            cert = tmp/'distribution.p12'
            cert.write_bytes(base64.b64decode(os.environ['APPLE_CERTIFICATE_P12_BASE64'], validate=True))
            profile = tmp/'profile.mobileprovision'
            profile.write_bytes(base64.b64decode(os.environ['APPLE_ADHOC_PROFILE_BASE64'], validate=True))
            info = plistlib.loads(run('security','cms','-D','-i',str(profile)))
            team = os.environ['APPLE_TEAM_ID']
            if team not in info['TeamIdentifier'] or not info.get('ProvisionedDevices'):
                raise ValueError('The profile must belong to this team and allow registered devices')
            if info['Entitlements'].get('get-task-allow'):
                raise ValueError('Use an ad-hoc distribution profile for release builds')
            if info['ExpirationDate'] <= datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None):
                raise ValueError('Provisioning profile expired')
            bundle_id = info['Entitlements']['application-identifier'].split('.',1)[1]
            if '*' in bundle_id: raise ValueError('An explicit app profile is required')
            target = Path.home()/'Library/MobileDevice/Provisioning Profiles'/(info['UUID']+'.mobileprovision')
            if target.exists(): raise ValueError('Refusing to replace an existing local profile')
            installed = target
            installed.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(profile,installed)
            run('security','create-keychain','-p',password,str(keychain))
            run('security','set-keychain-settings','-lut','21600',str(keychain))
            run('security','unlock-keychain','-p',password,str(keychain))
            run('security','import',str(cert),'-k',str(keychain),'-P',os.environ['APPLE_CERTIFICATE_PASSWORD'],'-T','/usr/bin/codesign','-T','/usr/bin/security')
            run('security','set-key-partition-list','-S','apple-tool:,apple:','-s','-k',password,str(keychain))
            run('security','list-keychains','-d','user','-s',str(keychain),*original)
            archive=tmp/'App.xcarchive'
            run('xcodebuild','archive','-project','Aastroastra.xcodeproj','-scheme','Aastroastra','-configuration','Release',
                '-destination','generic/platform=iOS','-archivePath',str(archive),'-derivedDataPath',str(tmp/'DerivedData'),
                'CODE_SIGN_STYLE=Manual','DEVELOPMENT_TEAM='+team,'CODE_SIGN_IDENTITY=Apple Distribution',
                'PROVISIONING_PROFILE_SPECIFIER='+info['Name'])
            app = next((archive/'Products/Applications').glob('*.app'))
            metadata = plistlib.loads((app/'Info.plist').read_bytes())
            if (metadata['CFBundleIdentifier'] != bundle_id or str(metadata['CFBundleVersion']) != str(state['build'])
                or metadata['CFBundleShortVersionString'] != state['version']):
                raise ValueError('Archived app does not match the tag and signing profile')
            options=tmp/'export.plist'
            options.write_bytes(plistlib.dumps({'method':'release-testing','signingStyle':'manual','teamID':team,
                'provisioningProfiles':{bundle_id:info['Name']},'signingCertificate':'Apple Distribution',
                'manageAppVersionAndBuildNumber':False,'stripSwiftSymbols':True}))
            run('xcodebuild','-exportArchive','-archivePath',str(archive),'-exportPath',str(tmp/'export'),'-exportOptionsPlist',str(options))
            ipa=next((tmp/'export').glob('*.ipa'))
            with zipfile.ZipFile(ipa) as z:
                embedded=next(n for n in z.namelist() if n.startswith('Payload/') and n.endswith('.app/Info.plist') and n.count('/')==2)
                exported=plistlib.loads(z.read(embedded))
                if exported['CFBundleVersion'] != metadata['CFBundleVersion']: raise ValueError('Export changed build number')
            (out/'installers').mkdir(exist_ok=True)
            shutil.copy2(ipa,out/'installers/aastroastra.ipa')
            state['ios_distribution']={'method':'ad-hoc','bundle_id':bundle_id,'profile_expires':info['ExpirationDate'].isoformat()+'Z'}
            (out/'release.json').write_text(json.dumps(state,indent=2)+'\n')
        finally:
            # Restore the search list even when signing fails. Never export other identities.
            subprocess.run(['security','list-keychains','-d','user','-s',*original],capture_output=True)
            subprocess.run(['security','delete-keychain',str(keychain)],capture_output=True)
            if installed and installed.exists(): installed.unlink()

if __name__ == '__main__':
    try: main(Path(sys.argv[1]))
    except subprocess.CalledProcessError:
        # security command arguments can contain passwords; never print the exception.
        sys.exit('Signing/export command failed. Check the certificate, profile and Xcode project configuration.')
