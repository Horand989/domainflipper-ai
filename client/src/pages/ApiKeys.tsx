import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";

export default function ApiKeys() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPrefix, setCopiedPrefix] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: keys, isLoading: keysLoading } = trpc.apiKeys.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createKey = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.fullKey);
      setNewKeyName("");
      setShowKey(true);
      utils.apiKeys.list.invalidate();
      toast.success("API key created! Copy it now — it will not be shown again.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create API key");
    },
  });

  const revokeKey = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      utils.apiKeys.list.invalidate();
      toast.success("API key revoked.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to revoke key");
    },
  });

  const copyToClipboard = (text: string, isPrefix?: boolean) => {
    navigator.clipboard.writeText(text);
    if (isPrefix) {
      setCopiedPrefix(text);
      setTimeout(() => setCopiedPrefix(null), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for this key (e.g. 'My ChatGPT Key')");
      return;
    }
    createKey.mutate({ name: newKeyName.trim() });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to manage your API keys</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Key className="w-8 h-8 text-primary" />
            API Keys
          </h1>
          <p className="text-muted-foreground text-lg">
            Generate personal API keys to use FlipandSift from ChatGPT, Claude, Gemini, Perplexity, or any tool that supports REST APIs.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setLocation("/developer")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Developer Docs
          </Button>
        </div>

        {/* Newly Created Key Banner */}
        {createdKey && (
          <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2 text-base">
                <CheckCircle2 className="w-5 h-5" />
                API Key Created — Copy It Now
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-500">
                This key will not be shown again. Store it somewhere safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white dark:bg-black/30 border rounded px-3 py-2 text-sm font-mono break-all">
                  {showKey ? createdKey : createdKey.replace(/./g, "•").slice(0, 30) + "..."}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdKey)}
                >
                  {copiedKey ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="ml-2">{copiedKey ? "Copied!" : "Copy"}</span>
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setCreatedKey(null)}
              >
                I've saved my key, dismiss this
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create New Key */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Create New API Key</CardTitle>
            <CardDescription>Give it a descriptive name so you remember where it's used.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="e.g. My ChatGPT Key, Claude Integration"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                maxLength={100}
                className="flex-1"
              />
              <Button onClick={handleCreate} disabled={createKey.isPending || !newKeyName.trim()}>
                {createKey.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Key
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Your API Keys</span>
              <Badge variant="secondary">{keys?.length ?? 0} / 10</Badge>
            </CardTitle>
            <CardDescription>
              Keys are shown as a short prefix only. The full key is only visible once at creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {keysLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !keys || keys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No API keys yet</p>
                <p className="text-sm mt-1">Create your first key above to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{key.name}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {key.keyPrefix}...
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(key.createdAt)} · Last used {formatDate(key.lastUsedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Copy prefix"
                        onClick={() => copyToClipboard(key.keyPrefix + "...", true)}
                      >
                        {copiedPrefix === key.keyPrefix ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-destructive" />
                              Revoke API Key?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Revoking <strong>{key.name}</strong> ({key.keyPrefix}...) will immediately stop all requests using this key. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => revokeKey.mutate({ keyId: key.id })}
                            >
                              Revoke Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Note */}
        <p className="text-xs text-muted-foreground mt-4 text-center">
          API keys grant full access to your FlipandSift account. Never share them publicly or commit them to code repositories.
        </p>
      </div>
    </div>
  );
}
