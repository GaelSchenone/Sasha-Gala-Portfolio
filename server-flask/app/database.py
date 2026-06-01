import threading
import mysql.connector
from mysql.connector import pooling
from .config import Config

db_pool = None
_pool_lock = threading.Lock()


def _build_pool(pool_name):
    return mysql.connector.pooling.MySQLConnectionPool(
        pool_name=pool_name,
        pool_size=5,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        database=Config.DB_NAME,
        connect_timeout=10,
    )


def init_db(app):
    global db_pool
    print(f"[STARTUP] Connecting to DB: {Config.DB_USER}@{Config.DB_HOST}:{Config.DB_PORT}/{Config.DB_NAME}", flush=True)
    with _pool_lock:
        try:
            db_pool = _build_pool("mypool")
            print("[STARTUP] Database pool initialized successfully", flush=True)
        except mysql.connector.Error as err:
            print(f"[STARTUP] Error initializing database pool: {err}", flush=True)
            db_pool = None


def get_db_connection():
    global db_pool
    if db_pool:
        try:
            return db_pool.get_connection()
        except mysql.connector.Error as err:
            print(f"Error getting DB connection, attempting to reinit pool: {err}")
            with _pool_lock:
                try:
                    db_pool = _build_pool("mypool_retry")
                    return db_pool.get_connection()
                except mysql.connector.Error as err2:
                    print(f"Error reinitializing DB pool: {err2}")
                    return None
    with _pool_lock:
        if db_pool:
            try:
                return db_pool.get_connection()
            except mysql.connector.Error:
                pass
        try:
            db_pool = _build_pool("mypool_init")
            return db_pool.get_connection()
        except mysql.connector.Error as err:
            print(f"Error creating DB pool on first query: {err}")
            return None


class DBError(Exception):
    """Raised when a query fails for infrastructure reasons (connection, syntax, etc.).
    Lets callers distinguish 'no rows' (returns None/[]) from real failures.
    """


def execute_query(query, params=None, dictionary=True, fetch_one=False):
    cnx = get_db_connection()
    if not cnx:
        print(f"DB ERROR: No connection available for query: {query[:80]}")
        return None

    cursor = cnx.cursor(dictionary=dictionary)
    try:
        cursor.execute(query, params or ())

        stripped = query.strip().upper()

        if stripped.startswith('INSERT'):
            cnx.commit()
            return cursor.lastrowid

        if stripped.startswith(('UPDATE', 'DELETE')):
            cnx.commit()
            return cursor.rowcount

        if fetch_one:
            return cursor.fetchone()
        return cursor.fetchall()

    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        print(f"Failed query: {query[:200]}")
        try:
            cnx.rollback()
        except Exception:
            pass
        return None
    except Exception as e:
        print(f"Unexpected DB error: {e}")
        print(f"Failed query: {query[:200]}")
        try:
            cnx.rollback()
        except Exception:
            pass
        return None
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            cnx.close()
        except Exception:
            pass
