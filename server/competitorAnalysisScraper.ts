import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CompetitorPage {
  url: string;
  title: string;
  wordCount: number;
  hasTitleMatch: boolean;
  contentType: 'forum' | 'thin' | 'strong' | 'unknown';
  domain: string;
}

export interface CompetitorAnalysis {
  keyword: string;
  topCompetitors: CompetitorPage[];
  averageWordCount: number;
  forumCount: number;
  thinContentCount: number;
}

/**
 * Detect if a URL is a forum or user-generated content site
 */
function isForumSite(url: string, domain: string): boolean {
  const forumDomains = [
    'reddit.com',
    'quora.com',
    'stackoverflow.com',
    'stackexchange.com',
    'medium.com',
    'linkedin.com/pulse',
    'facebook.com',
    'twitter.com',
    'x.com',
  ];
  
  return forumDomains.some(forumDomain => domain.includes(forumDomain) || url.includes(forumDomain));
}

/**
 * Classify content type based on word count and structure
 */
function classifyContentType(wordCount: number, isForum: boolean): CompetitorPage['contentType'] {
  if (isForum) return 'forum';
  if (wordCount < 600) return 'thin';
  if (wordCount >= 1500) return 'strong';
  return 'unknown';
}

/**
 * Extract word count from HTML content
 */
function extractWordCount(html: string): number {
  const $ = cheerio.load(html);
  
  // Remove script, style, nav, footer, header
  $('script, style, nav, footer, header, aside').remove();
  
  // Get main content (try common content selectors)
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '#content',
    'body',
  ];
  
  let content = '';
  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text();
      break;
    }
  }
  
  if (!content) {
    content = $('body').text();
  }
  
  // Count words
  const words = content
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(word => word.length > 0);
  
  return words.length;
}

/**
 * Check if keyword appears in page title
 */
function checkTitleMatch(title: string, keyword: string): boolean {
  const normalizedTitle = title.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();
  
  // Check for exact match or partial match
  return normalizedTitle.includes(normalizedKeyword);
}

/**
 * Fetch and analyze a competitor page
 */
async function analyzeCompetitorPage(
  url: string,
  keyword: string
): Promise<CompetitorPage | null> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DomainAnalyzer/1.0)',
      },
      maxRedirects: 3,
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    const title = $('title').text().trim() || 'Untitled';
    const wordCount = extractWordCount(html);
    const domain = new URL(url).hostname;
    const isForum = isForumSite(url, domain);
    const contentType = classifyContentType(wordCount, isForum);
    const hasTitleMatch = checkTitleMatch(title, keyword);
    
    return {
      url,
      title,
      wordCount,
      hasTitleMatch,
      contentType,
      domain,
    };
  } catch (error: any) {
    console.error(`Error analyzing competitor page ${url}:`, error.message);
    return null;
  }
}

/**
 * Search Google for top ranking URLs (mock implementation)
 * In production, integrate with Google Custom Search API or SerpAPI
 */
async function searchTopRankingURLs(keyword: string): Promise<string[]> {
  // Mock implementation - returns placeholder URLs
  // In production, replace with actual Google Custom Search API or SerpAPI
  
  // For now, return mock URLs based on keyword type
  const wordCount = keyword.split(' ').length;
  
  if (wordCount >= 4) {
    // Long-tail keywords often have forum results
    return [
      `https://www.reddit.com/r/sample/comments/sample-${keyword.replace(/\s+/g, '-')}`,
      `https://www.example.com/blog/${keyword.replace(/\s+/g, '-')}`,
      `https://www.quora.com/What-is-${keyword.replace(/\s+/g, '-')}`,
    ];
  } else {
    // Short keywords often have strong content
    return [
      `https://www.wikipedia.org/wiki/${keyword.replace(/\s+/g, '_')}`,
      `https://www.example.com/${keyword.replace(/\s+/g, '-')}`,
      `https://www.authority-site.com/${keyword.replace(/\s+/g, '-')}`,
    ];
  }
}

/**
 * Analyze top competitors for a keyword
 */
export async function analyzeKeywordCompetitors(
  keyword: string
): Promise<CompetitorAnalysis> {
  // Get top 3 ranking URLs
  const topURLs = await searchTopRankingURLs(keyword);
  
  // Analyze each competitor page
  const analysisPromises = topURLs.map(url => analyzeCompetitorPage(url, keyword));
  const results = await Promise.all(analysisPromises);
  
  // Filter out failed requests
  const topCompetitors = results.filter((page): page is CompetitorPage => page !== null);
  
  // Calculate statistics
  const averageWordCount = topCompetitors.length > 0
    ? Math.round(topCompetitors.reduce((sum, page) => sum + page.wordCount, 0) / topCompetitors.length)
    : 0;
  
  const forumCount = topCompetitors.filter(page => page.contentType === 'forum').length;
  const thinContentCount = topCompetitors.filter(page => page.contentType === 'thin').length;
  
  return {
    keyword,
    topCompetitors,
    averageWordCount,
    forumCount,
    thinContentCount,
  };
}

/**
 * Batch analyze multiple keywords
 */
export async function batchAnalyzeKeywords(
  keywords: string[]
): Promise<Map<string, CompetitorAnalysis>> {
  const results = new Map<string, CompetitorAnalysis>();
  
  // Process in batches of 3 to avoid overwhelming servers
  for (let i = 0; i < keywords.length; i += 3) {
    const batch = keywords.slice(i, i + 3);
    const batchPromises = batch.map(keyword => analyzeKeywordCompetitors(keyword));
    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach((analysis, index) => {
      results.set(batch[index], analysis);
    });
    
    // Small delay between batches
    if (i + 3 < keywords.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
