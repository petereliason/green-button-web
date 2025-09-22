#!/bin/bash

# Green Button Web App - Local Development Server
# Simple script to start a local development server

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[TIP]${NC} $1"
}

# Default port
PORT=8080

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Green Button Web App - Local Development Server"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -p, --port PORT    Set port number (default: 8080)"
            echo "  -h, --help         Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                 # Start server on port 8080"
            echo "  $0 -p 3000         # Start server on port 3000"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🚀 Green Button Web App - Local Development Server"
echo "================================================="
echo ""

print_status "Starting local development server on port $PORT..."

# Try different server options in order of preference
if command -v python3 &> /dev/null; then
    print_success "Using Python 3 HTTP server"
    print_warning "Press Ctrl+C to stop the server"
    echo ""
    echo "🌐 Open your browser and navigate to:"
    echo "   http://localhost:$PORT"
    echo ""
    echo "📁 Files being served from: $(pwd)"
    echo "🧪 Test with: http://localhost:$PORT/sample_green_button.xml"
    echo ""
    
    # Start Python server
    python3 -m http.server $PORT
    
elif command -v python &> /dev/null; then
    print_success "Using Python 2 HTTP server"
    print_warning "Press Ctrl+C to stop the server"
    echo ""
    echo "🌐 Open your browser and navigate to:"
    echo "   http://localhost:$PORT"
    echo ""
    
    # Start Python 2 server
    python -m SimpleHTTPServer $PORT
    
elif command -v php &> /dev/null; then
    print_success "Using PHP built-in server"
    print_warning "Press Ctrl+C to stop the server"
    echo ""
    echo "🌐 Open your browser and navigate to:"
    echo "   http://localhost:$PORT"
    echo ""
    
    # Start PHP server
    php -S localhost:$PORT
    
elif command -v node &> /dev/null; then
    print_warning "Node.js found but http-server not installed globally"
    echo "To use Node.js server, install http-server:"
    echo "  npm install -g http-server"
    echo "  http-server -p $PORT"
    echo ""
    echo "Falling back to browser opening..."
    
    # Try to open directly in browser
    if command -v open &> /dev/null; then
        print_status "Opening index.html in default browser (macOS)..."
        open index.html
    elif command -v xdg-open &> /dev/null; then
        print_status "Opening index.html in default browser (Linux)..."
        xdg-open index.html
    elif command -v start &> /dev/null; then
        print_status "Opening index.html in default browser (Windows)..."
        start index.html
    else
        echo "❌ No suitable server found and cannot open browser automatically"
        echo ""
        echo "Please install one of the following:"
        echo "  • Python 3: https://www.python.org/"
        echo "  • Node.js + http-server: npm install -g http-server"
        echo "  • PHP: https://www.php.net/"
        echo ""
        echo "Or open index.html directly in your browser:"
        echo "  file://$(pwd)/index.html"
        echo ""
        echo "⚠️  Note: Opening files directly may have security limitations"
        echo "   A local server is recommended for full functionality"
        exit 1
    fi
    
else
    echo "❌ No suitable local server found!"
    echo ""
    echo "Please install one of the following:"
    echo "  • Python 3: https://www.python.org/"
    echo "  • Node.js: npm install -g http-server"
    echo "  • PHP: https://www.php.net/"
    echo ""
    echo "Then run this script again, or manually start a server:"
    echo "  python3 -m http.server $PORT"
    echo "  http-server -p $PORT"
    echo "  php -S localhost:$PORT"
    exit 1
fi