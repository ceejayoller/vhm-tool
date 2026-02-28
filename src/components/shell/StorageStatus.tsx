"use client";

import { HardDrive } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useStorageStatus } from "@/db/hooks";
import { formatBytes } from "@/utils/storageEstimate";
import { cn } from "@/lib/utils";

const NEARLY_FULL_THRESHOLD_PERCENT = 95;
const LARGE_ESTIMATE_THRESHOLD = 5_000;

export function StorageStatus({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const status = useStorageStatus();

  if (status.quota === 0 && !status.loading) {
    return null;
  }

  const isNearlyFull =
    status.usagePercent >= NEARLY_FULL_THRESHOLD_PERCENT ||
    (status.diagramsRemaining !== null && status.diagramsRemaining === 0);
  const diagramsRemainingDisplay =
    status.diagramsRemaining !== null
      ? isNearlyFull
        ? "Storage nearly full"
        : status.diagramsRemaining > LARGE_ESTIMATE_THRESHOLD
          ? `~${LARGE_ESTIMATE_THRESHOLD.toLocaleString()}+ diagrams`
          : `~${status.diagramsRemaining} diagrams remaining`
      : status.assetCount === 0
        ? "Create diagrams to see estimate"
        : "—";

  const trigger = (
    <button
      type="button"
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact && "gap-1.5 px-1.5",
        className,
      )}
      aria-label="Storage usage and diagram estimate"
    >
      <HardDrive
        className={cn("size-4 shrink-0", compact && "size-3.5")}
        aria-hidden
      />
      {!status.loading && (
        <>
          <span className="tabular-nums">
            {formatBytes(status.usage)} / {formatBytes(status.quota)}
          </span>
          <div
            className={cn(
              "rounded-full bg-muted overflow-hidden",
              compact ? "w-12 h-1.5" : "w-16 h-1.5",
            )}
            role="progressbar"
            aria-valuenow={Math.round(status.usagePercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${Math.round(status.usagePercent)}% used`}
          >
            <div
              className="h-full bg-primary/60 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, status.usagePercent)}%` }}
            />
          </div>
        </>
      )}
      {status.loading && (
        <span className="text-muted-foreground/70">…</span>
      )}
    </button>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          className="max-w-xs p-3 space-y-2"
        >
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Storage</span>
              <span className="tabular-nums">
                {formatBytes(status.usage)} / {formatBytes(status.quota)} (
                {Math.round(status.usagePercent)}%)
              </span>
            </div>
            <Progress value={status.usagePercent} className="h-2" />
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {status.indexedDBUsage !== undefined ? (
              <div>IndexedDB: {formatBytes(status.indexedDBUsage)}</div>
            ) : (
              <div>Used: {formatBytes(status.usage)}</div>
            )}
            <div>Diagram data: {formatBytes(status.totalBlobBytes)}</div>
            <div>Estimated diagrams remaining: {diagramsRemainingDisplay}</div>
            {status.assetCount > 0 && (
              <div>
                Based on avg {formatBytes(status.avgBytesPerDiagram)} per
                diagram from {status.assetCount} existing diagram
                {status.assetCount !== 1 ? "s" : ""}
              </div>
            )}
            {status.assetCount === 0 && status.diagramsRemaining === null && (
              <div>Based on typical ~400 KB per 1080px diagram</div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/80 pt-1 border-t">
            Quota is a browser limit based on total disk size. If your disk is low
            on free space, you may run out sooner.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
