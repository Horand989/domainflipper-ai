/**
 * Weekly Launch Pulse Service
 * 
 * Checks indexation status and keyword rankings once per week (every Friday)
 * to match the pace of new domain launches and reduce API costs by 85%.
 * 
 * Philosophy:
 * - For new domains (Day 0-90), daily rank tracking is demoralizing and expensive
 * - Weekly checks provide meaningful milestones: "3 New Pages Indexed!"
 * - Focus on INDEX FIRST, RANK SECOND (Google needs to find the page before ranking it)
 * - Show "Building Trust..." instead of depressing ">100" ranks
 */

import axios from "axios";

// DataForSEO credentials (from environment)
const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || "";
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || "";
const DATAFORSEO_API_URL = "https://api.dataforseo.com/v3";

/**
 * Check if a URL is indexed in Google
 * Uses DataForSEO SERP API with "site:" operator
 * 
 * @param url - Full URL to check (e.g., "https://example.com/page")
 * @returns true if indexed, false if not found
 */
export async function checkIndexStatus(url: string): Promise<boolean> {
  try {
    // Use Google's "site:" operator to check if URL is indexed
    const searchQuery = `site:${url}`;
    
    const response = await axios.post(
      `${DATAFORSEO_API_URL}/serp/google/organic/live/advanced`,
      [
        {
          keyword: searchQuery,
          location_code: 2840, // United States
          language_code: "en",
          device: "desktop",
          os: "windows",
          depth: 10, // Check first 10 results
        },
      ],
      {
        auth: {
          username: DATAFORSEO_LOGIN,
          password: DATAFORSEO_PASSWORD,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.tasks?.[0]?.result?.[0]?.items) {
      const items = response.data.tasks[0].result[0].items;
      // If any results found, the page is indexed
      return items.length > 0;
    }

    return false;
  } catch (error) {
    console.error(`Error checking index status for ${url}:`, error);
    return false; // Assume not indexed on error
  }
}

/**
 * Check keyword rank position for a specific URL
 * Only call this AFTER confirming the page is indexed
 * 
 * @param keyword - Target keyword to check
 * @param targetUrl - URL to find in results
 * @returns rank position (1-100) or null if not found
 */
export async function checkKeywordRank(
  keyword: string,
  targetUrl: string
): Promise<number | null> {
  try {
    const response = await axios.post(
      `${DATAFORSEO_API_URL}/serp/google/organic/live/advanced`,
      [
        {
          keyword: keyword,
          location_code: 2840, // United States
          language_code: "en",
          device: "desktop",
          os: "windows",
          depth: 100, // Check top 100 results
        },
      ],
      {
        auth: {
          username: DATAFORSEO_LOGIN,
          password: DATAFORSEO_PASSWORD,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.tasks?.[0]?.result?.[0]?.items) {
      const items = response.data.tasks[0].result[0].items;
      
      // Normalize URLs for comparison (remove protocol and trailing slash)
      const normalizedTarget = targetUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")
        .toLowerCase();

      // Find the target URL in results
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.url) {
          const normalizedResult = item.url
            .replace(/^https?:\/\//, "")
            .replace(/\/$/, "")
            .toLowerCase();

          if (normalizedResult.includes(normalizedTarget)) {
            return item.rank_absolute || i + 1; // Return rank position
          }
        }
      }
    }

    return null; // Not found in top 100
  } catch (error) {
    console.error(`Error checking rank for keyword "${keyword}":`, error);
    return null;
  }
}

/**
 * Determine status badge based on index and rank data
 * 
 * @param isIndexed - Whether the page is indexed
 * @param rank - Rank position (1-100) or null
 * @returns status enum value
 */
export function determineStatus(
  isIndexed: boolean,
  rank: number | null
): "pending" | "indexed" | "ranking" | "building_trust" {
  if (!isIndexed) {
    return "pending"; // Not indexed yet
  }

  if (rank !== null && rank <= 100) {
    return "ranking"; // In top 100
  }

  if (rank === null) {
    return "building_trust"; // Indexed but not ranking yet (>100 or not found)
  }

  return "indexed"; // Indexed but rank unknown
}

/**
 * Get user-friendly status message for UI display
 * 
 * @param status - Status enum value
 * @param rank - Rank position (optional)
 * @returns Human-readable status message
 */
export function getStatusMessage(
  status: "pending" | "indexed" | "ranking" | "building_trust",
  rank?: number | null
): string {
  switch (status) {
    case "pending":
      return "⏳ Pending Indexation";
    case "indexed":
      return "✅ Indexed";
    case "ranking":
      return rank ? `🎯 Ranking #${rank}` : "🎯 Ranking in Top 100";
    case "building_trust":
      return "🌱 Building Trust...";
    default:
      return "Unknown";
  }
}

/**
 * Estimate API cost for weekly pulse check
 * 
 * @param pageCount - Number of pages to check (home + zombie pages)
 * @param keywordCount - Number of keywords to track
 * @returns Estimated cost in credits
 */
export function estimateWeeklyPulseCost(
  pageCount: number,
  keywordCount: number
): number {
  // Index check: 1 credit per page
  // Rank check: 1 credit per keyword (only if indexed)
  // Weekly = 4 checks per month
  const indexChecks = pageCount * 4; // 4 weeks
  const rankChecks = keywordCount * 4; // 4 weeks
  return indexChecks + rankChecks;
}

/**
 * Compare with daily tracking cost
 * 
 * @param pageCount - Number of pages
 * @param keywordCount - Number of keywords
 * @returns Cost comparison object
 */
export function compareCosts(pageCount: number, keywordCount: number) {
  const dailyCost = (pageCount + keywordCount) * 30; // 30 days
  const weeklyCost = estimateWeeklyPulseCost(pageCount, keywordCount);
  const savings = dailyCost - weeklyCost;
  const savingsPercent = Math.round((savings / dailyCost) * 100);

  return {
    dailyCost,
    weeklyCost,
    savings,
    savingsPercent,
  };
}
