"use client";

import { useState } from "react";
import { useTemplates } from "@/db/hooks";
import { createTemplate, deleteTemplate } from "@/db/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Save, Trash2 } from "lucide-react";
import { useEditorStore } from "@/state/editorStore";

export function TemplatePanel() {
  const templates = useTemplates();
  const { overlays, setOverlays } = useEditorStore();
  const [savingName, setSavingName] = useState("");

  const handleSaveTemplate = async () => {
    if (!savingName.trim()) return;

    await createTemplate({
      name: savingName.trim(),
      templateSpec: {
        overlays: overlays.map((o) => ({
          type: o.type,
          props: { ...o } as unknown as Record<string, unknown>,
        })),
      },
    });

    setSavingName("");
  };

  const handleLoadTemplate = async (templateId: string) => {
    const { db } = await import("@/db/db");
    const template = await db.templates.get(templateId);
    if (!template) return;

    const loaded = template.templateSpec.overlays.map(
      (o) => o.props as unknown as (typeof overlays)[number],
    );
    setOverlays(loaded);
  };

  const handleDeleteTemplate = async (
    e: React.MouseEvent,
    templateId: string,
  ) => {
    e.stopPropagation();
    if (confirm("Delete this template?")) {
      await deleteTemplate(templateId);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Save Current as Template</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Template name"
            value={savingName}
            onChange={(e) => setSavingName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
          />
          <Button
            size="sm"
            onClick={handleSaveTemplate}
            disabled={!savingName.trim()}
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Saved Templates</h3>
        <div className="space-y-2">
          {!templates || templates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No templates saved yet</p>
          ) : (
            templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleLoadTemplate(template.id)}
              >
                <CardHeader className="p-3 pb-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDeleteTemplate(e, template.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-xs text-muted-foreground">
                    {template.templateSpec.overlays.length} overlay
                    {template.templateSpec.overlays.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
