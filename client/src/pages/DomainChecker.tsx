import { useState } from 'react';
import { Upload, Loader2, Search, AlertCircle, Star, CheckCircle, Share2, Mail, Link as LinkIcon, Copy } from 'lucide-react';
import { trpc } from '../lib/trpc';

interface DomainResult {
  domain: string;
  available: boolean;
  brandabilityScore: number;
  registrar?: string;
  status?: string;
  pricing?: {
    registrar: string;
    price: number;
    currency: string;
  }[];
  error?: string;
}

export default function DomainChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<DomainResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'brandability' | 'alphabetical'>('brandability');
  const [savingDomains, setSavingDomains] = useState<Set<string>>(new Set());
  const [savedDomains, setSavedDomains] = useState<Set<string>>(new Set());
  const [checkingProgress, setCheckingProgress] = useState({ current: 0, total: 0 });
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const analyzeFileMutation = trpc.domainChecker.analyzeFile.useMutation();
  const saveDomainMutation = trpc.domainChecker.saveDomainToWatchlist.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.ms-excel'];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
        setError('Please upload a PDF, TXT, or CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.ms-excel'];
      if (!validTypes.includes(droppedFile.type) && !droppedFile.name.endsWith('.csv')) {
        setError('Please upload a PDF, TXT, or CSV file');
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleShare = () => {
    // Generate shareable link with results data
    const resultsData = encodeURIComponent(JSON.stringify({
      domains: results.map(r => ({
        domain: r.domain,
        available: r.available,
        score: r.brandabilityScore,
      })),
      timestamp: new Date().toISOString(),
    }));
    
    const link = `${window.location.origin}/domain-checker?shared=${resultsData}`;
    setShareLink(link);
    setShowShareModal(true);
  };
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };
  
  const handleEmailShare = () => {
    const subject = encodeURIComponent('Domain Availability Results');
    const body = encodeURIComponent(
      `I found ${availableCount} available domains with high brandability scores!\n\n` +
      `View the results here: ${shareLink}\n\n` +
      `Top domains:\n` +
      results.slice(0, 5).map(r => `- ${r.domain} (Score: ${r.brandabilityScore})`).join('\n')
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleSaveDomain = async (domain: string, brandabilityScore: number) => {
    setSavingDomains(prev => new Set(prev).add(domain));
    
    try {
      await saveDomainMutation.mutateAsync({
        domain,
        brandabilityScore,
      });
      
      setSavedDomains(prev => new Set(prev).add(domain));
    } catch (err) {
      console.error('Failed to save domain:', err);
      setError(`Failed to save ${domain} to watchlist`);
    } finally {
      setSavingDomains(prev => {
        const newSet = new Set(prev);
        newSet.delete(domain);
        return newSet;
      });
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setResults([]);
    setCheckingProgress({ current: 0, total: 0 });

    try {
      // Read file content
      const fileContent = await file.text();
      
      // Parse domains first to get total count
      const textLines = fileContent.split('\n').filter(line => line.trim());
      setCheckingProgress({ current: 0, total: textLines.length });
      
      // Call API to analyze domains
      const response = await analyzeFileMutation.mutateAsync({
        fileContent,
        fileName: file.name,
      });
      
      setCheckingProgress({ current: response.results.length, total: response.results.length });
      setResults(response.results);
      
      if (response.results.length === 0) {
        setError('No domains found in the uploaded file. Please check the file format.');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze domains. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'brandability') {
      return b.brandabilityScore - a.brandabilityScore;
    } else {
      return a.domain.localeCompare(b.domain);
    }
  });

  const availableCount = results.filter(r => r.available).length;
  const takenCount = results.filter(r => !r.available).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Domain Availability Checker
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Upload a list of domains (PDF, TXT, or CSV) to check availability and get brandability scores.
            High-scoring domains (🔥 80+) are memorable and SEO-friendly.
          </p>
        </div>

        {/* Upload Section */}
        {results.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div
              className="border-3 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Upload Domain List
              </h3>
              <p className="text-slate-600 mb-4">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-sm text-slate-500">
                Supported formats: PDF, TXT, CSV
              </p>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.txt,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {file && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Search className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{file.name}</p>
                      <p className="text-sm text-slate-600">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {checkingProgress.total > 0 
                          ? `Checking ${checkingProgress.current}/${checkingProgress.total} domains...`
                          : 'Analyzing...'
                        }
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Check Availability
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900">{results.length}</p>
                  <p className="text-slate-600">Total Domains</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{availableCount}</p>
                  <p className="text-slate-600">Available</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{takenCount}</p>
                  <p className="text-slate-600">Taken</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-slate-700">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'brandability' | 'alphabetical')}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="brandability">Brandability Score</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Results
                  </button>
                  <button
                    onClick={() => {
                      setResults([]);
                      setFile(null);
                    }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Upload New File
                  </button>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                        Domain
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                        Brandability
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                        Pricing
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sortedResults.map((result, index) => (
                      <tr
                        key={index}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {result.brandabilityScore > 80 && (
                              <span className="text-xl" title="High Brand Potential - Google Safe">
                                🔥
                              </span>
                            )}
                            <span className="font-medium text-slate-900">
                              {result.domain}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  result.brandabilityScore > 80
                                    ? 'bg-green-500'
                                    : result.brandabilityScore > 60
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${result.brandabilityScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-900">
                              {result.brandabilityScore}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {result.available ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              Taken
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {result.available && result.pricing && result.pricing.length > 0 ? (
                            <div className="text-sm">
                              <p className="font-semibold text-slate-900">
                                ${result.pricing[0].price.toFixed(2)}
                              </p>
                              <p className="text-slate-600">
                                {result.pricing[0].registrar}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {result.available ? (
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <button
                                onClick={() => handleSaveDomain(result.domain, result.brandabilityScore)}
                                disabled={savingDomains.has(result.domain) || savedDomains.has(result.domain)}
                                className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {savingDomains.has(result.domain) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : savedDomains.has(result.domain) ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <Star className="w-4 h-4" />
                                )}
                                {savedDomains.has(result.domain) ? 'Saved' : 'Save'}
                              </button>
                              <a
                                href={`https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(result.domain)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                              >
                                Namecheap
                              </a>
                              <a
                                href={`https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${encodeURIComponent(result.domain)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                              >
                                GoDaddy
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Share Results</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Shareable Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    {copySuccess ? (
                      <><CheckCircle className="w-4 h-4" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy</>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={handleEmailShare}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Share via Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
