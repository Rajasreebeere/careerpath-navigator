import json
import os
import re
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

import jwt
from flask import Flask, g, jsonify, request, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CAREER_DIR = BASE_DIR / "career_data"
STATIC_DIR = BASE_DIR / "static"
DB_PATH = DATA_DIR / "careerpath.db"
DATA_DIR.mkdir(parents=True, exist_ok=True)

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    JWT_SECRET = "careerpath-development-secret-change-before-publishing"
    print("WARNING: JWT_SECRET is missing; using the development fallback.", file=sys.stderr)

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="/static")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024
app.config["JSON_SORT_KEYS"] = False

RATE_LIMIT = {}
RATE_WINDOW_SECONDS = 60
RATE_MAX_REQUESTS = 10
CAREERS = {"sectors": [], "careers": []}


def get_db():
    if "db" not in g:
        connection = sqlite3.connect(DB_PATH)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        g.db = connection
    return g.db


@app.teardown_appcontext
def close_db(_error=None):
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def initialize_db():
    connection = sqlite3.connect(DB_PATH)
    try:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                progress TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )"""
        )
        connection.commit()
    finally:
        connection.close()


def load_careers():
    sectors_path = CAREER_DIR / "sectors.json"
    if not sectors_path.exists():
        print(f"WARNING: Missing career data file: {sectors_path}", file=sys.stderr)
        return
    try:
        CAREERS["sectors"] = json.loads(sectors_path.read_text(encoding="utf-8"))
        all_roles = []
        for file_path in sorted(CAREER_DIR.glob("*.json")):
            if file_path.name == "sectors.json":
                continue
            try:
                value = json.loads(file_path.read_text(encoding="utf-8"))
                if not isinstance(value, list):
                    print(f"WARNING: {file_path.name} must contain an array.", file=sys.stderr)
                    continue
                all_roles.extend(value)
            except (OSError, json.JSONDecodeError) as exc:
                print(f"WARNING: Could not read {file_path.name}: {exc}", file=sys.stderr)
        CAREERS["careers"] = all_roles
        validate_careers(CAREERS["careers"])
    except (OSError, json.JSONDecodeError) as exc:
        print(f"WARNING: Could not load career data: {exc}", file=sys.stderr)


def validate_careers(roles):
    required = {
        "id", "name", "sector", "icon", "shortDescription", "difficulty", "totalTime",
        "goalDefinition", "timeToGoal", "salaryRange", "demand", "whereItWorks",
        "overview", "requirements", "skills", "languagesAndTools", "phases",
        "dayInTheLife", "resources", "careerGrowth", "relatedRoles", "quizTags",
    }
    seen = set()
    for role in roles:
        role_id = role.get("id", "<missing id>")
        missing = required - role.keys()
        if missing:
            print(f"WARNING: {role_id} is missing {', '.join(sorted(missing))}.", file=sys.stderr)
        if role_id in seen:
            print(f"WARNING: Duplicate role id: {role_id}", file=sys.stderr)
        seen.add(role_id)
        paces = role.get("timeToGoal", {})
        if not all(pace in paces for pace in ("intensive", "regular", "relaxed")):
            print(f"WARNING: {role_id} is missing a pace.", file=sys.stderr)
        for index, phase in enumerate(role.get("phases", [])):
            if not 6 <= len(phase.get("dailyPlan", [])) <= 8:
                print(f"WARNING: {role_id} phase {index + 1} needs 6-8 dailyPlan entries.", file=sys.stderr)
            if not 3 <= len(phase.get("weekendPlan", [])) <= 4:
                print(f"WARNING: {role_id} phase {index + 1} needs 3-4 weekendPlan entries.", file=sys.stderr)
        if role.get("phases") and paces.get("regular"):
            phase_weeks = sum(phase.get("durationWeeks", 0) for phase in role["phases"])
            if phase_weeks != paces["regular"].get("totalWeeks"):
                print(f"WARNING: {role_id} phase weeks do not equal Regular totalWeeks.", file=sys.stderr)
    ids = {role.get("id") for role in roles}
    for role in roles:
        for related_id in role.get("relatedRoles", []):
            if related_id not in ids:
                print(f"WARNING: {role.get('id')} references missing role {related_id}.", file=sys.stderr)


def json_error(message, status):
    return jsonify({"error": message}), status


@app.errorhandler(400)
def bad_request(_error):
    return json_error("Please check the request and try again.", 400)


@app.errorhandler(401)
def unauthorized(_error):
    return json_error("Please sign in to continue.", 401)


@app.errorhandler(404)
def not_found(_error):
    if request.path.startswith("/api/"):
        return json_error("The requested resource was not found.", 404)
    return json_error("The requested page was not found.", 404)


@app.errorhandler(409)
def conflict(_error):
    return json_error("That request conflicts with an existing account.", 409)


@app.errorhandler(413)
def too_large(_error):
    return json_error("Request is too large. The limit is 1 MB.", 413)


@app.errorhandler(429)
def too_many(_error):
    return json_error("Too many sign-in attempts. Please wait a minute and try again.", 429)


@app.errorhandler(500)
def server_error(_error):
    return json_error("Something went wrong. Please try again.", 500)


@app.errorhandler(sqlite3.Error)
def database_error(error):
    app.logger.error("Database operation failed: %s", error)
    return json_error("A database error occurred. Please try again.", 500)


def auth_rate_limited():
    now = time.time()
    ip = request.remote_addr or "unknown"
    attempts = [stamp for stamp in RATE_LIMIT.get(ip, []) if now - stamp < RATE_WINDOW_SECONDS]
    if len(attempts) >= RATE_MAX_REQUESTS:
        RATE_LIMIT[ip] = attempts
        return True
    attempts.append(now)
    RATE_LIMIT[ip] = attempts
    return False


def issue_token(user_id):
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": now + timedelta(days=7)},
        JWT_SECRET,
        algorithm="HS256",
    )


def token_required(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        authorization = request.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            return json_error("Please sign in to continue.", 401)
        token = authorization[7:].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])
        except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
            return json_error("Your session has expired. Please sign in again.", 401)
        try:
            user = get_db().execute(
                "SELECT id, name, username FROM users WHERE id = ?", (user_id,)
            ).fetchone()
        except sqlite3.Error as exc:
            app.logger.error("Database operation failed: %s", exc)
            return json_error("A database error occurred. Please try again.", 500)
        if user is None:
            return json_error("Your session is no longer valid. Please sign in again.", 401)
        g.user = user
        return handler(*args, **kwargs)

    return wrapped


def read_json_object():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return None
    return body


@app.before_request
def limit_auth_requests():
    if request.path.startswith("/api/auth/") and request.method == "POST":
        if auth_rate_limited():
            return json_error("Too many sign-in attempts. Please wait a minute and try again.", 429)
    return None


@app.get("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.post("/api/auth/register")
def register():
    body = read_json_object()
    if body is None:
        return json_error("Request body must be a JSON object.", 400)
    name = str(body.get("name", "")).strip()
    username = str(body.get("username", "")).strip().lower()
    password = body.get("password", "")
    if not name:
        return json_error("Name is required.", 400)
    if not 3 <= len(username) <= 20 or not re.fullmatch(r"[a-z0-9_]+", username):
        return json_error("Username must be 3-20 characters using letters, numbers, or underscores.", 400)
    if not isinstance(password, str) or len(password) < 6:
        return json_error("Password must be at least 6 characters.", 400)
    try:
        db = get_db()
        cursor = db.execute(
            "INSERT INTO users (username, name, password_hash, progress) VALUES (?, ?, ?, '{}')",
            (username, name, generate_password_hash(password)),
        )
        db.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        return json_error("That username is already taken. Choose another one.", 409)
    except sqlite3.Error as exc:
        app.logger.error("Registration failed: %s", exc)
        return json_error("A database error occurred. Please try again.", 500)
    user = {"id": user_id, "name": name, "username": username}
    return jsonify({"token": issue_token(user_id), "user": user}), 201


@app.post("/api/auth/login")
def login():
    body = read_json_object()
    if body is None:
        return json_error("Request body must be a JSON object.", 400)
    username = str(body.get("username", "")).strip().lower()
    password = body.get("password", "")
    try:
        user = get_db().execute(
            "SELECT id, name, username, password_hash FROM users WHERE username = ?", (username,)
        ).fetchone()
    except sqlite3.Error as exc:
        app.logger.error("Login lookup failed: %s", exc)
        return json_error("A database error occurred. Please try again.", 500)
    if user is None or not isinstance(password, str) or not check_password_hash(user["password_hash"], password):
        return json_error("Invalid username or password", 401)
    user_info = {"id": user["id"], "name": user["name"], "username": user["username"]}
    return jsonify({"token": issue_token(user["id"]), "user": user_info})


@app.get("/api/auth/me")
@token_required
def me():
    return jsonify({"user": dict(g.user)})


@app.get("/api/user/progress")
@token_required
def get_progress():
    try:
        row = get_db().execute(
            "SELECT progress FROM users WHERE id = ?", (g.user["id"],)
        ).fetchone()
        return jsonify(json.loads(row["progress"] or "{}"))
    except (sqlite3.Error, json.JSONDecodeError) as exc:
        app.logger.error("Could not read progress: %s", exc)
        return json_error("Saved progress could not be loaded.", 500)


@app.post("/api/user/progress")
@token_required
def save_progress():
    progress = read_json_object()
    if progress is None:
        return json_error("Progress must be a JSON object.", 400)
    role_id = progress.get("roleId")
    pace = progress.get("pace")
    if role_id is not None and (not isinstance(role_id, str) or pace not in {"intensive", "regular", "relaxed"}):
        return json_error("A saved path needs a valid role and pace.", 400)
    if role_id is not None and not any(role.get("id") == role_id for role in CAREERS["careers"]):
        return json_error("That career path is not available.", 400)
    try:
        get_db().execute(
            "UPDATE users SET progress = ? WHERE id = ?",
            (json.dumps(progress, separators=(",", ":")), g.user["id"]),
        )
        get_db().commit()
    except sqlite3.Error as exc:
        app.logger.error("Could not save progress: %s", exc)
        return json_error("Saved progress could not be updated.", 500)
    return jsonify({"saved": True, "progress": progress})


@app.get("/api/careers")
@token_required
def careers():
    return jsonify(CAREERS)


@app.errorhandler(Exception)
def unexpected_error(error):
    if isinstance(error, sqlite3.Error):
        return database_error(error)
    app.logger.exception("Unhandled application error", exc_info=error)
    return json_error("Something went wrong. Please try again.", 500)


initialize_db()
load_careers()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
