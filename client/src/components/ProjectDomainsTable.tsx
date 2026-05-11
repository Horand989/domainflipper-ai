import { trpc } from "@/lib/trpc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

interface ProjectDomainsTableProps {
  projectId: number;
}

export function ProjectDomainsTable({ projectId, showAll = false }: ProjectDomainsTableProps & { showAll?: boolean }) {
  const utils = trpc.useUtils();
  
  const { data: allDomains, isLoading } = trpc.projects.getDomains.useQuery({ projectId });
  
  // Limit to Top 3 unless showAll is true
  const domains = showAll ? allDomains : allDomains?.slice(0, 3);
  const hasMore = allDomains && allDomains.length > 3;
  
  const removeDomain = trpc.projects.removeDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain removed from project");
      utils.projects.getDomains.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error(`Failed to remove domain: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!domains || domains.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No domains added yet. Click "View Suggestions" to find domains for this project.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Domain Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Alternative TLDs</TableHead>
            <TableHead>Availability</TableHead>
            <TableHead>Date Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {domains.map((domain) => {
            const tlds = domain.availableTlds ? JSON.parse(domain.availableTlds) : [];
            
            return (
              <TableRow key={domain.id}>
                <TableCell className="font-medium">
                  <Link href={`/domain/${encodeURIComponent(domain.domainName)}`}>
                    <span className="text-primary hover:underline cursor-pointer">
                      {domain.domainName}
                    </span>
                  </Link>
                </TableCell>
                
                {/* Status Column */}
                <TableCell>
                  <Badge variant={domain.status === "chosen" ? "default" : "secondary"}>
                    {domain.status === "chosen" ? "Chosen" : "Added"}
                  </Badge>
                </TableCell>
                
                {/* TLDs Column */}
                <TableCell>
                  {tlds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tlds.slice(0, 3).map((tld: string) => (
                        <Badge key={tld} variant="outline" className="text-xs">
                          {tld}
                        </Badge>
                      ))}
                      {tlds.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{tlds.length - 3}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                
                {/* Availability Column */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => {
                        const searchUrl = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain.domainName)}`;
                        window.open(searchUrl, '_blank');
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Namecheap
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => {
                        const searchUrl = `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain.domainName)}`;
                        window.open(searchUrl, '_blank');
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      GoDaddy
                    </Button>
                  </div>
                </TableCell>
                
                {/* Date Added Column */}
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(domain.addedAt).toLocaleDateString()}
                </TableCell>
                
                {/* Actions Column */}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Remove ${domain.domainName} from this project?`)) {
                        removeDomain.mutate({
                          projectId,
                          domainName: domain.domainName,
                        });
                      }
                    }}
                    disabled={removeDomain.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {/* View All Link */}
      {!showAll && hasMore && (
        <div className="border-t bg-muted/30 p-3 text-center">
          <Link href={`/projects/${projectId}/domains`}>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              View All {allDomains?.length} Domains
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
