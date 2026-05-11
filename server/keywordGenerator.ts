import { invokeLLM } from "./_core/llm";
import { calculateBulkKeywordMetrics, type KeywordMetrics } from "./keywordMetrics";

/**
 * Extract keywords from domain name by analyzing its structure
 */
export function extractKeywordsFromDomainName(domainName: string): string[] {
  // Remove TLD
  const nameWithoutTld = domainName.split('.')[0];
  
  // Split by common separators
  const parts = nameWithoutTld
    .split(/[-_]/)
    .flatMap(part => {
      // Split camelCase
      return part.split(/(?=[A-Z])/).map(p => p.toLowerCase());
    })
    .filter(part => part.length > 2); // Filter out very short parts
  
  // Remove common words
  const stopWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that'];
  const keywords = parts.filter(word => !stopWords.includes(word));
  
  return Array.from(new Set(keywords)); // Remove duplicates
}

/**
 * Generate keywords using AI based on domain name and niche
 */
export async function generateKeywordsFromDomain(
  domainName: string,
  niche?: string,
  existingTopics?: string
): Promise<KeywordMetrics[]> {
  const domainKeywords = extractKeywordsFromDomainName(domainName);
  
  const prompt = `Analyze the domain name "${domainName}" and generate 30 relevant SEO keywords.

${niche ? `Niche/Industry: ${niche}` : ''}
${existingTopics ? `Known Topics: ${existingTopics}` : ''}
${domainKeywords.length > 0 ? `Domain Components: ${domainKeywords.join(', ')}` : ''}

Generate keywords that:
1. Are relevant to the domain's likely purpose
2. Include industry-specific terms
3. Cover both broad and specific topics
4. Are suitable for SEO and content strategy

Return ONLY a JSON array of keyword strings, no additional text.
Example format: ["keyword1", "keyword2", "keyword3"]`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an SEO keyword research expert. Always respond with valid JSON arrays only." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "keywords",
        strict: true,
        schema: {
          type: "object",
          properties: {
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Array of SEO keywords"
            }
          },
          required: ["keywords"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No response from AI");
  }

  const parsed = JSON.parse(content);
  const keywords = parsed.keywords || [];
  
  // Calculate metrics for each keyword
  return calculateBulkKeywordMetrics(keywords);
}

/**
 * Generate long-tail keyword suggestions using AI
 */
export async function generateLongTailKeywords(
  domainName: string,
  primaryKeywords: string[],
  niche?: string
): Promise<KeywordMetrics[]> {
  const prompt = `Generate 50 long-tail keyword phrases for the domain "${domainName}".

${niche ? `Niche/Industry: ${niche}` : ''}
Primary Keywords: ${primaryKeywords.slice(0, 10).join(', ')}

Long-tail keywords should:
1. Be 3-5 words long
2. Have specific search intent
3. Be less competitive than broad keywords
4. Include question-based phrases
5. Target buyer intent where applicable
6. Be natural and conversational

Return ONLY a JSON array of long-tail keyword strings, no additional text.
Example format: ["how to use keyword1 for beginners", "best keyword2 tools for small business"]`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an SEO keyword research expert specializing in long-tail keywords. Always respond with valid JSON arrays only." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "long_tail_keywords",
        strict: true,
        schema: {
          type: "object",
          properties: {
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Array of long-tail keyword phrases"
            }
          },
          required: ["keywords"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No response from AI");
  }

  const parsed = JSON.parse(content);
  const keywords = parsed.keywords || [];
  
  // Calculate metrics for each keyword
  return calculateBulkKeywordMetrics(keywords);
}

/**
 * Fetch historical content from Archive.org and extract keywords
 */
export async function generateKeywordsFromArchive(domainName: string): Promise<KeywordMetrics[]> {
  try {
    // Fetch available snapshots from Archive.org
    const availabilityUrl = `https://archive.org/wayback/available?url=${domainName}`;
    const availabilityResponse = await fetch(availabilityUrl);
    
    if (!availabilityResponse.ok) {
      throw new Error("Failed to fetch Archive.org data");
    }
    
    const availabilityData = await availabilityResponse.json();
    const snapshot = availabilityData?.archived_snapshots?.closest;
    
    if (!snapshot || !snapshot.available) {
      // No archive available, fall back to domain name analysis
      const fallbackKeywords = extractKeywordsFromDomainName(domainName);
      return calculateBulkKeywordMetrics(fallbackKeywords);
    }
    
    // Fetch the archived page content
    const archiveUrl = snapshot.url;
    const contentResponse = await fetch(archiveUrl);
    const htmlContent = await contentResponse.text();
    
    // Extract text content (remove HTML tags)
    const textContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000); // Limit to first 5000 characters
    
    // Use AI to extract keywords from content
    const prompt = `Extract 30 relevant keywords from this website content:

${textContent}

Focus on:
1. Main topics and themes
2. Industry-specific terms
3. Product/service names
4. Target audience indicators

Return ONLY a JSON array of keyword strings, no additional text.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an SEO keyword extraction expert. Always respond with valid JSON arrays only." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extracted_keywords",
          strict: true,
          schema: {
            type: "object",
            properties: {
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "Array of extracted keywords"
              }
            },
            required: ["keywords"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    const keywords = parsed.keywords || [];
    
    // Calculate metrics for each keyword
    return calculateBulkKeywordMetrics(keywords);
    
  } catch (error) {
    console.error("Error fetching from Archive.org:", error);
    // Fall back to domain name analysis
    const fallbackKeywords = extractKeywordsFromDomainName(domainName);
    return calculateBulkKeywordMetrics(fallbackKeywords);
  }
}
