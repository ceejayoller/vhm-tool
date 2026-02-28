"use client";

import { VesselLayoutPicker } from "@/components/vessels/VesselLayoutPicker";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";

export default function VesselsPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Select a Layout</h1>
              <p className="text-muted-foreground mt-1">
                Choose a vessel layout to import from Kaiko Dashboard
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/project/new">
              <Upload className="mr-2 h-4 w-4" />
              Manual Upload
            </Link>
          </Button>
        </div>

        <VesselLayoutPicker />
      </div>
    </div>
  );
}
