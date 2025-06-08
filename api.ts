import { serve } from "bun";
import * as cheerio from "cheerio";
import { readFileSync, writeFileSync } from "fs";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import UserAgent from "user-agents";
import { randomUUID } from "crypto";

// Types
interface ProxyConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface ScrapingResponse {
  data: any;
  error: string | null;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

// Constants
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_PORT = 3001; // Different port from web interface
const PROXY_HOST = "gw-ap.scrapeless.io";
const PROXY_PORT = 8789;
const PROXY_USERNAME_PREFIX = "81365B2DF527-proxy-country_TW-r_10m-s_";
const PROXY_PASSWORD = "5mHwpO5X";

// Helper functions
async function getProxy(): Promise<ProxyConfig> {
  const sessionId = randomUUID().replace(/-/g, "").slice(0, 10);
  const proxyConfig = {
    host: PROXY_HOST,
    port: PROXY_PORT,
    username: `${PROXY_USERNAME_PREFIX}${sessionId}`,
    password: PROXY_PASSWORD,
  };

  try {
    const proxyUrl = `http://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyConfig.port}`;
    const agent = new HttpsProxyAgent(proxyUrl);

    const response = await axios.get("https://api.ipapi.is/", {
      httpsAgent: agent,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        "User-Agent": new UserAgent().toString(),
      },
    });

    console.log("Proxy verification response:", response.data);
    return proxyConfig;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Proxy verification failed:", errorMessage);
    throw new Error(`Failed to verify proxy: ${errorMessage}`);
  }
}

function generateShopeeCookies(sessionId: string, trackingId: string): string {
  const cookies = [
    `SPC_SI=${sessionId}`,
    `SPC_T_ID=${trackingId}`,
    `SPC_T_IV=${randomUUID()}`,
    `SPC_F=${randomUUID()}`,
    `SPC_U=-`,
    `SPC_EC=-`,
    `SPC_CD_ID=${randomUUID()}`,
    `SPC_R_T_ID=${randomUUID()}`,
    `SPC_R_T_IV=${randomUUID()}`,
    `SPC_T_IV=${randomUUID()}`,
    `SPC_SI=${sessionId}`,
    `SPC_T_ID=${trackingId}`,
    `SPC_T_IV=${randomUUID()}`,
    `SPC_F=${randomUUID()}`,
    `SPC_U=-`,
    `SPC_EC=-`,
    `SPC_CD_ID=${randomUUID()}`,
    `SPC_R_T_ID=${randomUUID()}`,
    `SPC_R_T_IV=${randomUUID()}`
  ];
  return cookies.join("; ");
}

