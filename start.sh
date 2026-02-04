#!/bin/sh

echo "🚀 Starting SwitchRadar application..."

# Check environment variables
echo "📋 Environment check:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "JWT_SECRET present: $([ -n "$JWT_SECRET" ] && echo "YES" || echo "NO")"

# Start Nginx in background
echo "🌐 Starting Nginx..."
nginx
if [ $? -eq 0 ]; then
    echo "✅ Nginx started successfully"
else
    echo "❌ Nginx failed to start"
    exit 1
fi

# Create data directory if it doesn't exist
mkdir -p /app/data
echo "📁 Data directory ready"

# Start Node.js backend with retry logic
echo "🔧 Starting Node.js backend..."
cd /app

# Function to start the backend with retries
start_backend() {
    local retries=0
    local max_retries=5
    
    while [ $retries -lt $max_retries ]; do
        echo "🔄 Attempt $((retries + 1))/$max_retries to start backend..."
        
        # Set default JWT_SECRET if not provided
        if [ -z "$JWT_SECRET" ]; then
            echo "⚠️ JWT_SECRET not set, using production default"
            export JWT_SECRET="10WLkV5qHvXMgADdHm78e6DlBdH8SC4kmFUBSWaEDIQ"
        fi
        
        node server/index.js &
        backend_pid=$!
        
        # Wait a bit to see if the process starts successfully
        sleep 5
        
        # Check if the process is still running
        if kill -0 $backend_pid 2>/dev/null; then
            echo "✅ Backend started successfully (PID: $backend_pid)"
            wait $backend_pid
            exit_code=$?
            echo "❌ Backend exited with code: $exit_code"
        else
            echo "❌ Backend failed to start"
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $max_retries ]; then
            echo "⏳ Waiting 10 seconds before retry..."
            sleep 10
        fi
    done
    
    echo "💥 Backend failed to start after $max_retries attempts"
    exit 1
}

# Start the backend
start_backend
