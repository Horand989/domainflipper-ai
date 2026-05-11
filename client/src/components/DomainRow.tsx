import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";
import PriceChart from "@/components/PriceChart";

interface DomainRowProps {
  domain: {
    id: number;
    name: string;
    currentPrice: number;
    lastChecked: Date;
  };
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export function DomainRow({ domain, onDelete, isDeleting }: DomainRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible key={domain.id} open={isOpen} onOpenChange={setIsOpen} asChild>
      <>
        <TableRow>
          <TableCell className="font-medium">{domain.name}</TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">
                ${(domain.currentPrice / 100).toFixed(2)}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {new Date(domain.lastChecked).toLocaleString()}
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(domain.id)}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <TableRow>
            <TableCell colSpan={4} className="p-4 bg-muted/30">
              <PriceChart domainId={domain.id} domainName={domain.name} />
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </>
    </Collapsible>
  );
}
