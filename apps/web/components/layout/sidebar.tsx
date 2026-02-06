"use client";

import { Nav } from "./nav";
import { Separator } from "@/components/ui/separator";
import { MapPin } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="hidden md:flex h-full w-60 flex-col border-r bg-sidebar-background">
      <div className="flex h-14 items-center gap-2 px-4">
        <MapPin className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Transport Router</span>
      </div>
      <Separator />
      <div className="flex-1 px-3 py-4">
        <Nav />
      </div>
    </aside>
  );
}
