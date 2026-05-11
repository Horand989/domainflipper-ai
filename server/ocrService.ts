import { invokeLLM } from "./_core/llm";

/**
 * OCR Service for extracting domain data from SpamZilla screenshots
 * Uses Google Vision API via LLM with vision capabilities
 */

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

export interface ParsedDomainData {
  domainName: string;
  trustFlow: number | null;
  citationFlow: number | null;
  majTopics: string;
  source: string | null;
  age: number | null;
  szScore: number | null;
  redirects: number | null;
  parked: number | null;
  drops: number | null;
  googleIndex: number | null;
  outLinksInternal: number | null;
  outLinksExternal: number | null;
  semRank: number | null;
  dateAdded: string | null;
  price: number | null;
  expires: string | null;
}

/**
 * Extract text from image using Vision API via LLM
 */
export async function extractTextFromImage(imageUrl: string): Promise<OCRResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an OCR assistant. Extract ALL text from the image exactly as it appears, preserving table structure and layout. Return only the extracted text.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this SpamZilla domain list screenshot. Preserve the table structure.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const extractedText = response.choices[0]?.message?.content;

    if (typeof extractedText === "string" && extractedText.length > 0) {
      return {
        success: true,
        text: extractedText,
        confidence: 0.95,
      };
    }

    return {
      success: false,
      error: "No text extracted from image",
    };
  } catch (error) {
    console.error("[OCR] Error extracting text:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown OCR error",
    };
  }
}

/**
 * Parse SpamZilla table data from OCR text using AI
 */
export async function parseSpamZillaData(ocrText: string): Promise<ParsedDomainData[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a data extraction assistant. Parse SpamZilla domain data from OCR text and return structured JSON.",
        },
        {
          role: "user",
          content: `Parse this SpamZilla table data and extract domain information. Return a JSON array of domains with these fields:
- domainName (string, required)
- trustFlow (number or null)
- citationFlow (number or null)
- majTopics (string, comma-separated topics)
- source (string or null)
- age (number or null)
- szScore (number or null)
- redirects (number or null)
- parked (number or null)
- drops (number or null)
- googleIndex (number or null)
- outLinksInternal (number or null)
- outLinksExternal (number or null)
- semRank (number or null)
- dateAdded (string YYYY-MM-DD or null)
- price (number or null)
- expires (string YYYY-MM-DD or null)

OCR Text:
${ocrText}

Return ONLY valid JSON array, no explanations.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "spamzilla_domains",
          strict: true,
          schema: {
            type: "object",
            properties: {
              domains: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    domainName: { type: "string" },
                    trustFlow: { type: ["number", "null"] },
                    citationFlow: { type: ["number", "null"] },
                    majTopics: { type: "string" },
                    source: { type: ["string", "null"] },
                    age: { type: ["number", "null"] },
                    szScore: { type: ["number", "null"] },
                    redirects: { type: ["number", "null"] },
                    parked: { type: ["number", "null"] },
                    drops: { type: ["number", "null"] },
                    googleIndex: { type: ["number", "null"] },
                    outLinksInternal: { type: ["number", "null"] },
                    outLinksExternal: { type: ["number", "null"] },
                    semRank: { type: ["number", "null"] },
                    dateAdded: { type: ["string", "null"] },
                    price: { type: ["number", "null"] },
                    expires: { type: ["string", "null"] },
                  },
                  required: ["domainName", "majTopics"],
                  additionalProperties: false,
                },
              },
            },
            required: ["domains"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return parsed.domains || [];
    }

    return [];
  } catch (error) {
    console.error("[OCR] Error parsing SpamZilla data:", error);
    return [];
  }
}

/**
 * Complete OCR workflow: extract and parse
 */
export async function processSpamZillaScreenshot(
  imageUrl: string
): Promise<{ success: boolean; domains: ParsedDomainData[]; error?: string }> {
  // Step 1: Extract text from image
  const ocrResult = await extractTextFromImage(imageUrl);

  if (!ocrResult.success || !ocrResult.text) {
    return {
      success: false,
      domains: [],
      error: ocrResult.error || "Failed to extract text from image",
    };
  }

  // Step 2: Parse domain data from text
  const domains = await parseSpamZillaData(ocrResult.text);

  if (domains.length === 0) {
    return {
      success: false,
      domains: [],
      error: "No domains found in the extracted text",
    };
  }

  return {
    success: true,
    domains,
  };
}
