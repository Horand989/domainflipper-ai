/**
 * Brandability Scoring Service
 * Scores domain names on a 0-100 scale based on memorability, pronounceability, and brandability factors
 */

export interface BrandabilityScore {
  score: number; // 0-100
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  factors: {
    length: number; // 0-25 points
    pronounceability: number; // 0-25 points
    memorability: number; // 0-25 points
    keywords: number; // 0-25 points
  };
  flags: string[]; // Issues like hyphens, numbers, etc.
  recommendations: string[];
}

/**
 * Calculate brandability score for a domain name
 */
export function calculateBrandabilityScore(domainName: string, keywords?: string[]): BrandabilityScore {
  // Remove TLD for analysis
  const nameWithoutTLD = domainName.split('.')[0].toLowerCase();
  
  const factors = {
    length: scoreDomainLength(nameWithoutTLD),
    pronounceability: scorePronounceability(nameWithoutTLD),
    memorability: scoreMemorability(nameWithoutTLD),
    keywords: scoreKeywordRelevance(nameWithoutTLD, keywords || []),
  };

  const score = Math.round(factors.length + factors.pronounceability + factors.memorability + factors.keywords);
  
  const flags = identifyFlags(nameWithoutTLD);
  const recommendations = generateRecommendations(nameWithoutTLD, factors, flags);
  
  let grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  if (score >= 80) grade = 'Excellent';
  else if (score >= 65) grade = 'Good';
  else if (score >= 50) grade = 'Fair';
  else grade = 'Poor';

  return {
    score,
    grade,
    factors,
    flags,
    recommendations,
  };
}

/**
 * Score based on domain length (shorter is better)
 * 0-6 chars: 25 points
 * 7-10 chars: 20 points
 * 11-15 chars: 15 points
 * 16-20 chars: 10 points
 * 21+ chars: 5 points
 */
function scoreDomainLength(name: string): number {
  const length = name.length;
  if (length <= 6) return 25;
  if (length <= 10) return 20;
  if (length <= 15) return 15;
  if (length <= 20) return 10;
  return 5;
}

/**
 * Score pronounceability (avoid difficult consonant clusters)
 * Penalize:
 * - 4+ consecutive consonants: -5 points each
 * - 3 consecutive consonants: -2 points each
 * - Difficult combinations (xz, qx, etc.): -3 points each
 */
function scorePronounceability(name: string): number {
  let score = 25;
  const vowels = 'aeiou';
  
  // Check for consonant clusters
  let consecutiveConsonants = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name[i];
    if (!vowels.includes(char) && /[a-z]/.test(char)) {
      consecutiveConsonants++;
      if (consecutiveConsonants >= 4) {
        score -= 5;
      } else if (consecutiveConsonants === 3) {
        score -= 2;
      }
    } else {
      consecutiveConsonants = 0;
    }
  }
  
  // Check for difficult combinations
  const difficultCombos = ['xz', 'qx', 'zx', 'qz', 'xq'];
  for (const combo of difficultCombos) {
    if (name.includes(combo)) {
      score -= 3;
    }
  }
  
  return Math.max(0, score);
}

/**
 * Score memorability
 * Bonus points for:
 * - Repeating patterns (e.g., "bookly"): +5 points
 * - Rhyming or alliteration: +5 points
 * - Simple structure (consonant-vowel patterns): +5 points
 * 
 * Penalties:
 * - Numbers: -10 points
 * - Hyphens: -10 points per hyphen
 * - Mixed case issues: -5 points
 */
function scoreMemorability(name: string): number {
  let score = 15; // Base score
  
  // Penalty for numbers
  if (/\d/.test(name)) {
    score -= 10;
  }
  
  // Penalty for hyphens
  const hyphenCount = (name.match(/-/g) || []).length;
  score -= hyphenCount * 10;
    // Bonus for repeating letters (but not too many)
  const repeatingPattern = /(.)\1/.test(name);
  if (repeatingPattern && !/(.)\1{2,}/.test(name)) {
    score += 5;
  }
  
  // Bonus for simple consonant-vowel patterns
  const vowels = 'aeiou';
  let hasSimplePattern = true;
  for (let i = 0; i < name.length - 1; i++) {
    const isVowel1 = vowels.includes(name[i]);
    const isVowel2 = vowels.includes(name[i + 1]);
    // If we have 3+ consecutive vowels or consonants, it's not simple
    if (i < name.length - 2) {
      const isVowel3 = vowels.includes(name[i + 2]);
      if ((isVowel1 && isVowel2 && isVowel3) || (!isVowel1 && !isVowel2 && !isVowel3)) {
        hasSimplePattern = false;
        break;
      }
    }
  }
  if (hasSimplePattern && name.length >= 5) {
    score += 5;
  }
  
  return Math.max(0, Math.min(25, score));
}

/**
 * Score keyword relevance
 * Check if domain contains relevant keywords
 */
function scoreKeywordRelevance(name: string, keywords: string[]): number {
  if (keywords.length === 0) return 15; // Neutral score if no keywords provided
  
  let score = 0;
  const maxScore = 25;
  
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (name.includes(lowerKeyword)) {
      // Exact match: full points
      if (name === lowerKeyword) {
        score = maxScore;
        break;
      }
      // Partial match: proportional points
      score += Math.round((lowerKeyword.length / name.length) * maxScore);
    }
  }
  
  return Math.min(maxScore, score);
}

/**
 * Identify potential issues with the domain
 */
function identifyFlags(name: string): string[] {
  const flags: string[] = [];
  
  if (/\d/.test(name)) {
    flags.push('Contains numbers (harder to remember)');
  }
  
  if (/-/.test(name)) {
    flags.push('Contains hyphens (less brandable)');
  }
  
  if (name.length > 15) {
    flags.push('Long domain (harder to type and remember)');
  }
  
  if (!/[aeiou]/.test(name)) {
    flags.push('No vowels (very hard to pronounce)');
  }
  
  const consecutiveConsonants = name.match(/[^aeiou]{4,}/g);
  if (consecutiveConsonants) {
    flags.push(`Difficult to pronounce (${consecutiveConsonants.length} consonant cluster${consecutiveConsonants.length > 1 ? 's' : ''})`);
  }
  
  return flags;
}

/**
 * Generate recommendations for improvement
 */
function generateRecommendations(name: string, factors: BrandabilityScore['factors'], flags: string[]): string[] {
  const recommendations: string[] = [];
  
  if (factors.length < 15) {
    recommendations.push('Consider a shorter domain name (under 12 characters is ideal)');
  }
  
  if (factors.pronounceability < 15) {
    recommendations.push('Simplify pronunciation by reducing consonant clusters');
  }
  
  if (factors.memorability < 15) {
    if (/-/.test(name)) {
      recommendations.push('Remove hyphens for better brandability');
    }
    if (/\d/.test(name)) {
      recommendations.push('Remove numbers for better memorability');
    }
  }
  
  if (factors.keywords < 15) {
    recommendations.push('Consider including relevant keywords for SEO benefits');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Excellent brandability! This domain has strong potential.');
  }
  
  return recommendations;
}

/**
 * Batch score multiple domains
 */
export function scoreDomainsBatch(domains: string[], keywords?: string[]): Map<string, BrandabilityScore> {
  const results = new Map<string, BrandabilityScore>();
  
  for (const domain of domains) {
    results.set(domain, calculateBrandabilityScore(domain, keywords));
  }
  
  return results;
}
