import { invokeLLM } from './_core/llm';
import { getHistoricalContent, HistoricalContent } from './waybackMachine';

export type TierLevel = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4';
export type RiskLevel = 'Safe' | 'Moderate' | 'Critical';

export interface ForensicAnalysisResult {
  finalTier: TierLevel;
  riskLevel: RiskLevel;
  primaryIdentity: string;
  badges: string[];
  reasoning: string;
  evidence: string;
  historicalSnapshots: {
    year: number;
    content: string;
  }[];
}

const FORENSIC_SYSTEM_PROMPT = `### ROLE
You are a "Google Search Quality Rater" and an Expert Forensic SEO Auditor. Your goal is to analyze the historical text of a domain name (from Wayback Machine snapshots) to determine its "Trust Flow" and "E-E-A-T" status. You are cynical and highly sensitive to spam, PBNs (Private Blog Networks), and repurposed domains.

### INPUT DATA
You will receive a set of text snapshots labeled by Date (Year).
[Example Input Format: "2015: [Text...]", "2019: [Text...]", "2023: [Text...]"]

### CLASSIFICATION RUBRIC
Classify the domain's history into ONE of the following Tiers:

**TIER 1: GOLD (High Trust)**
* **Criteria:** Official government (.gov), accredited educational institutions (.edu links), or registered non-profits.
* **Signals:** Mission statements, 501(c)(3) disclosure, physical address consistency, "Board of Directors" pages.

**TIER 2: SILVER (Legitimate Business/Persona)**
* **Criteria:** Consistent Small/Medium Business (SMB), Niche Expert Blog, or Personal Portfolio.
* **Signals:** Consistent "Name, Address, Phone" (NAP), real author bios, clear topical focus (e.g., only talks about plumbing), no sudden language changes.

**TIER 3: BRONZE (Low Value/Generic)**
* **Criteria:** General directories, thin affiliate sites, drop-shipping, or generic "content farms."
* **Signals:** Aggressive ads, generic "About Us" text, slight topical incoherence (e.g., "Best Toaster" next to "Credit Cards").

**TIER 4: TOXIC (Burned/Spam)**
* **Criteria:** Gambling, Adult, Pharma, PBNs, Hacked sites, or "Spam Zombification" (where a legit site turned into spam).
* **Signals:**
    * **Keywords:** "Casino," "Slots," "Viagra," "Cialis," "Escort," "Free Download," "Warez."
    * **PBN Footprints:** "Write for us," "Guest Post," "Sponsored," generic WordPress themes, topics that make no sense together (e.g., "Roofing" next to "Crypto").
    * **Language Swaps:** A site that was English in 2015 but Chinese/Russian/Indonesian in 2019 is AUTOMATICALLY Toxic.

### ANALYSIS LOGIC
1.  **Continuity Check:** If a domain was Tier 1 or 2 in the past, but Tier 4 in a later snapshot, the Final Status is **TOXIC**. (A good history does not save a burned domain).
2.  **Topical Consistency:** If the domain went from "Bakery" (2015) to "Crypto" (2019) to "Bakery" (2023), flag as **Suspicious/Hacked**.
3.  **Language Detection:** Detect the primary language of each snapshot. If it changes drastically (e.g., EN -> RU -> EN), flag as **Toxic**.

### OUTPUT FORMAT (Strict JSON)
You MUST respond with valid JSON only, no additional text:
{
  "final_tier": "Tier 1 | Tier 2 | Tier 3 | Tier 4",
  "risk_level": "Safe | Moderate | Critical",
  "primary_identity": "e.g., Local Bakery, Personal Blog, Gambling Portal",
  "badges": ["List applicable badges: e.g., 'Former Non-Profit', 'Language Swap Detected', 'PBN Footprint', 'Consistent History'"],
  "reasoning": "A concise 2-sentence explanation of why you chose this tier.",
  "evidence": "Extract 1-2 short text snippets that justify the classification (e.g., 'Found keywords: Online Slots')."
}`;

/**
 * Analyze domain history using AI to classify trust level
 * @param historicalContent - Array of historical snapshots with text content
 * @returns Forensic analysis result with tier classification
 */
