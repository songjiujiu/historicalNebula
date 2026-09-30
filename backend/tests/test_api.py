import hashlib
import json

from backend.app import create_app
from backend.corpus import CorpusDocument
from backend.import_corpus import source_documents, inspect_document


class FakeCorpus:
    def __init__(self):
        body = b'{"volume":1,"blocks":[]}'
        self.item = CorpusDocument(body, hashlib.sha256(body).hexdigest())
        self.paths = []

    def get(self, path):
        self.paths.append(path)
        return self.item if path == "shiji/001.json" else None

    def status(self):
        return {"release": "test", "documents": 1}


def test_read_and_conditional_request():
    corpus = FakeCorpus()
    client = create_app(corpus).test_client()
    response = client.get("/api/v1/data/shiji/001.json")
    assert response.status_code == 200
    assert response.json == {"volume": 1, "blocks": []}
    assert response.headers["Content-Type"].startswith("application/json")
    assert response.headers["Cache-Control"] == "public, max-age=300"
    assert client.get("/api/v1/data/shiji/001.json", headers={"If-None-Match": response.headers["ETag"]}).status_code == 304
    assert client.get("/api/v1/health").json == {"ok": True, "release": "test", "documents": 1}


def test_invalid_paths_never_reach_mysql():
    corpus = FakeCorpus()
    client = create_app(corpus).test_client()
    for path in ("secrets.json", "histories/bad/../../secrets.json", "modern/chapters/not-a-json.txt", "shiji/9999.json"):
        assert client.get(f"/api/v1/data/{path}").status_code == 404
    assert corpus.paths == []
    assert client.get("/api/v1/data/modern/chapters/not-present.json").status_code == 404


def test_validated_file_inventory_and_exact_bytes(tmp_path):
    root = tmp_path / "data"
    (root / "shiji").mkdir(parents=True)
    file = root / "shiji" / "001.json"
    file.write_bytes(b'{"volume":1}\n')
    assert source_documents(root, minimum=1) == [("shiji/001.json", file)]
    assert inspect_document(file) == (file.read_bytes(), hashlib.sha256(file.read_bytes()).hexdigest())
    file.write_text("broken", encoding="utf8")
    try:
        inspect_document(file)
    except json.JSONDecodeError:
        pass
    else:
        raise AssertionError("Malformed JSON must be rejected before import")
