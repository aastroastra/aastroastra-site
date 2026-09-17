#!/usr/bin/env python3
"""Assemble the static website and persisted release feed for GitHub Pages."""
import argparse
import datetime as dt
import json
from pathlib import Path
import shutil
from sync_releases import atomic_json
from core import release_order

def build(root,data,out):
    root,data,out=map(Path,(root,data,out))
    out.mkdir(parents=True,exist_ok=True)
    # Keep the entire current site; omit development and credential directories.
    ignored={'.git','.github','.DS_Store','__pycache__','node_modules','release-tools','.release-output','.venv','venv','_site','_release-data'}
    for path in root.iterdir():
        if path.name in ignored or path.name.startswith('.') or path.resolve() in (out.resolve(),data.resolve()):continue
        if path.is_dir():shutil.copytree(path,out/path.name,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','.DS_Store','node_modules'))
        elif path.suffix.lower() in ('.html','.css','.js','.mjs','.png','.jpg','.jpeg','.svg','.webp','.ico','.txt','.xml','.json','.zip','.pdf','.woff','.woff2','.mp4') or path.name=='CNAME':shutil.copy2(path,out/path.name)
    rows=json.loads((root/'release/history.json').read_text()) if (root/'release/history.json').exists() else []
    records=json.loads((data/'records.json').read_text()) if (data/'records.json').exists() else []
    entries={r['id']:r for r in rows}
    entries.update({r['id']:r for r in records})
    entries=sorted(entries.values(),key=release_order,reverse=True)
    status=json.loads((data/'sync.json').read_text()) if (data/'sync.json').exists() else {}
    atomic_json(out/'release/releases.json',{'schema':1,'updated':dt.datetime.now(dt.timezone.utc).isoformat(),'sync':status,'releases':entries})
    if (data/'reports').exists():shutil.copytree(data/'reports',out/'release/reports',dirs_exist_ok=True)
    (out/'.nojekyll').touch()
    print(f'Built website with {len(entries)} release and source-history records')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',default='_release-data');p.add_argument('--out',default='_site');args=p.parse_args()
    build(Path.cwd(),args.data,args.out)
