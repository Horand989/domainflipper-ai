/**
 * Domain Availability Checker
 * Uses GoDaddy, Namecheap, Porkbun, Hostinger APIs, and WHOIS lookups to check if domains are available
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

export interface DomainAvailability {
  domain: string;
  available: boolean;
  registrar?: string;
  expirationDate?: string;
  creationDate?: string;
  status?: string;
  error?: string;
  pricing?: {
    registrar: string;
    price: number;
    currency: string;
  }[];
}

/**
 * Check domain availability using GoDaddy API (OTE/Test environment)
 */
async function checkGoDaddyAvailability(domain: string): Promise<DomainAvailability | null> {
  try {
    const apiKey = process.env.GODADDY_API_KEY;
    const apiSecret = process.env.GODADDY_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      console.warn('GoDaddy API credentials not configured');
      return null;
    }
    
    // GoDaddy OTE (Test) environment
    const baseUrl = 'https://api.ote-godaddy.com';
    
    const response = await axios.get(
      `${baseUrl}/v1/domains/available?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          'Authorization': `sso-key ${apiKey}:${apiSecret}`,
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    const { available, price, currency } = response.data;
    
    return {
      domain,
      available: available === true,
      registrar: 'GoDaddy',
      status: available ? 'Available for registration' : 'Registered',
      pricing: price ? [{
        registrar: 'GoDaddy',
        price: price / 1000000, // GoDaddy returns price in micros
        currency: currency || 'USD',
      }] : undefined,
    };
    
  } catch (error: any) {
    console.error(`GoDaddy API check failed for ${domain}:`, error.message);
    return null;
  }
}

/**
 * Check domain availability using Namecheap API
 */
async function checkNamecheapAvailability(domain: string): Promise<DomainAvailability | null> {
  try {
    const apiUser = process.env.NAMECHEAP_USERNAME;
    const apiKey = process.env.NAMECHEAP_API_KEY;
    const clientIp = process.env.NAMECHEAP_CLIENT_IP;
    
    if (!apiUser || !apiKey || !clientIp) {
      console.warn('Namecheap API credentials not configured');
      return null;
    }
    
    // Namecheap Sandbox environment
    const baseUrl = 'https://api.sandbox.namecheap.com/xml.response';
    
    const params = new URLSearchParams({
      ApiUser: apiUser,
      ApiKey: apiKey,
      UserName: apiUser,
      ClientIp: clientIp,
      Command: 'namecheap.domains.check',
      DomainList: domain,
    });
    
    const response = await axios.get(`${baseUrl}?${params.toString()}`, {
      timeout: 10000,
    });
    
    // Parse XML response
    const xmlText = response.data;
    
    // Extract availability from XML
    const availableMatch = xmlText.match(/Available="(true|false)"/);
    const available = availableMatch && availableMatch[1] === 'true';
    
    return {
      domain,
      available: available || false,
      registrar: 'Namecheap',
      status: available ? 'Available for registration' : 'Registered',
      // Namecheap doesn't provide pricing in check API
      pricing: available ? [{
        registrar: 'Namecheap',
        price: getEstimatedPricing(domain).estimatedPrice,
        currency: 'USD',
      }] : undefined,
    };
    
  } catch (error: any) {
    console.error(`Namecheap API check failed for ${domain}:`, error.message);
    return null;
  }
}

/**
 * Check if a domain is available using WHOIS (fallback)
 */
async function checkWhoisAvailability(domain: string): Promise<DomainAvailability> {
  try {
    // Run WHOIS command
    const { stdout, stderr } = await execAsync(`whois ${domain}`, { timeout: 10000 });
    
    // Parse WHOIS response
    const whoisText = stdout.toLowerCase();
    
    // Check for common "not found" patterns
    const notFoundPatterns = [
      'no match for',
      'not found',
      'no entries found',
      'no data found',
      'status: available',
      'domain not found',
      'no match',
    ];
    
    const isAvailable = notFoundPatterns.some(pattern => whoisText.includes(pattern));
    
    if (isAvailable) {
      return {
        domain,
        available: true,
        status: 'Available for registration',
      };
    }
    
    // Domain is taken - extract registration info
    const registrar = extractField(stdout, ['registrar:', 'registrar name:']);
    const expirationDate = extractField(stdout, ['expiry date:', 'expiration date:', 'registry expiry date:']);
    const creationDate = extractField(stdout, ['creation date:', 'created:']);
    const status = extractField(stdout, ['domain status:', 'status:']);
    
    return {
      domain,
      available: false,
      registrar,
      expirationDate,
      creationDate,
      status: status || 'Registered',
    };
    
  } catch (error: any) {
    // WHOIS command failed
    console.error(`WHOIS lookup failed for ${domain}:`, error.message);
    
    return {
      domain,
      available: false,
      error: `WHOIS lookup failed: ${error.message}`,
    };
  }
}

/**
 * Check domain availability using Porkbun API
 */
async function checkPorkbunAvailability(
  domain: string,
  apiKey: string,
  secretKey: string
): Promise<DomainAvailability | null> {
  try {
    const endpoint = `https://api.porkbun.com/api/json/v3/domain/checkDomain/${domain}`;
    const response = await axios.post(endpoint, {
      apikey: apiKey,
      secretapikey: secretKey,
    }, { timeout: 10000 });
    if (response.data.status === 'SUCCESS') {
      const isAvailable = response.data.response.avail === 'yes';
      const price = response.data.response.price ? parseFloat(response.data.response.price) : undefined;
      const regularPrice = response.data.response.regularPrice ? parseFloat(response.data.response.regularPrice) : undefined;
      return {
        domain,
        available: isAvailable,
        registrar: 'Porkbun',
        status: isAvailable ? 'Available for registration' : 'Registered',
        pricing: (price || regularPrice) ? [{
          registrar: 'Porkbun',
          price: price || regularPrice || 0,
          currency: 'USD',
        }] : undefined,
      };
    }
    return null;
  } catch (error: any) {
    console.error(`Porkbun API check failed for ${domain}:`, error.message);
    return null;
  }
}

