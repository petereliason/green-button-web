# Green Button XML to CSV Converter

A client-side web application that converts Green Button XML energy consumption data files into CSV format. This tool processes data locally in your browser, ensuring your energy data remains private and secure.

## Features

- **Client-side processing**: All data processing happens in your browser - no data is sent to any server
- **Green Button format support**: Handles the standard Atom+XML format used by Green Button data
- **Comprehensive parsing**: Extracts Usage Points, Meter Readings, Interval Blocks, and Reading Types
- **CSV export**: Generates clean, structured CSV files with energy consumption data
- **Data preview**: View processed data before downloading
- **Error handling**: Robust error handling with user-friendly messages
- **Responsive design**: Works on desktop and mobile devices

## Green Button Data Format

This application parses the Green Button Alliance standard format which uses:

- **Atom Syndication Format**: XML structure with feed and entry elements
- **ESPI Resources**: Energy Services Provider Interface resources including:
  - UsagePoint: Where resources are measured (smart meters, outlets)
  - MeterReading: Container for measured data
  - IntervalBlock: Primary data carrier with time intervals
  - ReadingType: Metadata about the measurement type
  - LocalTimeParameters: Time zone and DST information

## CSV Output Structure

The generated CSV includes the following columns:

| Column | Description |
|--------|-------------|
| usage_point_id | Unique identifier for the usage point |
| meter_reading_id | Identifier for the meter reading |
| reading_type_id | Identifier for the reading type |
| service_category | Type of service (Electricity, Gas, Water) |
| commodity | Specific commodity being measured |
| uom | Unit of measure (e.g., 'Wh', 'kWh', 'm³') |
| power_multiplier | Power of 10 multiplier for raw values |
| start_time | Start time of the interval (ISO 8601) |
| duration | Duration in seconds |
| end_time | End time of the interval (ISO 8601) |
| value_raw | Original raw energy measurement from meter |
| value_actual | **Actual energy consumption** (raw × 10^multiplier) |
| cost_raw | Original cost in smallest currency unit (cents) |
| cost_dollars | **Cost in dollars** (raw ÷ 100) |
| quality_flags | Data quality indicators |
| interval_length | Standard interval length for this reading type |

### 🔍 Key Field Explanations

- **value_actual**: This is the real energy consumption you want for analysis
  - Example: 21021 Wh = 21.021 kWh of electricity consumed
- **cost_dollars**: This is the actual cost in dollars
  - Example: 2563.47 means $2,563.47 for that energy consumption  
- **Raw vs Actual**: Raw values are as stored in the XML, Actual values are human-readable

## Usage

### Option 1: Simple File Opening (Limited)
1. Open `index.html` directly in a modern web browser
2. Click "Choose Green Button XML File" to select your XML file
3. The application will automatically parse the file and display processing results
4. Review the data summary and preview
5. Click "Export to CSV" to download the converted data

**Note:** Opening the file directly may have limitations due to browser security policies. For full functionality, use a local server (Option 2).

### Option 2: Local Development Server (Recommended)

#### Using Python (Built-in)
```bash
# Navigate to the project directory
cd green-button-web

# Start Python's built-in HTTP server
python3 -m http.server 8080

# Open your browser and navigate to:
# http://localhost:8080
```

#### Using Node.js http-server
```bash
# Install http-server globally (one-time setup)
npm install -g http-server

# Navigate to the project directory
cd green-button-web

# Start the server
http-server -p 8080

# Open your browser and navigate to:
# http://localhost:8080
```

#### Using PHP (if available)
```bash
# Navigate to the project directory
cd green-button-web

# Start PHP's built-in server
php -S localhost:8080

# Open your browser and navigate to:
# http://localhost:8080
```

#### Using Live Server (VS Code Extension)
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Supported Browsers

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Technical Details

### File Structure

```
green-button-web/
├── index.html              # Main web interface
├── styles.css             # Application styles
├── app.js                 # Main application logic
├── greenButtonParser.js   # XML parsing functionality
├── csvExporter.js         # CSV generation and export
└── README.md              # This file
```

### Key Components

1. **XML Parser**: Handles Atom feed parsing and ESPI resource extraction
2. **Data Transformer**: Converts hierarchical XML data to flat CSV structure
3. **CSV Generator**: Creates downloadable CSV files from processed data
4. **User Interface**: Responsive web interface with progress tracking

## Development

To modify or extend this application:

