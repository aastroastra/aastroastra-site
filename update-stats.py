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
  users             The home page line ("90+ people use AstroAshva"): the same
                    non-guest accounts minus team and test accounts (team email
                    addresses, emails with test/demo/qa in the local part, and
                    the phones configured as test OTP numbers in the live auth
                    config). Read through the Supabase Management API.
  users_display     `users` rounded down to a friendly bucket ("90+", "1.2k+"),
                    or null below 10 so the page hides the line.
  downloads_*       Google Analytics 4 property 556099065 (Firebase-linked):
                    totalUsers since 2020-01-01, all platforms (downloads_total)
                    and by platform (downloads_android, downloads_ios), each with
                    a *_display bucket. The home page hero line uses these. The
                    backend edge function site-stats writes the same fields
                    daily at 02:30 UTC; this script keeps them on a manual run.

Credentials stay on this Mac (never in this public repo):
  ~/secrets/aastroastra/asc.env + ~/Documents/AstroAstra/keys/AuthKey_<id>.p8
  ~/secrets/aastroastra/play-publisher.json
  SUPABASE_SERVICE_ROLE_KEY, or the Supabase CLI login (same as publish.sh).
  SUPABASE_ACCESS_TOKEN, or the Supabase CLI login in the macOS keychain (users).

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


GA_PROPERTY = "556099065"


def ga_downloads():
    """(total, android, ios) unique users from GA4, via the Play service account."""
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession
    creds = service_account.Credentials.from_service_account_file(
        str(HOME / "secrets/aastroastra/play-publisher.json"),
        scopes=["https://www.googleapis.com/auth/analytics.readonly"])
    s = AuthorizedSession(creds)
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA_PROPERTY}:runReport"
    base = {"dateRanges": [{"startDate": "2020-01-01", "endDate": "today"}], "metrics": [{"name": "totalUsers"}]}
    r = s.post(url, json=base, timeout=30)
    r.raise_for_status()
    total = sum(int(row["metricValues"][0]["value"]) for row in r.json().get("rows", []))
    r = s.post(url, json={**base, "dimensions": [{"name": "platform"}]}, timeout=30)
    r.raise_for_status()
    by = {}
    for row in r.json().get("rows", []):
        k = row["dimensionValues"][0]["value"].lower()
        by[k] = by.get(k, 0) + int(row["metricValues"][0]["value"])
    return total, by.get("android", 0), by.get("ios", 0)


def registered_users():
    req = urllib.request.Request(BASE + "/rest/v1/rpc/public_stats", data=b"{}", method="POST",
                                 headers={"apikey": ANON, "Authorization": "Bearer " + ANON,
                                          "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return int(json.load(r)["people"])


PROJECT_REF = "gttszlununmqivrqevwv"
TEAM_EMAILS = ("aastroastra@gmail.com",)
TEAM_DOMAINS = ("astroashva.com", "aastroastra.com")


def management_token():
    tok = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if tok:
        return tok
    import base64
    import subprocess
    raw = subprocess.run(["security", "find-generic-password", "-s", "Supabase CLI", "-w"],
                         capture_output=True, text=True, check=True).stdout.strip()
    if raw.startswith("go-keyring-base64:"):
        raw = base64.b64decode(raw[len("go-keyring-base64:"):]).decode()
    return raw


def management(path, token, body=None):
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{PROJECT_REF}/{path}",
                                 data=None if body is None else json.dumps(body).encode(),
                                 method="GET" if body is None else "POST",
                                 headers={"Authorization": "Bearer " + token, "Content-Type": "application/json",
                                          "User-Agent": "astroashva-update-stats"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def users_sql(test_phones):
    domains = ", ".join("'%" + "@" + d + "'" for d in TEAM_DOMAINS)
    emails = ", ".join("'" + e + "'" for e in TEAM_EMAILS)
    phones = ", ".join("'" + p + "'" for p in test_phones) or "''"
    return f"""
select count(*) as raw,
       count(*) filter (where not (
             lower(coalesce(email, '')) in ({emails})
          or lower(coalesce(email, '')) like any (array[{domains}])
          or split_part(lower(coalesce(email, '')), '@', 1) ~ '(test|demo|qa)'
          or regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') in ({phones})
       )) as real
  from auth.users
 where is_anonymous is not true"""


def real_users():
    """(raw non-guest accounts, accounts after removing team and test ones)."""
    import re
    token = management_token()
    cfg = management("config/auth", token)
    phones = set()
    for pair in (cfg.get("sms_test_otp") or "").split(","):
        digits = re.sub(r"[^0-9]", "", pair.split("=")[0])
        if digits:
            phones.add(digits)
    row = management("database/query", token, {"query": users_sql(sorted(phones))})[0]
    return int(row["raw"]), int(row["real"])


def users_bucket(n):
    """Round down to a friendly bucket; None below 10 (the page hides the line)."""
    if n is None or n < 10:
        return None
    if n < 100:
        return f"{n // 10 * 10}+"
    if n < 1000:
        return f"{n // 50 * 50}+"
    h = n // 100 * 100
    return (f"{h // 1000}k+" if h % 1000 == 0 else f"{h / 1000:.1f}k+")


def main():
    dry = "--dry-run" in sys.argv
    out = {"android_installs": None, "android_listing": None, "ios_installs": None, "registered_users": None,
           "users": None, "users_display": None,
           "downloads_total": None, "downloads_android": None, "downloads_ios": None, "downloads_display": None,
           "downloads_android_display": None, "downloads_ios_display": None, "updated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
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
    try:
        raw, real = real_users()
        out["users"] = real
        out["users_display"] = users_bucket(real)
        out["source"]["users"] = (f"auth.users non-guest accounts ({raw}) minus team and test accounts "
                                  "(team emails, test/demo/qa emails, test OTP phones)")
    except Exception as e:
        out["source"]["users"] = f"unavailable ({type(e).__name__})"

    try:
        total, android, ios = ga_downloads()
        out.update(downloads_total=total, downloads_android=android, downloads_ios=ios,
                   downloads_display=users_bucket(total), downloads_android_display=users_bucket(android),
                   downloads_ios_display=users_bucket(ios))
        out["source"]["downloads"] = ("Google Analytics 4 property 556099065: totalUsers since 2020-01-01 "
                                      "(all platforms, and by platform)")
    except Exception as e:
        out["source"]["downloads"] = f"unavailable ({type(e).__name__})"

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
