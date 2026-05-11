/**
 * Find Available Domains Service
 *
 * Searches for real purchasable domains from:
 * - GoDaddy Auctions API (expiring/expired domains)
 * - Namecheap Marketplace (listed domains for sale)
 * - DataForSEO Domain Finder (keyword-matched available domains)
 * - WHOIS-based availability check on AI-generated suggestions
 */

import axios from "axios";
import { checkBatchAvailability, getEstimatedPricing, getAffiliatePurchaseLink } from "./domainAvailability";

export interface AvailableDomain {
  domain: string;
  source: "godaddy_auctions" | "namecheap_marketplace" | "dataforseo" | "generated_available";
  available: boolean;
  price: number;
  currency: string;
  isPremium: boolean;
  isAuction: boolean;
  auctionEndDate?: string;
  buyNowUrl: string;
  brandScore: number;
  tld: string;
}

/**
 * Calculate brandability score for a domain name
 */
function calcBrandScore(domain: string): number {
  const name = domain.split(".")[0];
  let score = 100;
  if (name.length > 15) score -= 20;
  else if (name.length > 12) score -= 10;
  if (name.includes("-")) score -= 30;
  const consonantRun = name.match(/[bcdfghjklmnpqrstvwxyz]{4,}/i);
  if (consonantRun) score -= 15;
  if (name.length <= 8) score += 10;
  return Math.max(0, Math.min(100, score));
}

/**
 * Search GoDaddy Auctions for expiring/expired domains matching keywords
 */
async function searchGoDaddyAuctions(keywords: string[]): Promise<AvailableDomain[]> {
  try {
    const apiKey = process.env.GODADDY_API_KEY;
    const apiSecret = process.env.GODADDY_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.warn("[FindAvailable] GoDaddy API credentials not configured");
      return [];
    }

    const results: AvailableDomain[] = [];

    // Search for each keyword in GoDaddy aftermarket
    for (const keyword of keywords.slice(0, 3)) {
      try {
        // GoDaddy Aftermarket/Auctions search (OTE environment)
        const response = await axios.get(
          `https://api.ote-godaddy.com/v1/aftermarket/listings/expiry`,
          {
            headers: {
              Authorization: `sso-key ${apiKey}:${apiSecret}`,
              Accept: "application/json",
            },
            params: {
              keywords: keyword,
              limit: 10,
              tlds: "com,net,org",
            },
            timeout: 10000,
          }
        );

        const listings = response.data?.listings || [];
        for (const listing of listings) {
          if (listing.domain) {
            results.push({
              domain: listing.domain,
              source: "godaddy_auctions",
              available: true,
              price: listing.price ? listing.price / 1000000 : 12.99,
              currency: "USD",
              isPremium: listing.price ? listing.price / 1000000 > 50 : false,
              isAuction: true,
              auctionEndDate: listing.expiresAt,
              buyNowUrl: `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${encodeURIComponent(listing.domain)}`,
              brandScore: calcBrandScore(listing.domain),
              tld: listing.domain.split(".").pop() || "com",
            });
          }
        }
      } catch (err: any) {
        console.warn(`[FindAvailable] GoDaddy Auctions search failed for "${keyword}":`, err.message);
      }
    }

    return results;
  } catch (error: any) {
    console.warn("[FindAvailable] GoDaddy Auctions search failed:", error.message);
    return [];
  }
}

/**
 * Search Namecheap Marketplace for domains matching keywords
 */
