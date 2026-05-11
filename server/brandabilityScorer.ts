/**
 * Brandability Analysis Service
 * Scores domains based on modern SEO principles that favor brandable names over keyword-stuffed domains
 */

export interface BrandabilityScore {
  totalScore: number; // 0-100
  lengthScore: number;
  hyphenScore: number;
  pronounceabilityScore: number;
  memorabilityScore: number;
  breakdown: {
    length: number;
    hyphens: number;
    consonantClusters: number;
    vowelDistribution: number;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
  };
}

/**
 * Calculate length score
 * Shorter domains are more brandable and memorable
 */
function calculateLengthScore(domain: string): number {
  // Remove TLD for length calculation
  const nameOnly = domain.split('.')[0];
  const length = nameOnly.length;
  
  if (length <= 7) return 100;
  if (length <= 12) return 80;
  if (length <= 15) return 60;
  if (length <= 20) return 40;
  return 20;
}

/**
 * Calculate hyphen penalty
 * Hyphens make domains harder to remember and communicate verbally
 */
function calculateHyphenScore(domain: string): number {
  const nameOnly = domain.split('.')[0];
  const hyphenCount = (nameOnly.match(/-/g) || []).length;
  
  if (hyphenCount === 0) return 100;
  if (hyphenCount === 1) return 50;
  return 0; // 2+ hyphens = very poor brandability
}

/**
 * Check pronounceability
 * Domains with long consonant clusters are hard to say and remember
 */
function calculatePronounceabilityScore(domain: string): number {
  const nameOnly = domain.split('.')[0].toLowerCase();
  const vowels = 'aeiou';
  
  let score = 100;
  let consonantStreak = 0;
  let maxConsonantStreak = 0;
  
  for (const char of nameOnly) {
    if (char.match(/[a-z]/)) {
      if (vowels.includes(char)) {
        consonantStreak = 0;
      } else {
        consonantStreak++;
        maxConsonantStreak = Math.max(maxConsonantStreak, consonantStreak);
      }
    }
  }
  
  // Penalize long consonant clusters
  if (maxConsonantStreak >= 4) score -= 40;
  else if (maxConsonantStreak === 3) score -= 20;
  
  // Check vowel distribution (should have at least 30% vowels)
  const letterCount = nameOnly.replace(/[^a-z]/g, '').length;
  const vowelCount = nameOnly.split('').filter(c => vowels.includes(c)).length;
  const vowelRatio = letterCount > 0 ? vowelCount / letterCount : 0;
  
  if (vowelRatio < 0.2) score -= 30;
  else if (vowelRatio < 0.3) score -= 15;
  
  return Math.max(0, score);
}

/**
 * Calculate memorability score
 * Domains with numbers or special characters are harder to remember
 */
function calculateMemorabilityScore(domain: string): number {
  const nameOnly = domain.split('.')[0];
  
  let score = 100;
  
  // Check for numbers
  if (/\d/.test(nameOnly)) {
    score -= 30;
  }
  
  // Check for special characters (other than hyphens, which are scored separately)
  if (/[^a-zA-Z0-9-]/.test(nameOnly)) {
    score -= 40;
  }
  
  // Bonus for all lowercase (easier to type)
  if (nameOnly === nameOnly.toLowerCase()) {
    score += 0; // No change, this is expected
  }
  
  // Penalty for mixed case (harder to communicate)
  if (nameOnly !== nameOnly.toLowerCase() && nameOnly !== nameOnly.toUpperCase()) {
    score -= 20;
  }
  
  return Math.max(0, score);
}

/**
 * Calculate overall brandability score for a domain
 */
export function calculateBrandabilityScore(domain: string): BrandabilityScore {
  const nameOnly = domain.split('.')[0];
  
  // Calculate individual scores
  const lengthScore = calculateLengthScore(domain);
  const hyphenScore = calculateHyphenScore(domain);
  const pronounceabilityScore = calculatePronounceabilityScore(domain);
  const memorabilityScore = calculateMemorabilityScore(domain);
  
  // Weighted average (length and hyphens are most important)
  const totalScore = Math.round(
    (lengthScore * 0.30) +
    (hyphenScore * 0.30) +
    (pronounceabilityScore * 0.25) +
    (memorabilityScore * 0.15)
  );
  
  // Gather breakdown data
  const consonantClusters = (nameOnly.match(/[bcdfghjklmnpqrstvwxyz]{3,}/gi) || []).length;
  const vowelCount = (nameOnly.match(/[aeiou]/gi) || []).length;
  const letterCount = (nameOnly.match(/[a-z]/gi) || []).length;
  
  return {
    totalScore,
    lengthScore,
    hyphenScore,
    pronounceabilityScore,
    memorabilityScore,
    breakdown: {
      length: nameOnly.length,
      hyphens: (nameOnly.match(/-/g) || []).length,
      consonantClusters,
      vowelDistribution: letterCount > 0 ? Math.round((vowelCount / letterCount) * 100) : 0,
      hasNumbers: /\d/.test(nameOnly),
      hasSpecialChars: /[^a-zA-Z0-9-]/.test(nameOnly),
    },
  };
}

/**
 * Get brandability tier label
 */
export function getBrandabilityTier(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Check if domain qualifies for "High Brand Potential" badge
 */
export function isHighBrandPotential(score: number): boolean {
  return score > 80;
}