export async function analyzeForensicHistory(
  historicalContent: HistoricalContent[]
): Promise<ForensicAnalysisResult> {
  if (historicalContent.length === 0) {
    return {
      finalTier: 'Tier 3',
      riskLevel: 'Moderate',
      primaryIdentity: 'Unknown - No Historical Data',
      badges: ['No Archive Data'],
      reasoning: 'No historical snapshots found in Wayback Machine. Unable to verify domain history.',
      evidence: 'Domain has no archived content available.',
      historicalSnapshots: [],
    };
  }

  // Format historical content for AI analysis
  const formattedInput = historicalContent
    .map(snapshot => `${snapshot.year}: ${snapshot.text}`)
    .join('\n\n---\n\n');

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: FORENSIC_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze the following historical snapshots and classify this domain:\n\n${formattedInput}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'forensic_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              final_tier: {
                type: 'string',
                enum: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'],
                description: 'The final trust tier classification',
              },
              risk_level: {
                type: 'string',
                enum: ['Safe', 'Moderate', 'Critical'],
                description: 'The risk level for purchasing this domain',
              },
              primary_identity: {
                type: 'string',
                description: 'The primary identity of the domain (e.g., Local Bakery, Gambling Portal)',
              },
              badges: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of applicable badges (e.g., Former Non-Profit, PBN Footprint)',
              },
              reasoning: {
                type: 'string',
                description: 'A concise 2-sentence explanation of the tier classification',
              },
              evidence: {
                type: 'string',
                description: 'Short text snippets that justify the classification',
              },
            },
            required: ['final_tier', 'risk_level', 'primary_identity', 'badges', 'reasoning', 'evidence'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentString);

    return {
      finalTier: result.final_tier,
      riskLevel: result.risk_level,
      primaryIdentity: result.primary_identity,
      badges: result.badges,
      reasoning: result.reasoning,
      evidence: result.evidence,
      historicalSnapshots: historicalContent.map(snapshot => ({
        year: snapshot.year,
        content: snapshot.text.substring(0, 300) + '...', // Store truncated version
      })),
    };
  } catch (error: any) {
    console.error('Error in forensic analysis:', error.message);
    
    // Fallback: Basic keyword-based analysis
    return performBasicAnalysis(historicalContent);
  }
}

/**
 * Fallback analysis using basic keyword detection
 * @param historicalContent - Historical snapshots
 * @returns Basic forensic analysis result
 */
function performBasicAnalysis(historicalContent: HistoricalContent[]): ForensicAnalysisResult {
  const allText = historicalContent.map(s => s.text.toLowerCase()).join(' ');
  
  // Toxic keywords
  const toxicKeywords = [
    'casino', 'slots', 'poker', 'gambling', 'viagra', 'cialis', 'escort',
    'porn', 'xxx', 'adult', 'warez', 'crack', 'keygen', 'torrent',
  ];
  
  // PBN footprints
  const pbnKeywords = ['write for us', 'guest post', 'sponsored post', 'link exchange'];
  
  const hasToxicKeywords = toxicKeywords.some(keyword => allText.includes(keyword));
  const hasPBNFootprints = pbnKeywords.some(keyword => allText.includes(keyword));
  
  if (hasToxicKeywords) {
    return {
      finalTier: 'Tier 4',
      riskLevel: 'Critical',
      primaryIdentity: 'Spam/Adult/Gambling Site',
      badges: ['Toxic Keywords Detected', 'High Risk'],
      reasoning: 'Domain contains spam-related keywords commonly associated with low-quality or harmful content. Not recommended for purchase.',
      evidence: `Found toxic keywords in historical content.`,
      historicalSnapshots: historicalContent.map(s => ({ year: s.year, content: s.text.substring(0, 300) + '...' })),
    };
  }
  
  if (hasPBNFootprints) {
    return {
      finalTier: 'Tier 4',
      riskLevel: 'Critical',
      primaryIdentity: 'Private Blog Network (PBN)',
      badges: ['PBN Footprint', 'Link Scheme'],
      reasoning: 'Domain shows signs of being part of a Private Blog Network, which violates Google guidelines. High risk for SEO penalties.',
      evidence: 'Found PBN-related phrases like "write for us" or "guest post".',
      historicalSnapshots: historicalContent.map(s => ({ year: s.year, content: s.text.substring(0, 300) + '...' })),
    };
  }
  
  // Default to Bronze if no red flags
  return {
    finalTier: 'Tier 3',
    riskLevel: 'Moderate',
    primaryIdentity: 'Generic Website',
    badges: ['No Major Red Flags', 'Basic Analysis'],
    reasoning: 'No obvious toxic signals detected, but unable to verify high trust indicators. Proceed with caution.',
    evidence: 'Basic keyword analysis completed without AI assistance.',
    historicalSnapshots: historicalContent.map(s => ({ year: s.year, content: s.text.substring(0, 300) + '...' })),
  };
}

/**
 * Main function: Perform complete forensic analysis on a domain
 * @param domain - Domain name to analyze
 * @returns Complete forensic analysis result
 */
export async function performForensicAnalysis(domain: string): Promise<ForensicAnalysisResult> {
  // Fetch historical content from Wayback Machine
  const historicalContent = await getHistoricalContent(domain);
  
  // Analyze with AI
  const result = await analyzeForensicHistory(historicalContent);
  
  return result;
}
