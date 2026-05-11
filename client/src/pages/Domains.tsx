import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import PriceChart from "@/components/PriceChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DomainRow } from "@/components/DomainRow";

export default function Domains() {
  const { user, loading: authLoading } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  const utils = trpc.useUtils();
  const { data: domains, isLoading } = trpc.domains.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createDomain = trpc.domains.create.useMutation({
    onSuccess: () => {
      utils.domains.list.invalidate();
      toast.success("Domain added successfully");
      setIsAddDialogOpen(false);
      setDomainName("");
      setCurrentPrice("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add domain");
    },
  });

  const deleteDomain = trpc.domains.delete.useMutation({
    onSuccess: () => {
      utils.domains.list.invalidate();
      toast.success("Domain deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete domain");
    },
  });

  const handleAddDomain = () => {
    const priceInCents = Math.round(parseFloat(currentPrice) * 100);
    if (!domainName || isNaN(priceInCents) || priceInCents <= 0) {
      toast.error("Please enter valid domain name and price");
      return;
    }
    createDomain.mutate({ name: domainName, currentPrice: priceInCents });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Domain Portfolio
          </h1>
          <p className="text-muted-foreground">
            Track and monitor domain prices in your portfolio
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Domains</CardTitle>
                <CardDescription>Manage domain names and their current market prices</CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Domain
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Domain</DialogTitle>
                    <DialogDescription>
                      Enter the domain name and its current market price
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain-name">Domain Name</Label>
                      <Input
                        id="domain-name"
                        placeholder="example.com"
                        value={domainName}
                        onChange={(e) => setDomainName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current-price">Current Price ($)</Label>
                      <Input
                        id="current-price"
                        type="number"
                        step="0.01"
                        placeholder="1000.00"
                        value={currentPrice}
                        onChange={(e) => setCurrentPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddDomain}
                      disabled={createDomain.isPending}
                    >
                      {createDomain.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add Domain
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {!domains || domains.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No domains added yet</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Domain
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain Name</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => (
                    <DomainRow
                      key={domain.id}
                      domain={domain}
                      onDelete={(id) => deleteDomain.mutate({ id })}
                      isDeleting={deleteDomain.isPending}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
