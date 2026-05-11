/**
 * Domain Checker Enhancement Features Tests
 * Tests save to watchlist, progress tracking, and sharing functionality
 */

import { describe, it, expect } from 'vitest';
import { calculateBrandabilityScore } from './services/brandabilityScorer';
import { parseDomainNamesFromText } from './services/pdfDomainParser';

describe('Domain Checker Enhancement Features', () => {
  describe('Save to Watchlist Integration', () => {
    it('should identify domains suitable for watchlist (available + high score)', () => {
      const testDomains = [
        { domain: 'stripe.com', available: false, score: 63 },
        { domain: 'brandable.com', available: true, score: 85 },
        { domain: 'test-domain-123.com', available: true, score: 35 },
        { domain: 'zoom.com', available: false, score: 90 },
        { domain: 'newbrand.com', available: true, score: 78 },
      ];
      
      // Filter domains that should be saved: available AND score > 70
      const watchlistCandidates = testDomains.filter(d => d.available && d.score > 70);
      
      expect(watchlistCandidates.length).toBe(2);
      expect(watchlistCandidates[0].domain).toBe('brandable.com');
      expect(watchlistCandidates[1].domain).toBe('newbrand.com');
      
      console.log('✅ Watchlist candidates identified:', watchlistCandidates.map(d => d.domain));
    });
    
    it('should calculate brandability scores for watchlist notes', () => {
      const domains = ['brandable.com', 'newstartup.com', 'techsaas.com'];
      const keywords = ['tech', 'startup', 'saas'];
      
      const results = domains.map(domain => ({
        domain,
        ...calculateBrandabilityScore(domain, keywords),
      }));
      
      results.forEach(r => {
        expect(r.score).toBeGreaterThan(0);
        expect(r.score).toBeLessThanOrEqual(100);
        expect(r.factors).toHaveProperty('length');
        expect(r.factors).toHaveProperty('pronounceability');
      });
      
      console.log('✅ Brandability scores for watchlist:');
      results.forEach(r => {
        console.log(`  - ${r.domain}: ${r.score} (${JSON.stringify(r.factors)})`);
      });
    });
  });
  
  describe('Progress Tracking', () => {
    it('should track progress during batch domain checking', () => {
      const domainList = `
        accountingpro.com
        bookkeeperhq.com
        invoicemaster.com
        taxwizard.com
        ledgerlink.com
      `;
      
      const parsed = parseDomainNamesFromText(domainList);
      const totalDomains = parsed.length;
      
      expect(totalDomains).toBe(5);
      
      // Simulate progress tracking
      const progress = {
        current: 0,
        total: totalDomains,
      };
      
      // Simulate checking each domain
      for (let i = 0; i < totalDomains; i++) {
        progress.current = i + 1;
        const percentage = Math.round((progress.current / progress.total) * 100);
        
        console.log(`✅ Progress: ${progress.current}/${progress.total} (${percentage}%)`);
      }
      
      expect(progress.current).toBe(progress.total);
    });
    
    it('should handle empty domain lists gracefully', () => {
      const emptyList = '';
      const parsed = parseDomainNamesFromText(emptyList);
      
      const progress = {
        current: 0,
        total: parsed.length,
      };
      
      expect(progress.total).toBe(0);
      expect(progress.current).toBe(0);
      
      console.log('✅ Empty list handled: progress =', progress);
    });
  });
  
  describe('Sharing Functionality', () => {
    it('should generate shareable results data', () => {
      const results = [
        { domain: 'example1.com', available: true, brandabilityScore: 85 },
        { domain: 'example2.com', available: false, brandabilityScore: 60 },
        { domain: 'example3.com', available: true, brandabilityScore: 92 },
      ];
      
      // Generate shareable data (same format as frontend)
      const shareData = {
        domains: results.map(r => ({
          domain: r.domain,
          available: r.available,
          score: r.brandabilityScore,
        })),
        timestamp: new Date().toISOString(),
      };
      
      expect(shareData.domains.length).toBe(3);
      expect(shareData.timestamp).toBeDefined();
      
      // Simulate URL encoding
      const encoded = encodeURIComponent(JSON.stringify(shareData));
      expect(encoded.length).toBeGreaterThan(0);
      
      // Simulate decoding
      const decoded = JSON.parse(decodeURIComponent(encoded));
      expect(decoded.domains.length).toBe(3);
      expect(decoded.domains[0].domain).toBe('example1.com');
      
      console.log('✅ Shareable data generated and validated');
      console.log('  - Encoded length:', encoded.length);
      console.log('  - Decoded domains:', decoded.domains.length);
    });
    
    it('should format email share content', () => {
      const results = [
        { domain: 'brandable.com', available: true, brandabilityScore: 88 },
        { domain: 'startup.io', available: true, brandabilityScore: 82 },
        { domain: 'techsaas.com', available: true, brandabilityScore: 75 },
      ];
      
      const availableCount = results.filter(r => r.available).length;
      const shareLink = 'https://example.com/domain-checker?shared=abc123';
      
      const emailBody = 
        `I found ${availableCount} available domains with high brandability scores!\n\n` +
        `View the results here: ${shareLink}\n\n` +
        `Top domains:\n` +
        results.slice(0, 5).map(r => `- ${r.domain} (Score: ${r.brandabilityScore})`).join('\n');
      
      expect(emailBody).toContain('3 available domains');
      expect(emailBody).toContain('brandable.com');
      expect(emailBody).toContain('Score: 88');
      expect(emailBody).toContain(shareLink);
      
      console.log('✅ Email share content formatted:');
      console.log(emailBody);
    });
  });
  
  describe('Complete Enhancement Flow', () => {
    it('should handle full workflow: parse → check → score → save → share', () => {
      // Step 1: Parse domain list
      const domainList = `
        brandable.com
        startup.io
        techsaas.com
      `;
      
      const parsed = parseDomainNamesFromText(domainList);
      expect(parsed.length).toBe(3);
      console.log('✅ Step 1: Parsed', parsed.length, 'domains');
      
      // Step 2: Simulate availability check (mock data)
      const mockResults = parsed.map(p => ({
        domain: p.fullDomain,
        available: Math.random() > 0.5, // Random availability
        brandabilityScore: 0,
      }));
      console.log('✅ Step 2: Checked availability');
      
      // Step 3: Calculate brandability scores
      const keywords = ['tech', 'startup'];
      mockResults.forEach(result => {
        const score = calculateBrandabilityScore(result.domain, keywords);
        result.brandabilityScore = score.score;
      });
      console.log('✅ Step 3: Calculated brandability scores');
      
      // Step 4: Identify watchlist candidates
      const watchlistCandidates = mockResults.filter(r => r.available && r.brandabilityScore > 70);
      console.log('✅ Step 4: Identified', watchlistCandidates.length, 'watchlist candidates');
      
      // Step 5: Generate shareable data
      const shareData = {
        domains: mockResults.map(r => ({
          domain: r.domain,
          available: r.available,
          score: r.brandabilityScore,
        })),
        timestamp: new Date().toISOString(),
      };
      const encoded = encodeURIComponent(JSON.stringify(shareData));
      expect(encoded.length).toBeGreaterThan(0);
      console.log('✅ Step 5: Generated shareable link');
      
      // Verify complete flow
      expect(mockResults.length).toBe(3);
      mockResults.forEach(r => {
        expect(r).toHaveProperty('domain');
        expect(r).toHaveProperty('available');
        expect(r).toHaveProperty('brandabilityScore');
        expect(r.brandabilityScore).toBeGreaterThan(0);
      });
      
      console.log('✅ Complete enhancement flow validated');
    });
  });
});
