#!/usr/bin/env python3
"""Refresh the download counts shown on the home page (stats.json in the `site` bucket).

Every number comes from a real source. A number that cannot be read is written
as null and the page leaves it out; nothing is estimated.

  ios_installs      App Store Connect API: TestFlight testers of app 6768119933
                    whose state is INSTALLED (public link + email invites).
  android_installs  Google Play "Total User Installs" from the Play Console
                    statistics export in Cloud Storage. Needs PLAY_REPORTS_BUCKET
                    (e.g. pubsite_prod_rev_0123456789) and the Play service
                    account granted "View app information and download bulk
                    reports". Without it this stays null.
  android_listing   The public Google Play listing's download bucket (e.g. "5+"),
                    exactly as Play shows it; used when the exact count is unknown.
  registered_users  Accounts signed in with a phone or email (never guests),
                    from the public `public_stats` RPC. Includes team accounts.

Credentials stay on this Mac (never in this public repo):
  ~/secrets/aastroastra/asc.env + ~/Documents/AstroAstra/keys/AuthKey_<id>.p8
  ~/secrets/aastroastra/play-publisher.json
  SUPABASE_SERVICE_ROLE_KEY, or the Supabase CLI login (same as publish.sh).

Run:  SSL_CERT_FILE=$(python3 -m certifi) python3 update-stats.py [--dry-run]
"""
import csv
import datetime as dt
import io
import json
import os
from pathlib import Path
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parent))
import importlib.util

_spec = importlib.util.spec_from_file_location("publish_storage", Path(__file__).resolve().parent / "publish-storage.py")
publish_storage = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(publish_storage)

APP_ID = "6768119933"
PACKAGE = "com.avdstudiox.android"
BASE = publish_storage.BASE
PUBLIC = publish_storage.PUBLIC
ANON = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dHN6bHVudW5tcWl2cnFldnd2Iiwicm9sZSI6ImFub24i"
        "LCJpYXQiOjE3NzMyMzEwMjQsImV4cCI6MjA4ODgwNzAyNH0.owDFA7ZPpDYoTmcIwYxxfn1w-qRUnKrM5pX17IAIzQQ")
HOME = Path.home()


def ios_installs():
    import jwt  # PyJWT[crypto]
    env = {}
    for line in (HOME / "secrets/aastroastra/asc.env").read_text().splitlines():
        if "=" in line:
            k, v = line.strip().split("=", 1)
            env[k] = v
    kid, iss = env["ASC_KEY_ID"], env["ASC_ISSUER_ID"]
    key_path = os.environ.get("APPLE_PRIVATE_KEY_PATH") or str(HOME / f"Documents/AstroAstra/keys/AuthKey_{kid}.p8")
    now = int(time.time())
    token = jwt.encode({"iss": iss, "iat": now, "exp": now + 900, "aud": "appstoreconnect-v1"},
                       Path(key_path).read_text(), algorithm="ES256", headers={"kid": kid})
    url = f"https://api.appstoreconnect.apple.com/v1/betaTesters?filter[apps]={APP_ID}&limit=200&fields[betaTesters]=state"
    installed = 0
    while url:
        req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
        with urllib.request.urlopen(req, timeout=30) as r:
            page = json.load(r)
        installed += sum(1 for d in page["data"] if d["attributes"].get("state") == "INSTALLED")
        url = page.get("links", {}).get("next")
    return installed


def android_installs():
    bucket = os.environ.get("PLAY_REPORTS_BUCKET")
    if not bucket:
        return None, "PLAY_REPORTS_BUCKET not set"
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession
    creds = service_account.Credentials.from_service_account_file(
        str(HOME / "secrets/aastroastra/play-publisher.json"),
        scopes=["https://www.googleapis.com/auth/devstorage.read_only"])
    s = AuthorizedSession(creds)
    prefix = f"stats/installs/installs_{PACKAGE}_"
    r = s.get(f"https://storage.googleapis.com/storage/v1/b/{bucket}/o", params={"prefix": prefix})
    r.raise_for_status()
    names = sorted(o["name"] for o in r.json().get("items", []) if o["name"].endswith("_overview.csv"))
    if not names:
        return None, "no installs overview report in bucket"
    obj = urllib.parse.quote(names[-1], safe="")
    r = s.get(f"https://storage.googleapis.com/storage/v1/b/{bucket}/o/{obj}", params={"alt": "media"})
    r.raise_for_status()
    text = r.content.decode("utf-16") if r.content[:2] in (b"\xff\xfe", b"\xfe\xff") else r.content.decode("utf-8-sig")
    rows = [row for row in csv.DictReader(io.StringIO(text)) if row.get("Total User Installs")]
    if not rows:
        return None, "report has no Total User Installs"
    return int(rows[-1]["Total User Installs"]), names[-1]


def android_listing():
    import re
    url = f"https://play.google.com/store/apps/details?id={PACKAGE}&hl=en&gl=US"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8", "replace")
    m = re.search(r'>([0-9][0-9.,]*[KMB]?\+)</div><div[^>]*>Downloads<', html)
    if not m:
        raise ValueError("downloads bucket not found on the listing")
    return m.group(1)


def registered_users():
    req = urllib.request.Request(BASE + "/rest/v1/rpc/public_stats", data=b"{}", method="POST",
                                 headers={"apikey": ANON, "Authorization": "Bearer " + ANON,
                                          "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return int(json.load(r)["people"])


def main():
    dry = "--dry-run" in sys.argv
    out = {"android_installs": None, "android_listing": None, "ios_installs": None, "registered_users": None,
           "updated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
           "source": {}}
    try:
        out["ios_installs"] = ios_installs()
        out["source"]["ios_installs"] = "App Store Connect API: TestFlight testers with state INSTALLED"
    except Exception as e:  # never print credentials; the message is enough
        out["source"]["ios_installs"] = f"unavailable ({type(e).__name__})"
    try:
        n, note = android_installs()
        out["android_installs"] = n
        out["source"]["android_installs"] = ("Google Play Console statistics export: " + note) if n is not None else f"unavailable ({note})"
    except Exception as e:
        out["source"]["android_installs"] = f"unavailable ({type(e).__name__})"
    try:
        out["android_listing"] = android_listing()
        out["source"]["android_listing"] = "Public Google Play listing, downloads bucket"
    except Exception as e:
        out["source"]["android_listing"] = f"unavailable ({type(e).__name__})"
    try:
        out["registered_users"] = registered_users()
        out["source"]["registered_users"] = "public_stats(): non-guest accounts, includes team accounts"
    except Exception as e:
        out["source"]["registered_users"] = f"unavailable ({type(e).__name__})"

    body = (json.dumps(out, indent=2) + "\n").encode()
    print(body.decode())
    if dry:
        return
    key = publish_storage.credentials()
    req = urllib.request.Request(BASE + "/storage/v1/object/site/stats.json", data=body, method="POST",
                                 headers={"apikey": key, "Authorization": "Bearer " + key,
                                          "Content-Type": "application/json", "Cache-Control": "no-cache",
                                          "x-upsert": "true"})
    with urllib.request.urlopen(req, timeout=60) as r:
        r.read()
    with urllib.request.urlopen(PUBLIC + "stats.json?verify=" + str(int(time.time())), timeout=60) as r:
        if json.load(r) != out:
            raise SystemExit("stats.json verification failed")
    print("Uploaded and verified " + PUBLIC + "stats.json")


if __name__ == "__main__":
    main()
