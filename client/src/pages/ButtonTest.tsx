import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ButtonTest() {
  const handleClick = (buttonName: string) => {
    console.log(`${buttonName} clicked!`);
    toast.success(`${buttonName} clicked!`);
    alert(`${buttonName} clicked!`);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Button Test Page</h1>
      
      <div className="space-y-8">
        {/* Test 1: Buttons outside Card */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Test 1: Buttons Outside Card</h2>
          <div className="space-x-4">
            <Button onClick={() => handleClick("Button 1")}>
              Button 1
            </Button>
            <Button onClick={() => handleClick("Button 2")} variant="outline">
              Button 2
            </Button>
            <Button onClick={() => handleClick("Button 3")} variant="secondary">
              Button 3
            </Button>
          </div>
        </div>

        {/* Test 2: Buttons inside Card */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Test 2: Buttons Inside Card</h2>
          <Card>
            <CardHeader>
              <CardTitle>Card with Buttons</CardTitle>
            </CardHeader>
            <CardContent className="space-x-4">
              <Button onClick={() => handleClick("Card Button 1")}>
                Card Button 1
              </Button>
              <Button onClick={() => handleClick("Card Button 2")} variant="outline">
                Card Button 2
              </Button>
              <Button onClick={() => handleClick("Card Button 3")} variant="secondary">
                Card Button 3
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Test 3: Grid layout like ProjectDetail */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Test 3: Grid Layout (Like ProjectDetail)</h2>
          <Card>
            <CardHeader>
              <CardTitle>Domain Suggestion Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full" 
                onClick={() => handleClick("Choose This Domain")}
              >
                Choose This Domain
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleClick("Add to Project")}
                >
                  Add to Project
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleClick("Watchlist")}
                >
                  Watchlist
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleClick("Check Availability")}
                >
                  Check Availability
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleClick("Show TLDs")}
                >
                  Show TLDs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
