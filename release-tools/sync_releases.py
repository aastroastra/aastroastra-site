#!/usr/bin/env python3
"""Mirror verified release evidence and installers from the source repositories."""
import argparse
import copy
import datetime as dt
import json
import os
from pathlib import Path
import plistlib
import shutil
import tempfile
import urllib.error
from urllib.parse import quote
from core import REPOS, extract_report, sha256, slug, validate_manifest, release_order
from github_api import GitHub

SITE_REPO=REPOS['site']
PUBLIC_SITE='https://www.aastroastra.com'

def atomic_json(path,data):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(data,indent=2)+'\n');temporary.replace(path)

def public_downloads(client,data,files):
    if not data['downloads']:return []
    tag='mirror-'+slug(data['id'])
    try: release=client.json(f'repos/{SITE_REPO}/releases/tags/{quote(tag,safe="")}')
    except urllib.error.HTTPError as error:
        if error.code!=404:raise
        description=('Retained existing public download; its original regression result was not recorded.' if data.get('kind')=='published-build' else 'Verified release downloads.')
        release=client.json(f'repos/{SITE_REPO}/releases','POST',{'tag_name':tag,'target_commitish':'main',
            'name':f"{data['platform'].title()} {data.get('version') or data['tag']} ({data.get('build') or data['sha'][:8]})",
            'body':f"{description} Source: {data['repo']} at {data['sha']}.\n\nHistory and HTML regression evidence: {PUBLIC_SITE}/release/",'make_latest':'false'})
    assets={a['name']:a for a in client.pages(f'repos/{SITE_REPO}/releases/{release["id"]}/assets')}
    downloads=[]
    for item in data['downloads']:
        name=f"aastroastra-{data['platform']}-{slug(data['tag'])}-{item['sha256'][:16]}.{item['kind']}"
        asset=assets.get(name)
        if asset is None:asset=client.upload(release,files[item['name']],name)
        if asset['size']!=item['size']:raise ValueError('Mirrored installer size mismatch')
        if asset.get('digest') and asset['digest']!='sha256:'+item['sha256']:raise ValueError('Mirrored installer checksum mismatch')
        if not asset.get('digest'):
            with tempfile.TemporaryDirectory() as tmp:
                verified=Path(tmp)/'installer';client.download(SITE_REPO,asset,verified)
                if sha256(verified)!=item['sha256']:raise ValueError('Mirrored installer checksum mismatch')
        # Uploaded names include the full source digest prefix and are never overwritten.
        downloads.append({**item,'url':asset['browser_download_url']})
    return downloads

