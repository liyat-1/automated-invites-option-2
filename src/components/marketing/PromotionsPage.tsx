import { useLayoutEffect, useRef, useState } from "react";
import {
  Copy,
  Gift,
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
  type Promotion,
} from "@/lib/marketing";

type View = "all" | "assigned" | "unassigned" | "expired";
type CodeFilter = "all" | NonNullable<Promotion["codeType"]>;

const VIEWS: { key: View; label: string }[] = [
  { key: "all", label: "All promos" },
  { key: "assigned", label: "In use" },
  { key: "unassigned", label: "Not assigned" },
  { key: "expired", label: "Expired" },
];

const CODES: CodeFilter[] = ["all", "promo", "rate", "corporate"];

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

/** Clean, searchable promotion workspace with one easy-to-scan row per promo. */
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

  const matchesView = (promotion: Promotion, key: View) => {
    const count = countFor(promotion);
    if (key === "assigned") return count > 0;
    if (key === "unassigned") return count === 0;
    if (key === "expired") return promotionExpired(promotion);
    return true;
  };
  const matchesCode = (promotion: Promotion) => code === "all" || (promotion.codeType ?? "promo") === code;
  const matchesQuery = (promotion: Promotion) =>
    !q || `${promotion.name} ${promotion.detail} ${promotion.code}`.toLowerCase().includes(q);

  const list = promotions.filter((p) => matchesView(p, view) && matchesCode(p) && matchesQuery(p));
  const viewCount = (key: View) => promotions.filter((p) => matchesView(p, key)).length;
  const active = promotions.find((promotion) => promotion.id === managing) ?? null;
  const editTarget = promotions.find((promotion) => promotion.id === editingId) ?? null;
  const deleteTarget = promotions.find((promotion) => promotion.id === deletingId) ?? null;

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

  const viewLabel = VIEWS.find((v) => v.key === view)?.label ?? "All promos";

  return (
    <MarketingShell title="Promotions">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col overflow-hidden md:h-[calc(100dvh-57px)]">
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
                    {list.length} {list.length === 1 ? "promo" : "promos"}
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
              <div className="flex gap-1 rounded-md bg-muted p-1 text-[12.5px]">
                {VIEWS.map(({ key, label }) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    onClick={() => setView(key)}
                    className={view === key ? "bg-card text-card-foreground shadow-card hover:bg-card" : "text-muted-foreground"}
                  >
                    {label}
                    <span className="text-[10px] tabular-nums text-muted-foreground">{viewCount(key)}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-6">
            {list.map((promotion) => {
              const count = countFor(promotion);
              const expired = promotionExpired(promotion);
              return (
                <article
                  key={promotion.id}
                  className="group flex min-h-[150px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-[border-color,box-shadow] hover:border-brand/45 hover:shadow-lift sm:flex-row"
                >
                  <button
                    type="button"
                    title="Edit this promotion's config"
                    onClick={() => setEditingId(promotion.id)}
                    className="block h-[150px] w-full shrink-0 overflow-hidden border-b border-border sm:w-[300px] sm:border-b-0 sm:border-r"
                  >
                    <BannerThumb promotion={promotion} />
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-3.5">
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

                  <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 sm:w-[270px] sm:border-l sm:border-t-0">
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
                      className="ml-auto sm:ml-0"
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
              <div className="rounded-lg border border-dashed border-border bg-card px-4 py-16 text-center">
                <span className="mx-auto grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Gift size={20} />
                </span>
                <p className="mt-3 text-[13px] font-semibold text-card-foreground">
                  {promotions.length === 0 ? "No promotions yet" : `Nothing in ${viewLabel}`}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {promotions.length === 0
                    ? "Create your first promo to start assigning it to campaigns."
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
              The promo is removed from every campaign that carries it. This cannot be undone.
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
