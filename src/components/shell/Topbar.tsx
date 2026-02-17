"use client";

import type { Project } from "@/db/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TopbarProps {
  project: Project;
}

export function Topbar({ project }: TopbarProps) {
  return (
    <div className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Projects
          </Link>
        </Button>
        <div className="border-l pl-4">
          <h1 className="font-semibold text-sm">{project.name}</h1>
          {project.description && (
            <p className="text-xs text-muted-foreground truncate max-w-md">
              {project.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
