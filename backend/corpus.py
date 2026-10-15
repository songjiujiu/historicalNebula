"""MySQL storage for versioned, byte-exact JSON documents."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass

CORPUS_PATH = re.compile(
    r"(?:shiji/(?:[0-9]{3}|search|manifest)|"
    r"histories/[a-z0-9-]+/(?:[0-9]{3}|search)|"
    r"modern/(?:manifest|chapters/[a-z0-9-]+|documents/[a-z0-9-]+|"
    r"qingshigao/(?:[1-9][0-9]{0,2}|manifest|search)))\.json\Z"
)


def valid_corpus_path(path: str) -> bool:
    return bool(CORPUS_PATH.fullmatch(path)) and len(path) <= 180


def database_settings() -> dict:
    password = os.environ.get("HISTORY_DB_PASSWORD")
    if not password:
        raise RuntimeError("HISTORY_DB_PASSWORD is required")
    return {
        "host": os.environ.get("HISTORY_DB_HOST", "127.0.0.1"),
        "port": int(os.environ.get("HISTORY_DB_PORT", "3306")),
        "user": os.environ.get("HISTORY_DB_USER", "historical_nebula"),
        "password": password,
        "database": os.environ.get("HISTORY_DB_NAME", "historical_nebula"),
        "connection_timeout": 5,
        "charset": "utf8mb4",
    }


@dataclass(frozen=True)
class CorpusDocument:
    body: bytes
    sha256: str


class MySQLCorpus:
    def __init__(self) -> None:
        from mysql.connector.pooling import MySQLConnectionPool

        self.pool = MySQLConnectionPool(pool_size=4, pool_reset_session=True, **database_settings())

    def get(self, path: str) -> CorpusDocument | None:
        connection = self.pool.get_connection()
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    "SELECT d.payload, d.sha256 FROM corpus_state AS s "
                    "JOIN corpus_documents AS d ON d.release_id = s.active_release "
                    "WHERE s.id = 1 AND d.path = %s",
                    (path,),
                )
                row = cursor.fetchone()
                return CorpusDocument(bytes(row[0]), row[1]) if row else None
            finally:
                cursor.close()
        finally:
            connection.close()

    def status(self) -> dict:
        connection = self.pool.get_connection()
        try:
            cursor = connection.cursor()
            try:
                cursor.execute(
                    "SELECT s.active_release, COUNT(d.path) FROM corpus_state AS s "
                    "LEFT JOIN corpus_documents AS d ON d.release_id = s.active_release "
                    "WHERE s.id = 1 GROUP BY s.active_release"
                )
                row = cursor.fetchone()
                if not row or not row[0] or not row[1]:
                    raise RuntimeError("No active corpus")
                return {"release": row[0], "documents": row[1]}
            finally:
                cursor.close()
        finally:
            connection.close()
