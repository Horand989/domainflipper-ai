/**
 * PDF Domain List Parser
 * Extracts domain names from uploaded PDF files
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface ParsedDomain {
  domain: string;
  tld: string;
  fullDomain: string;
}

/**
 * Extract text from PDF using pdftotext (from poppler-utils, pre-installed)
 */
async function extractTextFromPDF(pdfPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`pdftotext "${pdfPath}" -`);
    return stdout;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Parse domain names from text content
 * Supports various formats:
 * - example.com
 * - example .com (with space)
 * - example (will add .com by default)
 * - Lists with bullets, numbers, etc.
 */
export function parseDomainNamesFromText(text: string): ParsedDomain[] {
  const domains: ParsedDomain[] = [];
  const seen = new Set<string>();
  
  // Common TLDs to look for
  const tlds = ['com', 'net', 'org', 'ca', 'io', 'co', 'ai', 'app', 'dev', 'tech', 'online', 'store', 'shop'];
  
  // Pattern 1: Full domains (example.com)
  const fullDomainPattern = /\b([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|ca|io|co|ai|app|dev|tech|online|store|shop))\b/gi;
  const fullMatches = Array.from(text.matchAll(fullDomainPattern));
  
  for (const match of fullMatches) {
    const fullDomain = match[1].toLowerCase();
    if (!seen.has(fullDomain)) {
      seen.add(fullDomain);
      const parts = fullDomain.split('.');
      domains.push({
        domain: parts[0],
        tld: '.' + parts.slice(1).join('.'),
        fullDomain,
      });
    }
  }
  
  // Pattern 2: Domain names with space before TLD (example .com)
  const spacedDomainPattern = /\b([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)\s+\.?(com|net|org|ca|io|co|ai|app|dev|tech|online|store|shop)\b/gi;
  const spacedMatches = Array.from(text.matchAll(spacedDomainPattern));
  
  for (const match of spacedMatches) {
    const domain = match[1].toLowerCase();
    const tld = '.' + match[3].toLowerCase();
    const fullDomain = domain + tld;
    
    if (!seen.has(fullDomain)) {
      seen.add(fullDomain);
      domains.push({
        domain,
        tld,
        fullDomain,
      });
    }
  }
  
  // Pattern 3: Standalone domain names (will try to infer TLD)
  // Look for lines that start with bullets, numbers, or are standalone words
  const lines = text.split('\n');
  for (const line of lines) {
    // Remove common list markers
    const cleaned = line.trim().replace(/^[•\-*\d]+[\.\)]\s*/, '');
    
    // Check if it looks like a domain name (alphanumeric with optional hyphens)
    const domainMatch = cleaned.match(/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)$/i);
    if (domainMatch) {
      const domain = domainMatch[1].toLowerCase();
      
      // Skip if it's a common word or too short
      if (domain.length < 3 || domain.length > 63) continue;
      
      // Try .com first (most common)
      const fullDomain = domain + '.com';
      if (!seen.has(fullDomain)) {
        seen.add(fullDomain);
        domains.push({
          domain,
          tld: '.com',
          fullDomain,
        });
      }
    }
  }
  
  return domains;
}

/**
 * Parse domains from uploaded PDF file
 */
export async function parsePDFDomainList(pdfPath: string): Promise<ParsedDomain[]> {
  try {
    // Extract text from PDF
    const text = await extractTextFromPDF(pdfPath);
    
    // Parse domain names from text
    const domains = parseDomainNamesFromText(text);
    
    console.log(`[PDF Parser] Extracted ${domains.length} domains from PDF`);
    
    return domains;
  } catch (error) {
    console.error('Error parsing PDF domain list:', error);
    throw error;
  }
}

/**
 * Parse domains from text file (.txt, .csv)
 */
export async function parseTextDomainList(filePath: string): Promise<ParsedDomain[]> {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    const domains = parseDomainNamesFromText(text);
    
    console.log(`[Text Parser] Extracted ${domains.length} domains from text file`);
    
    return domains;
  } catch (error) {
    console.error('Error parsing text domain list:', error);
    throw error;
  }
}

/**
 * Auto-detect file type and parse accordingly
 */
export async function parseUploadedDomainList(filePath: string): Promise<ParsedDomain[]> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') {
    return parsePDFDomainList(filePath);
  } else if (ext === '.txt' || ext === '.csv') {
    return parseTextDomainList(filePath);
  } else {
    throw new Error(`Unsupported file type: ${ext}. Please upload PDF, TXT, or CSV files.`);
  }
}
