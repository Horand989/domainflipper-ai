import { CompetitorAnalysis, CompetitorPage } from './competitorAnalysisScraper';

export interface OpportunityScore {
  keyword: string;
  winProbability: number; // 0-100
  verdict: 'easy_win' | 'good_shot' | 'hidden_gem' | 'medium' | 'too_hard';
  verdictLabel: string;
  verdictIcon: string;
  reasoning: string;
  evidence: {
    keywordLength: number;
    wordCount: string;
    topCompetitorType: string;
    hasTitleMatch: boolean;
    forumCount: number;
  };
}

/**
 * Count words in a keyword phrase
 */
function getKeywordLength(keyword: string): number {
  return keyword.trim().split(/\s+/).length;
}

/**
 * Get the dominant competitor type from analysis
 */
function getDominantCompetitorType(analysis: CompetitorAnalysis): CompetitorPage['contentType'] {
  if (analysis.forumCount > 0) return 'forum';
  if (analysis.thinContentCount > 0) return 'thin';
  if (analysis.averageWordCount >= 1500) return 'strong';
  return 'unknown';
}

/**
 * Calculate win probability using the Hybrid Opportunity Algorithm
 * 
 * Logic Map:
 * - Long (4+ words) + Thin content (< 600 words) = 95% (Easy Win)
 * - Long (4+ words) + Strong content (> 1500 words) = 75% (Good Shot)
 * - Short (2-3 words) + Forum/UGC = 90% (Hidden Gem)
 * - Short (2-3 words) + Thin content = 60% (Medium)
 * - Short (2-3 words) + Strong content = 10% (Too Hard)
 */
export function calculateWinProbability(
  keyword: string,
  competitorAnalysis: CompetitorAnalysis
): OpportunityScore {
  const keywordLength = getKeywordLength(keyword);
  const dominantType = getDominantCompetitorType(competitorAnalysis);
  const averageWordCount = competitorAnalysis.averageWordCount;
  const hasTitleMatch = competitorAnalysis.topCompetitors.some(c => c.hasTitleMatch);
  
  let winProbability = 50; // Default
  let verdict: OpportunityScore['verdict'] = 'medium';
  let verdictLabel = '🟡 Medium';
  let verdictIcon = '🟡';
  let reasoning = '';
  
  // Apply the Hybrid Opportunity Algorithm
  if (keywordLength >= 4) {
    // Long-tail keywords
    if (averageWordCount < 600 || dominantType === 'thin') {
      winProbability = 95;
      verdict = 'easy_win';
      verdictLabel = '🟢 Easy Win';
      verdictIcon = '🟢';
      reasoning = `Long-tail keyword (${keywordLength} words) competing against thin content (avg ${averageWordCount} words). This is a guaranteed win - low competition with high specificity.`;
    } else if (averageWordCount >= 1500 || dominantType === 'strong') {
      winProbability = 75;
      verdict = 'good_shot';
      verdictLabel = '🟢 Good Shot';
      verdictIcon = '🟢';
      reasoning = `Long-tail keyword (${keywordLength} words) with strong competitors (avg ${averageWordCount} words). You have a good shot with targeted, in-depth content.`;
    } else {
      winProbability = 85;
      verdict = 'easy_win';
      verdictLabel = '🟢 Easy Win';
      verdictIcon = '🟢';
      reasoning = `Long-tail keyword (${keywordLength} words) with moderate competition (avg ${averageWordCount} words). High probability of ranking with quality content.`;
    }
  } else if (keywordLength >= 2) {
    // Short keywords (2-3 words)
    if (dominantType === 'forum' || competitorAnalysis.forumCount > 0) {
      winProbability = 90;
      verdict = 'hidden_gem';
      verdictLabel = '💎 Hidden Gem';
      verdictIcon = '💎';
      reasoning = `Short keyword (${keywordLength} words) dominated by forums/UGC (${competitorAnalysis.forumCount} forum results). This is a rare gem - you can outrank user-generated content with a proper article.`;
    } else if (averageWordCount < 600 || dominantType === 'thin') {
      winProbability = 60;
      verdict = 'medium';
      verdictLabel = '🟡 Medium';
      verdictIcon = '🟡';
      reasoning = `Short keyword (${keywordLength} words) with thin competitors (avg ${averageWordCount} words). Possible to rank with comprehensive content, but requires effort.`;
    } else if (averageWordCount >= 1500 || dominantType === 'strong') {
      winProbability = 10;
      verdict = 'too_hard';
      verdictLabel = '🔴 Too Hard';
      verdictIcon = '🔴';
      reasoning = `Short keyword (${keywordLength} words) with strong authority content (avg ${averageWordCount} words). This is a hard target - requires significant SEO investment and domain authority.`;
    } else {
      winProbability = 40;
      verdict = 'medium';
      verdictLabel = '🟡 Medium';
      verdictIcon = '🟡';
      reasoning = `Short keyword (${keywordLength} words) with moderate competition (avg ${averageWordCount} words). Challenging but achievable with quality content and backlinks.`;
    }
  } else {
    // Single-word keywords (very competitive)
    winProbability = 5;
    verdict = 'too_hard';
    verdictLabel = '🔴 Too Hard';
    verdictIcon = '🔴';
    reasoning = `Single-word keyword - extremely competitive. Requires massive SEO investment and established domain authority. Not recommended unless you have significant resources.`;
  }
  
  // Bonus: Title match increases probability slightly
  if (hasTitleMatch && winProbability < 95) {
    winProbability = Math.min(100, winProbability + 5);
    reasoning += ` Competitors have title match, indicating keyword focus.`;
  }
  
  return {
    keyword,
    winProbability,
    verdict,
    verdictLabel,
    verdictIcon,
    reasoning,
    evidence: {
      keywordLength,
      wordCount: `${averageWordCount} words (avg)`,
      topCompetitorType: dominantType,
      hasTitleMatch,
      forumCount: competitorAnalysis.forumCount,
    },
  };
}

/**
 * Batch calculate opportunity scores for multiple keywords
 */
export function batchCalculateOpportunityScores(
  competitorAnalysisMap: Map<string, CompetitorAnalysis>
): Map<string, OpportunityScore> {
  const scores = new Map<string, OpportunityScore>();
  
  const entries = Array.from(competitorAnalysisMap.entries());
  for (const [keyword, analysis] of entries) {
    const score = calculateWinProbability(keyword, analysis);
    scores.set(keyword, score);
  }
  
  return scores;
}

/**
 * Sort keywords by opportunity score (highest first)
 */
export function sortByOpportunity(scores: OpportunityScore[]): OpportunityScore[] {
  return scores.sort((a, b) => b.winProbability - a.winProbability);
}

/**
 * Filter keywords by minimum win probability
 */
export function filterByMinProbability(
  scores: OpportunityScore[],
  minProbability: number
): OpportunityScore[] {
  return scores.filter(score => score.winProbability >= minProbability);
}

/**
 * Get keywords by verdict type
 */
export function filterByVerdict(
  scores: OpportunityScore[],
  verdicts: OpportunityScore['verdict'][]
): OpportunityScore[] {
  return scores.filter(score => verdicts.includes(score.verdict));
}
