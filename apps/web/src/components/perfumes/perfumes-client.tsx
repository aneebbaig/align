"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Edit3, Loader2, Plus, Snowflake, SprayCan, Sun, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createPerfume, deletePerfume, updatePerfume } from "@/actions/perfumes";
import { cn } from "@/lib/utils";
import { PerfumeForm, PerfumeFormData } from "./perfume-form";

interface Perfume {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number | null;
  status: string;
  isLiked: boolean;
  buyNext: boolean;
  isSummer: boolean;
  blindBuy: boolean;
  occasion: string | null;
  notes: string | null;
  company: string | null;
  basedOn: string | null;
}

const STATUS_TABS = [
  { value: "WANT_TO_BUY", label: "Want" },
  { value: "BOUGHT", label: "Owned" },
  { value: "UNDECIDED", label: "Maybe" },
];

const CATEGORY_LABELS: Record<string, string> = {
  ORIGINAL: "Original",
  IMPRESSION: "Impression",
  INSPIRED: "Inspired",
  TWIST: "Twist",
  CLONE: "Clone",
};

const OCCASION_LABELS: Record<string, string> = {
  DAILY_WEAR: "Daily wear",
  WORK: "Work",
  DATE: "Date",
  FORMAL_MEETING: "Formal meeting",
};