async function searchNamecheapMarketplace(keywords: string[]): Promise<AvailableDomain[]> {
  try {
    const apiUser = process.env.NAMECHEAP_USERNAME;
    const apiKey = process.env.NAMECHEAP_API_KEY;
    const clientIp = process.env.NAMECHEAP_CLIENT_IP;

    if (!apiUser || !apiKey || !clientIp) {
      console.warn("[FindAvailable] Namecheap API credentials not configured");
      return [];
    }

    const results: AvailableDomain[] = [];

    for (const keyword of keywords.slice(0, 3)) {
      try {
        const params = new URLSearchParams({
          ApiUser: apiUser,
          ApiKey: apiKey,
          UserName: apiUser,
          ClientIp: clientIp,
          Command: "namecheap.market.search",
          Keyword: keyword,
          MaxResults: "10",
        });

        const response = await axios.get(
          `https://api.sandbox.namecheap.com/xml.response?${params.toString()}`,
          { timeout: 10000 }
        );

        // Parse XML for marketplace listings
        const xmlText = response.data as string;
        const domainMatches = Array.from(xmlText.matchAll(/<Domain[^>]*Name="([^"]+)"[^>]*Price="([^"]+)"/g));

        for (const match of domainMatches) {
          const domain = match[1];
          const price = parseFloat(match[2]) || 12.99;
          if (domain) {
            results.push({
              domain,
              source: "namecheap_marketplace",
              available: true,
              price,
              currency: "USD",
              isPremium: price > 50,
              isAuction: false,
              buyNowUrl: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`,
              brandScore: calcBrandScore(domain),
              tld: domain.split(".").pop() || "com",
            });
          }
        }
      } catch (err: any) {
        console.warn(`[FindAvailable] Namecheap Marketplace search failed for "${keyword}":`, err.message);
      }
    }

    return results;
  } catch (error: any) {
    console.warn("[FindAvailable] Namecheap Marketplace search failed:", error.message);
    return [];
  }
}

/**
 * Generate keyword-based domain variations and check real availability
 * This is the most reliable fallback — generate smart variations and verify each one
 */
async function generateAndCheckDomains(
  keywords: string[],
  niche: string
): Promise<AvailableDomain[]> {
  // Generate domain name variations from keywords
  const variations: string[] = [];
  const tlds = [".com", ".net", ".org", ".co", ".io"];
  const prefixes = ["get", "try", "my", "the", "go", "pro", "best", "top", "smart", "easy"];
  const suffixes = ["hq", "hub", "pro", "app", "now", "lab", "co", "io", "ai"];

  for (const keyword of keywords.slice(0, 5)) {
    const clean = keyword.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.length < 3) continue;

    // Direct keyword + TLD
    for (const tld of tlds.slice(0, 2)) {
      variations.push(`${clean}${tld}`);
    }

    // Prefix + keyword
    for (const prefix of prefixes.slice(0, 3)) {
      variations.push(`${prefix}${clean}.com`);
    }

    // Keyword + suffix
    for (const suffix of suffixes.slice(0, 3)) {
      variations.push(`${clean}${suffix}.com`);
    }
  }

  // Deduplicate
  const uniqueVariations = Array.from(new Set(variations)).slice(0, 40);

  console.log(`[FindAvailable] Checking ${uniqueVariations.length} generated variations...`);

  // Check availability in batches
  const availabilityResults = await checkBatchAvailability(uniqueVariations);

  const available: AvailableDomain[] = [];
  for (const result of availabilityResults) {
    if (result.available && !result.error) {
      const pricing = getEstimatedPricing(result.domain);
      const price = result.pricing?.[0]?.price || pricing.estimatedPrice;

      // Only include standard-priced domains (not premium)
      if (price <= 50) {
        available.push({
          domain: result.domain,
          source: "generated_available",
          available: true,
          price,
          currency: "USD",
          isPremium: false,
          isAuction: false,
          buyNowUrl: getAffiliatePurchaseLink(result.domain, "namecheap"),
          brandScore: calcBrandScore(result.domain),
          tld: result.domain.split(".").pop() || "com",
        });
      }
    }
  }

  console.log(`[FindAvailable] Found ${available.length} available standard-price domains`);
  return available;
}

/**
 * Main function: find available domains for a given niche and keywords
 */
export async function findAvailableDomains(input: {
  keywords: string[];
  niche: string;
  maxResults?: number;
}): Promise<AvailableDomain[]> {
  const { keywords, niche, maxResults = 20 } = input;

  console.log(`[FindAvailable] Searching for available domains in niche: "${niche}"`);

  // Run all three sources in parallel
  const [auctionResults, marketplaceResults, generatedResults] = await Promise.all([
    searchGoDaddyAuctions(keywords),
    searchNamecheapMarketplace(keywords),
    generateAndCheckDomains(keywords, niche),
  ]);

  // Combine all results
  const allResults = [...auctionResults, ...marketplaceResults, ...generatedResults];

  // Deduplicate by domain name
  const seenDomains: Record<string, boolean> = {};
  const deduplicated = allResults.filter((d) => {
    if (seenDomains[d.domain]) return false;
    seenDomains[d.domain] = true;
    return true;
  });

  // Sort: standard price first, then by brand score
  deduplicated.sort((a, b) => {
    if (a.isPremium !== b.isPremium) return a.isPremium ? 1 : -1;
    if (a.isAuction !== b.isAuction) return a.isAuction ? -1 : 1;
    return b.brandScore - a.brandScore;
  });

  return deduplicated.slice(0, maxResults);
}
