import axios from "axios";
import * as cheerio from "cheerio";

export interface CompetitorAnalysis {
  url: string;
  metaKeywords: string[];
  headings: {
    h1: string[];
    h2: string[];
  };
  visibleText: string;
  extractedKeywords: string[];
}

/**
 * Scrape competitor homepage and extract SEO-relevant data
 */
export async function scrapeCompetitorUrl(url: string): Promise<CompetitorAnalysis> {
  try {
    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000, // 10 second timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract meta keywords
    const metaKeywords: string[] = [];
    $('meta[name="keywords"]').each((_: any, el: any) => {
      const content = $(el).attr("content");
      if (content) {
        metaKeywords.push(...content.split(",").map((k) => k.trim()).filter(Boolean));
      }
    });

    // Extract H1 tags
    const h1Tags: string[] = [];
    $("h1").each((_: any, el: any) => {
      const text = $(el).text().trim();
      if (text) h1Tags.push(text);
    });

    // Extract H2 tags
    const h2Tags: string[] = [];
    $("h2").each((_: any, el: any) => {
      const text = $(el).text().trim();
      if (text) h2Tags.push(text);
    });

    // Extract visible text (remove scripts, styles, etc.)
    $("script, style, noscript, iframe").remove();
    const visibleText = $("body").text().replace(/\s+/g, " ").trim();

    // Extract keywords from all sources
    const extractedKeywords = extractKeywordsFromText([
      ...metaKeywords,
      ...h1Tags,
      ...h2Tags,
      visibleText.substring(0, 1000), // First 1000 chars of body text
    ].join(" "));

    return {
      url,
      metaKeywords,
      headings: {
        h1: h1Tags,
        h2: h2Tags,
      },
      visibleText: visibleText.substring(0, 500), // Return first 500 chars
      extractedKeywords,
    };
  } catch (error: any) {
    console.error(`[CompetitorScraper] Error scraping ${url}:`, error.message);
    throw new Error(`Failed to scrape competitor URL: ${error.message}`);
  }
}

/**
 * Extract meaningful keywords from text
 * Filters out common stop words and short words
 */
function extractKeywordsFromText(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "this", "that", "these", "those", "it",
    "its", "we", "you", "they", "them", "their", "our", "your",
  ]);

  // Extract words, convert to lowercase, filter
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => {
      return (
        word.length >= 3 && // At least 3 characters
        !stopWords.has(word) && // Not a stop word
        !/^\d+$/.test(word) // Not just numbers
      );
    });

  // Count frequency
  const frequency = new Map<string, number>();
  words.forEach((word) => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });

  // Sort by frequency and return top 50
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word]) => word);
}

/**
 * Analyze domain gaps: keywords competitor uses but user doesn't have
 */
export function analyzeDomainGaps(
  competitorKeywords: string[],
  userKeywords: string[]
): string[] {
  const userKeywordSet = new Set(userKeywords.map((k) => k.toLowerCase()));
  
  return competitorKeywords.filter((keyword) => {
    return !userKeywordSet.has(keyword.toLowerCase());
  });
}
