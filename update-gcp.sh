#!/bin/bash

# Green Button Web App - Quick Update Script for Google Cloud Storage
# This script quickly updates the deployed static website with local changes

set -e  # Exit on any error

# Configuration (will be read from deployment config if exists)
CONFIG_FILE=".gcp-deploy-config"
PROJECT_ID=""
BUCKET_NAME=""

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
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to load configuration from previous deployment
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
        print_status "Loaded configuration from previous deployment"
        echo "  Project ID: $PROJECT_ID"
        echo "  Bucket Name: $BUCKET_NAME"
    else
        print_warning "No previous deployment config found"
        
        # Try to get current project
        CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
        if [[ -n "$CURRENT_PROJECT" ]]; then
            PROJECT_ID="$CURRENT_PROJECT"
            BUCKET_NAME="${PROJECT_ID}-green-button-web"
            print_status "Using current project: $PROJECT_ID"
            print_status "Assuming bucket name: $BUCKET_NAME"
        else
            print_warning "Please run the initial deployment script first: ./deploy-gcp.sh"
            exit 1
        fi
    fi
}

# Function to check if bucket exists
check_bucket() {
    print_status "Checking if bucket exists..."
    
    if ! gsutil ls -b gs://"$BUCKET_NAME" &> /dev/null; then
        print_warning "Bucket gs://$BUCKET_NAME not found"
        print_status "Please run the initial deployment script: ./deploy-gcp.sh"
        exit 1
    fi
    
    print_success "Bucket found: gs://$BUCKET_NAME"
}

# Function to update files
update_files() {
    print_status "Updating website files..."
    
    # Count files
    local html_files=$(ls *.html 2>/dev/null | wc -l)
    local css_files=$(ls *.css 2>/dev/null | wc -l)
    local js_files=$(ls *.js 2>/dev/null | wc -l)
    local xml_files=$(ls *.xml 2>/dev/null | wc -l)
    
    # Update HTML files (no cache)
    if [[ $html_files -gt 0 ]]; then
        print_status "Updating HTML files ($html_files files)..."
        gsutil -m cp -r *.html gs://"$BUCKET_NAME"/ \
            -h "Cache-Control:no-cache, max-age=0" \
            -h "Content-Type:text/html"
    fi
    
    # Update CSS files
    if [[ $css_files -gt 0 ]]; then
        print_status "Updating CSS files ($css_files files)..."
        gsutil -m cp -r *.css gs://"$BUCKET_NAME"/ \
            -h "Cache-Control:public, max-age=86400" \
            -h "Content-Type:text/css"
    fi
    
    # Update JavaScript files
    if [[ $js_files -gt 0 ]]; then
        print_status "Updating JavaScript files ($js_files files)..."
        gsutil -m cp -r *.js gs://"$BUCKET_NAME"/ \
            -h "Cache-Control:public, max-age=86400" \
            -h "Content-Type:application/javascript"
    fi
    
    # Update XML files if any
    if [[ $xml_files -gt 0 ]]; then
        print_status "Updating XML files ($xml_files files)..."
        gsutil -m cp *.xml gs://"$BUCKET_NAME"/ \
            -h "Cache-Control:public, max-age=86400" \
            -h "Content-Type:application/xml"
    fi
    
    print_success "Update complete!"
    
    # Show update summary
    local total_files=$((html_files + css_files + js_files + xml_files))
    echo "  📊 Update Summary:"
    echo "     HTML files: $html_files"
    echo "     CSS files: $css_files"
    echo "     JavaScript files: $js_files"
    echo "     XML files: $xml_files"
    echo "     Total files updated: $total_files"
}

# Function to show final information
show_info() {
    WEBSITE_URL="https://storage.googleapis.com/$BUCKET_NAME/index.html"
    
    echo ""
    echo "🌐 Your updated site is live at:"
    echo "   $WEBSITE_URL"
    echo ""
    print_warning "Note: Changes may take a few minutes to propagate globally"
    echo ""
    echo "🔧 Other useful commands:"
    echo "   View bucket contents: gsutil ls gs://$BUCKET_NAME/"
    echo "   Check file details: gsutil ls -L gs://$BUCKET_NAME/"
    echo "   Force cache refresh: Ctrl+F5 or Cmd+Shift+R in browser"
    echo ""
}

# Help function
show_help() {
    echo "Green Button Web App - Quick Update Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script quickly updates your deployed website with local changes."
    echo "It assumes you've already deployed using ./deploy-gcp.sh"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  --force-config          Ignore saved config and prompt for new settings"
    echo ""
    echo "Examples:"
    echo "  $0                      # Quick update using saved config"
    echo "  $0 --force-config       # Update with new configuration"
    echo ""
}

# Parse command line arguments
FORCE_CONFIG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --force-config)
            FORCE_CONFIG=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "⚡ Green Button Web App - Quick Update"
    echo "===================================="
    echo ""
    
    if [[ "$FORCE_CONFIG" == "true" ]]; then
        rm -f "$CONFIG_FILE"
    fi
    
    load_config
    check_bucket
    update_files
    show_info
    
    print_success "🎉 Update completed successfully!"
}

# Run main function
main