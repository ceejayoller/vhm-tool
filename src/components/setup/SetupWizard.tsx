"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./ImageUpload";
import { GeoJSONUpload } from "./GeoJSONUpload";
import { createProject } from "@/db/crud";
import type { LatLngBounds, ChildFeatureCollection } from "@/types/geo";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type Step = "basic" | "image" | "geojson" | "confirm";
const STEPS: Step[] = ["basic", "image", "geojson", "confirm"];

const STEP_LABELS: Record<Step, string> = {
  basic: "Project Details",
  image: "Base Image",
  geojson: "Child Polygons",
  confirm: "Confirm",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  basic: "Enter a name and description for your project",
  image: "Upload the base image for your project",
  geojson:
    "Upload a GeoJSON file with child polygons, or skip to draw them later",
  confirm: "Review your settings and create the project",
};

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("basic");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [baseImageBounds, setBaseImageBounds] = useState<LatLngBounds | null>(
    null,
  );
  const [childGeoJSON, setChildGeoJSON] =
    useState<ChildFeatureCollection | null>(null);

  const handleCreate = async () => {
    if (!baseImage || !baseImageBounds) return;

    setLoading(true);
    try {
      const project = await createProject({
        name,
        description: description || undefined,
        baseImageBlob: baseImage,
        baseImageBounds,
        childGeoJSON: childGeoJSON || undefined,
      });
      router.push(`/workspace/${project.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. See console for details.");
      setLoading(false);
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case "basic":
        return name.trim().length > 0;
      case "image":
        return baseImage !== null && baseImageBounds !== null;
      case "geojson":
        return true;
      case "confirm":
        return true;
      default:
        return false;
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
    else router.push("/");
  };

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <div className="flex items-center gap-2 mt-4">
          {STEPS.map((s, idx) => (
            <div key={s} className="flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                `}
              >
                {idx + 1}
              </div>
              <span className="text-xs ml-1.5 text-muted-foreground hidden sm:inline">
                {STEP_LABELS[s]}
              </span>
              {idx < STEPS.length - 1 && (
                <div className="w-8 h-0.5 bg-muted mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEP_LABELS[step]}</CardTitle>
          <CardDescription>{STEP_DESCRIPTIONS[step]}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "basic" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Geo Project"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === "image" && (
            <ImageUpload
              file={baseImage}
              bounds={baseImageBounds}
              onImageSelectAction={setBaseImage}
              onBoundsChangeAction={setBaseImageBounds}
            />
          )}

          {step === "geojson" && (
            <GeoJSONUpload
              geojson={childGeoJSON}
              onGeoJSONChangeAction={setChildGeoJSON}
            />
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Project Name</h3>
                <p className="text-sm text-muted-foreground">{name}</p>
              </div>
              {description && (
                <div>
                  <h3 className="font-medium">Description</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              )}
              <div>
                <h3 className="font-medium">Base Image</h3>
                <p className="text-sm text-muted-foreground">
                  {baseImage?.name} (
                  {((baseImage?.size ?? 0) / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
              <div>
                <h3 className="font-medium">Child Polygons</h3>
                <p className="text-sm text-muted-foreground">
                  {childGeoJSON
                    ? `${childGeoJSON.features.length} features loaded`
                    : "None (draw later in workspace)"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={goBack} disabled={loading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {step !== "confirm" ? (
          <Button onClick={goNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={loading || !canProceed()}>
            <Check className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Project"}
          </Button>
        )}
      </div>
    </div>
  );
}
