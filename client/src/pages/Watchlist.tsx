import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Star, Trash2, Edit, ExternalLink } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { toast } from "sonner";

export default function Watchlist() {
  const { user, loading: authLoading } = useAuth();
  const [editingDomain, setEditingDomain] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: watchlist, isLoading } = trpc.watchlist.list.useQuery(undefined, {
    enabled: !!user,
  });

  const removeFromWatchlist = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      toast.success("Removed from watchlist");
      utils.watchlist.list.invalidate();
    },
    onError: () => {
      toast.error("Failed to remove from watchlist");
    },
  });

  const updateNotes = trpc.watchlist.updateNotes.useMutation({
    onSuccess: () => {
      toast.success("Notes updated");
      utils.watchlist.list.invalidate();
      setEditingDomain(null);
      setNotes("");
    },
    onError: () => {
      toast.error("Failed to update notes");
    },
  });

  const handleRemove = (domainId: number) => {
    if (confirm("Remove this domain from your watchlist?")) {
      removeFromWatchlist.mutate({ domainId });
    }
  };

  const handleUpdateNotes = (domainId: number) => {
    updateNotes.mutate({ domainId, notes });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Star className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Sign in to view your watchlist</h1>
          <p className="text-muted-foreground mb-6">
            Save your favorite domains and track them over time
          </p>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 font-serif">Domain Watchlist</h1>
          <p className="text-muted-foreground">
            Track your favorite domains and monitor price changes
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : watchlist && watchlist.length > 0 ? (
          <div className="grid gap-6">
            {watchlist.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        {item.domain.domainName}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Added {new Date(item.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Dialog
                        open={editingDomain === item.domainId}
                        onOpenChange={(open) => {
                          if (open) {
                            setEditingDomain(item.domainId);
                            setNotes(item.notes || "");
                          } else {
                            setEditingDomain(null);
                            setNotes("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Notes</DialogTitle>
                            <DialogDescription>
                              Add notes about this domain
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add your notes here..."
                            rows={5}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleUpdateNotes(item.domainId)}
                              disabled={updateNotes.isPending}
                              className="flex-1"
                            >
                              {updateNotes.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                "Save Notes"
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditingDomain(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(item.domainId)}
                        disabled={removeFromWatchlist.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Domain Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {item.domain.trustFlow !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Trust Flow</p>
                        <p className="text-lg font-semibold">{item.domain.trustFlow}</p>
                      </div>
                    )}
                    {item.domain.citationFlow !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Citation Flow</p>
                        <p className="text-lg font-semibold">{item.domain.citationFlow}</p>
                      </div>
                    )}
                    {item.domain.age !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Age</p>
                        <p className="text-lg font-semibold">{item.domain.age}y</p>
                      </div>
                    )}
                    {item.domain.szScore !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">SZ Score</p>
                        <p className="text-lg font-semibold">{item.domain.szScore}</p>
                      </div>
                    )}
                  </div>

                  {/* Topics */}
                  {item.domain.majTopics && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Topics:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.domain.majTopics.split(",").map((topic, idx) => (
                          <Badge key={idx} variant="secondary">
                            {topic.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                      <p className="text-sm bg-muted p-3 rounded-md">{item.notes}</p>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    {item.domain.price && (
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="text-xl font-bold text-primary">${item.domain.price}</p>
                      </div>
                    )}
                    {item.domain.expires && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Expires</p>
                        <p className="text-sm">{item.domain.expires}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button asChild variant="default" className="flex-1">
                      <a
                        href={`https://spamzilla.io/search?domain=${item.domain.domainName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on SpamZilla
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Domains in Watchlist</h3>
              <p className="text-muted-foreground mb-4">
                Start adding domains from your analysis results to track them here
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
