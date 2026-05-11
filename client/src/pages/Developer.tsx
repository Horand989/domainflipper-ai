import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, CheckCircle2, ExternalLink, Key, Zap, Globe, Search, FolderOpen } from "lucide-react";
import { useLocation } from "wouter";

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 text-sm overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-100"
        onClick={copy}
      >
        {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://flipandsift.com";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/health",
    label: "Health Check",
    description: "Verify the API is reachable. No auth required.",
    icon: <Zap className="w-4 h-4" />,
    auth: false,
  },
  {
    method: "POST",
    path: "/api/v1/domain/check",
    label: "Check Domain",
    description: "Check if a single domain is available and get pricing.",
    icon: <Globe className="w-4 h-4" />,
    auth: true,
    body: `{ "domain": "flipandsift.com" }`,
  },
  {
    method: "POST",
    path: "/api/v1/domain/bulk-check",
    label: "Bulk Check Domains",
    description: "Check up to 20 domains in a single request.",
    icon: <Globe className="w-4 h-4" />,
    auth: true,
    body: `{ "domains": ["flipandsift.com", "domainradar.com"] }`,
  },
  {
    method: "POST",
    path: "/api/v1/affiliate/analyze",
    label: "Affiliate Intelligence",
    description: "Analyze a product and get domain ideas, keywords, and funnel strategy.",
    icon: <Search className="w-4 h-4" />,
    auth: true,
    body: `{ "productName": "Flat Belly Fix", "url": "https://example.com/product" }`,
  },
  {
    method: "POST",
    path: "/api/v1/keywords/extract",
    label: "Extract Keywords",
    description: "Extract SEO keywords and content ideas for a domain.",
    icon: <Search className="w-4 h-4" />,
    auth: true,
    body: `{ "domain": "flipandsift.com" }`,
  },
  {
    method: "GET",
    path: "/api/v1/projects",
    label: "List Projects",
    description: "Retrieve all your FlipandSift projects.",
    icon: <FolderOpen className="w-4 h-4" />,
    auth: true,
  },
];

