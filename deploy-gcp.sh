#!/bin/bash

# Green Button Web App - Google Cloud Storage Deployment Script
# This script deploys the static web application to Google Cloud Storage
# and configures it for website hosting.

set -e  # Exit on any error

# Configuration
PROJECT_ID=""
BUCKET_NAME=""
REGION="us-central1"
CONFIG_FILE=".gcp-deploy-config"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required commands exist
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI not found. Please install Google Cloud SDK."
        print_status "Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Function to get or set project configuration
setup_project_config() {
    print_status "Setting up project configuration..."
    
    # Get current project if not set
    if [[ -z "$PROJECT_ID" ]]; then
        CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
        if [[ -n "$CURRENT_PROJECT" ]]; then
            print_status "Using current project: $CURRENT_PROJECT"
            PROJECT_ID="$CURRENT_PROJECT"
        else
            print_error "No Google Cloud project configured."
            print_status "Please run: gcloud config set project YOUR_PROJECT_ID"
            print_status "Or edit this script to set PROJECT_ID variable"
            exit 1
        fi
    fi
    
    # Set bucket name if not configured
    if [[ -z "$BUCKET_NAME" ]]; then
        BUCKET_NAME="${PROJECT_ID}-green-button-web"
        print_status "Using bucket name: $BUCKET_NAME"
    fi
    
    print_success "Project configuration complete"
    echo "  Project ID: $PROJECT_ID"
    echo "  Bucket Name: $BUCKET_NAME"
    echo "  Region: $REGION"
}

# Function to authenticate with Google Cloud
authenticate() {
    print_status "Checking authentication..."
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_status "Not authenticated. Starting authentication flow..."
        gcloud auth login
    fi
    
    print_success "Authentication verified"
}

# Function to enable required APIs
enable_apis() {
    print_status "Enabling required APIs..."
    
    gcloud services enable storage-api.googleapis.com --project="$PROJECT_ID"
    gcloud services enable storage-component.googleapis.com --project="$PROJECT_ID"
    
    print_success "APIs enabled"
}

# Function to create and configure the storage bucket
setup_bucket() {
    print_status "Setting up storage bucket..."
    
    # Create bucket if it doesn't exist
    if ! gsutil ls -b gs://"$BUCKET_NAME" &> /dev/null; then
        print_status "Creating bucket: $BUCKET_NAME"
        gsutil mb -p "$PROJECT_ID" -c STANDARD -l "$REGION" gs://"$BUCKET_NAME"
        print_success "Bucket created"
    else
        print_status "Bucket already exists: $BUCKET_NAME"
    fi
    
    # Configure bucket for website hosting
    print_status "Configuring bucket for website hosting..."
    gsutil web set -m index.html -e 404.html gs://"$BUCKET_NAME"
    
    # Make bucket publicly readable
    print_status "Making bucket publicly accessible..."
    gsutil iam ch allUsers:objectViewer gs://"$BUCKET_NAME"
    
    print_success "Bucket configuration complete"
}

# Function to deploy the application files
deploy_files() {
    print_status "Deploying application files..."
    
    # Count files for deployment summary
    local html_files=$(ls *.html 2>/dev/null | wc -l)
    local css_files=$(ls *.css 2>/dev/null | wc -l)
    local js_files=$(ls *.js 2>/dev/null | wc -l)
    local xml_files=$(ls *.xml 2>/dev/null | wc -l)
    
    # Set cache control headers for different file types
    print_status "Uploading HTML files ($html_files files)..."
    gsutil -m cp -r *.html gs://"$BUCKET_NAME"/ \
        -h "Cache-Control:no-cache, max-age=0" \
        -h "Content-Type:text/html"
    
    print_status "Uploading CSS files ($css_files files)..."
    gsutil -m cp -r *.css gs://"$BUCKET_NAME"/ \
        -h "Cache-Control:public, max-age=86400" \
        -h "Content-Type:text/css"
    
    print_status "Uploading JavaScript files ($js_files files)..."
    gsutil -m cp -r *.js gs://"$BUCKET_NAME"/ \
        -h "Cache-Control:public, max-age=86400" \
        -h "Content-Type:application/javascript"
    
    if [[ $xml_files -gt 0 ]]; then
        print_status "Uploading sample XML files ($xml_files files)..."
        gsutil -m cp *.xml gs://"$BUCKET_NAME"/ \
            -h "Cache-Control:public, max-age=86400" \
            -h "Content-Type:application/xml"
    fi
    
    # Upload README if it exists
    if [[ -f "README.md" ]]; then
        print_status "Uploading README.md..."
        gsutil cp README.md gs://"$BUCKET_NAME"/ \
            -h "Cache-Control:public, max-age=3600" \
            -h "Content-Type:text/markdown"
    fi
    
    print_success "Files deployed successfully"
    
    # Show deployment summary
    local total_files=$((html_files + css_files + js_files + xml_files))
    echo "  📊 Deployment Summary:"
    echo "     HTML files: $html_files"
    echo "     CSS files: $css_files" 
    echo "     JavaScript files: $js_files"
    echo "     XML files: $xml_files"
    echo "     Total files: $total_files"
}

