"use client";

import { useProjects } from "@/db/hooks";
import { deleteProject } from "@/db/crud";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const projects = useProjects();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">VHM Tool</h1>
            <p className="text-muted-foreground mt-2">
              GeoJSON polygon screenshot automation & editing platform
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/project/new">
              <Plus className="mr-2 h-5 w-5" />
              New Project
            </Link>
          </Button>
        </div>

        {!projects || projects.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first project to get started
            </p>
            <Button asChild>
              <Link href="/project/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => deleteProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
