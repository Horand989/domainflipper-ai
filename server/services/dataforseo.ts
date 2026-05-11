/**
 * DataForSEO API Service
 * 
 * Provides keyword metrics, backlink data, and SERP analysis.
 * All functions are PRO-tier gated to protect API costs.
 * 
 * API Documentation: https://docs.dataforseo.com/v3/
 */

interface DataForSEOCredentials {
  login: string;
  password: string;
}

interface KeywordMetrics {
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null; // 0-100
  cpc: number | null; // Cost per click in USD
  competition: number | null; // 0-1
  trend: number[] | null; // Monthly search volume trend
}

interface DomainMetrics {
  domain: string;
  domainAuthority: number | null;
  pageAuthority: number | null;
  trustFlow: number | null;
  citationFlow: number | null;
  backlinks: number | null;
  referringDomains: number | null;
  organicTraffic: number | null;
  organicKeywords: number | null;
}

interface RankData {
  keyword: string;
  url: string;
  position: number | null; // null if not in top 100
  searchVolume: number | null;
}

/**
 * Get DataForSEO credentials from environment
 */
function getCredentials(): DataForSEOCredentials {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error("DataForSEO credentials not configured. Please set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.");
  }

  return { login, password };
}

/**
 * Make authenticated request to DataForSEO API
 */
async function makeRequest(
  endpoint: string,
  payload: any
): Promise<any> {
  const { login, password } = getCredentials();
  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  const response = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DataForSEO API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Check for API-level errors
  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO API error: ${data.status_message || "Unknown error"}`);
  }

  return data;
}

/**
 * Get keyword metrics using DataForSEO Labs API
 * 
 * @param keywords - Array of keywords to analyze
 * @param location - Location code (default: 2840 for USA)
 * @param language - Language code (default: "en")
 * @returns Array of keyword metrics
 */
export async function getKeywordData(
  keywords: string[],
  location: number = 2840,
  language: string = "en"
): Promise<KeywordMetrics[]> {
  try {
    const payload = [
      {
        keywords,
        location_code: location,
        language_code: language,
        include_serp_info: false,
        include_clickstream_data: true,
      },
    ];

    const response = await makeRequest("keywords_data/google/search_volume/live", payload);

    if (!response.tasks || response.tasks.length === 0) {
      return [];
    }

    const task = response.tasks[0];
    if (!task.result || task.result.length === 0) {
      return [];
    }

    return task.result.map((item: any) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume || null,
      difficulty: item.keyword_difficulty || null,
      cpc: item.cpc || null,
      competition: item.competition || null,
      trend: item.monthly_searches?.map((m: any) => m.search_volume) || null,
    }));
  } catch (error) {
    console.error("[DataForSEO] getKeywordData error:", error);
    throw error;
  }
}

/**
 * Get domain backlink metrics using DataForSEO Backlinks API
 * 
 * @param domain - Domain to analyze (without http/https)
 * @returns Domain metrics including backlinks and authority scores
 */
export async function getDomainMetrics(domain: string): Promise<DomainMetrics> {
  try {
    // Remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

    const payload = [
      {
        target: cleanDomain,
        internal_list_limit: 1,
        backlinks_status_type: "all",
      },
    ];

    const response = await makeRequest("backlinks/domain_pages/live", payload);

    if (!response.tasks || response.tasks.length === 0) {
      throw new Error("No data returned from DataForSEO");
    }

    const task = response.tasks[0];
    
    // For domain pages endpoint, result might be empty for new domains
    // Return zeros instead of throwing error
    if (!task.result || task.result.length === 0) {
      return {
        domain: cleanDomain,
        domainAuthority: 0,
        pageAuthority: null,
        trustFlow: null,
        citationFlow: null,
        backlinks: 0,
        referringDomains: 0,
        organicTraffic: null,
        organicKeywords: null,
      };
    }

    const result = task.result[0];

    return {
      domain: cleanDomain,
      domainAuthority: result.rank || 0,
      pageAuthority: null, // Not available in backlinks API
      trustFlow: null, // Not available in DataForSEO (Majestic metric)
      citationFlow: null, // Not available in DataForSEO (Majestic metric)
      backlinks: result.backlinks || 0,
      referringDomains: result.referring_domains || 0,
      organicTraffic: null, // Would need separate API call
      organicKeywords: null, // Would need separate API call
    };
  } catch (error) {
    console.error("[DataForSEO] getDomainMetrics error:", error);
    throw error;
  }
}

/**
 * Get keyword rankings for a specific domain
 * 
 * @param domain - Domain to check rankings for
 * @param keywords - Keywords to check
 * @param location - Location code (default: 2840 for USA)
 * @param language - Language code (default: "en")
 * @returns Array of rank data
 */
export async function getKeywordRankings(
  domain: string,
  keywords: string[],
  location: number = 2840,
  language: string = "en"
): Promise<RankData[]> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const results: RankData[] = [];

    // DataForSEO requires one keyword per request for SERP API
    for (const keyword of keywords) {
      const payload = [
        {
          keyword,
          location_code: location,
          language_code: language,
          device: "desktop",
          os: "windows",
          depth: 100, // Check top 100 results
        },
      ];

      const response = await makeRequest("serp/google/organic/live/advanced", payload);

      if (!response.tasks || response.tasks.length === 0) {
        results.push({
          keyword,
          url: "",
          position: null,
          searchVolume: null,
        });
        continue;
      }

      const task = response.tasks[0];
      if (!task.result || task.result.length === 0) {
        results.push({
          keyword,
          url: "",
          position: null,
          searchVolume: null,
        });
        continue;
      }

      const items = task.result[0].items || [];
      const found = items.find((item: any) => 
        item.domain && item.domain.includes(cleanDomain)
      );

      results.push({
        keyword,
        url: found?.url || "",
        position: found?.rank_absolute || null,
        searchVolume: task.result[0].keyword_data?.keyword_info?.search_volume || null,
      });
    }

    return results;
  } catch (error) {
    console.error("[DataForSEO] getKeywordRankings error:", error);
    throw error;
  }
}

/**
 * Check if a URL is indexed in Google
 * 
 * @param url - Full URL to check
 * @returns Boolean indicating if indexed
 */
export async function checkIndexStatus(url: string): Promise<boolean> {
  try {
    const payload = [
      {
        keyword: `site:${url}`,
        location_code: 2840,
        language_code: "en",
        device: "desktop",
        os: "windows",
      },
    ];

    const response = await makeRequest("serp/google/organic/live/advanced", payload);

    if (!response.tasks || response.tasks.length === 0) {
      return false;
    }

    const task = response.tasks[0];
    if (!task.result || task.result.length === 0) {
      return false;
    }

    const items = task.result[0].items || [];
    return items.length > 0;
  } catch (error) {
    console.error("[DataForSEO] checkIndexStatus error:", error);
    return false;
  }
}

/**
 * Batch process multiple keywords with rate limiting
 * 
 * @param keywords - Array of keywords
 * @param batchSize - Number of keywords per batch
 * @param delayMs - Delay between batches in milliseconds
 * @returns Array of keyword metrics
 */
export async function batchGetKeywordData(
  keywords: string[],
  batchSize: number = 100,
  delayMs: number = 1000
): Promise<KeywordMetrics[]> {
  const results: KeywordMetrics[] = [];

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    const batchResults = await getKeywordData(batch);
    results.push(...batchResults);

    // Rate limiting delay
    if (i + batchSize < keywords.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
