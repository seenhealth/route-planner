import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Upload, Settings, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-8 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Route Planner</h2>
        <p className="text-muted-foreground">
          Daily transport routing for Seen Health PACE Center participants.
        </p>
      </div>

      {/* How it works */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">How to use</h3>
        <ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground">
          <li><strong className="text-foreground">Upload a manifest</strong> — Go to <Link href="/upload" className="underline underline-offset-2">Upload</Link> and drop in the daily transport CSV from the scheduling system.</li>
          <li><strong className="text-foreground">View routes</strong> — Open <Link href="/routes" className="underline underline-offset-2">Routes</Link>, select the manifest, and the system will compute optimized pickup and dropoff trips using Google Route Optimization.</li>
          <li><strong className="text-foreground">Filter and explore</strong> — Toggle between pickups/dropoffs, filter by vehicle, click a trip to see the stop-by-stop itinerary, and hover routes on the map.</li>
          <li><strong className="text-foreground">Adjust settings</strong> — In <Link href="/settings" className="underline underline-offset-2">Settings</Link>, configure the max drive time per trip and your vehicle fleet (names and seat capacities). Changes auto-invalidate cached routes.</li>
          <li><strong className="text-foreground">Recompute</strong> — Hit &quot;Recompute Routes&quot; anytime to regenerate with current settings. Previous results are cached for fast reload.</li>
        </ol>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/upload">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upload</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Upload a transport manifest CSV to generate routes.
              </p>
              <div className="flex items-center gap-1 text-xs text-primary mt-2 group-hover:underline">
                Go to Upload <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/routes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Routes</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                View optimized pickup and dropoff routes on the map.
              </p>
              <div className="flex items-center gap-1 text-xs text-primary mt-2 group-hover:underline">
                Go to Routes <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Settings</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Configure drive time limits and vehicle fleet.
              </p>
              <div className="flex items-center gap-1 text-xs text-primary mt-2 group-hover:underline">
                Go to Settings <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
