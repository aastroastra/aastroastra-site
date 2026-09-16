#!/usr/bin/env python3
"""Publish a verified Android download without deleting live storage objects."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

BASE = "https://gttszlununmqivrqevwv.supabase.co"
PUBLIC = BASE + "/storage/v1/object/public/site/"


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


def publish(apk, metadata, key, opener=urllib.request.urlopen):
    payload = Path(apk).read_bytes()
    version = json.loads(Path(metadata).read_text())
    code = int(version["versionCode"])
    if code <= 0 or not payload:
        raise ValueError("APK bytes and a positive version code are required")
    digest = hashlib.sha256(payload).hexdigest()
    name = f"aastroastra-{code}-{digest[:16]}.apk"
    headers = {"apikey": key, "Authorization": "Bearer " + key}

    request = urllib.request.Request(BASE + "/storage/v1/bucket/site", headers=headers)
    with opener(request, timeout=30) as response:
        bucket = json.load(response)
    limit = bucket.get("file_size_limit")
    if bucket.get("public") is not True:
        raise RuntimeError("The site bucket is not public; nothing was uploaded")
    if not isinstance(limit, int) or limit <= 0:
        raise RuntimeError("Cannot verify the site bucket size limit; nothing was uploaded")
    if len(payload) > limit:
        raise RuntimeError(f"APK is {len(payload)} bytes; bucket limit is {limit}; nothing was uploaded")

    def upload(object_name, data, content_type, cache):
        request = urllib.request.Request(
            BASE + "/storage/v1/object/site/" + object_name, data=data, method="POST",
            headers={**headers, "Content-Type": content_type,
                     "Cache-Control": cache, "x-upsert": "true"},
        )
        with opener(request, timeout=240) as response:
            response.read()

    def verify(object_name, expected):
        # No credentials on public downloads. A fresh query avoids cached copies.
        token = hashlib.sha256(expected).hexdigest()
        request = urllib.request.Request(PUBLIC + object_name + "?verify=" + token)
        with opener(request, timeout=240) as response:
            actual = response.read()
        if hashlib.sha256(actual).digest() != hashlib.sha256(expected).digest():
            raise RuntimeError(f"Public download verification failed: {object_name}")

    content_type = "application/vnd.android.package-archive"
    upload(name, payload, content_type, "max-age=31536000, immutable")
    verify(name, payload)
    # Keep the historical stable URL working, without a delete-before-upload gap.
    upload("aastroastra-latest.apk", payload, content_type, "no-cache")
    verify("aastroastra-latest.apk", payload)
    # The site points directly to immutable, verified bytes, avoiding CDN staleness.
    version.update(apk=PUBLIC + name, sha256=digest)
    encoded = (json.dumps(version, indent=2) + "\n").encode()
    upload("version.json", encoded, "application/json", "no-cache")
    verify("version.json", encoded)
    Path(metadata).write_bytes(encoded)
    print(f"Verified build {code}: {len(payload)} bytes, SHA-256 {digest}")
    print("Download: " + version["apk"])
    return version


if __name__ == "__main__":
    try:
        publish(sys.argv[1], sys.argv[2], credentials())
    except Exception as error:
        # Exceptions here contain status/path details, never request headers.
        print(f"Publication failed: {error}", file=sys.stderr)
        sys.exit(1)