def process(source,public,repo,release,existing,destination):
    assets={a['name']:a for a in release.get('assets',[])}
    if release.get('draft') or not {'release.json','release-report.zip'}<=assets.keys():return None
    with tempfile.TemporaryDirectory(prefix='release-mirror-') as tmp:
        tmp=Path(tmp)
        source.download(repo,assets['release.json'],tmp/'release.json',5_000_000)
        data=json.loads((tmp/'release.json').read_text())
        sha=source.tag_sha(repo,release['tag_name'])
        validate_manifest(data,repo,release['tag_name'],sha)
        signature=sha256(tmp/'release.json')
        receipt=None;receipt_hash=None
        if repo==REPOS['android'] and 'play-submission.json' in assets:
            source.download(repo,assets['play-submission.json'],tmp/'play-submission.json',20_000)
            receipt=json.loads((tmp/'play-submission.json').read_text())
            if (receipt.get('package')!='com.avdstudiox.android' or receipt.get('sha')!=sha or str(receipt.get('build'))!=str(data.get('build'))
                or receipt.get('bundle_sha256')!=data.get('bundle',{}).get('sha256') or receipt.get('status')!='submitted'
                or receipt.get('track') not in ('production','internal','alpha')):raise ValueError('Invalid Play submission receipt')
            receipt_hash=sha256(tmp/'play-submission.json')
        old=existing.get(data['id'])
        report_dir=destination/'reports'/slug(data['id'])
        if old and old.get('manifest_sha256')==signature and old.get('receipt_sha256')==receipt_hash and (report_dir/'index.html').exists():return old
        source.download(repo,assets['release-report.zip'],tmp/'report.zip',80_000_000)
        if sha256(tmp/'report.zip')!=data.get('report_sha256'):raise ValueError('Report checksum mismatch')
        extract_report(tmp/'report.zip',tmp/'report')
        # The HTML bundle carries the same source and validation result as its manifest.
        inner=json.loads((tmp/'report/release.json').read_text())
        validate_manifest(inner,repo,data['tag'],sha)
        if any(inner.get(k)!=data.get(k) for k in ('id','status','checks','downloads')):raise ValueError('Report does not match release metadata')
        files={}
        for download in data['downloads']:
            asset=assets.get(download['name'])
            if not asset or asset['size']!=download['size']:raise ValueError('Installer missing from source release')
            path=tmp/download['name'];source.download(repo,asset,path)
            if sha256(path)!=download['sha256']:raise ValueError('Source installer checksum mismatch')
            files[download['name']]=path
        data['downloads']=public_downloads(public,data,files)
        if receipt:
            data['distribution']={'play':receipt}
            data['receipt_sha256']=receipt_hash
            shutil.copy2(tmp/'play-submission.json',tmp/'report/play-submission.json')
        if data['platform']=='ios' and data['downloads']:
            ipa=next(d for d in data['downloads'] if d['kind']=='ipa')
            profile=data['ios_distribution']
            plist={'items':[{'assets':[{'kind':'software-package','url':ipa['url']}],
                'metadata':{'bundle-identifier':profile['bundle_id'],'bundle-version':data['version'], 'kind':'software','title':'AastroAstra'}}]}
            (tmp/'report/manifest.plist').write_bytes(plistlib.dumps(plist))
            manifest_url=f'{PUBLIC_SITE}/release/reports/{slug(data["id"])}/manifest.plist'
            data['install_url']='itms-services://?action=download-manifest&url='+quote(manifest_url,safe='')
        data.update(report_url=f'/release/reports/{slug(data["id"])}/',manifest_sha256=signature,
            source_release=release['html_url'],published_at=release['published_at'])
        # Only replace an existing report after the complete new record was validated.
        if report_dir.exists():shutil.rmtree(report_dir)
        report_dir.parent.mkdir(parents=True,exist_ok=True)
        shutil.copytree(tmp/'report',report_dir)
        return data

def sync(source,public,destination):
    destination=Path(destination);destination.mkdir(parents=True,exist_ok=True)
    index=destination/'records.json'
    records=json.loads(index.read_text()) if index.exists() else []
    existing={r['id']:r for r in records}
    errors=[]
    for platform,repo in REPOS.items():
        try:
            for release in source.pages(f'repos/{repo}/releases'):
                if not release['tag_name'].startswith(('v','release-')):continue
                record=process(source,public,repo,release,existing,destination)
                if record:existing[record['id']]=record
        except Exception as error:
            # Keep all other repositories and their previous valid records available.
            errors.append(platform+': '+type(error).__name__)
    rows=sorted(existing.values(),key=release_order,reverse=True)
    prior_status=json.loads((destination/'sync.json').read_text()) if (destination/'sync.json').exists() else None
    atomic_json(index,rows)
    # Avoid a history commit on every scheduled heartbeat when no evidence changed.
    if records!=rows or prior_status is None or prior_status.get('errors')!=errors:
        atomic_json(destination/'sync.json',{'last_change':dt.datetime.now(dt.timezone.utc).isoformat(),'errors':errors})
    for error in errors:print('Release sync error: '+error)
    return not errors

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',required=True);args=p.parse_args()
    ok=sync(GitHub(os.environ['RELEASE_SOURCE_TOKEN']),GitHub(os.environ['GH_TOKEN']),args.data)
    # A failed source does not erase history. Workflow still deploys the previous valid page.
    raise SystemExit(0 if ok else 1)
