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
    def __init__(self, limit=1000, fail=None, corrupt=False):
        self.limit, self.fail, self.corrupt = limit, fail, corrupt
        self.objects = {"aastroastra-latest.apk": b"old-apk", "version.json": b"old-metadata"}
        self.writes = []

    def open(self, request, timeout):
        path = urlsplit(request.full_url).path
        if path.endswith("/bucket/site"):
            return io.BytesIO(json.dumps({"public": True, "file_size_limit": self.limit}).encode())
        name = path.rsplit("/", 1)[1]
        if request.get_method() == "POST":
            if self.fail == "candidate" and name.startswith("aastroastra-195-") or self.fail == name:
                raise TimeoutError("Simulated upload failure")
            self.writes.append(name)
            self.objects[name] = request.data
            return io.BytesIO(b"{}")
        if request.get_method() != "GET":
            raise AssertionError("Publisher must not delete live objects")
        if request.get_header("Authorization") or request.get_header("Apikey"):
            raise AssertionError("Credentials must not be sent to public download URLs")
        content = self.objects[name]
        if self.corrupt and name.startswith("aastroastra-195-"):
            content = b"incorrect CDN bytes"
        return io.BytesIO(content)


class PublishingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.apk = Path(self.tmp.name) / "candidate.apk"
        self.meta = Path(self.tmp.name) / "version.json"
        self.apk.write_bytes(b"new-signed-artifact-placeholder")
        self.meta.write_text(json.dumps({"version": "1.0.7", "versionCode": 195}))

    def publish(self, storage):
        return publisher.publish(self.apk, self.meta, "test-key", opener=storage.open)

    def test_oversized_apk_does_not_touch_live_objects(self):
        storage = Storage(limit=1)
        with self.assertRaises(RuntimeError):
            self.publish(storage)
        self.assertEqual(storage.writes, [])
        self.assertEqual(storage.objects["version.json"], b"old-metadata")

    def test_unknown_limit_fails_before_upload(self):
        storage = Storage(limit=None)
        with self.assertRaises(RuntimeError):
            self.publish(storage)
        self.assertEqual(storage.writes, [])

    def test_failed_candidate_preserves_existing_download(self):
        storage = Storage(fail="candidate")
        with self.assertRaises(TimeoutError):
            self.publish(storage)
        self.assertEqual(storage.objects["aastroastra-latest.apk"], b"old-apk")
        self.assertEqual(storage.objects["version.json"], b"old-metadata")

    def test_corrupt_download_is_never_promoted(self):
        storage = Storage(corrupt=True)
        with self.assertRaises(RuntimeError):
            self.publish(storage)
        self.assertEqual(storage.objects["aastroastra-latest.apk"], b"old-apk")
        self.assertEqual(storage.objects["version.json"], b"old-metadata")

    def test_stable_upload_failure_does_not_publish_metadata(self):
        storage = Storage(fail="aastroastra-latest.apk")
        with self.assertRaises(TimeoutError):
            self.publish(storage)
        self.assertEqual(storage.objects["version.json"], b"old-metadata")

    def test_metadata_points_to_verified_immutable_bytes(self):
        storage = Storage()
        version = self.publish(storage)
        name = urlsplit(version["apk"]).path.rsplit("/", 1)[1]
        self.assertEqual(storage.objects[name], self.apk.read_bytes())
        self.assertEqual(storage.objects["aastroastra-latest.apk"], self.apk.read_bytes())
        self.assertEqual(storage.writes, [name, "aastroastra-latest.apk", "version.json"])
        self.assertEqual(json.loads(storage.objects["version.json"]), version)


if __name__ == "__main__":
    unittest.main()
