import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { X, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export interface FilterState {
  extensions: string[];
  maxLength: number;
  availableOnly: boolean;
  sortBy?: 'brandScore' | 'confidence' | 'none';
}

interface SuggestionFilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

const COMMON_EXTENSIONS = [
  ".com",
  ".net",
  ".io",
  ".ai",
  ".co",
  ".org",
  ".app",
  ".dev",
];

export function SuggestionFilterBar({
  filters,
  onFiltersChange,
  onClearFilters,
}: SuggestionFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExtensionToggle = (extension: string) => {
    const newExtensions = filters.extensions.includes(extension)
      ? filters.extensions.filter((ext) => ext !== extension)
      : [...filters.extensions, extension];
    
    onFiltersChange({ ...filters, extensions: newExtensions });
  };

  const handleMaxLengthChange = (value: number[]) => {
    onFiltersChange({ ...filters, maxLength: value[0] });
  };

  const handleAvailableOnlyToggle = (checked: boolean) => {
    onFiltersChange({ ...filters, availableOnly: checked });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({ ...filters, sortBy: value as 'brandScore' | 'confidence' | 'none' });
  };

  const hasActiveFilters =
    filters.extensions.length > 0 ||
    filters.maxLength < 50 ||
    filters.availableOnly;

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Filter Suggestions</h3>
          {hasActiveFilters && (
            <span className="text-sm text-muted-foreground">
              ({filters.extensions.length > 0 ? `${filters.extensions.length} ext` : ""}
              {filters.maxLength < 50 ? `, ≤${filters.maxLength} chars` : ""}
              {filters.availableOnly ? ", available only" : ""})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Hide" : "Show"} Filters
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Extension Filter */}
          <div>
            <Label className="text-base mb-3 block">Extensions</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {COMMON_EXTENSIONS.map((ext) => (
                <div key={ext} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ext-${ext}`}
                    checked={filters.extensions.includes(ext)}
                    onCheckedChange={() => handleExtensionToggle(ext)}
                  />
                  <label
                    htmlFor={`ext-${ext}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {ext}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Max Length Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base">Max Length</Label>
              <Input
                type="number"
                value={filters.maxLength}
                onChange={(e) => handleMaxLengthChange([parseInt(e.target.value) || 50])}
                className="w-20 h-8 text-sm"
                min={1}
                max={50}
              />
            </div>
            <Slider
              value={[filters.maxLength]}
              onValueChange={handleMaxLengthChange}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 char</span>
              <span>50 chars</span>
            </div>
          </div>

          {/* Sort By Filter */}
          <div>
            <Label className="text-base mb-3 block">Sort By</Label>
            <Select value={filters.sortBy || 'none'} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No sorting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No sorting</SelectItem>
                <SelectItem value="brandScore">Brand Score (High to Low)</SelectItem>
                <SelectItem value="confidence">Confidence (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Availability Filter */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="available-only" className="text-base">
                Show Available Only
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Hide domains that are already registered
              </p>
            </div>
            <Switch
              id="available-only"
              checked={filters.availableOnly}
              onCheckedChange={handleAvailableOnlyToggle}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
