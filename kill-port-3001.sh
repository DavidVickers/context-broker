#!/bin/bash
# Quick script to kill processes on port 3001

echo "🔍 Checking port 3001..."

PROCESSES=$(lsof -ti :3001)

if [ -z "$PROCESSES" ]; then
    echo "✅ Port 3001 is free"
else
    echo "⚠️  Found processes on port 3001: $PROCESSES"
    echo "🛑 Killing processes..."
    lsof -ti :3001 | xargs kill -9
    sleep 1
    if lsof -ti :3001 > /dev/null 2>&1; then
        echo "❌ Failed to kill all processes"
    else
        echo "✅ Port 3001 is now free"
    fi
fi