function formatPriceWith(price: number, symbol: string) {
  return symbol + " " + (price / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export function PerfumesClient({ initialPerfumes, baseSymbol = "Rs" }: { initialPerfumes: Perfume[]; baseSymbol?: string }) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPerfume, setEditingPerfume] = useState<Perfume | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const counts = STATUS_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.value] = initialPerfumes.filter((p) => p.status === tab.value).length;
    return acc;
  }, {});

  async function handleCreate(data: PerfumeFormData) {
    setLoading(true);
    const res = await createPerfume(data);
    if (res.success) {
      toast.success("Perfume added");
      setIsAddOpen(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to add perfume");
      throw new Error(res.error ?? "Failed to add perfume");
    }
    setLoading(false);
  }

  async function handleUpdate(id: string, data: PerfumeFormData) {
    setLoading(true);
    const res = await updatePerfume(id, data);
    if (res.success) {
      toast.success("Perfume updated");
      setEditingPerfume(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to update perfume");
      setLoading(false);
      throw new Error(res.error ?? "Failed to update perfume");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setLoading(true);
    const res = await deletePerfume(deleteId);
    if (res.success) {
      toast.success("Perfume deleted");
      setDeleteId(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to delete perfume");
    }
    setLoading(false);
  }

  async function handleLiked(id: string, isLiked: boolean) {
    setActionId(id);
    const res = await updatePerfume(id, { isLiked });
    if (res.success) {
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to update preference");
    }
    setActionId(null);
  }

  async function handleMarkBought(id: string) {
    setActionId(id);
    const res = await updatePerfume(id, { status: "BOUGHT" });
    if (res.success) {
      toast.success("Moved to Owned");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to mark as bought");
    }
    setActionId(null);
  }

  function renderList(status: string) {
    const list = initialPerfumes.filter((p) => p.status === status);

    if (list.length === 0) {
      return (
        <EmptyState
          icon={SprayCan}
          title="No perfumes here"
          description="Add one when you find something worth tracking."
          action={{ label: "Add Perfume", onClick: () => setIsAddOpen(true) }}
          className="py-12"
        />
      );
    }

    return (
      <SeasonSections
        perfumes={list}
        actionId={actionId}
        onEdit={setEditingPerfume}
        onDelete={setDeleteId}
        onLiked={handleLiked}
        onMarkBought={handleMarkBought}
        baseSymbol={baseSymbol}
      />
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Perfume
        </Button>
      </div>

      <Tabs defaultValue="WANT_TO_BUY">
        <TabsList className="flex-wrap h-auto">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label} ({counts[tab.value] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {renderList(tab.value)}
          </TabsContent>
        ))}
      </Tabs>

      <PerfumeForm
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleCreate}
        baseSymbol={baseSymbol}
      />

      {editingPerfume && (
        <PerfumeForm
          open={true}
          perfume={{
            name: editingPerfume.name,
            company: editingPerfume.company,
            category: editingPerfume.category,
            price: editingPerfume.price,
            quantity: editingPerfume.quantity,
            status: editingPerfume.status,
            isLiked: editingPerfume.isLiked,
            isSummer: editingPerfume.isSummer,
            blindBuy: editingPerfume.blindBuy,
            occasion: editingPerfume.occasion,
            notes: editingPerfume.notes,
            basedOn: editingPerfume.basedOn,
          }}
          onClose={() => setEditingPerfume(null)}
          onSubmit={(data) => handleUpdate(editingPerfume.id, data)}
          baseSymbol={baseSymbol}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={loading}
        title="Delete perfume"
        description="This will permanently remove this perfume from your list."
      />
    </>
  );
}

function SeasonSections({
  perfumes,
  actionId,
  onEdit,
  onDelete,
  onLiked,
  onMarkBought,
  baseSymbol,
}: {
  perfumes: Perfume[];
  actionId: string | null;
  onEdit: (perfume: Perfume) => void;
  onDelete: (id: string) => void;
  onLiked: (id: string, isLiked: boolean) => void;
  onMarkBought: (id: string) => void;
  baseSymbol: string;
}) {
  const sections = [
    { label: "Summer", icon: Sun, items: perfumes.filter((p) => p.isSummer) },
    { label: "Winter", icon: Snowflake, items: perfumes.filter((p) => !p.isSummer) },
  ];

  return (
    <div className="space-y-6">
      {sections.filter((s) => s.items.length > 0).map(({ label, icon: Icon, items }) => (
        <section key={label} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Icon className={cn("h-4 w-4", label === "Summer" ? "text-amber-500" : "text-blue-500")} />
            <h2 className="text-sm font-semibold text-foreground">{label}</h2>
            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((perfume) => (
              <PerfumeCard
                key={perfume.id}
                perfume={perfume}
                loading={actionId === perfume.id}
                onEdit={() => onEdit(perfume)}
                onDelete={() => onDelete(perfume.id)}
                onLiked={(isLiked) => onLiked(perfume.id, isLiked)}
                onMarkBought={() => onMarkBought(perfume.id)}
                baseSymbol={baseSymbol}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PerfumeCard({
  perfume,
  loading,
  onEdit,
  onDelete,
  onLiked,
  onMarkBought,
  baseSymbol,
}: {
  perfume: Perfume;
  loading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onLiked: (isLiked: boolean) => void;
  onMarkBought: () => void;
  baseSymbol: string;
}) {
  const formatPrice = (price: number) => formatPriceWith(price, baseSymbol);
  const isOwned = perfume.status === "BOUGHT";
  const isWant = perfume.status === "WANT_TO_BUY";

  const metaParts = [
    perfume.company,
    perfume.quantity ? `${perfume.quantity}ml` : null,
    perfume.basedOn ? `based on ${perfume.basedOn}` : null,
  ].filter(Boolean);

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-card">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{perfume.name}</span>
          <span className="text-xs font-medium text-muted-foreground shrink-0">{formatPrice(perfume.price)}</span>
        </div>

        {metaParts.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">{metaParts.join(" · ")}</p>
        )}

        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {CATEGORY_LABELS[perfume.category] ?? perfume.category}
          </Badge>
          {perfume.blindBuy && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">Blind buy</Badge>
          )}
          {perfume.occasion && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
              {OCCASION_LABELS[perfume.occasion] ?? perfume.occasion}
            </Badge>
          )}
        </div>

        {perfume.notes && (
          <p className="text-xs text-muted-foreground line-clamp-1">{perfume.notes}</p>
        )}

        {isWant && (
          <div className="pt-0.5">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onMarkBought} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Mark as Bought
            </Button>
          </div>
        )}

        {isOwned && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-xs text-muted-foreground">Verdict:</span>
            <button
              onClick={() => onLiked(true)}
              disabled={loading}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                perfume.isLiked
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <ThumbsUp className="h-3 w-3" />
              Like
            </button>
            <button
              onClick={() => onLiked(false)}
              disabled={loading}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                !perfume.isLiked
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <ThumbsDown className="h-3 w-3" />
              Dislike
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={onEdit}
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
          aria-label={`Edit ${perfume.name}`}
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-muted"
          aria-label={`Delete ${perfume.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
