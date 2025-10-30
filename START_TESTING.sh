#!/bin/bash

# Start Local Testing Script for Fog City Drive Solutions
# This will start both broker and frontend servers

echo "🚀 Starting Fog City Drive Solutions Local Testing"
echo ""

# Check if broker dependencies are installed
if [ ! -d "broker/node_modules" ]; then
    echo "📦 Installing broker dependencies..."
    cd broker && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "✅ Dependencies ready!"
echo ""
echo "Starting servers..."
echo ""
echo "⚠️  IMPORTANT: Keep this terminal open!"
echo ""
echo "📡 Broker will run on: http://localhost:3001"
echo "🌐 Frontend will run on: http://localhost:3000"
echo ""
echo "Opening frontend in your browser..."
echo ""

# Start broker in background
cd broker
npm run dev > ../broker.log 2>&1 &
BROKER_PID=$!
cd ..

# Wait a moment for broker to start
sleep 3

# Start frontend (will open browser automatically)
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "✅ Servers started!"
echo ""
echo "Broker PID: $BROKER_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop servers, run:"
echo "  kill $BROKER_PID $FRONTEND_PID"
echo ""
echo "Or press Ctrl+C and run:"
echo "  pkill -f 'node.*broker'"
echo "  pkill -f 'react-scripts'"
echo ""
echo "Check broker logs: tail -f broker.log"
echo ""

wait

