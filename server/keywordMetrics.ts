/**
 * Keyword Metrics Calculator
 * Estimates difficulty and search volume for keywords
 */

export interface KeywordMetrics {
  keyword: string;
  difficulty: number; // 0-100 scale
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';
  searchVolume: number; // Monthly search volume estimate
  volumeCategory: 'Low' | 'Medium' | 'High' | 'Very High';
}

/**
 * Calculate keyword difficulty based on various factors
 * Returns a score from 0-100 (0 = easiest, 100 = hardest)
 */
export function calculateKeywordDifficulty(keyword: string): number {
  let difficulty = 0;
  
  // Factor 1: Keyword length (shorter = more competitive)
  const wordCount = keyword.split(' ').length;
  if (wordCount === 1) {
    difficulty += 40; // Single words are highly competitive
  } else if (wordCount === 2) {
    difficulty += 25; // Two words are moderately competitive
  } else if (wordCount === 3) {
    difficulty += 15; // Three words are less competitive
  } else {
    difficulty += 5; // Long-tail (4+ words) are least competitive
  }
  
  // Factor 2: Keyword length in characters
  const charLength = keyword.length;
  if (charLength < 10) {
    difficulty += 20; // Short keywords are competitive
  } else if (charLength < 20) {
    difficulty += 10;
  } else {
    difficulty += 5;
  }
  
  // Factor 3: Common commercial intent keywords
  const commercialKeywords = ['buy', 'purchase', 'price', 'cost', 'cheap', 'best', 'review', 'top'];
  const hasCommercialIntent = commercialKeywords.some(word => 
    keyword.toLowerCase().includes(word)
  );
  if (hasCommercialIntent) {
    difficulty += 15; // Commercial intent increases competition
  }
  
  // Factor 4: Question-based keywords (usually easier)
  const questionWords = ['how', 'what', 'why', 'when', 'where', 'who'];
  const isQuestion = questionWords.some(word => 
    keyword.toLowerCase().startsWith(word)
  );
  if (isQuestion) {
    difficulty -= 10; // Questions are often easier to rank for
  }
  
  // Factor 5: Specific/niche terms (easier)
  const specificWords = ['guide', 'tutorial', 'tips', 'examples', 'checklist'];
  const isSpecific = specificWords.some(word => 
    keyword.toLowerCase().includes(word)
  );
  if (isSpecific) {
    difficulty -= 5;
  }
  
  // Add some randomness for variation (±5 points)
  const randomVariation = Math.floor(Math.random() * 11) - 5;
  difficulty += randomVariation;
  
  // Clamp between 0-100
  return Math.max(0, Math.min(100, difficulty));
}

/**
 * Estimate monthly search volume for a keyword
 */
export function estimateSearchVolume(keyword: string, difficulty: number): number {
  let baseVolume = 1000; // Base volume
  
  // Factor 1: Difficulty correlation (harder keywords often have higher volume)
  baseVolume *= (1 + difficulty / 100);
  
  // Factor 2: Keyword length (shorter = higher volume)
  const wordCount = keyword.split(' ').length;
  if (wordCount === 1) {
    baseVolume *= 10; // Single words get 10x multiplier
  } else if (wordCount === 2) {
    baseVolume *= 5; // Two words get 5x
  } else if (wordCount === 3) {
    baseVolume *= 2; // Three words get 2x
  }
  // Long-tail (4+ words) keep base multiplier
  
  // Factor 3: Commercial intent (higher volume)
  const commercialKeywords = ['buy', 'purchase', 'price', 'cost', 'cheap', 'best'];
  const hasCommercialIntent = commercialKeywords.some(word => 
    keyword.toLowerCase().includes(word)
  );
  if (hasCommercialIntent) {
    baseVolume *= 1.5;
  }
  
  // Factor 4: Question keywords (moderate volume)
  const questionWords = ['how', 'what', 'why', 'when', 'where', 'who'];
  const isQuestion = questionWords.some(word => 
    keyword.toLowerCase().startsWith(word)
  );
  if (isQuestion) {
    baseVolume *= 1.2;
  }
  
  // Add randomness for variation (±30%)
  const randomFactor = 0.7 + Math.random() * 0.6;
  baseVolume *= randomFactor;
  
  // Round to nearest 10 for cleaner numbers
  return Math.round(baseVolume / 10) * 10;
}

/**
 * Get difficulty level category
 */
export function getDifficultyLevel(difficulty: number): 'Easy' | 'Medium' | 'Hard' {
  if (difficulty < 35) return 'Easy';
  if (difficulty < 65) return 'Medium';
  return 'Hard';
}

/**
 * Get volume category
 */
export function getVolumeCategory(volume: number): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (volume < 1000) return 'Low';
  if (volume < 5000) return 'Medium';
  if (volume < 20000) return 'High';
  return 'Very High';
}

/**
 * Calculate complete metrics for a keyword
 */
export function calculateKeywordMetrics(keyword: string): KeywordMetrics {
  const difficulty = calculateKeywordDifficulty(keyword);
  const searchVolume = estimateSearchVolume(keyword, difficulty);
  
  return {
    keyword,
    difficulty,
    difficultyLevel: getDifficultyLevel(difficulty),
    searchVolume,
    volumeCategory: getVolumeCategory(searchVolume),
  };
}

/**
 * Calculate metrics for multiple keywords
 */
export function calculateBulkKeywordMetrics(keywords: string[]): KeywordMetrics[] {
  return keywords.map(keyword => calculateKeywordMetrics(keyword));
}
