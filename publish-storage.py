#!/usr/bin/env python3
"""Share an Android build privately with the team.

Public APK/IPA publishing stopped on 29 Sep 2026 (Google Ads readiness).
Builds reach people only through Google Play testing tracks and TestFlight.
For a quick team check, `publish.sh --private` uploads the APK to the PRIVATE
`builds-internal` bucket and prints a signed link that expires after 7 days.
Nothing is written to the public `site` bucket.

BASE, PUBLIC and credentials() are also used by update-stats.py.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

BASE = "https://gttszlununmqivrqevwv.supabase.co"
PUBLIC = BASE + "/storage/v1/object/public/site/"
PRIVATE_BUCKET = "builds-internal"
SIGNED_SECONDS = 7 * 24 * 60 * 60


def credentials():
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if key:
        return key
    result = subprocess.run(
        ["supabase", "projects", "api-keys", "--project-ref",
         "gttszlununmqivrqevwv", "--output", "json"],
        capture_output=True, text=True,
    )
    if result.returncode == 0:
        for item in json.loads(result.stdout):
            if item.get("name") == "service_role":
                return item["api_key"]
    raise RuntimeError("Set SUPABASE_SERVICE_ROLE_KEY for the existing site project; credentials were not printed.")


def share_private(artifact, prefix, key, opener=urllib.request.urlopen, content_type="application/vnd.android.package-archive"):
    """Upload to the private bucket and return (object name, 7-day signed URL)."""
    payload = Path(artifact).read_bytes()
    if not payload:
        raise ValueError("Artifact bytes are required")
    digest = hashlib.sha256(payload).hexdigest()
    suffix = Path(artifact).suffix or ".bin"
    name = f"{prefix}-{digest[:16]}{suffix}"
    headers = {"apikey": key, "Authorization": "Bearer " + key}

    request = urllib.request.Request(BASE + "/storage/v1/bucket/" + PRIVATE_BUCKET, headers=headers)
    with opener(request, timeout=30) as response:
        bucket = json.load(response)
    # Never fall back to a public bucket: that is exactly what this replaces.
    if bucket.get("public") is not False:
        raise RuntimeError(f"Bucket {PRIVATE_BUCKET} is not private; nothing was uploaded")
    limit = bucket.get("file_size_limit")
    if isinstance(limit, int) and limit > 0 and len(payload) > limit:
        raise RuntimeError(f"Artifact is {len(payload)} bytes; bucket limit is {limit}; nothing was uploaded")

    request = urllib.request.Request(
        BASE + f"/storage/v1/object/{PRIVATE_BUCKET}/{name}", data=payload, method="POST",
        headers={**headers, "Content-Type": content_type, "x-upsert": "true"},
    )
    with opener(request, timeout=240) as response:
        response.read()

    request = urllib.request.Request(
        BASE + f"/storage/v1/object/sign/{PRIVATE_BUCKET}/{name}",
        data=json.dumps({"expiresIn": SIGNED_SECONDS}).encode(), method="POST",
        headers={**headers, "Content-Type": "application/json"},
    )
    with opener(request, timeout=30) as response:
        signed = json.load(response)
    path = signed.get("signedURL") or signed.get("signedUrl")
    if not path:
        raise RuntimeError("Storage did not return a signed URL")
    url = path if path.startswith("http") else BASE + "/storage/v1" + path
    return name, url, digest


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] != "--private":
        print("Public APK publishing is disabled (29 Sep 2026). Use Play internal/open testing.", file=sys.stderr)
        print("Usage: publish-storage.py --private <artifact> <object-prefix>", file=sys.stderr)
        sys.exit(2)
    try:
        name, url, digest = share_private(sys.argv[2], sys.argv[3], credentials())
        print(f"Private upload: {PRIVATE_BUCKET}/{name} (SHA-256 {digest})")
        print("Team link (expires in 7 days, do not post publicly):")
        print(url)
    except Exception as error:
        # Exceptions here contain status/path details, never request headers.
        print(f"Private upload failed: {error}", file=sys.stderr)
        sys.exit(1)
