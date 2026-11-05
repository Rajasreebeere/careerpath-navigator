# CareerPath Navigator

CareerPath Navigator helps students in India explore career options, compare realistic study timelines, and follow a saved day-by-day learning plan.

## Run locally

From this directory, install the three application dependencies and start Flask:

```bash
python -m pip install -r requirements.txt
python app.py
```

The server uses `PORT` when provided, or port `5000` when run directly. The Replit development workflow starts the same Flask application.

Before publishing, add a strong `JWT_SECRET` in Replit Secrets. If it is missing, the app logs a warning and uses a development-only fallback. The deployment command is:

```bash
gunicorn --bind 0.0.0.0:$PORT app:app
```

## Application structure

```text
app.py
requirements.txt
README.md
data/
  careerpath.db
career_data/
  it.json
  engineering.json
  medical.json
  commerce.json
  government.json
  law_education.json
  creative.json
  entrepreneurship.json
  sectors.json
static/
  index.html
  css/styles.css
  js/main.js
  js/api.js
  js/state.js
  js/components.js
  js/pages/
```

SQLite is created automatically in `data/` on startup. The `career_data/` directory is outside the Flask static directory; clients can retrieve it only through the authenticated careers endpoint.

## API

All request and response bodies are JSON.

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/auth/me` | Bearer token |
| `GET` | `/api/careers` | Bearer token |
| `GET` | `/api/user/progress` | Bearer token |
| `POST` | `/api/user/progress` | Bearer token |

Registration and login return a seven-day HS256 token. Send it as `Authorization: Bearer <token>` for protected endpoints. User passwords are hashed with Werkzeug; password hashes are never included in API responses. Authentication requests have an in-memory per-IP rate limit.

## Career roadmap notes

The career catalog contains 41 paths in eight sectors. Timelines are estimates, not admission, employment, salary, or investment guarantees. Formal routes include the relevant Indian education and selection steps; students should verify current eligibility and dates with official institutions. Entrepreneurship plans include customer validation, business planning, funding considerations, marketing, and registration checks such as Udyam and GST where applicable.
