#!/usr/bin/env python3
"""Public-safe, deterministic evidence from committed source. No AI status inference."""
import argparse
import datetime as dt
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

STATES = {'aligned', 'gap', 'intentional', 'review'}
REPOS = {p: f'aastroastra/aastroastra-{p}' for p in ('ios', 'android')}
ROOT = Path(__file__).resolve().parent.parent

def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()

def write(path, data):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

def tree(repo, ref='HEAD'):
    result = {}
    for record in git(repo, 'ls-tree', '-rz', '--full-tree', ref).split('\0'):
        if not record: continue
        meta, name = record.split('\t', 1)
        if meta.split()[1] == 'blob': result[name] = meta.split()[2]
    return result

def matched(files, patterns):
    return sorted(p for p in files if any(fnmatch.fnmatchcase(p, g) for g in patterns))

def fingerprint(files, paths):
    return hashlib.sha256('\n'.join(f'{p}:{files[p]}' for p in paths).encode()).hexdigest()

def catalog():
    return json.loads((ROOT / 'differences/catalog.json').read_text())

def validate(manifest, definitions=None):
    definitions = definitions or catalog()
    assert manifest.get('schema') == 1, 'Unknown manifest schema'
    assert manifest.get('platform') in REPOS, 'Unknown platform'
    features = manifest.get('features', [])
    ids = [f['id'] for f in features]
    assert len(ids) == len(set(ids)), 'Duplicate feature IDs'
    assert set(ids) == {f['id'] for f in definitions['features']}, 'Catalog and manifest feature IDs differ'
    for f in features:
        assert f['assessment'] in STATES, f"Invalid assessment: {f['id']}"
        for key in ['behavior', 'difference', 'next', 'validation', 'reviewed_on']:
            assert isinstance(f.get(key), str) and f[key].strip(), f"Missing {key}: {f['id']}"
        dt.date.fromisoformat(f['reviewed_on'])
        assert re.fullmatch(r'[0-9a-f]{64}', f['reviewed_fingerprint']), 'Invalid fingerprint'
        assert f['paths'] and all(not p.startswith(('/', '-')) and '..' not in p.split('/') for p in f['paths']), 'Invalid paths'
    return manifest

def load_manifest(repo, ref):
    return json.loads(git(repo, 'show', f'{ref}:.parity/features.json'))

def commits(repo, ref, paths=None, limit=3):
    args = ['log', ref, f'-{limit}', '--format=%H%x09%cI%x09%s']
    if paths: args += ['--'] + paths
    rows = []
    for line in git(repo, *args).splitlines():
        sha, date, title = line.split('\t', 2)
        rows.append({'sha': sha, 'date': date, 'title': title[:220]})
    return rows

def snapshot(repo, ref='HEAD', branch='main', run_url=None):
    m = validate(load_manifest(repo, ref)); files = tree(repo, ref)
    features = []; covered = set()
    for f in m['features']:
        paths = matched(files, f['paths']); covered.update(paths)
        digest = fingerprint(files, paths)
        fresh = digest == f['reviewed_fingerprint']
        features.append({**{k: f[k] for k in ['id', 'assessment', 'behavior', 'difference', 'next', 'validation', 'reviewed_on']},
            'status': f['assessment'] if fresh else 'review', 'review_current': fresh,
            'fingerprint': digest, 'file_count': len(paths), 'paths': paths,
            'commits': commits(repo, ref, paths) if paths else [],
            'reason': '' if fresh else 'Source changed since the recorded review. Recheck this behavior on both platforms.'})
    source_roots = ['Aastroastra/'] if m['platform'] == 'ios' else ['app/src/main/java/com/aastroastra/android/']
    untracked = [p for p in files if p.endswith(('.swift', '.kt')) and any(p.startswith(r) for r in source_roots) and p not in covered]
    head = git(repo, 'rev-parse', ref)
    return {'schema': 1, 'platform': m['platform'], 'repo': REPOS[m['platform']], 'branch': branch,
        'head': head, 'pushed_at': git(repo, 'show', '-s', '--format=%cI', ref),
        'generated_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'run_url': run_url,
        'features': features, 'unmapped_paths': sorted(untracked), 'commits': commits(repo, ref, limit=35)}

def stamp(repo, ids):
    path = Path(repo) / '.parity/features.json'; m = json.loads(path.read_text()); files = tree(repo)
    known = {f['id'] for f in m['features']}
    assert set(ids) <= known, 'Unknown feature ID'
    for f in m['features']:
        if f['id'] in ids:
            f['reviewed_fingerprint'] = fingerprint(files, matched(files, f['paths']))
            f['reviewed_on'] = dt.date.today().isoformat()
    validate(m); write(path, m)