/**
 * Check domain availability using Hostinger API
 */
async function checkHostingerAvailability(
  domain: string,
  apiKey: string
): Promise<DomainAvailability | null> {
  try {
    const parts = domain.split('.');
    const domainName = parts.slice(0, -1).join('.');
    const tld = parts[parts.length - 1];
    const endpoint = 'https://api.hostinger.com/api/domains/v1/availability';
    const response = await axios.post(
      endpoint,
      { domain: domainName, tlds: [tld], with_alternatives: false },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    const result = response.data[`${domainName}.${tld}`];
    const isAvailable = result?.is_available === true;
    return {
      domain,
      available: isAvailable,
      registrar: 'Hostinger',
      status: isAvailable ? 'Available for registration' : 'Registered',
    };
  } catch (error: any) {
    console.error(`Hostinger API check failed for ${domain}:`, error.message);
    return null;
  }
}

/**
 * Check domain availability with fallback chain: GoDaddy -> Namecheap -> Porkbun -> Hostinger -> WHOIS
 */
export async function checkDomainAvailability(
  domain: string,
  credentials?: {
    porkbunApiKey?: string;
    porkbunSecretKey?: string;
    hostingerApiKey?: string;
  }
): Promise<DomainAvailability> {
  // Try GoDaddy first (uses env vars)
  const godaddyResult = await checkGoDaddyAvailability(domain);
  if (godaddyResult) {
    return godaddyResult;
  }
  
  // Try Namecheap second (uses env vars)
  const namecheapResult = await checkNamecheapAvailability(domain);
  if (namecheapResult) {
    return namecheapResult;
  }

  // Try Porkbun if credentials provided
  if (credentials?.porkbunApiKey && credentials?.porkbunSecretKey) {
    const porkbunResult = await checkPorkbunAvailability(domain, credentials.porkbunApiKey, credentials.porkbunSecretKey);
    if (porkbunResult) {
      return porkbunResult;
    }
  }

  // Try Hostinger if credentials provided
  if (credentials?.hostingerApiKey) {
    const hostingerResult = await checkHostingerAvailability(domain, credentials.hostingerApiKey);
    if (hostingerResult) {
      return hostingerResult;
    }
  }
  
  // Fall back to WHOIS
  return await checkWhoisAvailability(domain);
}

/**
 * Extract field value from WHOIS response
 */
function extractField(whoisText: string, fieldNames: string[]): string | undefined {
  for (const fieldName of fieldNames) {
    const regex = new RegExp(`${fieldName}\\s*(.+)`, 'i');
    const match = whoisText.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

/**
 * Check availability for multiple domains
 */
export async function checkBatchAvailability(domains: string[]): Promise<DomainAvailability[]> {
  const results: DomainAvailability[] = [];
  
  // Process in batches of 5 to avoid overwhelming APIs
  const batchSize = 5;
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(domain => checkDomainAvailability(domain))
    );
    
    results.push(...batchResults);
    
    // Wait 2 seconds between batches to avoid rate limiting
    if (i + batchSize < domains.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

/**
 * Get estimated pricing for domain registration
 * Returns typical market prices (not real-time API prices)
 */
export function getEstimatedPricing(domain: string): { tld: string; estimatedPrice: number; currency: string } {
  const tld = domain.split('.').pop()?.toLowerCase() || 'com';
  
  // Typical market prices (in USD)
  const pricingMap: Record<string, number> = {
    'com': 12.99,
    'net': 14.99,
    'org': 14.99,
    'ca': 14.99,
    'io': 39.99,
    'co': 24.99,
    'ai': 89.99,
    'app': 14.99,
    'dev': 14.99,
    'tech': 19.99,
    'online': 29.99,
    'store': 49.99,
    'shop': 29.99,
  };
  
  return {
    tld,
    estimatedPrice: pricingMap[tld] || 19.99,
    currency: 'USD',
  };
}

/**
 * Get affiliate purchase links for domain registrars
 */
export function getAffiliatePurchaseLink(domain: string, registrar: 'namecheap' | 'godaddy' | 'porkbun' | 'hostinger'): string {
  if (registrar === 'namecheap') {
    return `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`;
  } else if (registrar === 'porkbun') {
    return `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`;
  } else if (registrar === 'hostinger') {
    return `https://www.hostinger.com/domain-name-search?domain=${encodeURIComponent(domain)}`;
  } else {
    // GoDaddy affiliate link format
    return `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${encodeURIComponent(domain)}`;
  }
}
