import { useLayoutEffect, useRef, useState } from "react";
import {
  Ban,
  Clock,
  Copy,
  Gift,
  Layers,
  Link2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { MarketingShell } from "./MarketingShell";
import { PromotionAssignOverlay } from "./PromotionAssignOverlay";
import { PromotionEditorOverlay } from "./PromotionEditorOverlay";
import { PromoBanner } from "./PromoBanner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CODE_TYPE_LABEL,
  CURRENT_USER,
  campaignPromotionIds,
  mutate,
  promotionExpired,
  promotionValidity,
  uid,
  useMarketing,
  variantPromotionId,
  type AudienceKey,
  type Promotion,
} from "@/lib/marketing";

type View = "all" | "assigned" | "unassigned" | "expired";
type CodeFilter = "all" | NonNullable<Promotion["codeType"]>;

const VIEWS: { key: View; label: string; icon: typeof Layers }[] = [
  { key: "all", label: "All offers", icon: Layers },
  { key: "assigned", label: "In use", icon: Link2 },
  { key: "unassigned", label: "Not assigned", icon: Ban },
  { key: "expired", label: "Expired", icon: Clock },
];

const CODES: CodeFilter[] = ["all", "promo", "rate", "corporate"];

const AUDIENCE_KEYS: AudienceKey[] = ["direct", "ota"];

/** Live banner preview scaled to fill whatever box it is dropped into. */
function BannerThumb({ promotion }: { promotion: Promotion }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);
  useLayoutEffect(() => {
    const el = inner.current;
    const frame = box.current;
    if (!el || !frame) return;
    const fit = () => setScale(frame.clientWidth / el.offsetWidth || 0.8);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [promotion]);
  return (
    <div ref={box} className="h-full w-full overflow-hidden bg-muted/40">
      <div
        ref={inner}
        className="origin-top-left"
        style={{ transform: `scale(${scale})`, width: `${100 / scale}%` }}
      >
        <PromoBanner promotion={promotion} className="shadow-none" />
      </div>
    </div>
  );
}

/**
 * Promotion library built like the media workspace: a fixed rail of saved
 * views beside a scrollable pane of offer cards.
 */
