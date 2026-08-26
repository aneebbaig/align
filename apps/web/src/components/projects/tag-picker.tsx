"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { createTag, deleteTag } from "@/actions/projects";
import { cn } from "@/lib/utils";

export interface TagOption {
  id: string;
  name: string;
  color: string;
}

export function TagPicker({
  allTags, selectedIds, onChange, onTagsChanged,
}: {
  allTags: TagOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onTagsChanged: (tags: TagOption[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const result = await createTag({ name, color: newColor });
    setCreating(false);
    if (result.success && result.data) {
      const created = { id: result.data.id, name, color: newColor };
      onTagsChanged([...allTags, created]);
      onChange([...selectedIds, created.id]);
      setNewName("");
    } else {
      toast.error(result.error ?? "Failed to create tag");
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const result = await deleteTag(id);
    if (result.success) {
      onTagsChanged(allTags.filter((t) => t.id !== id));
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      toast.error(result.error ?? "Failed to delete tag");
    }
  }

  const selectedTags = allTags.filter((t) => selectedIds.includes(t.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex flex-wrap items-center gap-1.5 min-h-9 w-full rounded-md border border-input px-2.5 py-1.5 text-sm text-left hover:border-foreground/30 transition-colors"
        >
          {selectedTags.length === 0 ? (
            <span className="text-muted-foreground flex items-center gap-1.5"><TagIcon className="h-3.5 w-3.5" />Add tags</span>
          ) : (
            selectedTags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${t.color}22`, color: t.color }}
              >
                {t.name}
              </span>
            ))
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {allTags.length === 0 && <p className="text-xs text-muted-foreground px-1 py-2">No tags yet - create one below.</p>}
          {allTags.map((t) => (
            <div
              key={t.id}
              onClick={() => toggle(t.id)}
              className={cn(
                "group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted",
                selectedIds.includes(t.id) && "bg-muted",
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="truncate">{t.name}</span>
              </span>
              <button
                onClick={(e) => handleDelete(t.id, e)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity shrink-0"
                title="Delete tag"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-7 w-7 shrink-0 cursor-pointer rounded border border-input"
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
            placeholder="New tag"
            className="h-7 text-xs"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="shrink-0 rounded-md p-1.5 text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
            title="Create tag"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
