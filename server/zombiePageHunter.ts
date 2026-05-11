import axios from 'axios';

export interface ZombiePage {
  url: string;
  originalPath: string;
  lastCrawled: string;
  statusCode: number;
  estimatedLinks: number;
  estimatedTraffic: number;
  priority: number;
}

/**
 * Find "zombie pages" - URLs that returned 200 OK in the past but are now dead
 * These pages likely have backlinks pointing to them, creating SEO recovery opportunities
 */
export async function findZombiePages(domain: string): Promise<ZombiePage[]> {
  try {
    // Query Wayback Machine CDX API for all historical URLs
    const cdxUrl = `https://web.archive.org/cdx/search/cdx`;
    const params = {
      url: `${domain}/*`,
      matchType: 'prefix',
      filter: 'statuscode:200',
      output: 'json',
      collapse: 'urlkey',
      limit: 1000
    };

    const response = await axios.get(cdxUrl, { params, timeout: 30000 });
    const data = response.data;

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Skip header row
    const rows = data.slice(1);
    
    // Parse CDX response format: [urlkey, timestamp, original, mimetype, statuscode, digest, length]
    const zombiePages: ZombiePage[] = [];
    const seenPaths = new Set<string>();

    for (const row of rows) {
      const [urlkey, timestamp, original, mimetype, statuscode] = row;
      
      // Extract path from original URL
      const url = new URL(original);
      const path = url.pathname;

      // Skip root, common assets, and duplicates
      if (
        path === '/' ||
        path.match(/\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$/i) ||
        seenPaths.has(path)
      ) {
        continue;
      }

      seenPaths.add(path);

      // Check if page is currently dead (404)
      const isCurrentlyDead = await checkIfPageIsDead(original);
      
      if (isCurrentlyDead) {
        // Estimate value based on URL characteristics
        const estimatedLinks = estimateLinkCount(path);
        const estimatedTraffic = estimateTrafficPotential(path);
        const priority = calculatePriority(estimatedLinks, estimatedTraffic, timestamp);

        zombiePages.push({
          url: original,
          originalPath: path,
          lastCrawled: formatTimestamp(timestamp),
          statusCode: parseInt(statuscode),
          estimatedLinks,
          estimatedTraffic,
          priority
        });
      }
    }

    // Sort by priority (highest first) and return top results
    return zombiePages
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 20);

  } catch (error) {
    console.error('Error finding zombie pages:', error);
    return [];
  }
}

/**
 * Check if a URL currently returns 404 or is otherwise dead
 */
async function checkIfPageIsDead(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      validateStatus: () => true // Don't throw on 404
    });
    return response.status === 404 || response.status >= 500;
  } catch (error) {
    // If request fails (DNS, timeout, etc.), consider it dead
    return true;
  }
}

/**
 * Estimate link count based on URL characteristics
 * Deeper paths and content-focused URLs likely have more backlinks
 */
function estimateLinkCount(path: string): number {
  let score = 10; // Base score

  // Depth bonus (more segments = more specific content = more links)
  const segments = path.split('/').filter(s => s.length > 0);
  score += segments.length * 5;

  // Content indicators
  if (path.includes('/blog/') || path.includes('/article/')) score += 20;
  if (path.includes('/guide/') || path.includes('/tutorial/')) score += 15;
  if (path.includes('/features/') || path.includes('/pricing/')) score += 25;
  if (path.includes('/docs/') || path.includes('/documentation/')) score += 10;
  
  // Product/service pages
  if (path.includes('/product/') || path.includes('/service/')) score += 15;
  
  return Math.min(score, 100);
}

/**
 * Estimate traffic potential based on URL characteristics
 */
function estimateTrafficPotential(path: string): number {
  let score = 10; // Base score

  // High-traffic page indicators
  if (path.includes('/buy') || path.includes('/purchase')) score += 30;
  if (path.includes('/pricing') || path.includes('/plans')) score += 25;
  if (path.includes('/features') || path.includes('/benefits')) score += 20;
  if (path.includes('/download') || path.includes('/get-started')) score += 20;
  if (path.includes('/compare') || path.includes('/vs')) score += 15;
  
  // Blog/content pages
  if (path.includes('/blog/') || path.includes('/article/')) score += 15;
  
  // Landing pages
  if (path.match(/\/(lp|landing|promo)/)) score += 25;
  
  return Math.min(score, 100);
}

/**
 * Calculate overall priority score
 */
function calculatePriority(links: number, traffic: number, timestamp: string): number {
  // Weighted combination of factors
  const linkScore = links * 0.6;
  const trafficScore = traffic * 0.4;
  
  // Recency bonus (more recent = higher priority)
  const year = parseInt(timestamp.substring(0, 4));
  const recencyBonus = Math.max(0, (year - 2010) * 2);
  
  return Math.round(linkScore + trafficScore + recencyBonus);
}

/**
 * Format Wayback timestamp (YYYYMMDDhhmmss) to readable date
 */
function formatTimestamp(timestamp: string): string {
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  return `${year}-${month}-${day}`;
}
