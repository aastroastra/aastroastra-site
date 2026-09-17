#!/usr/bin/env python3
"""Import actual Git history without asserting that each commit was deployed."""
import argparse
import json
from pathlib import Path
from core import PLATFORMS, REPOS, changes, git, versions

def history(workspace):
    rows=[]
    for platform in PLATFORMS:
        repo=Path(workspace)/('aastroastra-'+platform)
        args=['log','--first-parent','--reverse','--format=%H%x09%cI%x09%s','HEAD']
        if platform in ('android','ios'):
            file='app/build.gradle.kts' if platform=='android' else 'Aastroastra.xcodeproj/project.pbxproj'
            raw=git(repo,*args,'--',file)
            points=[];seen=set()
            for line in raw.splitlines():
                sha,date,subject=line.split('\t',2)
                version,build=versions(repo,platform,sha)
                if not build or (version,build) in seen:continue
                seen.add((version,build));points.append((sha,date,version,build))
        else:
            # One dated source snapshot per day, never a fabricated backend deployment.
            days={}
            for line in git(repo,*args).splitlines():
                sha,date,subject=line.split('\t',2);days[date[:10]]=(sha,date,None,None)
            points=list(days.values())
        previous=None
        for sha,date,version,build in points:
            rows.append({'schema':1,'id':f'{platform}:source:{sha}','platform':platform,'repo':REPOS[platform],
                'version':version,'build':build,'sha':sha,'date':date,'tag':None,'kind':'source-history',
                'status':'not_recorded','deployment':'not_recorded','changes':changes(repo,sha,previous),
                'checks':[],'downloads':[]})
            previous=sha
    return sorted(rows,key=lambda r:(r['date'],r['id']),reverse=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('workspace');p.add_argument('--out',default='release/history.json');args=p.parse_args()
    target=Path(args.out)
    previous=json.loads(target.read_text()) if target.exists() else []
    rows=history(args.workspace)+[r for r in previous if r['kind']!='source-history']
    target.write_text(json.dumps(sorted(rows,key=lambda r:(r['date'],r['id']),reverse=True),indent=2)+'\n')
    print(f'Imported {len(rows)} records from local Git history')
