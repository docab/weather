import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2 } from "lucide-react";
import { geocodeUK, makeLocation, type GeoResult } from "@/lib/api";
import type { Location } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (loc: Location) => void;
}

export function AddLocationDialog({ open, onOpenChange, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await geocodeUK(q);
      setResults(res);
      if (!res.length) setError("No UK matches. Try a town name or postcode.");
    } catch {
      setError("Search failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const choose = (g: GeoResult) => {
    onSelect(makeLocation(g));
    onOpenChange(false);
    setQ("");
    setResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a location</DialogTitle>
          <DialogDescription>Search by UK town, city or postcode.</DialogDescription>
        </DialogHeader>
        <form onSubmit={search} className="flex gap-2">
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="e.g. Brighton or BN1 1AA"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {results.length > 0 && (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => choose(r)}
                  className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-secondary/60"
                >
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[r.postcode, r.region].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}