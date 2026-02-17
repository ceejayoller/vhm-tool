"use client";

import type { Project } from "@/db/db";
import { useBlobUrl } from "@/db/hooks";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Image as ImageIcon, Trash2 } from "lucide-react";

interface ProjectCardProps {
  project: Project;
  onDeleteAction: () => void;
}

export function ProjectCard({ project, onDeleteAction }: ProjectCardProps) {
  const thumbnailUrl = useBlobUrl(project.overlayBlobId);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete project "${project.name}"?`)) {
      onDeleteAction();
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="line-clamp-1">{project.name}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {thumbnailUrl ? (
          <div className="aspect-video relative rounded-md overflow-hidden bg-muted">
            <Image
              src={thumbnailUrl}
              alt={project.name}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video rounded-md bg-muted flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {project.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {project.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(project.updatedAt).toLocaleDateString()}
          {project.childGeojson && (
            <span className="ml-auto">
              {project.childGeojson.features.length} child polygons
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/workspace/${project.id}`}>Open Project</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
