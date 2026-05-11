// @ts-ignore - whois-json doesn't have TypeScript types
const whois = require("whois-json");

export interface DomainAvailability {
  domain: string;
  available: boolean;
  registrar?: string;
  expiryDate?: string;
  error?: string;
}

/**
 * Check if a single domain is available using WHOIS lookup
 */
export async function checkDomainAvailability(domain: string): Promise<DomainAvailability> {
  try {
    console.log(`[DomainAvailability] Checking ${domain}...`);
    
    const result = await whois(domain, {
      timeout: 10000, // 10 second timeout
      follow: 2, // Follow up to 2 redirects
    });

    // Check if domain is available based on WHOIS response
    // If domainName exists in response, domain is registered (taken)
    const isAvailable = !result.domainName && (
                       !result.registrar ||
                       result.status?.includes("No match") ||
                       result.status?.includes("NOT FOUND") ||
                       result.status?.includes("AVAILABLE")
                     );

    return {
      domain,
      available: isAvailable,
      registrar: result.registrar || undefined,
      expiryDate: result.expiryDate || undefined,
    };
  } catch (error: any) {
    console.error(`[DomainAvailability] Error checking ${domain}:`, error.message);
    
    // If WHOIS fails, we can't determine availability
    return {
      domain,
      available: false, // Conservative: assume taken if we can't check
      error: error.message,
    };
  }
}

/**
 * Check availability for multiple domains in batches
 * @param domains Array of domain names to check
 * @param batchSize Number of domains to check concurrently (default: 5)
 */
export async function checkBulkDomainAvailability(
  domains: string[],
  batchSize: number = 5
): Promise<DomainAvailability[]> {
  const results: DomainAvailability[] = [];
  
  // Process domains in batches to avoid overwhelming WHOIS servers
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    console.log(`[DomainAvailability] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(domains.length / batchSize)}`);
    
    const batchResults = await Promise.all(
      batch.map(domain => checkDomainAvailability(domain))
    );
    
    results.push(...batchResults);
    
    // Add a small delay between batches to be respectful to WHOIS servers
    if (i + batchSize < domains.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  return results;
}

/**
 * Extract domain name from a full domain string (e.g., "example.com" from "https://example.com/path")
 */
export function extractDomainName(url: string): string {
  try {
    // Remove protocol if present
    let domain = url.replace(/^https?:\/\//, "");
    
    // Remove path and query string
    domain = domain.split("/")[0];
    domain = domain.split("?")[0];
    
    // Remove port if present
    domain = domain.split(":")[0];
    
    return domain.toLowerCase();
  } catch (error) {
    return url.toLowerCase();
  }
}
