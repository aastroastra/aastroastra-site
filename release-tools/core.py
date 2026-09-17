"""Release manifest, Git history and report contracts. Standard library only."""
import datetime as dt
import hashlib
import html
import json
import os
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile

PLATFORMS = {"android": "Android", "ios": "iOS", "backend": "Backend", "admin": "Admin", "web": "Web", "site": "Website"}
REPOS = {p: "aastroastra/aastroastra-" + p for p in PLATFORMS}

def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()

def slug(value):
    # Hash prevents collisions between tags such as release/a and release-a.
    return re.sub(r"[^A-Za-z0-9._-]", "-", value)[:80] + "-" + hashlib.sha256(value.encode()).hexdigest()[:10]

def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""): digest.update(block)
    return digest.hexdigest()

def versions(root, platform, ref="HEAD"):
    try:
        if platform == "android":
            text = git(root, "show", f"{ref}:app/build.gradle.kts")
            return re.search(r'versionName\s*=\s*"([^"]+)"', text)[1], re.search(r'versionCode\s*=\s*(\d+)', text)[1]
        if platform == "ios":
            text = git(root, "show", f"{ref}:Aastroastra.xcodeproj/project.pbxproj")
            return re.search(r'MARKETING_VERSION\s*=\s*([^;]+);', text)[1].strip('"'), re.search(r'CURRENT_PROJECT_VERSION\s*=\s*(\d+)', text)[1]
        if platform in ("admin", "web"):
            return json.loads(git(root, "show", f"{ref}:package.json")).get("version", ""), None
    except (subprocess.CalledProcessError, TypeError, KeyError, ValueError): pass
    return None, None

def changes(root, head, previous=None):
    scope = f"{previous}..{head}" if previous else head
    raw = git(root, "log", "--no-merges", "--format=%H%x09%s", scope)
    return [{"sha": line.split("\t", 1)[0], "subject": line.split("\t", 1)[1]} for line in raw.splitlines() if "\t" in line]

def manifest(root, platform, tag):
    if platform not in PLATFORMS: raise ValueError("Unknown platform")
    if not re.fullmatch(r"(?:v|release-)[A-Za-z0-9][A-Za-z0-9._+-]*", tag): raise ValueError("Use a v* or release-* tag containing letters, numbers, dots and hyphens")
    sha = git(root, "rev-parse", f"refs/tags/{tag}^{{commit}}")
    if git(root, "rev-parse", "HEAD") != sha: raise ValueError("Checkout must match the release tag exactly")
    prior = subprocess.run(["git", "-C", str(root), "describe", "--tags", "--abbrev=0", "--match", "v*", "--match", "release-*", f"{sha}^"], capture_output=True, text=True)
    previous = prior.stdout.strip() if prior.returncode == 0 else None
    version, build = versions(root, platform, sha)
    return {"schema": 1, "id": f"{platform}:{tag}", "platform": platform, "repo": REPOS[platform], "tag": tag,
            "sha": sha, "previous_tag": previous, "version": version, "build": build,
            "date": git(root, "show", "-s", "--format=%cI", sha), "kind": "tag", "status": "pending",
            "deployment": "not_recorded", "changes": changes(root, sha, previous), "checks": [], "downloads": [],
            "run_url": os.environ.get("RELEASE_RUN_URL"), "run_number": os.environ.get("GITHUB_RUN_NUMBER"),
            "run_attempt": os.environ.get("GITHUB_RUN_ATTEMPT", "1")}

def junit_counts(paths):
    total = failed = skipped = 0
    for path in paths:
        root = ET.parse(path).getroot()
        for case in root.iter("testcase"):
            total += 1
            failed += int(case.find("failure") is not None or case.find("error") is not None)
            skipped += int(case.find("skipped") is not None)
    return {"total": total, "passed": total - failed - skipped, "failed": failed, "skipped": skipped}