export default function Developer() {
  const [, setLocation] = useLocation();

  const curlExample = `# 1. Check domain availability
curl -X POST ${BASE_URL}/api/v1/domain/check \\
  -H "Authorization: Bearer ds_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"domain": "flipandsift.com"}'

# 2. Bulk check up to 20 domains
curl -X POST ${BASE_URL}/api/v1/domain/bulk-check \\
  -H "Authorization: Bearer ds_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"domains": ["flipandsift.com", "domainradar.com", "domainvault.io"]}'

# 3. Run Affiliate Intelligence
curl -X POST ${BASE_URL}/api/v1/affiliate/analyze \\
  -H "Authorization: Bearer ds_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"productName": "Flat Belly Fix", "url": "https://example.com/product"}'`;

  const pythonExample = `import requests

API_KEY = "ds_YOUR_API_KEY"
BASE_URL = "${BASE_URL}/api/v1"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Check domain availability
resp = requests.post(f"{BASE_URL}/domain/check", json={"domain": "flipandsift.com"}, headers=HEADERS)
print(resp.json())

# Bulk check
domains = ["flipandsift.com", "domainradar.com", "domainvault.io"]
resp = requests.post(f"{BASE_URL}/domain/bulk-check", json={"domains": domains}, headers=HEADERS)
results = resp.json()["results"]
available = [r["domain"] for r in results if r.get("available")]
print("Available:", available)

# Affiliate Intelligence
resp = requests.post(f"{BASE_URL}/affiliate/analyze",
    json={"productName": "Flat Belly Fix", "url": "https://example.com"},
    headers=HEADERS)
print(resp.json())`;

  const chatgptExample = `# How to add FlipandSift to a Custom GPT

1. Go to https://chat.openai.com/gpts/editor
2. Click "Create a GPT" → "Configure" tab
3. Scroll to "Actions" → click "Add actions"
4. In the "Schema" field, paste this URL:
   ${BASE_URL}/api/v1/openapi.json
5. Under "Authentication", choose "API Key"
   - Auth Type: Bearer
   - API Key: ds_YOUR_API_KEY
6. Click "Save" — your GPT can now check domains,
   run affiliate analysis, and extract keywords.

Example prompt for your GPT:
"Check if flipandsift.com is available and suggest 
5 similar domain names that are also available."`;

  const claudeExample = `# How to use FlipandSift in Claude Projects

Claude supports tool use via the Anthropic API.
Add FlipandSift as a tool in your system prompt:

tools = [
  {
    "name": "check_domain",
    "description": "Check if a domain name is available for registration",
    "input_schema": {
      "type": "object",
      "properties": {
        "domain": {"type": "string", "description": "Domain name to check"}
      },
      "required": ["domain"]
    }
  }
]

# When Claude calls check_domain, forward to:
# POST ${BASE_URL}/api/v1/domain/check
# Authorization: Bearer ds_YOUR_API_KEY`;

  const nodeExample = `import fetch from "node-fetch"; // or use built-in fetch in Node 18+

const API_KEY = "ds_YOUR_API_KEY";
const BASE = "${BASE_URL}/api/v1";

async function checkDomain(domain: string) {
  const res = await fetch(\`\${BASE}/domain/check\`, {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domain }),
  });
  return res.json();
}

async function bulkCheck(domains: string[]) {
  const res = await fetch(\`\${BASE}/domain/bulk-check\`, {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domains }),
  });
  return res.json();
}

// Usage
const result = await checkDomain("flipandsift.com");
console.log(result);`;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span>FlipandSift</span>
            <span>/</span>
            <span>Developer Docs</span>
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Developer Docs
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Use FlipandSift from ChatGPT, Claude, Gemini, Perplexity, or any tool that supports REST APIs.
            All endpoints require an API key.
          </p>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => setLocation("/api-keys")}>
              <Key className="w-4 h-4 mr-2" />
              Get Your API Key
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/v1/openapi.json" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                OpenAPI Spec
              </a>
            </Button>
          </div>
        </div>

        {/* Authentication */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>All API requests (except /health) require a Bearer token.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CodeBlock code={`Authorization: Bearer ds_YOUR_API_KEY`} />
            <p className="text-sm text-muted-foreground">
              API keys start with <code className="bg-muted px-1 rounded">ds_</code> and are generated on the{" "}
              <button className="text-primary underline" onClick={() => setLocation("/api-keys")}>
                API Keys page
              </button>
              . Each account can have up to 10 active keys. Keys are hashed and never stored in plain text.
            </p>
          </CardContent>
        </Card>

        {/* Endpoints Reference */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
            <CardDescription>Base URL: <code className="bg-muted px-1 rounded">{BASE_URL}/api/v1</code></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ENDPOINTS.map((ep) => (
                <div key={ep.path} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                  <Badge
                    variant={ep.method === "GET" ? "secondary" : "default"}
                    className="mt-0.5 shrink-0 font-mono text-xs"
                  >
                    {ep.method}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono text-primary">{ep.path}</code>
                      {!ep.auth && (
                        <Badge variant="outline" className="text-xs">No auth</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{ep.description}</p>
                    {ep.body && (
                      <code className="text-xs text-muted-foreground mt-1 block">
                        Body: {ep.body}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Code Examples */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Code Examples
          </h2>
          <Tabs defaultValue="curl">
            <TabsList className="mb-4">
              <TabsTrigger value="curl">curl</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="node">Node.js / TypeScript</TabsTrigger>
              <TabsTrigger value="chatgpt">ChatGPT Custom GPT</TabsTrigger>
              <TabsTrigger value="claude">Claude / Anthropic</TabsTrigger>
            </TabsList>
            <TabsContent value="curl">
              <CodeBlock code={curlExample} language="bash" />
            </TabsContent>
            <TabsContent value="python">
              <CodeBlock code={pythonExample} language="python" />
            </TabsContent>
            <TabsContent value="node">
              <CodeBlock code={nodeExample} language="typescript" />
            </TabsContent>
            <TabsContent value="chatgpt">
              <CodeBlock code={chatgptExample} language="text" />
            </TabsContent>
            <TabsContent value="claude">
              <CodeBlock code={claudeExample} language="python" />
            </TabsContent>
          </Tabs>
        </div>

        {/* Rate Limits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Rate Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Plan</th>
                    <th className="text-left py-2 pr-4 font-medium">Requests / min</th>
                    <th className="text-left py-2 font-medium">Bulk check max</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2 pr-4">Free</td>
                    <td className="py-2 pr-4">10</td>
                    <td className="py-2">5 domains</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Pro</td>
                    <td className="py-2 pr-4">60</td>
                    <td className="py-2">20 domains</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Agency</td>
                    <td className="py-2 pr-4">300</td>
                    <td className="py-2">20 domains</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Error Codes */}
        <Card>
          <CardHeader>
            <CardTitle>Error Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {[
                { code: "401", msg: "Missing or invalid API key" },
                { code: "400", msg: "Invalid request body or missing required fields" },
                { code: "429", msg: "Rate limit exceeded — slow down requests" },
                { code: "500", msg: "Internal error — try again or contact support" },
              ].map((e) => (
                <div key={e.code} className="flex items-center gap-3">
                  <Badge variant="destructive" className="font-mono w-12 justify-center shrink-0">
                    {e.code}
                  </Badge>
                  <span className="text-muted-foreground">{e.msg}</span>
                </div>
              ))}
            </div>
            <CodeBlock
              code={`// All errors return JSON:
{ "error": "Description of what went wrong" }`}
              language="json"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
