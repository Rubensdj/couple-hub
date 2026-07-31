#!/bin/bash
set -e

echo "============================================"
echo "  COUPLE HUB - DATABASE SETUP (choose one)"
echo "============================================"
echo ""

echo "OPTIONS:"
echo "  [1] SQLite (local, zero config — BEST for Termux)"
echo "  [2] PostgreSQL (local or remote via pg)"
echo "  [3] MongoDB (remote via Atlas — FREE tier)"
echo "  [4] Supabase (remote PostgreSQL — FREE 500MB)"
echo ""

read -p "Which one? (1-4): " choice

case $choice in
  1)
    echo ">> Setting up SQLite..."
    npm install better-sqlite3
    echo "✓ SQLite ready"
    echo "  Database file: couple-hub.db (auto-created)"
    ;;
  2)
    echo ">> Setting up PostgreSQL..."
    npm install pg
    echo "✓ pg driver ready"
    echo "  Need: DATABASE_URL=postgres://..."
    ;;
  3)
    echo ">> Setting up MongoDB..."
    npm install mongodb
    echo "✓ MongoDB driver ready"
    echo "  Need: MONGODB_URI=mongodb+srv://..."
    ;;
  4)
    echo ">> Setting up Supabase..."
    npm install @supabase/supabase-js
    echo "✓ Supabase client ready"
    echo "  Need: SUPABASE_URL + SUPABASE_KEY"
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "============================================"
echo "  DATABASE READY"
echo "============================================"
echo ""
echo "Next steps:"
echo "  cd login-site/"
echo "  npm install"
echo "  node server.js"
echo "  http://localhost:3000"
echo ""
EOF