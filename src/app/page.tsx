"use client";

import { useProjects } from "@/db/hooks";
import { deleteProject } from "@/db/crud";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { Plus, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/state/authStore";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const projects = useProjects();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

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
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {user.first_name} {user.last_name}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
            <Button asChild size="lg">
              <Link href="/project/new">
                <Plus className="mr-2 h-5 w-5" />
                New Project
              </Link>
            </Button>
          </div>
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
                onDeleteAction={() => deleteProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
