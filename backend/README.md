# Vận tải hàng hóa - Backend

Python backend API using FastAPI.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry
│   ├── config.py             # Settings & configuration
│   ├── database.py           # DB connection
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── router.py     # API v1 routes
│   ├── core/
│   │   ├── __init__.py
│   │   └── security.py       # Auth & JWT
│   ├── models/
│   │   ├── __init__.py
│   │   └── base.py           # SQLAlchemy models
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── base.py           # Pydantic schemas
│   └── services/
│       ├── __init__.py
│       └── base.py           # Business logic
├── alembic/
│   ├── env.py
│   └── versions/
├── tests/
│   └── __init__.py
├── requirements.txt
└── alembic.ini
```