1. Clone or download this repository
2. Open files in your preferred code editor
3. Test changes by opening `index.html` in a browser
4. All processing is client-side JavaScript - no build tools required

## Privacy & Security

- **No server communication**: All processing happens locally in your browser
- **No data storage**: Files are not saved or cached anywhere
- **No tracking**: No analytics or user tracking
- **Open source**: All code is visible and auditable

## License

This project is open source and available under the MIT License.

## Resources

- [Green Button Alliance](http://greenbuttonalliance.org/)
- [Green Button Developer Resources](https://archive.greenbuttondata.org/developers/)
- [ESPI Standard (NAESB REQ.21)](https://www.naesb.org/)
- [Sample Green Button Files](https://archive.greenbuttondata.org/samples)

## Deployment

### Google Cloud Storage (Static Website Hosting) - Recommended

This is the perfect deployment method for this client-side application - **no server costs, pay only for storage and bandwidth!**

#### Why Google Cloud Storage for Static Hosting?
- ✅ **Cost-effective**: No compute charges, only storage (~$0.02/GB/month) and bandwidth
- ✅ **Scalable**: Handles traffic spikes automatically
- ✅ **Fast**: Served from Google's global CDN
- ✅ **Simple**: No server management required
- ✅ **Secure**: HTTPS enabled by default

#### Quick Deployment

```bash
# Make scripts executable (first time only)
chmod +x deploy-gcp.sh update-gcp.sh serve-local.sh

# Initial deployment to Google Cloud Storage
./deploy-gcp.sh

# For future updates (after making changes)
./update-gcp.sh
```

The deployment script will:
1. Create a storage bucket
2. Configure it for website hosting
3. Upload all your files
4. Set proper caching headers
5. Make it publicly accessible
6. Save configuration for easy updates
7. Give you the live URL

#### Making Updates

After your initial deployment, making updates is super easy:

```bash
# Make your changes to HTML, CSS, or JS files
# Then run the update script:
./update-gcp.sh
```

The update script is much faster than the initial deployment since it skips the bucket setup.

#### Custom Domain (Optional)
After deployment, you can easily add a custom domain:
1. Follow the script output instructions
2. Or see: https://cloud.google.com/storage/docs/hosting-static-website#custom-domain

#### Estimated Costs
For a typical small website:
- Storage: ~$0.50/month for 25GB
- Bandwidth: ~$1.00/month for 100GB transfer
- **Total: ~$1.50/month** (much cheaper than App Engine!)

### Alternative Deployment Options

#### GitHub Pages (Free)
1. Push your code to a GitHub repository
2. Go to Settings > Pages
3. Select source as "Deploy from a branch"
4. Choose your main branch
5. Your site will be available at `https://yourusername.github.io/green-button-web`

#### Netlify (Free Tier Available)
1. Drag and drop the project folder to [Netlify Drop](https://app.netlify.com/drop)
2. Or connect your GitHub repository for automatic deployments

#### Vercel (Free Tier Available)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts

**Note:** All of these alternatives work great since this is a static web application with no server-side dependencies.

## Local Development

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for local server) OR Node.js (for http-server)
- Git (for version control)

### Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/petereliason/green-button-web.git
   cd green-button-web
   ```

2. Start a local server (see Usage section above)

3. Test with the included sample file:
   - Use `sample_green_button.xml` to test the application
   - This file contains realistic Green Button data for testing

### File Structure Explained
```
green-button-web/
├── index.html              # Main web interface
├── styles.css              # Application styles  
├── app.js                  # Main application logic & UI handling
├── greenButtonParser.js    # XML parsing functionality
├── csvExporter.js          # CSV generation and export
├── sample_green_button.xml # Sample Green Button file for testing
├── serve-local.sh          # Local development server script  
├── deploy-gcp.sh           # Google Cloud Storage deployment script ⭐
├── update-gcp.sh           # Quick update script for deployed site ⭐
└── README.md              # This file
```

**⭐ Recommended workflow:**
1. **Development**: `./serve-local.sh` → make changes → test locally
2. **Initial Deploy**: `./deploy-gcp.sh` → creates your live site  
3. **Updates**: `./update-gcp.sh` → pushes changes to live site

### Quick Start for Local Development

```bash
# Option 1: Use the convenience script
chmod +x serve-local.sh
./serve-local.sh

# Option 2: Manual server startup
python3 -m http.server 8080
# Then open http://localhost:8080
```

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test locally
4. Commit your changes: `git commit -am 'Add some feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request