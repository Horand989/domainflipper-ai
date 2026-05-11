/**
 * Keyword Table Component
 * 
 * Displays project keywords with enrichment status and selection.
 * Supports pay-to-reveal model where users select specific keywords to enrich.
 */

import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, Lock, TrendingUp, DollarSign } from "lucide-react";
import { LockedValue } from "./PremiumLock";

interface KeywordTableProps {
  projectId: number;
  userTier: "FREE" | "PRO";
}

export function KeywordTable({ projectId, userTier }: KeywordTableProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<number[]>([]);
  const utils = trpc.useUtils();

  // Fetch keywords
  const { data: keywordsData, isLoading } = trpc.keywords.list.useQuery({
    projectId,
  });

  // Enrich mutation
  const enrichMutation = trpc.keywords.enrich.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully enriched ${data.enriched} keywords! Used ${data.creditsUsed} credits.`);
      setSelectedKeywords([]);
      utils.keywords.list.invalidate({ projectId });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to enrich keywords");
    },
  });

  // Get enrichment cost
  const { data: costData } = trpc.keywords.getEnrichmentCost.useQuery(
    { keywordCount: selectedKeywords.length },
    { enabled: selectedKeywords.length > 0 }
  );

  const keywords = keywordsData?.keywords || [];
  const unenrichedKeywords = keywords.filter((k) => k.isEnriched === 0);

  const handleSelectAll = () => {
    if (selectedKeywords.length === unenrichedKeywords.length) {
      setSelectedKeywords([]);
    } else {
      setSelectedKeywords(unenrichedKeywords.map((k) => k.id));
    }
  };

  const handleToggleKeyword = (keywordId: number) => {
    setSelectedKeywords((prev) =>
      prev.includes(keywordId)
        ? prev.filter((id) => id !== keywordId)
        : [...prev, keywordId]
    );
  };

  const handleEnrich = async () => {
    if (selectedKeywords.length === 0) return;
    if (userTier !== "PRO") {
      toast.error("Upgrade to PRO to enrich keywords with real data");
      return;
    }

    await enrichMutation.mutateAsync({ keywordIds: selectedKeywords });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No keywords added yet.</p>
        <p className="text-sm mt-2">Add keywords to start tracking their metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Select All */}
      {unenrichedKeywords.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedKeywords.length === unenrichedKeywords.length && unenrichedKeywords.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedKeywords.length > 0
                ? `${selectedKeywords.length} selected`
                : "Select keywords to enrich"}
            </span>
          </div>

          {keywordsData && (
            <div className="text-sm text-muted-foreground">
              {keywordsData.enriched} of {keywordsData.total} enriched
            </div>
          )}
        </div>
      )}

      {/* Keyword Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-12 p-3"></th>
              <th className="text-left p-3 font-medium">Keyword</th>
              <th className="text-left p-3 font-medium">Volume</th>
              <th className="text-left p-3 font-medium">Difficulty</th>
              <th className="text-left p-3 font-medium">CPC</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((keyword) => {
              const isEnriched = keyword.isEnriched === 1;
              const isSelected = selectedKeywords.includes(keyword.id);
              const canSelect = !isEnriched && userTier === "PRO";

              return (
                <tr key={keyword.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    {canSelect && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleKeyword(keyword.id)}
                      />
                    )}
                  </td>
                  <td className="p-3 font-medium">{keyword.keyword}</td>
                  <td className="p-3">
                    {isEnriched ? (
                      keyword.searchVolume !== null ? (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          {keyword.searchVolume.toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No data</span>
                      )
                    ) : userTier === "PRO" ? (
                      <span className="text-muted-foreground">Not enriched</span>
                    ) : (
                      <LockedValue feature="keyword_volume" />
                    )}
                  </td>
                  <td className="p-3">
                    {isEnriched ? (
                      keyword.difficulty !== null ? (
                        <Badge
                          variant={
                            keyword.difficulty < 30
                              ? "default"
                              : keyword.difficulty < 60
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {keyword.difficulty}/100
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">No data</span>
                      )
                    ) : userTier === "PRO" ? (
                      <span className="text-muted-foreground">Not enriched</span>
                    ) : (
                      <LockedValue feature="keyword_difficulty" />
                    )}
                  </td>
                  <td className="p-3">
                    {isEnriched ? (
                      keyword.cpc !== null ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          {parseFloat(keyword.cpc).toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No data</span>
                      )
                    ) : userTier === "PRO" ? (
                      <span className="text-muted-foreground">Not enriched</span>
                    ) : (
                      <LockedValue feature="keyword_cpc" />
                    )}
                  </td>
                  <td className="p-3">
                    {isEnriched ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Enriched
                      </Badge>
                    ) : userTier === "PRO" ? (
                      <Badge variant="outline">Pending</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Action Bar */}
      {selectedKeywords.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-primary text-primary-foreground rounded-full shadow-lg px-6 py-3 flex items-center gap-4">
            <span className="font-medium">
              {selectedKeywords.length} keyword{selectedKeywords.length > 1 ? "s" : ""} selected
            </span>
            
            {costData && (
              <span className="text-sm opacity-90">
                Cost: {costData.totalCost} credits
              </span>
            )}

            <Button
              onClick={handleEnrich}
              disabled={enrichMutation.isPending}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              {enrichMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Enrich Selected
                </>
              )}
            </Button>

            <Button
              onClick={() => setSelectedKeywords([])}
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:text-primary-foreground/80"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
