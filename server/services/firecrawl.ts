/**
 * Firecrawl API Service
 * 
 * Scrapes competitor websites and converts them to clean Markdown.
 * Used for zombie page discovery and launch strategy competitor analysis.
 * 
 * API Documentation: https://docs.firecrawl.dev/
 */

interface FirecrawlConfig {
  apiKey: string;
  baseUrl: string;
}

interface ScrapeResult {
  url: string;
  markdown: string;
  html: string | null;
  metadata: {
    title: string | null;
    description: string | null;
    keywords: string[] | null;
    ogImage: string | null;
    statusCode: number;
  };
  links: string[];
  success: boolean;
  error?: string;
}

interface CrawlResult {
  urls: string[];
  pages: ScrapeResult[];
  totalPages: number;
}

/**
 * Get Firecrawl configuration from environment
 */
function getConfig(): FirecrawlConfig {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error("Firecrawl API key not configured. Please set FIRECRAWL_API_KEY.");
  }

  return {
    apiKey,
    baseUrl: "https://api.firecrawl.dev/v1",
  };
}

/**
 * Make authenticated request to Firecrawl API
 */
async function makeRequest(
  endpoint: string,
  method: "GET" | "POST" = "POST",
  body?: any
): Promise<any> {
  const { apiKey, baseUrl } = getConfig();

  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };

  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firecrawl API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Scrape a single URL and convert to Markdown
 * 
 * @param url - URL to scrape
 * @param options - Scraping options
 * @returns Scraped content in Markdown format
 */
export async function scrapeUrl(
  url: string,
  options: {
    includeHtml?: boolean;
    onlyMainContent?: boolean;
    timeout?: number;
  } = {}
): Promise<ScrapeResult> {
  try {
    const payload = {
      url,
      formats: ["markdown", "html"],
      onlyMainContent: options.onlyMainContent !== false, // Default true
      timeout: options.timeout || 30000, // 30 seconds default
    };

    const response = await makeRequest("/scrape", "POST", payload);

    if (!response.success) {
      throw new Error(response.error || "Scraping failed");
    }

    const data = response.data;

    return {
      url,
      markdown: data.markdown || "",
      html: options.includeHtml ? data.html : null,
      metadata: {
        title: data.metadata?.title || null,
        description: data.metadata?.description || null,
        keywords: data.metadata?.keywords || null,
        ogImage: data.metadata?.ogImage || null,
        statusCode: data.metadata?.statusCode || 200,
      },
      links: data.links || [],
      success: true,
    };
  } catch (error: any) {
    console.error("[Firecrawl] scrapeUrl error:", error);
    return {
      url,
      markdown: "",
      html: null,
      metadata: {
        title: null,
        description: null,
        keywords: null,
        ogImage: null,
        statusCode: 0,
      },
      links: [],
      success: false,
      error: error.message,
    };
  }
}

/**
 * Scrape a competitor website for content analysis
 * Extracts main content and converts to clean Markdown
 * 
 * @param url - Competitor URL to analyze
 * @returns Clean Markdown content for AI analysis
 */
