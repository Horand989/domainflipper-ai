import { invokeLLM } from './_core/llm';
import { findZombiePages, type ZombiePage } from './zombiePageHunter';
import { type OpportunityScore } from './opportunityScorer';

export interface LaunchTask {
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  category: 'zombie_page' | 'keyword_content' | 'technical' | 'marketing';
  completed: boolean;
  url?: string;
  keyword?: string;
  targetWordCount?: number;
}

export interface LaunchBrief {
  domain: string;
  generatedAt: string;
  summary: string;
  zombiePageTasks: LaunchTask[];
  keywordContentTasks: LaunchTask[];
  technicalTasks: LaunchTask[];
  marketingTasks: LaunchTask[];
  estimatedCompletionDays: number;
}

/**
 * Generate a comprehensive 30-day launch strategy for a domain
 * Combines zombie page recovery with high-opportunity keyword targeting
 */
export async function generateLaunchBrief(
  domain: string,
  keywords: string[],
  keywordScores?: OpportunityScore[]
): Promise<LaunchBrief> {
  
  // Step 1: Find zombie pages
  const zombiePages = await findZombiePages(domain);
  const topZombiePages = zombiePages.slice(0, 3);

  // Step 2: Identify Easy Win keywords
  const easyWinKeywords = keywordScores
    ? keywordScores
        .filter(score => score.winProbability >= 75)
        .sort((a, b) => b.winProbability - a.winProbability)
        .slice(0, 3)
    : [];

  // Step 3: Use AI to generate strategic recommendations
  const aiPrompt = `
You are an SEO strategist creating a 30-day launch plan for the domain: ${domain}

ZOMBIE PAGES (Dead URLs with historical backlinks):
${topZombiePages.map((page, i) => `
${i + 1}. ${page.originalPath}
   - Last crawled: ${page.lastCrawled}
   - Estimated backlinks: ${page.estimatedLinks}
   - Traffic potential: ${page.estimatedTraffic}
`).join('\n')}

EASY WIN KEYWORDS (High-probability ranking opportunities):
${easyWinKeywords.map((kw, i) => `
${i + 1}. "${kw.keyword}" (${kw.winProbability}% win probability)
   - Verdict: ${kw.verdictLabel}
   - Reason: ${kw.reasoning}
`).join('\n')}

Generate a strategic 30-day launch plan with specific, actionable tasks. Return JSON in this exact format:
{
  "summary": "2-3 sentence executive summary of the strategy",
  "zombiePageTasks": [
    {
      "title": "Recreate [URL]",
      "description": "Why this page matters and what it should contain",
      "action": "Step-by-step instructions for recreating the page",
      "estimatedTime": "e.g., 4-6 hours",
      "targetWordCount": 1500,
      "url": "the original path"
    }
  ],
  "keywordContentTasks": [
    {
      "title": "Write article targeting '[keyword]'",
      "description": "Why this keyword is an easy win",
      "action": "Specific content brief with title suggestion and outline",
      "estimatedTime": "e.g., 3-5 hours",
      "targetWordCount": 2000,
      "keyword": "the target keyword"
    }
  ],
  "technicalTasks": [
    {
      "title": "Task name",
      "description": "What and why",
      "action": "How to do it",
      "estimatedTime": "time estimate"
    }
  ],
  "marketingTasks": [
    {
      "title": "Task name",
      "description": "What and why",
      "action": "How to do it",
      "estimatedTime": "time estimate"
    }
  ],
  "estimatedCompletionDays": 30
}

Focus on quick wins that leverage the domain's existing authority. Be specific and actionable.
`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are an expert SEO strategist specializing in expired domain resurrection.' },
      { role: 'user', content: aiPrompt }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'launch_brief',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            zombiePageTasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  action: { type: 'string' },
                  estimatedTime: { type: 'string' },
                  targetWordCount: { type: 'number' },
                  url: { type: 'string' }
                },
                required: ['title', 'description', 'action', 'estimatedTime'],
                additionalProperties: false
              }
            },
            keywordContentTasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  action: { type: 'string' },
                  estimatedTime: { type: 'string' },
                  targetWordCount: { type: 'number' },
                  keyword: { type: 'string' }
                },
                required: ['title', 'description', 'action', 'estimatedTime'],
                additionalProperties: false
              }
            },
            technicalTasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  action: { type: 'string' },
                  estimatedTime: { type: 'string' }
                },
                required: ['title', 'description', 'action', 'estimatedTime'],
                additionalProperties: false
              }
            },
            marketingTasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  action: { type: 'string' },
                  estimatedTime: { type: 'string' }
                },
                required: ['title', 'description', 'action', 'estimatedTime'],
                additionalProperties: false
              }
            },
            estimatedCompletionDays: { type: 'number' }
          },
          required: ['summary', 'zombiePageTasks', 'keywordContentTasks', 'technicalTasks', 'marketingTasks', 'estimatedCompletionDays'],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (typeof content !== 'string') {
    throw new Error('Invalid AI response format');
  }

  const aiPlan = JSON.parse(content);

  // Convert AI response to structured LaunchBrief with IDs and categories
  const launchBrief: LaunchBrief = {
    domain,
    generatedAt: new Date().toISOString(),
    summary: aiPlan.summary,
    zombiePageTasks: aiPlan.zombiePageTasks.map((task: any, i: number) => ({
      id: `zombie-${i + 1}`,
      ...task,
      priority: 'high' as const,
      category: 'zombie_page' as const,
      completed: false
    })),
    keywordContentTasks: aiPlan.keywordContentTasks.map((task: any, i: number) => ({
      id: `keyword-${i + 1}`,
      ...task,
      priority: 'high' as const,
      category: 'keyword_content' as const,
      completed: false
    })),
    technicalTasks: aiPlan.technicalTasks.map((task: any, i: number) => ({
      id: `technical-${i + 1}`,
      ...task,
      priority: 'medium' as const,
      category: 'technical' as const,
      completed: false
    })),
    marketingTasks: aiPlan.marketingTasks.map((task: any, i: number) => ({
      id: `marketing-${i + 1}`,
      ...task,
      priority: 'low' as const,
      category: 'marketing' as const,
      completed: false
    })),
    estimatedCompletionDays: aiPlan.estimatedCompletionDays
  };

  return launchBrief;
}
