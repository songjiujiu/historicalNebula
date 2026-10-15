"""Validate the checked-in corpus, import it to MySQL, then activate it atomically."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from .corpus import database_settings, valid_corpus_path

RELEASE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,47}\Z")
SCHEMA = (
    "CREATE TABLE IF NOT EXISTS corpus_documents ("
    "release_id VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,"
    "path VARCHAR(180) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,"
    "payload LONGBLOB NOT NULL,"
    "sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,"
    "byte_count INT UNSIGNED NOT NULL,"
    "PRIMARY KEY (release_id, path)"
    ") ENGINE=InnoDB",
    "CREATE TABLE IF NOT EXISTS corpus_state ("
    "id TINYINT UNSIGNED PRIMARY KEY,"
    "active_release VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL"
    ") ENGINE=InnoDB",
)


def source_documents(root: Path, minimum: int = 3800) -> list[tuple[str, Path]]:
    if not root.is_dir():
        raise ValueError(f"Corpus directory missing: {root}")
    documents = sorted((file.relative_to(root).as_posix(), file) for file in root.rglob("*.json"))
    if len(documents) < minimum:
        raise ValueError(f"Corpus has {len(documents)} documents; expected at least {minimum}")
    for key, file in documents:
        if not valid_corpus_path(key) or file.is_symlink():
            raise ValueError(f"Unexpected corpus path: {key}")
    return documents


def inspect_document(file: Path) -> tuple[bytes, str]:
    body = file.read_bytes()
    json.loads(body)
    return body, hashlib.sha256(body).hexdigest()


def import_release(root: Path, release: str, *, minimum: int = 3800, activate: bool = True) -> dict:
    if not RELEASE_ID.fullmatch(release):
        raise ValueError("Invalid release identifier")
    documents = source_documents(root, minimum)
    # Validate all files before altering the active database state.
    for _, file in documents:
        inspect_document(file)

    import mysql.connector

    connection = mysql.connector.connect(**database_settings())
    total_bytes = 0
    try:
        cursor = connection.cursor()
        try:
            for statement in SCHEMA:
                cursor.execute(statement)
            cursor.execute("SELECT active_release FROM corpus_state WHERE id = 1")
            current = cursor.fetchone()
            if current and current[0] == release:
                raise ValueError("Refusing to replace an active release")
            cursor.execute("DELETE FROM corpus_documents WHERE release_id = %s", (release,))
            connection.commit()
            for index, (key, file) in enumerate(documents, 1):
                body, sha256 = inspect_document(file)
                cursor.execute(
                    "INSERT INTO corpus_documents (release_id, path, payload, sha256, byte_count) "
                    "VALUES (%s, %s, %s, %s, %s)",
                    (release, key, body, sha256, len(body)),
                )
                total_bytes += len(body)
                if index % 25 == 0:
                    connection.commit()
                    print(f"Imported {index}/{len(documents)}", flush=True)
            connection.commit()
            cursor.execute("SELECT COUNT(*), SUM(byte_count) FROM corpus_documents WHERE release_id = %s", (release,))
            count, stored_bytes = cursor.fetchone()
            if count != len(documents) or stored_bytes != total_bytes:
                raise RuntimeError("MySQL corpus row or byte count mismatch")
            if activate:
                cursor.execute(
                    "INSERT INTO corpus_state (id, active_release) VALUES (1, %s) "
                    "ON DUPLICATE KEY UPDATE active_release = VALUES(active_release)",
                    (release,),
                )
                connection.commit()
            return {"release": release, "documents": count, "bytes": total_bytes, "active": activate}
        finally:
            cursor.close()
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("public/data"))
    parser.add_argument("--release", required=True)
    parser.add_argument("--min-files", type=int, default=3800)
    parser.add_argument("--no-activate", action="store_true")
    args = parser.parse_args()
    print(json.dumps(import_release(args.root, args.release, minimum=args.min_files, activate=not args.no_activate)))


if __name__ == "__main__":
    main()
