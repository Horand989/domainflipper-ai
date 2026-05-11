import { Coins, TrendingUp, ShoppingCart, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Badge } from "./ui/badge";

export function CreditBalanceCard() {
  const { data: balanceData, isLoading: loadingBalance } = trpc.pricing.getBalance.useQuery();
  const { data: transactions, isLoading: loadingTransactions } = trpc.pricing.getCreditHistory.useQuery(
    { limit: 5 },
    { enabled: !!balanceData }
  );

  if (loadingBalance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Credit Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentBalance = balanceData?.credits || 0;
  const isLowBalance = currentBalance < 10;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-purple-600" />
            Credit Balance
          </CardTitle>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            Pro Tier
          </Badge>
        </div>
        <CardDescription>
          Use credits for bulk domain uploads and advanced features
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Balance */}
        <div className="text-center py-4 bg-white rounded-lg border border-purple-100">
          <div className="text-5xl font-bold text-purple-600 mb-1">
            {currentBalance.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">
            Credits Available
          </div>
          {isLowBalance && currentBalance > 0 && (
            <Badge variant="outline" className="mt-2 border-amber-300 text-amber-700">
              Low Balance
            </Badge>
          )}
          {currentBalance === 0 && (
            <Badge variant="outline" className="mt-2 border-red-300 text-red-700">
              No Credits
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/pricing">
            <Button className="w-full" variant="default">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy Credits
            </Button>
          </Link>
          <Link href="/pricing">
            <Button className="w-full" variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              View Plans
            </Button>
          </Link>
        </div>

        {/* Recent Transactions */}
        {!loadingTransactions && transactions && transactions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="w-4 h-4" />
              Recent Transactions
            </div>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-100 text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {tx.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${
                      tx.amount > 0 ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Tip */}
        <div className="text-xs text-muted-foreground bg-purple-50 p-3 rounded border border-purple-100">
          <strong>Tip:</strong> Each domain in a bulk upload costs 1 credit. 
          Credits never expire and can be used anytime.
        </div>
      </CardContent>
    </Card>
  );
}
