#!/usr/bin/env python3
"""Retain existing public app bytes without inventing their regression results."""
import json
import os
from pathlib import Path
import plistlib
import tempfile
import urllib.request
from urllib.parse import quote
import zipfile
from core import REPOS, sha256, slug
from github_api import GitHub
from sync_releases import PUBLIC_SITE, atomic_json, public_downloads

PUBLIC='https://gttszlununmqivrqevwv.supabase.co/storage/v1/object/public/site/'

def main():
    history=Path('release/history.json')
    rows={r['id']:r for r in json.loads(history.read_text())}
    github=GitHub(os.environ['GH_TOKEN'])
    for platform,file,kind in [('android','version.json','apk'),('ios','version-ios.json','ipa')]:
        with urllib.request.urlopen(PUBLIC+file,timeout=30) as response:meta=json.load(response)
        code=str(meta['versionCode'] if platform=='android' else meta['build'])
        identity=f'{platform}:published:{code}'
        if identity in rows:continue
        with tempfile.TemporaryDirectory(prefix='published-build-') as tmp:
            path=Path(tmp)/('aastroastra.'+kind)
            if not meta[kind].startswith(PUBLIC):raise ValueError('Unexpected published installer host')
            with urllib.request.urlopen(meta[kind],timeout=180) as response,path.open('wb') as stream:
                while block:=response.read(1024*1024):stream.write(block)
            digest=sha256(path)
            if kind=='apk' and digest!=meta['sha256']:raise ValueError('Published APK checksum mismatch')
            row={'schema':1,'id':identity,'platform':platform,'repo':REPOS[platform],'sha':None,'tag':None,
                'version':meta['version'],'build':code,'date':meta['date'],'kind':'published-build','status':'not_recorded',
                'deployment':'website','changes':[],'checks':[],'downloads':[{'kind':kind,'name':path.name,'sha256':digest,'size':path.stat().st_size}],
                'note':'Imported from the existing public download. The original source SHA and regression result for these exact bytes were not recorded.'}
            if kind=='ipa':
                with zipfile.ZipFile(path) as z:
                    name=next(n for n in z.namelist() if n.startswith('Payload/') and n.endswith('.app/Info.plist') and n.count('/')==2)
                    info=plistlib.loads(z.read(name))
                if str(info['CFBundleVersion'])!=code or info['CFBundleShortVersionString']!=meta['version']:raise ValueError('Published IPA version mismatch')
                row['testflight']=meta.get('testflight')
            # Reuse the immutable public mirror format, with an explicit historical label.
            mirror={**row,'tag':'published-'+code,'sha':'not recorded'}
            row['downloads']=public_downloads(github,mirror,{path.name:path})
            if kind=='ipa':
                report=Path('release/reports')/slug(identity);report.mkdir(parents=True,exist_ok=True)
                plist={'items':[{'assets':[{'kind':'software-package','url':row['downloads'][0]['url']}],
                    'metadata':{'bundle-identifier':info['CFBundleIdentifier'],'bundle-version':meta['version'],'kind':'software','title':'AastroAstra'}}]}
                (report/'manifest.plist').write_bytes(plistlib.dumps(plist))
                row['install_url']='itms-services://?action=download-manifest&url='+quote(f'{PUBLIC_SITE}/release/reports/{slug(identity)}/manifest.plist',safe='')
            rows[identity]=row
            print(f'Retained existing {platform} build {code}, SHA-256 {digest}')
    atomic_json(history,sorted(rows.values(),key=lambda r:(r['date'],r['id']),reverse=True))

if __name__=='__main__':main()
