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

// Constants
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_PORT = 3000;
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

// HTML template for the UI
const htmlTemplate = (result: string = "", error: string = "") => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopee Scraper</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; height: 100vh; background: #f8f9fa; }
        .panel { padding: 25px; height: 100%; overflow-y: auto; }
        .left-panel { width: 35%; background: #ffffff; border-right: 1px solid #e0e0e0; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .right-panel { width: 65%; background: #fafafa; }
        h1 { color: #ee4d2d; margin-bottom: 10px; font-size: 1.8rem; }
        h2 { color: #212121; margin: 20px 0 15px; font-size: 1.4rem; }
        .description { color: #757575; margin-bottom: 25px; line-height: 1.5; }
        form { display: flex; flex-direction: column; gap: 15px; }
        .input-group { display: flex; flex-direction: column; }
        label { margin-bottom: 8px; font-weight: 500; color: #424242; }
        input { padding: 12px 15px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; transition: border 0.3s; }
        input:focus { outline: none; border-color: #ee4d2d; box-shadow: 0 0 0 2px rgba(238, 77, 45, 0.1); }
        button { padding: 12px 20px; background: #ee4d2d; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background 0.3s; }
        button:hover { background: #d04226; }
        button:active { transform: translateY(1px); }
        #result { white-space: pre-wrap; background: #ffffff; padding: 20px; border-radius: 8px; min-height: 75vh; max-height: 80vh; overflow: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-family: monospace; font-size: 14px; line-height: 1.5; }
        .error { color: #d32f2f; margin-top: 15px; padding: 10px; background: #ffebee; border-radius: 6px; }
        .success { color: #388e3c; margin-top: 15px; padding: 10px; background: #e8f5e9; border-radius: 6px; }
        .loading { display: none; margin-top: 15px; }
        .loading.active { display: block; }
        .example { margin-top: 20px; background: #f5f5f5; padding: 15px; border-radius: 8px; font-size: 0.9rem; }
        .example-title { font-weight: 600; margin-bottom: 8px; }
        .example-url { color: #1976d2; word-break: break-all; }
    </style>
</head>
<body>
    <div class="left-panel">
        <h1>Shopee Scraper</h1>
        <p class="description">Enter a Shopee product URL to extract PDP_BFF_DATA - the structured product information from Shopee's backend.</p>
        
        <form id="scrapeForm">
            <div class="input-group">
                <label for="url">Shopee Product URL:</label>
                <input type="url" id="url" name="url" placeholder="https://shopee.tw/product/..." required>
            </div>
            <button type="submit">Scrape Product Data</button>
            
            <div class="loading" id="loading">Scraping... Please wait</div>
            <div class="error" id="error">${error}</div>
            <div class="success" id="success"></div>
            
            <div class="example">
                <div class="example-title">Example URLs:</div>
                <div class="example-url">https://shopee.tw/滿意寶寶-日本白金-極上呵護黏貼L-52片全新現貨-i.178926468.21448123549</div>
                <div class="example-url">https://shopee.tw/product/178926468/21448123549</div>
            </div>
        </form>
    </div>
    <div class="right-panel">
        <h2>Extracted PDP_BFF_DATA</h2>
        <pre id="result">${result}</pre>
    </div>

    <script>
        document.getElementById('scrapeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = document.getElementById('url').value;
            const resultEl = document.getElementById('result');
            const errorEl = document.getElementById('error');
            const successEl = document.getElementById('success');
            const loadingEl = document.getElementById('loading');
            
            // Reset UI
            errorEl.textContent = '';
            successEl.textContent = '';
            resultEl.textContent = '';
            loadingEl.classList.add('active');
            
            try {
                const response = await fetch('/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Server error');
                }
                
                const data = await response.json();
                resultEl.textContent = JSON.stringify(data, null, 2);
                successEl.textContent = 'Data successfully scraped!';
            } catch (error) {
                errorEl.textContent = 'Error: ' + error.message;
            } finally {
                loadingEl.classList.remove('active');
            }
        });
    </script>
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
        
        // Serve HTML interface
        if (request.method === "GET" && url.pathname === "/") {
          return new Response(htmlTemplate(), {
            headers: { "Content-Type": "text/html" },
          });
        }
        
        // Handle scraping requests
        if (request.method === "POST" && url.pathname === "/scrape") {
          try {
            const { url: shopeeUrl } = await request.json();
            
            if (!shopeeUrl) {
              return new Response(
                JSON.stringify({ error: "URL is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            const { data, error } = await scrapeShopeeProduct(shopeeUrl);
            
            if (error) {
              return new Response(
                JSON.stringify({ error }),
                { status: 500, headers: { "Content-Type": "application/json" } }
              );
            }

            return new Response(JSON.stringify(data), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return new Response(
              JSON.stringify({ error: `Scraping failed: ${errorMessage}` }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }
        }

        return new Response("Not Found", { status: 404 });
      },
    });

    console.log(`Server running at http://localhost:${port}`);
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