function extractInitialStateFromHtml(html: string): ScrapingResponse {
  try {
    const $ = cheerio.load(html);
    const script = $('script[type="text/mfe-initial-data"]');
    
    if (!script.length) {
      return { data: null, error: "Target script tag not found" };
    }

    const content = script.html();
    if (!content) {
      return { data: null, error: "Script content is empty" };
    }

    const jsonData = JSON.parse(content.replace(/;$/, ''));
    
    if (!jsonData?.initialState?.DOMAIN_PDP?.data?.PDP_BFF_DATA) {
      return { data: null, error: "PDP_BFF_DATA not found in the parsed JSON" };
    }

    return { 
      data: jsonData.initialState.DOMAIN_PDP.data.PDP_BFF_DATA,
      error: null 
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Failed to parse JSON:", errorMessage);
    return { data: null, error: `Failed to parse JSON: ${errorMessage}` };
  }
}

async function scrapeShopeeProduct(url: string): Promise<ScrapingResponse> {
  try {
    // Get and verify proxy
    const proxyConfig = await getProxy();
    const proxyUrl = `http://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyConfig.port}`;
    const agent = new HttpsProxyAgent(proxyUrl);

    // Generate session IDs
    const sessionId = randomUUID();
    const trackingId = randomUUID();

    // Fetch the Shopee product page with proxy
    console.log("Making request to Shopee with proxy...");
    const response = await axios.get(url, {
      httpsAgent: agent,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        "User-Agent": new UserAgent().toString(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Language": "en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
        "sec-ch-ua": '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "Cookie": generateShopeeCookies(sessionId, trackingId)
      }
    });

    console.log("Response status:", response.status);
    console.log("Response type:", response.headers["content-type"]);

    // Save the HTML response
    writeFileSync("debug.html", response.data);
    console.log("Saved raw HTML to debug.html");

    // Extract and save the data
    const result = extractInitialStateFromHtml(response.data);
    if (result.data) {
      writeFileSync("results.json", JSON.stringify(result.data, null, 2));
      console.log("Successfully saved results to results.json");
    }

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error:", errorMessage);
    return { data: null, error: `Scraping failed: ${errorMessage}` };
  }
}

// API Documentation HTML
const apiDocsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopee Scraper API Documentation</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #ee4d2d; margin-bottom: 20px; }
        h2 { color: #212121; margin: 30px 0 15px; }
        .endpoint { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .method { display: inline-block; padding: 5px 10px; border-radius: 4px; color: white; font-weight: bold; margin-right: 10px; }
        .get { background: #61affe; }
        .post { background: #49cc90; }
        .url { font-family: monospace; background: #f1f1f1; padding: 2px 5px; border-radius: 3px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 10px 0; }
        code { font-family: monospace; }
        .example { margin-top: 10px; }
        .example-title { font-weight: bold; margin-bottom: 5px; }
    </style>
</head>
<body>
    <h1>Shopee Scraper API Documentation</h1>
    
    <div class="endpoint">
        <h2><span class="method get">GET</span> <span class="url">/api/docs</span></h2>
        <p>Get API documentation (this page)</p>
    </div>

    <div class="endpoint">
        <h2><span class="method post">POST</span> <span class="url">/api/scrape</span></h2>
        <p>Scrape product data from a Shopee URL</p>
        
        <h3>Request Body:</h3>
        <pre><code>{
    "url": "https://shopee.tw/product/178926468/21448123549"
}</code></pre>

        <h3>Response:</h3>
        <pre><code>{
    "success": true,
    "data": {
        // Product data from PDP_BFF_DATA
    },
    "timestamp": "2024-03-14T12:00:00.000Z"
}</code></pre>

        <div class="example">
            <div class="example-title">Example using curl:</div>
            <pre><code>curl -X POST http://localhost:3001/api/scrape \\
    -H "Content-Type: application/json" \\
    -d '{"url": "https://shopee.tw/product/178926468/21448123549"}'</code></pre>
        </div>
    </div>

    <div class="endpoint">
        <h2><span class="method get">GET</span> <span class="url">/api/health</span></h2>
        <p>Check API health status</p>
        
        <h3>Response:</h3>
        <pre><code>{
    "success": true,
    "data": {
        "status": "healthy",
        "timestamp": "2024-03-14T12:00:00.000Z"
    }
}</code></pre>
    </div>
</body>
</html>
`;

// Server setup
const startServer = async (port: number = DEFAULT_PORT) => {
  try {
    serve({
      port,
      async fetch(request) {
        const url = new URL(request.url);
        
        // CORS headers
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        };

        // Handle OPTIONS requests for CORS
        if (request.method === "OPTIONS") {
          return new Response(null, {
            status: 204,
            headers: corsHeaders,
          });
        }

        // API Documentation
        if (request.method === "GET" && url.pathname === "/api/docs") {
          return new Response(apiDocsHtml, {
            headers: { 
              "Content-Type": "text/html",
              ...corsHeaders
            },
          });
        }

        // Health check endpoint
        if (request.method === "GET" && url.pathname === "/api/health") {
          const response: ApiResponse = {
            success: true,
            data: {
              status: "healthy",
              timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
          };
          return new Response(JSON.stringify(response), {
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            },
          });
        }

        // Scraping endpoint
        if (request.method === "POST" && url.pathname === "/api/scrape") {
          try {
            const { url: shopeeUrl } = await request.json();
            
            if (!shopeeUrl) {
              const response: ApiResponse = {
                success: false,
                error: "URL is required",
                timestamp: new Date().toISOString()
              };
              return new Response(JSON.stringify(response), {
                status: 400,
                headers: { 
                  "Content-Type": "application/json",
                  ...corsHeaders
                },
              });
            }

            const { data, error } = await scrapeShopeeProduct(shopeeUrl);
            
            const response: ApiResponse = {
              success: !error,
              data: data,
              error: error || undefined,
              timestamp: new Date().toISOString()
            };

            return new Response(JSON.stringify(response), {
              status: error ? 500 : 200,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
              },
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const response: ApiResponse = {
              success: false,
              error: `Scraping failed: ${errorMessage}`,
              timestamp: new Date().toISOString()
            };
            return new Response(JSON.stringify(response), {
              status: 500,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
              },
            });
          }
        }

        // 404 for unknown endpoints
        const response: ApiResponse = {
          success: false,
          error: "Endpoint not found",
          timestamp: new Date().toISOString()
        };
        return new Response(JSON.stringify(response), {
          status: 404,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          },
        });
      },
    });

    console.log(`API Server running at http://localhost:${port}`);
    console.log(`API Documentation available at http://localhost:${port}/api/docs`);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === "EADDRINUSE") {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      await startServer(port + 1);
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Failed to start server:", errorMessage);
      process.exit(1);
    }
  }
};

// Start the server
startServer(); 