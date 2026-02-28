"use client";

import type { Project } from "@/db/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/state/authStore";
import { useRouter } from "next/navigation";
import { StorageStatus } from "./StorageStatus";

interface TopbarProps {
  project: Project;
}

export function Topbar({ project }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

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
      <div className="flex items-center gap-3">
        <StorageStatus compact />
        {user && (
          <>
            <span className="text-sm text-muted-foreground">
              {user.first_name} {user.last_name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
