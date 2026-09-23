#!/usr/bin/env python3
"""Scheduled reconciliation: regenerate from main if an event publication was missed."""
import argparse
import datetime as dt
import json
from pathlib import Path
import parity
p=argparse.ArgumentParser(); p.add_argument('--data',required=True); p.add_argument('--ios',required=True); p.add_argument('--android',required=True); a=p.parse_args()
result={}; failed=False
for platform in ('ios','android'):
    try:
        repo=getattr(a,platform); head=parity.git(repo,'rev-parse','HEAD')
        path=Path(a.data)/'snapshots'/f'{platform}.json'
        old=json.loads(path.read_text()) if path.exists() else {}
        if old.get('head') != head:
            parity.write(path,parity.snapshot(repo,branch='main'))
        result[platform]={'ok':True,'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'head':head}
    except Exception as e:
        failed=True
        result[platform]={'ok':False,'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'error':'Could not reconcile committed main source. Last recorded snapshot retained.'}
        print(f'::warning::{platform} parity source could not be reconciled ({type(e).__name__}).')
parity.write(Path(a.data)/'sync.json',result)
raise SystemExit(1 if failed else 0)
