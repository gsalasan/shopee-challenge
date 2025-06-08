# Shopee Product Scraper

A web-based tool and REST API for scraping product data from Shopee using a proxy service. This application provides both a user-friendly interface and a REST API to extract PDP_BFF_DATA from Shopee product pages.

## Features

- Web-based user interface
- REST API for programmatic access
- Proxy integration for reliable scraping
- Automatic port management
- Real-time scraping status
- JSON data export
- Support for both Windows and Unix systems
- CORS support for API endpoints
- Interactive API documentation

## Prerequisites

- [Bun](https://bun.sh/) runtime (version 1.0.0 or higher)
- Node.js (version 16 or higher) - Required for some dependencies
- Git (optional, for cloning the repository)

## Installation

### Windows

1. Install Bun:
   ```powershell
   # Using PowerShell (Run as Administrator)
   powershell -c "iwr bun.sh/install.ps1 -useb | iex"
   ```

2. Install Node.js:
   - Download and install from [Node.js official website](https://nodejs.org/)
   - Choose the LTS version for better stability

3. Clone or download the repository:
   ```powershell
   git clone https://github.com/yourusername/shopee-challenge.git
   cd shopee-challenge
   ```

4. Install dependencies:
   ```powershell
   bun install
   ```

### Unix (macOS/Linux)

1. Install Bun:
   ```bash
   # Using curl
   curl -fsSL https://bun.sh/install | bash

   # Or using wget
   wget -qO- https://bun.sh/install | bash
   ```

2. Install Node.js:
   ```bash
   # Using nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc  # or source ~/.zshrc
   nvm install --lts
   ```

3. Clone or download the repository:
   ```bash
   git clone https://github.com/yourusername/shopee-challenge.git
   cd shopee-challenge
   ```

4. Install dependencies:
   ```bash
   bun install
   ```

## Usage

### Web Interface

1. Start the web interface server:
   ```bash
   bun run index.ts
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```
   Note: If port 3000 is in use, the server will automatically use the next available port.

3. Enter a Shopee product URL in the input field. Example URLs:
   ```
   https://shopee.tw/a-i.178926468.21448123549
   https://shopee.tw/product/178926468/21448123549
   ```

4. Click "Scrape Product Data" and wait for the results.

5. The scraped data will be displayed in the right panel and saved to:
   - `debug.html`: Raw HTML response
   - `results.json`: Extracted PDP_BFF_DATA

### REST API

1. Start the API server:
   ```bash
   bun run api.ts
   ```

2. The API will be available at:
   ```
   http://localhost:3001
   ```
   Note: If port 3001 is in use, the server will automatically use the next available port.

3. API Documentation:
   - Visit `http://localhost:3001/api/docs` for interactive API documentation
   - The documentation includes example requests and response formats

4. Available Endpoints:

   a. **Scrape Product Data**
   ```bash
   curl -X POST http://localhost:3001/api/scrape \
     -H "Content-Type: application/json" \
     -d '{"url": "https://shopee.tw/product/178926468/21448123549"}'
   ```

   b. **Health Check**
   ```bash
   curl http://localhost:3001/api/health
   ```

   c. **API Documentation**
   ```bash
   curl http://localhost:3001/api/docs
   ```

5. API Response Format:
   ```json
   {
     "success": true,
     "data": {
       // Product data from PDP_BFF_DATA
     },
     "timestamp": "2024-03-14T12:00:00.000Z"
   }
   ```

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Both servers will automatically try the next available port
   - Check the console output for the correct port numbers

2. **Proxy connection issues**
   - Verify your internet connection
   - Check if the proxy service is active
   - Ensure you have the correct proxy credentials

3. **Installation errors**
   - Make sure you have the latest version of Bun
   - Try clearing the Bun cache: `bun cache rm`
   - Reinstall dependencies: `bun install --force`

### Windows-specific

1. **PowerShell execution policy**
   - If you encounter permission issues, run:
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Path issues**
   - Ensure Bun and Node.js are added to your system PATH
   - Restart your terminal after installation

### Unix-specific

1. **Permission issues**
   - If you encounter permission errors, try:
   ```bash
   chmod +x index.ts api.ts
   ```

2. **Shell configuration**
   - Add Bun to your PATH in `~/.bashrc` or `~/.zshrc`:
   ```bash
   export BUN_INSTALL="$HOME/.bun"
   export PATH="$BUN_INSTALL/bin:$PATH"
   ```

## Development

### Project Structure

```
shopee-challenge/
├── index.ts          # Web interface server
├── api.ts            # REST API server
├── debug.html        # Raw HTML response (generated)
├── results.json      # Extracted data (generated)
├── package.json      # Project dependencies
└── README.md         # This file
```

### Dependencies

- `bun`: Runtime and package manager
- `axios`: HTTP client
- `cheerio`: HTML parsing
- `https-proxy-agent`: Proxy support
- `user-agents`: User agent generation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

If you encounter any issues or have questions, please:
1. Check the troubleshooting section
2. Search for existing issues
3. Create a new issue with detailed information about your problem
