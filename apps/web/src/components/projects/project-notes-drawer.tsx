"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateProject } from "@/actions/projects";

export interface ProjectLink {
  id: string;
  label: string;
  url: string;
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function ProjectNotesDrawer({
  projectId, open, onOpenChange, initialNotes, initialLinks,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialNotes: string;
  initialLinks: ProjectLink[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [links, setLinks] = useState<ProjectLink[]>(initialLinks);
  const [savingNotes, setSavingNotes] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  async function saveNotes() {
    if (notes === savedNotes) return;
    setSavingNotes(true);
    const result = await updateProject(projectId, { notes });
    setSavingNotes(false);
    if (result.success) setSavedNotes(notes);
    else toast.error("Failed to save notes");
  }

  async function persistLinks(next: ProjectLink[]) {
    const prev = links;
    setLinks(next);
    const result = await updateProject(projectId, { links: next });
    if (!result.success) { toast.error("Failed to save link"); setLinks(prev); }
  }

  function addLink() {
    const url = normalizeUrl(newUrl);
    if (!url) return;
    const label = newLabel.trim() || url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    persistLinks([...links, { id: crypto.randomUUID(), label, url }]);
    setNewLabel(""); setNewUrl(""); setAddingLink(false);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) saveNotes(); onOpenChange(v); }}>
      <SheetContent className="gap-0">
        <SheetHeader className="mb-4">
          <SheetTitle>Details</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-6">
          {/* Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Notes</Label>
              {savingNotes && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            <Textarea
              rows={6}
              placeholder="Scope, decisions, reminders…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              className="resize-none"
            />
          </div>

          {/* Links */}
          <div className="space-y-2">
            <Label>Links</Label>
            {links.length === 0 && !addingLink && (
              <p className="text-xs text-muted-foreground">No links yet.</p>
            )}
            <div className="space-y-1.5">
              {links.map((l) => (
                <div key={l.id} className="group flex items-center gap-2 rounded-lg border border-border px-2.5 py-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 truncate text-sm hover:text-primary transition-colors"
                    title={l.url}
                  >
                    {l.label}
                  </a>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                  <button
                    onClick={() => persistLinks(links.filter((x) => x.id !== l.id))}
                    className="shrink-0 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                    aria-label="Remove link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {addingLink ? (
              <div className="space-y-2 rounded-lg border border-border p-2.5">
                <Input
                  placeholder="Label (e.g. Figma)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="https://…"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
                  className="h-8 text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addLink} disabled={!newUrl.trim()} className="h-7 flex-1">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingLink(false); setNewLabel(""); setNewUrl(""); }} className="h-7">Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingLink(true)}
                className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-2 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add link
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