def combine(snapshots, definitions=None):
    definitions = definitions or catalog(); rows = []
    for f in definitions['features']:
        pair = {p: next((r for r in snapshots.get(p, {}).get('features', []) if r['id'] == f['id']), None) for p in REPOS}
        states = [r['status'] if r else 'review' for r in pair.values()]
        status = 'gap' if 'gap' in states else 'review' if 'review' in states else 'intentional' if 'intentional' in states else 'aligned'
        rows.append({**f, 'status': status, 'platforms': pair,
            'needs_review': any(r is None or not r['review_current'] or r['status'] == 'review' for r in pair.values())})
    return rows

def build(data, out):
    folder = Path(data); snapshots = {}
    for p in REPOS:
        path = folder / 'snapshots' / f'{p}.json'
        if path.exists():
            value = json.loads(path.read_text())
            assert value['platform'] == p and value['branch'] == 'main' and value['schema'] == 1
            snapshots[p] = value
    branches = []
    for path in (folder / 'branches').glob('*/*.json'):
        s = json.loads(path.read_text())
        branches.append({k: s.get(k) for k in ['platform', 'branch', 'head', 'pushed_at', 'generated_at', 'run_url']})
    sync_path = folder / 'sync.json'
    sync = json.loads(sync_path.read_text()) if sync_path.exists() else {}
    payload = {'schema': 1, 'generated_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'sync': sync,
        'platforms': {p: {k: v for k, v in s.items() if k != 'features'} for p, s in snapshots.items()},
        'features': combine(snapshots), 'branches': sorted(branches, key=lambda s: s['pushed_at'], reverse=True)[:30]}
    write(Path(out) / 'data.json', payload)
    return payload

def snapshot_path(s):
    assert s['platform'] in REPOS and s['schema'] == 1 and re.fullmatch(r'[0-9a-f]{40}', s['head'])
    if s['branch'] == 'main': return f"snapshots/{s['platform']}.json"
    digest = hashlib.sha256(s['branch'].encode()).hexdigest()[:24]
    return f"branches/{s['platform']}/{digest}.json"

def publish(repo, source):
    """Retry concurrent pushes, and never let a slower old job replace a newer head."""
    s = json.loads(Path(source).read_text()); target = snapshot_path(s)
    for attempt in range(5):
        git(repo, 'fetch', 'origin', 'differences-data')
        git(repo, 'reset', '--hard', 'origin/differences-data')
        # Source ref may have advanced while this job was queued. A newer job owns it.
        remote_head = git(os.environ['SOURCE_REPO'], 'ls-remote', 'origin', f"refs/heads/{s['branch']}").split()
        if not remote_head or remote_head[0] != s['head']:
            print('A newer source push exists (or branch was deleted); keeping its snapshot.'); return
        write(Path(repo) / target, s)
        git(repo, 'add', '--', target)
        if not git(repo, 'diff', '--cached', '--name-only'): return
        git(repo, 'commit', '-m', f"Update {s['platform']} parity evidence at {s['head'][:8]}")
        result = subprocess.run(['git', '-C', str(repo), 'push', 'origin', 'HEAD:differences-data'], capture_output=True, text=True)
        if result.returncode == 0: return
    raise RuntimeError('Snapshot publication failed after concurrent-push retries')

if __name__ == '__main__':
    p = argparse.ArgumentParser(); sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('snapshot'); s.add_argument('--repo', default='.'); s.add_argument('--ref', default='HEAD'); s.add_argument('--branch', default='main'); s.add_argument('--out', required=True); s.add_argument('--run-url')
    s = sub.add_parser('stamp'); s.add_argument('--repo', default='.'); s.add_argument('--features', nargs='+', required=True)
    s = sub.add_parser('build'); s.add_argument('--data', required=True); s.add_argument('--out', required=True)
    s = sub.add_parser('publish'); s.add_argument('--repo', required=True); s.add_argument('--snapshot', required=True)
    a = p.parse_args()
    if a.cmd == 'snapshot': write(a.out, snapshot(a.repo, a.ref, a.branch, a.run_url))
    elif a.cmd == 'stamp': stamp(a.repo, a.features)
    elif a.cmd == 'build': build(a.data, a.out)
    else: publish(a.repo, a.snapshot)