export async function scrapeCompetitor(url: string): Promise<{
  content: string;
  title: string | null;
  wordCount: number;
  headings: string[];
  links: string[];
}> {
  try {
    const result = await scrapeUrl(url, {
      includeHtml: false,
      onlyMainContent: true,
      timeout: 30000,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to scrape competitor");
    }

    // Extract headings from markdown
    const headings = extractHeadings(result.markdown);

    // Count words
    const wordCount = result.markdown.split(/\s+/).filter(Boolean).length;

    return {
      content: result.markdown,
      title: result.metadata.title,
      wordCount,
      headings,
      links: result.links,
    };
  } catch (error) {
    console.error("[Firecrawl] scrapeCompetitor error:", error);
    throw error;
  }
}

/**
 * Crawl multiple pages from a website
 * 
 * @param url - Base URL to crawl
 * @param options - Crawl options
 * @returns Array of scraped pages
 */
export async function crawlWebsite(
  url: string,
  options: {
    maxPages?: number;
    includeSubdomains?: boolean;
    excludePaths?: string[];
  } = {}
): Promise<CrawlResult> {
  try {
    const payload = {
      url,
      limit: options.maxPages || 10,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },
      excludePaths: options.excludePaths || [],
    };

    // Start crawl job
    const startResponse = await makeRequest("/crawl", "POST", payload);

    if (!startResponse.success) {
      throw new Error("Failed to start crawl job");
    }

    const jobId = startResponse.id;

    // Poll for completion (max 2 minutes)
    const maxAttempts = 24; // 24 * 5s = 2 minutes
    let attempts = 0;
    let crawlData: any = null;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await makeRequest(`/crawl/${jobId}`, "GET");

      if (statusResponse.status === "completed") {
        crawlData = statusResponse;
        break;
      }

      if (statusResponse.status === "failed") {
        throw new Error("Crawl job failed");
      }

      attempts++;
    }

    if (!crawlData) {
      throw new Error("Crawl job timed out");
    }

    const pages: ScrapeResult[] = crawlData.data.map((page: any) => ({
      url: page.url,
      markdown: page.markdown || "",
      html: null,
      metadata: {
        title: page.metadata?.title || null,
        description: page.metadata?.description || null,
        keywords: null,
        ogImage: null,
        statusCode: 200,
      },
      links: page.links || [],
      success: true,
    }));

    return {
      urls: pages.map((p) => p.url),
      pages,
      totalPages: pages.length,
    };
  } catch (error) {
    console.error("[Firecrawl] crawlWebsite error:", error);
    throw error;
  }
}

/**
 * Extract headings from Markdown content
 */
function extractHeadings(markdown: string): string[] {
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  const headings: string[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push(match[1].trim());
  }

  return headings;
}

/**
 * Analyze competitor content structure
 * Useful for identifying content gaps and opportunities
 * 
 * @param url - Competitor URL
 * @returns Content analysis with topics and structure
 */
export async function analyzeCompetitorContent(url: string): Promise<{
  url: string;
  title: string | null;
  wordCount: number;
  headingCount: number;
  headings: string[];
  topics: string[];
  linkCount: number;
  hasImages: boolean;
  contentQuality: "low" | "medium" | "high";
}> {
  try {
    const competitor = await scrapeCompetitor(url);

    // Extract topics from headings (simple keyword extraction)
    const topics = competitor.headings
      .flatMap((h) => h.toLowerCase().split(/\s+/))
      .filter((word) => word.length > 4) // Filter short words
      .filter((word, index, self) => self.indexOf(word) === index); // Unique

    // Determine content quality based on word count and structure
    let contentQuality: "low" | "medium" | "high" = "low";
    if (competitor.wordCount > 2000 && competitor.headings.length > 5) {
      contentQuality = "high";
    } else if (competitor.wordCount > 800 && competitor.headings.length > 2) {
      contentQuality = "medium";
    }

    return {
      url,
      title: competitor.title,
      wordCount: competitor.wordCount,
      headingCount: competitor.headings.length,
      headings: competitor.headings,
      topics: topics.slice(0, 20), // Top 20 topics
      linkCount: competitor.links.length,
      hasImages: competitor.content.includes("!["),
      contentQuality,
    };
  } catch (error) {
    console.error("[Firecrawl] analyzeCompetitorContent error:", error);
    throw error;
  }
}

/**
 * Batch scrape multiple URLs with rate limiting
 * 
 * @param urls - Array of URLs to scrape
 * @param delayMs - Delay between requests in milliseconds
 * @returns Array of scrape results
 */
export async function batchScrapeUrls(
  urls: string[],
  delayMs: number = 2000
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  for (const url of urls) {
    const result = await scrapeUrl(url);
    results.push(result);

    // Rate limiting delay
    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
