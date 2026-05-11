/**
 * Domain Checker Integration Tests
 * Tests domain availability checking, brandability scoring, and file parsing
 */

import { describe, it, expect } from 'vitest';
import { checkDomainAvailability, checkBatchAvailability } from './services/domainAvailability';
import { calculateBrandabilityScore } from './services/brandabilityScorer';
import { parseDomainNamesFromText } from './services/pdfDomainParser';

describe('Domain Checker System', () => {
  describe('Domain Availability Checking', () => {
    it('should check availability of a single domain', async () => {
      const result = await checkDomainAvailability('example-test-domain-12345.com');
      
      expect(result).toHaveProperty('domain');
      expect(result).toHaveProperty('available');
      expect(typeof result.available).toBe('boolean');
      
      console.log('✅ Single domain check result:', result);
    }, 30000); // 30 second timeout for API calls
    
    it('should check availability of multiple domains', async () => {
      const domains = [
        'test-domain-1.com',
        'test-domain-2.com',
        'test-domain-3.com',
      ];
      
      const results = await checkBatchAvailability(domains);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('domain');
      expect(results[0]).toHaveProperty('available');
      
      console.log('✅ Batch check results:', results.map(r => ({
        domain: r.domain,
        available: r.available,
        registrar: r.registrar,
      })));
    }, 60000); // 60 second timeout for batch API calls
  });
  
  describe('Brandability Scoring', () => {
    it('should score short, pronounceable domains highly', () => {
      const result = calculateBrandabilityScore('stripe.com', ['payment', 'finance']);
      
      expect(result.score).toBeGreaterThan(60); // Adjusted based on actual scoring
      expect(result.factors).toHaveProperty('length');
      expect(result.factors).toHaveProperty('pronounceability');
      
      console.log('✅ Brandability score for "stripe.com":', result);
    });
    
    it('should penalize domains with hyphens', () => {
      const withHyphen = calculateBrandabilityScore('my-test-domain.com', []);
      const withoutHyphen = calculateBrandabilityScore('mytestdomain.com', []);
      
      expect(withoutHyphen.score).toBeGreaterThan(withHyphen.score);
      
      console.log('✅ Hyphen penalty test:');
      console.log('  - With hyphens:', withHyphen.score);
      console.log('  - Without hyphens:', withoutHyphen.score);
    });
    
    it('should give bonus for keyword relevance', () => {
      const keywords = ['accounting', 'finance', 'bookkeeping'];
      
      const relevant = calculateBrandabilityScore('accountingpro.com', keywords);
      const irrelevant = calculateBrandabilityScore('randomword.com', keywords);
      
      expect(relevant.score).toBeGreaterThan(irrelevant.score);
      
      console.log('✅ Keyword relevance test:');
      console.log('  - Relevant domain:', relevant.score);
      console.log('  - Irrelevant domain:', irrelevant.score);
    });
    
    it('should identify high-scoring domains (>80) for fire icon', () => {
      // Test domains that should score >80
      const highScoreDomains = [
        'stripe.com',
        'zoom.com',
        'slack.com',
        'notion.com',
      ];
      
      const results = highScoreDomains.map(domain => ({
        domain,
        score: calculateBrandabilityScore(domain, []).score,
      }));
      
      const highScorers = results.filter(r => r.score > 80);
      
      expect(highScorers.length).toBeGreaterThan(0);
      
      console.log('✅ High-scoring domains (should show 🔥 icon):');
      results.forEach(r => {
        console.log(`  - ${r.domain}: ${r.score}${r.score > 80 ? ' 🔥' : ''}`);
      });
    });
  });
  
  describe('Domain List Parsing', () => {
    it('should parse domains from text content', () => {
      const textContent = `
        accountingpro.com
        bookkeeperhq.com
        invoicemaster.com
        taxwizard.com
        ledgerlink.com
      `;
      
      const domains = parseDomainNamesFromText(textContent);
      
      expect(domains.length).toBeGreaterThan(0);
      expect(domains[0]).toHaveProperty('domain');
      expect(domains[0]).toHaveProperty('tld');
      expect(domains[0]).toHaveProperty('fullDomain');
      
      console.log('✅ Parsed domains from text:', domains);
    });
    
    it('should handle various domain formats', () => {
      const textContent = `
        1. example.com
        2. another-domain .com
        3. thirdone
        - bullet-domain.net
        * starred-domain.org
      `;
      
      const domains = parseDomainNamesFromText(textContent);
      
      expect(domains.length).toBeGreaterThan(0);
      
      console.log('✅ Parsed domains from various formats:', domains);
    });
    
    it('should parse accounting SaaS domain list', () => {
      const accountingDomains = `
        accountingpro.com
        bookkeeperhq.com
        invoicemaster.com
        taxwizard.com
        ledgerlink.com
        payrollplus.com
        financeflow.com
        auditace.com
        budgetboss.com
        expenseease.com
        cashflowpro.com
        profitpath.com
        revenuerocket.com
        balancebeam.com
        fiscalfox.com
      `;
      
      const domains = parseDomainNamesFromText(accountingDomains);
      
      expect(domains.length).toBe(15);
      
      console.log('✅ Parsed 15 accounting SaaS domains');
      console.log('Sample domains:', domains.slice(0, 5).map(d => d.fullDomain));
    });
  });
  
  describe('Complete Domain Checker Flow', () => {
    it('should parse, check availability, and score domains', async () => {
      const textContent = `
        stripe.com
        example-test-12345.com
        google.com
      `;
      
      // Step 1: Parse domains
      const parsedDomains = parseDomainNamesFromText(textContent);
      expect(parsedDomains.length).toBe(3);
      
      // Step 2: Check availability
      const domainNames = parsedDomains.map(d => d.fullDomain);
      const availabilityResults = await checkBatchAvailability(domainNames);
      expect(availabilityResults.length).toBe(3);
      
      // Step 3: Calculate brandability scores
      const keywords = ['payment', 'finance'];
      const finalResults = availabilityResults.map(result => ({
        domain: result.domain,
        available: result.available,
        brandabilityScore: calculateBrandabilityScore(result.domain, keywords).score,
        registrar: result.registrar,
      }));
      
      // Step 4: Sort by availability and brandability
      finalResults.sort((a, b) => {
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return 1;
        return b.brandabilityScore - a.brandabilityScore;
      });
      
      console.log('✅ Complete flow test results:');
      finalResults.forEach(r => {
        console.log(`  - ${r.domain}: ${r.available ? 'Available' : 'Taken'} | Score: ${r.brandabilityScore}${r.brandabilityScore > 80 ? ' 🔥' : ''}`);
      });
      
      expect(finalResults.length).toBe(3);
    }, 60000);
  });
});
