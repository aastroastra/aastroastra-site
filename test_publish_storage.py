import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from urllib.parse import urlsplit

spec = importlib.util.spec_from_file_location("publisher", Path(__file__).with_name("publish-storage.py"))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class Storage:
    """Fake Supabase Storage: records every request the publisher makes."""

    def __init__(self, public=False, limit=50_000_000):
        self.public, self.limit = public, limit
        self.objects, self.paths = {}, []

    def open(self, request, timeout):
        path = urlsplit(request.full_url).path
        self.paths.append((request.get_method(), path))
        if "/object/public/" in path:
            raise AssertionError("Private sharing must never touch a public URL")
        if path.endswith("/bucket/" + publisher.PRIVATE_BUCKET):
            return io.BytesIO(json.dumps({"public": self.public, "file_size_limit": self.limit}).encode())
        if "/object/sign/" in path:
            body = json.loads(request.data)
            if body["expiresIn"] != 7 * 24 * 3600:
                raise AssertionError("Signed links last 7 days")
            return io.BytesIO(json.dumps({"signedURL": path.split("/storage/v1", 1)[1] + "?token=t"}).encode())
        if request.get_method() == "POST":
            self.objects[path] = request.data
            return io.BytesIO(b"{}")
        raise AssertionError("Unexpected request " + path)


class PrivateShareTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.apk = Path(self.tmp.name) / "candidate.apk"
        self.apk.write_bytes(b"new-signed-artifact-placeholder")

    def share(self, storage):
        return publisher.share_private(self.apk, "android/aastroastra-244", "test-key", opener=storage.open)

    def test_uploads_only_to_private_bucket_and_signs(self):
        storage = Storage()
        name, url, _ = self.share(storage)
        self.assertTrue(name.startswith("android/aastroastra-244-") and name.endswith(".apk"))
        self.assertEqual(list(storage.objects.values()), [self.apk.read_bytes()])
        self.assertTrue(all("/builds-internal/" in p or p.endswith("/builds-internal") for _, p in storage.paths))
        self.assertIn("/storage/v1/object/sign/builds-internal/", url)

    def test_public_bucket_is_refused_before_upload(self):
        storage = Storage(public=True)
        with self.assertRaises(RuntimeError):
            self.share(storage)
        self.assertEqual(storage.objects, {})

    def test_oversized_artifact_is_refused(self):
        storage = Storage(limit=1)
        with self.assertRaises(RuntimeError):
            self.share(storage)
        self.assertEqual(storage.objects, {})


if __name__ == "__main__":
    unittest.main()
