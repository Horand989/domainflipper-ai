import axios from "axios";
import { getCachedValue, setCachedValue, CACHE_TTL } from "./cacheService";

interface AvailabilityResult {
  domain: string;
  available: boolean;
  price?: number;
  currency?: string;
  registrar: string;
  error?: string;
}

/**
 * Check domain availability using Namecheap API
 */
export async function checkNamecheapAvailability(
  domain: string,
  apiKey: string,
  username: string
): Promise<AvailabilityResult> {
  try {
    // Namecheap API endpoint
    const endpoint = "https://api.namecheap.com/xml.response";
    
    const params = {
      ApiUser: username,
      ApiKey: apiKey,
      UserName: username,
      Command: "namecheap.domains.check",
      ClientIp: "127.0.0.1", // Replace with actual IP in production
      DomainList: domain,
    };

    const response = await axios.get(endpoint, { params });
    
    // Parse XML response (simplified - in production use proper XML parser)
    const available = response.data.includes('Available="true"');
    
    return {
      domain,
      available,
      registrar: "Namecheap",
      price: available ? 10.98 : undefined, // Default price, should be parsed from response
      currency: "USD",
    };
  } catch (error: any) {
    return {
      domain,
      available: false,
      registrar: "Namecheap",
      error: error.message || "Failed to check availability",
    };
  }
}

/**
 * Check domain availability using GoDaddy API
 */
export async function checkGoDaddyAvailability(
  domain: string,
  apiKey: string,
  apiSecret: string
): Promise<AvailabilityResult> {
  try {
    const endpoint = `https://api.godaddy.com/v1/domains/available?domain=${domain}`;
    
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `sso-key ${apiKey}:${apiSecret}`,
        "Content-Type": "application/json",
      },
    });

    return {
      domain,
      available: response.data.available === true,
      registrar: "GoDaddy",
      price: response.data.price ? response.data.price / 1000000 : undefined,
      currency: response.data.currency || "USD",
    };
  } catch (error: any) {
    return {
      domain,
      available: false,
      registrar: "GoDaddy",
      error: error.message || "Failed to check availability",
    };
  }
}

/**
 * Check domain availability using Porkbun API
 */
export async function checkPorkbunAvailability(
  domain: string,
  apiKey: string,
  secretKey: string
): Promise<AvailabilityResult> {
  try {
    const endpoint = `https://api.porkbun.com/api/json/v3/domain/checkDomain/${domain}`;
    
    const response = await axios.post(endpoint, {
      apikey: apiKey,
      secretapikey: secretKey,
    });

    if (response.data.status === "SUCCESS") {
      const isAvailable = response.data.response.avail === "yes";
      const price = response.data.response.price ? parseFloat(response.data.response.price) : undefined;
      const regularPrice = response.data.response.regularPrice ? parseFloat(response.data.response.regularPrice) : undefined;
      const isPremium = response.data.response.premium === "yes";

      return {
        domain,
        available: isAvailable,
        registrar: "Porkbun",
        price: price || regularPrice,
        currency: "USD",
      };
    } else {
      return {
        domain,
        available: false,
        registrar: "Porkbun",
        error: "Failed to check availability",
      };
    }
  } catch (error: any) {
    return {
      domain,
      available: false,
      registrar: "Porkbun",
      error: error.message || "Failed to check availability",
    };
  }
}

/**
 * Check domain availability using Hostinger API
 */
export async function checkHostingerAvailability(
  domain: string,
  apiKey: string
): Promise<AvailabilityResult> {
  try {
    // Extract domain name and TLD
    const parts = domain.split(".");
    const domainName = parts.slice(0, -1).join(".");
    const tld = parts[parts.length - 1];

    const endpoint = "https://api.hostinger.com/api/domains/v1/availability";
    
    const response = await axios.post(
      endpoint,
      {
        domain: domainName,
        tlds: [tld],
        with_alternatives: false,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Hostinger returns availability status
    const result = response.data[`${domainName}.${tld}`];
    const isAvailable = result?.is_available === true;

    return {
      domain,
      available: isAvailable,
      registrar: "Hostinger",
      // Hostinger API doesn't provide pricing in availability response
      error: isAvailable ? undefined : "Domain not available or pricing not provided",
    };
  } catch (error: any) {
    return {
      domain,
      available: false,
      registrar: "Hostinger",
      error: error.message || "Failed to check availability",
    };
  }
}

/**
 * Check domain availability across multiple registrars
 */
export async function checkDomainAvailability(
  domain: string,
  settings: {
    namecheapApiKey?: string;
    namecheapUsername?: string;
    godaddyApiKey?: string;
    godaddyApiSecret?: string;
    porkbunApiKey?: string;
    porkbunSecretKey?: string;
    hostingerApiKey?: string;
  }
): Promise<AvailabilityResult[]> {
  // Check cache first
  const cacheKey = `availability:${domain}`;
  const cached = await getCachedValue(cacheKey);
  if (cached) {
    return JSON.parse(cached) as AvailabilityResult[];
  }

  const results: Promise<AvailabilityResult>[] = [];

  // Check Namecheap if credentials provided
  if (settings.namecheapApiKey && settings.namecheapUsername) {
    results.push(
      checkNamecheapAvailability(
        domain,
        settings.namecheapApiKey,
        settings.namecheapUsername
      )
    );
  }

  // Check GoDaddy if credentials provided
  if (settings.godaddyApiKey && settings.godaddyApiSecret) {
    results.push(
      checkGoDaddyAvailability(
        domain,
        settings.godaddyApiKey,
        settings.godaddyApiSecret
      )
    );
  }

  // Check Porkbun if credentials provided
  if (settings.porkbunApiKey && settings.porkbunSecretKey) {
    results.push(
      checkPorkbunAvailability(
        domain,
        settings.porkbunApiKey,
        settings.porkbunSecretKey
      )
    );
  }

  // Check Hostinger if credentials provided
  if (settings.hostingerApiKey) {
    results.push(
      checkHostingerAvailability(
        domain,
        settings.hostingerApiKey
      )
    );
  }

  if (results.length === 0) {
    return [
      {
        domain,
        available: false,
        registrar: "None",
        error: "No API credentials configured. Please add API keys for Namecheap, GoDaddy, Porkbun, or Hostinger in settings.",
      },
    ];
  }

  const availabilityResults = await Promise.all(results);

  // Cache the results
  await setCachedValue(cacheKey, JSON.stringify(availabilityResults), CACHE_TTL.DOMAIN_AVAILABILITY);

  return availabilityResults;
}