def validate_manifest(data, repo=None, tag=None, sha=None):
    if data.get("schema") != 1 or data.get("platform") not in PLATFORMS: raise ValueError("Unsupported manifest")
    if data.get("repo") != REPOS[data["platform"]]: raise ValueError("Repository/platform mismatch")
    if data.get('id') != data['platform']+':'+data.get('tag',''):raise ValueError('Release identity mismatch')
    for key, expected in (("repo", repo), ("tag", tag), ("sha", sha)):
        if expected is not None and data.get(key) != expected: raise ValueError(f"Release {key} mismatch")
    if not re.fullmatch(r"[a-f0-9]{40}", data.get("sha", "")): raise ValueError("Invalid source SHA")
    if data.get("status") not in ("passed", "failed", "incomplete"): raise ValueError("Release is not finalized")
    if data["status"] == "passed" and (not any(c.get("required",True) for c in data.get("checks",[])) or any(c.get("status") != "passed" for c in data["checks"] if c.get("required", True))):
        raise ValueError("Passing release has missing or failed checks")
    if data.get("downloads") and data["status"] != "passed": raise ValueError("Unvalidated installers cannot be published")
    for item in data.get("downloads", []):
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*',item['name']) or item["kind"] not in ("apk", "ipa"): raise ValueError("Invalid download")
        if not isinstance(item.get('size'),int) or item['size']<=0:raise ValueError('Download size required')
        if not re.fullmatch(r"[a-f0-9]{64}", item.get("sha256", "")): raise ValueError("Download checksum required")
    return data

def extract_report(archive, destination):
    destination = Path(destination)
    with zipfile.ZipFile(archive) as z:
        infos = z.infolist()
        if len(infos) > 2000 or sum(i.file_size for i in infos) > 80_000_000: raise ValueError("Report archive too large")
        for i in infos:
            p = Path(i.filename)
            if p.is_absolute() or '..' in p.parts or '\\' in i.filename or ':' in i.filename or (i.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("Unsafe archive path")
            if not i.is_dir() and p.suffix.lower() not in ('.html', '.json', '.jpg', '.jpeg', '.png', '.css', '.txt'):
                raise ValueError("Unsupported report file")
        if 'index.html' not in z.namelist(): raise ValueError("Report has no HTML entry point")
        z.extractall(destination)

CSS = """body{font:16px/1.6 system-ui,sans-serif;background:#111416;color:#f1f4f5;margin:0}main{max-width:1080px;margin:auto;padding:40px 24px}h1{font-size:40px;line-height:1.15}h2{font-size:23px;margin-top:38px}.muted{color:#9eacb2}a{color:#efac79}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #303a3f;padding:12px}.passed{color:#80d7af}.failed{color:#ff9494}.incomplete{color:#edcf83}.stats{display:flex;gap:18px;flex-wrap:wrap}.stats div{padding:18px;background:#20272b;border-radius:12px}code{overflow-wrap:anywhere}li{margin:8px 0}.scroll{overflow:auto}"""

def render_report(data, destination, detail=False):
    e = lambda x: html.escape(str(x if x is not None else ""), quote=True)
    checks = ''.join(f'<tr><td>{e(c["name"])}</td><td class="{e(c["status"])}">{e(c["status"])}</td><td>{e(c.get("summary", ""))}</td></tr>' for c in data['checks'])
    notes = ''.join(f'<li>{e(c["subject"])} <code>{e(c["sha"][:8])}</code></li>' for c in data['changes'])
    template = Path(__file__).with_name('report-template.html').read_text()
    fields = {"CSS": CSS, "TITLE": e(PLATFORMS[data['platform']] + ' ' + data['tag']), "VERSION": e(data.get('version') or data['tag']),
              "BUILD": e(data.get('build') or 'Not applicable'), "SHA": e(data['sha']), "DATE": e(data['date']),
              "STATUS": e(data['status']), "CHECKS": checks, "CHANGES": notes,
              "DETAIL": '<p><a href="android/index.html">Open the Android screen and endpoint regression report →</a></p>' if detail else ''}
    for key, value in fields.items(): template = template.replace('@@' + key + '@@', value)
    Path(destination).write_text(template)