export function PromotionsPage() {
  const { campaigns, promotions } = useMarketing();
  const [managing, setManaging] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<View>("all");
  const [code, setCode] = useState<CodeFilter>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const assignedCampaigns = (promotionId: string) => campaigns.filter((campaign) => {
    const ids = campaignPromotionIds(campaign);
    return ids.direct === promotionId || ids.ota === promotionId;
  });
  const countFor = (promotion: Promotion) => assignedCampaigns(promotion.id).length;

  const inView = (promotion: Promotion) => {
    const count = countFor(promotion);
    if (view === "assigned") return count > 0;
    if (view === "unassigned") return count === 0;
    if (view === "expired") return promotionExpired(promotion);
    return true;
  };
  const matchesCode = (promotion: Promotion) => code === "all" || (promotion.codeType ?? "promo") === code;
  const matchesQuery = (promotion: Promotion) =>
    !q || `${promotion.name} ${promotion.detail} ${promotion.code}`.toLowerCase().includes(q);

  const list = promotions.filter((p) => inView(p) && matchesCode(p) && matchesQuery(p));
  const viewCount = (key: View) => {
    const previous = view;
    view = key;
    const total = promotions.filter(inView).length;
    view = previous;
    return total;
  };
  const active = promotions.find((promotion) => promotion.id === managing) ?? null;
  const editTarget = promotions.find((promotion) => promotion.id === editingId) ?? null;
  const deleteTarget = promotions.find((promotion) => promotion.id === deletingId) ?? null;

  const inUse = promotions.filter((p) => countFor(p) > 0).length;
  const covered = campaigns.filter((c) => AUDIENCE_KEYS.some((a) => variantPromotionId(c, a))).length;
  const coverage = campaigns.length ? Math.round((covered / campaigns.length) * 100) : 0;

  const duplicate = (promotionId: string) => mutate((draft) => {
    const source = draft.promotions.find((promotion) => promotion.id === promotionId);
    if (!source) return;
    draft.promotions.push({ ...source, id: uid(), name: `${source.name} Copy`, updatedBy: { by: CURRENT_USER.name, at: Date.now() } });
  });
  const remove = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    mutate((draft) => {
      draft.promotions = draft.promotions.filter((promotion) => promotion.id !== id);
      (["direct", "ota"] as const).forEach((audience) => {
        if (draft.globalPromotions[audience] === id) draft.globalPromotions[audience] = null;
      });
      draft.campaigns.forEach((campaign) => {
        (["direct", "ota"] as const).forEach((audience) => {
          const variant = campaign.variants[audience];
          if (variant.promotionId === id) {
            variant.promotionId = null;
            variant.promotionMode = "none";
          }
        });
        const ids = campaignPromotionIds(campaign);
        campaign.promotionId = ids.direct ?? ids.ota;
        campaign.promotionMode = campaign.promotionId ? "custom" : "none";
      });
    });
    setDeletingId(null);
  };

  const viewLabel = VIEWS.find((v) => v.key === view)?.label ?? "All offers";

  return (
    <MarketingShell title="Promotions">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col overflow-hidden md:h-[calc(100dvh-57px)] md:flex-row">
        <aside className="flex shrink-0 flex-col border-b border-border bg-card md:h-full md:w-60 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 md:px-5">
            <div>
              <p className="text-[13px] font-semibold text-card-foreground">Offer library</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Every promotion you run</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCreating(true)}
              aria-label="New promotion"
              title="New promotion"
              className="size-8 text-brand"
            >
              <Plus size={15} />
            </Button>
          </div>

          <div className="p-3">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saved views</p>
            <div className="space-y-1">
              {VIEWS.map(({ key, label, icon: Icon }) => {
                const isActive = view === key;
                return (
                  <Button
                    key={key}
                    variant="ghost"
                    onClick={() => setView(key)}
                    className={`h-10 w-full justify-start gap-3 px-3 text-[12.5px] ${
                      isActive ? "bg-brand-soft font-semibold text-brand hover:bg-brand-soft" : "text-muted-foreground"
                    }`}
                  >
                    <Icon size={16} className={isActive ? "text-brand" : "text-muted-foreground"} />
                    <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {viewCount(key)}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto hidden border-t border-border p-5 md:block">
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>{inUse} of {promotions.length} in use</span>
              <span>{coverage}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-brand" style={{ width: `${coverage}%` }} />
            </div>
            <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
              {covered} of {campaigns.length} campaigns carry an offer to at least one guest segment.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-canvas/70">
          <div className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-4 backdrop-blur-md sm:px-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Gift size={20} />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-[18px] font-semibold tracking-tight text-card-foreground">{viewLabel}</h2>
                  <p className="text-[12px] text-muted-foreground">
                    {list.length} {list.length === 1 ? "offer" : "offers"}
                  </p>
                </div>
              </div>
              <Button variant="brand" size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} />
                New promotion
              </Button>
            </header>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search promotions"
                  className="w-full rounded-md border border-border bg-muted/55 py-2.5 pl-9 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:bg-background focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div className="flex gap-1 rounded-md bg-muted p-1 text-[12.5px]">
                {CODES.map((key) => (
                  <button
                    key={key}
                    onClick={() => setCode(key)}
                    className={`rounded px-3 py-1.5 font-medium transition-colors ${
                      code === key ? "bg-card text-card-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {key === "all" ? "All codes" : CODE_TYPE_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 p-4 sm:p-6">
            {list.map((promotion) => {
              const count = countFor(promotion);
              const expired = promotionExpired(promotion);
              return (
                <article
                  key={promotion.id}
                  className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand/45 hover:shadow-lift"
                >
                  <button
                    type="button"
                    title="Edit this promotion's config"
                    onClick={() => setEditingId(promotion.id)}
                    className="block aspect-[16/8] w-full overflow-hidden border-b border-border"
                  >
                    <BannerThumb promotion={promotion} />
                  </button>

                  <div className="flex flex-1 flex-col gap-2 px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-card-foreground">{promotion.name}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">{promotion.detail}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded-sm border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {promotion.code}
                      </span>
                      <span className="rounded-sm border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {CODE_TYPE_LABEL[promotion.codeType ?? "promo"]}
                      </span>
                      {promotion.discountPercent ? (
                        <span className="rounded-sm border border-transparent bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                          {promotion.discountPercent}% off
                        </span>
                      ) : null}
                      {promotion.minNights ? (
                        <span className="rounded-sm border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          min {promotion.minNights} night{promotion.minNights === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      {expired ? (
                        <span className="rounded-sm border border-transparent bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                          Expired
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-auto truncate text-[10.5px] text-muted-foreground">{promotionValidity(promotion)}</p>
                  </div>

                  <div className="flex items-center gap-2 border-t border-border px-3.5 py-2.5">
                    <span
                      className={`shrink-0 rounded-sm px-2 py-1 text-[11px] font-semibold ${
                        count ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count === 0 ? "No campaigns" : `${count} campaign${count === 1 ? "" : "s"}`}
                    </span>
                    <Button
                      variant={count ? "outline" : "brand"}
                      size="sm"
                      className="ml-auto"
                      onClick={() => setManaging(promotion.id)}
                    >
                      <Link2 size={13} />
                      {count ? "Edit assignment" : "Assign campaigns"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Manage ${promotion.name}`}>
                          <MoreVertical size={15} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => setEditingId(promotion.id)}>
                          <Pencil size={13} />
                          Edit config
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => duplicate(promotion.id)}>
                          <Copy size={13} />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeletingId(promotion.id)}>
                          <Trash2 size={13} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              );
            })}

            {list.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed border-border bg-card px-4 py-16 text-center">
                <span className="mx-auto grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Gift size={20} />
                </span>
                <p className="mt-3 text-[13px] font-semibold text-card-foreground">
                  {promotions.length === 0 ? "No promotions yet" : `Nothing in ${viewLabel}`}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {promotions.length === 0
                    ? "Create your first offer to start assigning it to campaigns."
                    : "Try another view, code type, or clear the search."}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {creating && <PromotionEditorOverlay promotion={null} onClose={() => setCreating(false)} />}
      {editTarget && <PromotionEditorOverlay promotion={editTarget} onClose={() => setEditingId(null)} />}
      {active && <PromotionAssignOverlay promotion={active} onClose={() => setManaging(null)} />}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The offer is removed from every campaign that carries it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MarketingShell>
  );
}
