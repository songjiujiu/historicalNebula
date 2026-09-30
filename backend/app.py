"""Read-only same-origin API consumed by the historical reading website."""

from __future__ import annotations

from flask import Flask, Response, jsonify, request

from .corpus import MySQLCorpus, valid_corpus_path


def create_app(repository=None) -> Flask:
    app = Flask(__name__)
    live_repository = repository

    def store():
        nonlocal live_repository
        if live_repository is None:
            live_repository = MySQLCorpus()
        return live_repository

    @app.get("/api/v1/health")
    def health():
        try:
            return jsonify({"ok": True, **store().status()})
        except Exception:
            app.logger.exception("Corpus health check failed")
            return jsonify({"ok": False, "error": "corpus_unavailable"}), 503

    @app.get("/api/v1/data/<path:document_path>")
    def document(document_path: str):
        if not valid_corpus_path(document_path):
            return jsonify({"error": "not_found"}), 404
        try:
            item = store().get(document_path)
        except Exception:
            app.logger.exception("Corpus read failed")
            return jsonify({"error": "corpus_unavailable"}), 503
        if item is None:
            return jsonify({"error": "not_found"}), 404
        if request.if_none_match.contains(item.sha256):
            response = Response(status=304)
        else:
            response = Response(item.body, mimetype="application/json")
        response.set_etag(item.sha256)
        response.cache_control.public = True
        response.cache_control.max_age = 300
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    return app
