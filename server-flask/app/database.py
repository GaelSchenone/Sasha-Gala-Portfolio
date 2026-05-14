import mysql.connector
from mysql.connector import pooling
from .config import Config

db_pool = None

def init_db(app):
    global db_pool
    db_name = Config.DB_NAME
    # Escape database name with hyphens for MySQL/MariaDB compatibility
    if '-' in db_name and not db_name.startswith('`'):
        db_name_escaped = f'`{db_name}`'
    else:
        db_name_escaped = db_name

    db_config = {
        "user": Config.DB_USER,
        "password": Config.DB_PASSWORD,
        "host": Config.DB_HOST,
        "port": Config.DB_PORT,
        "database": db_name,
        "connect_timeout": 10,
        "pool_name": "mypool",
        "pool_size": 5,
    }

    app.logger.info(f"Connecting to DB: {Config.DB_USER}@{Config.DB_HOST}:{Config.DB_PORT}/{db_name}")

    try:
        db_pool = mysql.connector.pooling.MySQLConnectionPool(**db_config)
        app.logger.info("Database pool initialized successfully")
    except mysql.connector.Error as err:
        app.logger.error(f"Error initializing database pool: {err}")
        raise


def get_db_connection():
    global db_pool
    if db_pool:
        try:
            return db_pool.get_connection()
        except mysql.connector.Error as err:
            print(f"Error getting DB connection: {err}")
            try:
                db_pool = mysql.connector.pooling.MySQLConnectionPool(
                    pool_name="mypool_retry",
                    pool_size=5,
                    user=Config.DB_USER,
                    password=Config.DB_PASSWORD,
                    host=Config.DB_HOST,
                    port=Config.DB_PORT,
                    database=Config.DB_NAME,
                    connect_timeout=5,
                )
                return db_pool.get_connection()
            except mysql.connector.Error as err2:
                print(f"Error reinitializing DB pool: {err2}")
    else:
        try:
            db_pool = mysql.connector.pooling.MySQLConnectionPool(
                pool_name="mypool_init",
                pool_size=5,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                database=Config.DB_NAME,
                connect_timeout=5,
            )
            return db_pool.get_connection()
        except mysql.connector.Error as err:
            print(f"Error creating DB pool on first query: {err}")
    return None


def execute_query(query, params=None, dictionary=True, fetch_one=False):
    cnx = get_db_connection()
    if not cnx:
        print(f"DB ERROR: No connection available for query: {query[:80]}")
        return None

    cursor = cnx.cursor(dictionary=dictionary)
    try:
        cursor.execute(query, params or ())

        stripped = query.strip().upper()

        if stripped.startswith(('INSERT',)):
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
        cnx.rollback()
        return None
    except Exception as e:
        print(f"Unexpected DB error: {e}")
        print(f"Failed query: {query[:200]}")
        cnx.rollback()
        return None
    finally:
        cursor.close()
        cnx.close()
