/**
 * Affiliate Link Generator
 * Generates registrar purchase URLs with affiliate tracking parameters
 */

interface AffiliateIds {
  namecheapAffiliateId?: string | null;
  godaddyAffiliateId?: string | null;
  porkbunAffiliateId?: string | null;
  hostingerAffiliateId?: string | null;
}

/**
 * Generate affiliate purchase links for all registrars
 * @param domain - Full domain name (e.g., "example.com")
 * @param affiliateIds - User's affiliate IDs for each registrar
 * @returns Object with purchase URLs for each registrar
 */
export function generateAffiliatePurchaseLinks(
  domain: string,
  affiliateIds: AffiliateIds = {}
): Record<string, string> {
  const {
    namecheapAffiliateId,
    godaddyAffiliateId,
    porkbunAffiliateId,
    hostingerAffiliateId,
  } = affiliateIds;

  return {
    namecheap: generateNamecheapLink(domain, namecheapAffiliateId),
    godaddy: generateGoDaddyLink(domain, godaddyAffiliateId),
    porkbun: generatePorkbunLink(domain, porkbunAffiliateId),
    hostinger: generateHostingerLink(domain, hostingerAffiliateId),
  };
}

/**
 * Generate Namecheap purchase link with optional affiliate ID
 */
function generateNamecheapLink(domain: string, affiliateId?: string | null): string {
  const baseUrl = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`;
  
  if (affiliateId) {
    return `${baseUrl}&aff=${encodeURIComponent(affiliateId)}`;
  }
  
  return baseUrl;
}

/**
 * Generate GoDaddy purchase link with optional affiliate ID
 */
function generateGoDaddyLink(domain: string, affiliateId?: string | null): string {
  const baseUrl = `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`;
  
  if (affiliateId) {
    // GoDaddy uses 'isc' parameter for affiliate tracking
    return `${baseUrl}&isc=${encodeURIComponent(affiliateId)}`;
  }
  
  return baseUrl;
}

/**
 * Generate Porkbun purchase link with optional affiliate ID
 */
function generatePorkbunLink(domain: string, affiliateId?: string | null): string {
  const baseUrl = `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`;
  
  if (affiliateId) {
    return `${baseUrl}&coupon=${encodeURIComponent(affiliateId)}`;
  }
  
  return baseUrl;
}

/**
 * Generate Hostinger purchase link with optional affiliate ID
 */
function generateHostingerLink(domain: string, affiliateId?: string | null): string {
  const baseUrl = `https://www.hostinger.com/domain-name-search?domain=${encodeURIComponent(domain)}`;
  
  if (affiliateId) {
    // Hostinger uses 'ref' parameter for affiliate tracking
    return `${baseUrl}&ref=${encodeURIComponent(affiliateId)}`;
  }
  
  return baseUrl;
}
