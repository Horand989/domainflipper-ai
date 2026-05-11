import axios from 'axios';

export interface WaybackSnapshot {
  timestamp: string; // YYYYMMDDHHMMSS format
  year: number;
  url: string;
  statusCode: number;
  mimeType: string;
}

export interface HistoricalContent {
  year: number;
  timestamp: string;
  text: string; // Extracted text content
  url: string;
}

/**
 * Fetch available snapshots from Wayback Machine CDX API
 * @param domain - Domain name (without protocol)
 * @returns Array of available snapshots
 */
export async function fetchWaybackSnapshots(domain: string): Promise<WaybackSnapshot[]> {
  try {
    // CDX API endpoint
    const cdxUrl = `https://web.archive.org/cdx/search/cdx`;
    
    const response = await axios.get(cdxUrl, {
      params: {
        url: domain,
        matchType: 'domain',
        output: 'json',
        filter: 'statuscode:200', // Only successful captures
        collapse: 'timestamp:8', // Group by year
        limit: 1000, // Get up to 1000 snapshots
      },
      timeout: 15000,
    });

    if (!response.data || response.data.length === 0) {
      return [];
    }

    // First row is headers, skip it
    const rows = response.data.slice(1);
    
    const snapshots: WaybackSnapshot[] = rows.map((row: any[]) => {
      const timestamp = row[1];
      const year = parseInt(timestamp.substring(0, 4));
      
      return {
        timestamp,
        year,
        url: row[2],
        statusCode: parseInt(row[4]),
        mimeType: row[3],
      };
    });

    return snapshots;
  } catch (error: any) {
    console.error('Error fetching Wayback snapshots:', error.message);
    return [];
  }
}

/**
 * Select 3 representative snapshots: oldest, middle, most recent
 * @param snapshots - Array of all available snapshots
 * @returns Array of 3 selected snapshots
 */
export function selectKeySnapshots(snapshots: WaybackSnapshot[]): WaybackSnapshot[] {
  if (snapshots.length === 0) return [];
  if (snapshots.length === 1) return [snapshots[0]];
  if (snapshots.length === 2) return [snapshots[0], snapshots[1]];

  // Group by year to get distinct years
  const yearMap = new Map<number, WaybackSnapshot>();
  snapshots.forEach(snapshot => {
    if (!yearMap.has(snapshot.year)) {
      yearMap.set(snapshot.year, snapshot);
    }
  });

  const uniqueYears = Array.from(yearMap.values()).sort((a, b) => a.year - b.year);

  if (uniqueYears.length <= 3) {
    return uniqueYears;
  }

  // Select oldest, middle, and most recent
  const oldest = uniqueYears[0];
  const mostRecent = uniqueYears[uniqueYears.length - 1];
  const middleIndex = Math.floor(uniqueYears.length / 2);
  const middle = uniqueYears[middleIndex];

  return [oldest, middle, mostRecent];
}

/**
 * Fetch and extract text content from a Wayback Machine snapshot
 * @param snapshot - Snapshot to fetch
 * @returns Extracted text content
 */
export async function fetchSnapshotContent(snapshot: WaybackSnapshot): Promise<string> {
  try {
    const waybackUrl = `https://web.archive.org/web/${snapshot.timestamp}/${snapshot.url}`;
    
    const response = await axios.get(waybackUrl, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DomainAnalyzer/1.0)',
      },
    });

    const html = response.data;
    
    // Extract text from HTML (remove tags)
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Limit to first 500 words + footer (last 200 words)
    const words = text.split(/\s+/);
    if (words.length > 700) {
      const firstPart = words.slice(0, 500).join(' ');
      const lastPart = words.slice(-200).join(' ');
      text = `${firstPart} [...] ${lastPart}`;
    }

    return text;
  } catch (error: any) {
    console.error(`Error fetching snapshot content for ${snapshot.year}:`, error.message);
    return `[Error: Could not fetch content for ${snapshot.year}]`;
  }
}

/**
 * Main function: Get historical content for domain analysis
 * @param domain - Domain name (without protocol)
 * @returns Array of historical content from 3 key snapshots
 */
export async function getHistoricalContent(domain: string): Promise<HistoricalContent[]> {
  // Remove protocol if present
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');

  // Fetch all available snapshots
  const snapshots = await fetchWaybackSnapshots(cleanDomain);
  
  if (snapshots.length === 0) {
    return [];
  }

  // Select 3 key snapshots
  const keySnapshots = selectKeySnapshots(snapshots);

  // Fetch content for each snapshot
  const historicalContent: HistoricalContent[] = [];
  
  for (const snapshot of keySnapshots) {
    const text = await fetchSnapshotContent(snapshot);
    historicalContent.push({
      year: snapshot.year,
      timestamp: snapshot.timestamp,
      text,
      url: snapshot.url,
    });
  }

  return historicalContent;
}
