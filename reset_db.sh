#!/bin/bash
# Reset CineBook to a fresh state. Run from the project root.
set -e

SQL_DIR="$(dirname "$0")/backend/sql"

echo "Dropping and recreating CineBook database..."
mysql -u root -e "DROP DATABASE IF EXISTS CineBook;"

echo "[1/5] Loading schema (create_tables.sql)..."
mysql -u root < "$SQL_DIR/create_tables.sql"

echo "[2/5] Loading P1 — account management (database_logic.sql)..."
mysql -u root CineBook < "$SQL_DIR/database_logic.sql"

echo "[3/5] Loading P2 — query procedures (database_logic_P2.sql)..."
mysql -u root CineBook < "$SQL_DIR/database_logic_P2.sql"

echo "[4/5] Loading P4 — booking + loyalty (database_logic_P4.sql)..."
mysql -u root CineBook < "$SQL_DIR/database_logic_P4.sql"


echo
echo "Done. Now run the seed if you want sample data:"
echo "  cd backend && ./venv/bin/python seed.py"
echo "Then start the API:"
echo "  cd backend && ./venv/bin/uvicorn app.main:app --reload --port 8000"