# Function to create a simple 404 page
create_404_page() {
    print_status "Creating 404 error page..."
    
    cat > 404.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found | Green Button Converter</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
               text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; 
                     padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2e7d32; margin-bottom: 20px; }
        a { color: #2e7d32; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <p><a href="/">Return to Green Button Converter</a></p>
    </div>
</body>
</html>
EOF
    
    gsutil cp 404.html gs://"$BUCKET_NAME"/
    rm 404.html
    
    print_success "404 page created"
}

# Function to get the website URL and provide next steps
get_website_url() {
    WEBSITE_URL="https://storage.googleapis.com/$BUCKET_NAME/index.html"
    
    print_success "Deployment complete!"
    echo ""
    echo "🌐 Your Green Button Converter is now live at:"
    echo "   $WEBSITE_URL"
    echo ""
    echo "📝 Additional URLs:"
    echo "   Sample XML file: https://storage.googleapis.com/$BUCKET_NAME/sample_green_button.xml"
    echo "   Bucket management: https://console.cloud.google.com/storage/browser/$BUCKET_NAME"
    echo ""
    echo "� For a custom domain (optional):"
    echo "   1. Verify domain ownership: https://search.google.com/search-console"
    echo "   2. Create DNS CNAME record: www.yourdomain.com -> c.storage.googleapis.com"
    echo "   3. Create bucket with domain name: gsutil mb gs://www.yourdomain.com"
    echo "   4. Copy files to new bucket: gsutil -m cp -r gs://$BUCKET_NAME/* gs://www.yourdomain.com/"
    echo ""
    echo "💰 Estimated monthly costs:"
    echo "   Storage (5GB): ~$0.10"
    echo "   Bandwidth (50GB): ~$0.50"
    echo "   Total: ~$0.60/month"
    echo ""
    echo "🔧 Useful commands:"
    echo "   Update site: gsutil -m cp -r *.html *.css *.js gs://$BUCKET_NAME/"
    echo "   Check usage: gsutil du -sh gs://$BUCKET_NAME"
    echo "   View logs: gsutil logging get gs://$BUCKET_NAME"
    echo "   Delete site: gsutil -m rm -r gs://$BUCKET_NAME"
    echo ""
    
    # Ask if user wants to open the site
    read -p "🚀 Open the live site in your browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v open &> /dev/null; then
            open "$WEBSITE_URL"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "$WEBSITE_URL"
        elif command -v start &> /dev/null; then
            start "$WEBSITE_URL"
        else
            print_status "Please open this URL in your browser: $WEBSITE_URL"
        fi
    fi
}

# Function to cleanup on script exit
cleanup() {
    if [[ -f "404.html" ]]; then
        rm -f 404.html
    fi
}

# Set cleanup trap
trap cleanup EXIT

# Main execution
main() {
    echo "🚀 Green Button Web App - Google Cloud Storage Deployment"
    echo "=========================================================="
    echo ""
    
    check_dependencies
    setup_project_config
    authenticate
    enable_apis
    setup_bucket
    create_404_page
    deploy_files
    get_website_url
    
    # Save configuration for future updates
    print_status "Saving deployment configuration..."
    cat > "$CONFIG_FILE" << EOF
PROJECT_ID="$PROJECT_ID"
BUCKET_NAME="$BUCKET_NAME"
REGION="$REGION"
EOF
    
    print_success "🎉 Deployment completed successfully!"
    print_warning "Configuration saved to $CONFIG_FILE for easy updates"
    echo "Run ./update-gcp.sh for quick updates in the future"
}

# Help function
show_help() {
    echo "Green Button Web App - Google Cloud Storage Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -p, --project PROJECT   Set Google Cloud project ID"
    echo "  -b, --bucket BUCKET     Set storage bucket name"
    echo "  -r, --region REGION     Set bucket region (default: us-central1)"
    echo ""
    echo "Environment Variables:"
    echo "  PROJECT_ID              Google Cloud project ID"
    echo "  BUCKET_NAME            Storage bucket name"
    echo "  REGION                 Bucket region"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Use current project"
    echo "  $0 -p my-project                     # Specify project"
    echo "  $0 -p my-project -b my-bucket        # Specify project and bucket"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -p|--project)
            PROJECT_ID="$2"
            shift 2
            ;;
        -b|--bucket)
            BUCKET_NAME="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main