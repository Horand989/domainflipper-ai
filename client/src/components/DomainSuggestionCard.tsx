import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, FolderPlus, Star, Search, Globe, ExternalLink, Loader2, Flame, History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface DomainSuggestionCardProps {
  suggestion: {
    id: number;
    suggestedDomain: string;
    tld: string;
    reasoning: string;
    namingPattern: string;
    confidence: number;
    brandScore?: number | null;
  };
  projectId: number;
  onAddToProject: (domainName: string) => void;
  onAddToWatchlist: (domainName: string) => void;
  onCheckAvailability: (domainName: string) => void;
  onChooseDomain: (domainName: string) => void;
  onShowTLDs: (domainName: string) => void;
  onSpamZillaSearch: (domain: string, tld: string) => void;
  onCheckHistory: (domainName: string) => void;
  isAddingToProject: boolean;
  isAddingToWatchlist: boolean;
  isChoosingDomain: boolean;
}

export function DomainSuggestionCard({
  suggestion,
  projectId,
  onAddToProject,
  onAddToWatchlist,
  onCheckAvailability,
  onChooseDomain,
  onShowTLDs,
  onSpamZillaSearch,
  onCheckHistory,
  isAddingToProject,
  isAddingToWatchlist,
  isChoosingDomain,
}: DomainSuggestionCardProps) {
  const domainName = `${suggestion.suggestedDomain}${suggestion.tld}`;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>
              {suggestion.suggestedDomain}
              <span className="text-primary">{suggestion.tld}</span>
            </span>
            {suggestion.brandScore && suggestion.brandScore > 80 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Flame className="h-5 w-5 text-orange-500 fill-orange-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">High Brand Potential - Google Safe</p>
                    <p className="text-sm text-muted-foreground">Brand Score: {suggestion.brandScore}/100</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
          <Badge variant="outline">{suggestion.confidence}%</Badge>
        </CardTitle>
        <CardDescription>
          <Badge variant="secondary" className="text-xs">
            {suggestion.namingPattern}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
        
        {suggestion.brandScore !== null && suggestion.brandScore !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Brand Score:</span>
            <Badge 
              variant={suggestion.brandScore >= 80 ? "default" : suggestion.brandScore >= 60 ? "secondary" : "destructive"}
              className={suggestion.brandScore >= 80 ? "bg-green-600" : suggestion.brandScore >= 60 ? "bg-yellow-600" : ""}
            >
              {suggestion.brandScore}/100
            </Badge>
            <span className="text-xs text-muted-foreground">
              {suggestion.brandScore >= 80 ? "Excellent" : suggestion.brandScore >= 60 ? "Good" : suggestion.brandScore >= 40 ? "Fair" : "Poor"}
            </span>
          </div>
        )}
        
        <div className="space-y-2">
          <Button
            className="w-full"
            variant="default"
            onClick={() => {
              console.log('Choose This Domain clicked:', domainName);
              onChooseDomain(domainName);
            }}
            disabled={isChoosingDomain}
          >
            {isChoosingDomain ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Choose This Domain
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Add to Project clicked:', domainName);
                onAddToProject(domainName);
              }}
              disabled={isAddingToProject}
            >
              {isAddingToProject ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <FolderPlus className="w-4 h-4 mr-1" />
              )}
              Add to Project
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Add to Watchlist clicked:', domainName);
                onAddToWatchlist(domainName);
              }}
              disabled={isAddingToWatchlist}
            >
              {isAddingToWatchlist ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Star className="w-4 h-4 mr-1" />
              )}
              Watchlist
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Check Availability clicked:', domainName);
                // Open Namecheap search in new tab
                const searchUrl = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domainName)}`;
                window.open(searchUrl, '_blank');
                toast.success(`Opening availability check for ${domainName}`);
              }}
            >
              <Search className="w-4 h-4 mr-1" />
              Check Availability
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Show TLDs clicked');
                onShowTLDs(domainName);
              }}
            >
              <Globe className="w-4 h-4 mr-1" />
              Show TLDs
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                console.log('SpamZilla search clicked:', suggestion.suggestedDomain, suggestion.tld);
                onSpamZillaSearch(suggestion.suggestedDomain, suggestion.tld);
              }}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              SpamZilla
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Check History clicked:', domainName);
                onCheckHistory(domainName);
              }}
            >
              <History className="w-4 h-4 mr-1" />
              Check History
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
