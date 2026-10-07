import os
import sqlite3
from contextlib import contextmanager
from typing import Generator

# пути к базе и скриптам схемы
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
project_root = os.path.dirname(base_dir)
db_path = os.path.join(project_root, "database", "app.db")
schema_path = os.path.join(project_root, "database", "schema.sql")
seed_path = os.path.join(project_root, "database", "seed.sql")


def dict_factory(cursor: sqlite3.Cursor, row: tuple) -> dict:
    # превращаем строку из кортежа в нормальный питонячий словарь
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    # открываем соединение и включаем внешние ключи
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("pragma foreign_keys = on;")
    conn.row_factory = dict_factory
    try:
        # отдаем соединение наружу
        yield conn
        # если все ок, фиксируем изменения
        conn.commit()
    except Exception:
        # если упало, откатываем транзакцию
        conn.rollback()
        raise
    finally:
        # в любом случае закрываем соединение
        conn.close()


def init_db(force_reseed: bool = False) -> None:
    # создаем таблицы и сидим данные если базы еще нет
    with get_db() as conn:
        cursor = conn.cursor()
        # проверяем создана ли уже таблица юзеров
        table_check = cursor.execute(
            "select name from sqlite_master where type='table' and name='users';"
        ).fetchone()

        if not table_check or force_reseed:
            # накатываем схему из файла
            if os.path.exists(schema_path):
                with open(schema_path, "r", encoding="utf-8") as f:
                    conn.executescript(f.read())

            # накатываем тестовые данные
            if os.path.exists(seed_path):
                with open(seed_path, "r", encoding="utf-8") as f:
                    conn.executescript(f.read())
