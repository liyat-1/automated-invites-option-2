import { useMemo, useState } from "react";
import { Check, FileStack, GripVertical, Info, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkDragChips } from "./BulkDragChips";
import { SegmentPill } from "./SegmentPill";
import {
  AUDIENCE_LABEL,
  CAMPAIGN_BULK_DRAG_TYPE,
  CAMPAIGN_DRAG_TYPE,
  GROUP_META,
  promotionAudiencesOn,
  mutate,
  useMarketing,
  variantPromotionId,
  type AudienceKey,
  type BulkScope,
  type CampaignGroup,
  type MarketingCampaign,
  type MarketingState,
  type Promotion,
} from "@/lib/marketing";

const GROUPS: CampaignGroup[] = ["invites", "transactional", "in_property"];
const AUDIENCES: { key: AudienceKey; label: string }[] = [
  { key: "direct", label: "Direct" },
  { key: "ota", label: "OTA" },
];
const audiencesOf = (scope: BulkScope): AudienceKey[] => (scope === "both" ? ["direct", "ota"] : [scope]);

/** Name of the promotion blocking a guest segment on this campaign, if any. */
function blockedBy(state: MarketingState, campaign: MarketingCampaign, audience: AudienceKey, promotionId: string) {
  const id = variantPromotionId(campaign, audience);
  if (!id || id === promotionId) return null;
  return state.promotions.find((p) => p.id === id)?.name ?? "another promotion";
}


/**
 * Assignment board for one promotion, built like the media board: a fixed
 * column of available campaigns beside the three message sections. Bulk chips
 * drag every free campaign in at once, and guest segments already taken by
 * another promotion stay locked and explain themselves.
 */
export function PromotionAssignOverlay({
  promotion,
  onClose,
}: {
  promotion: Promotion;
  onClose: () => void;
}) {
  const state = useMarketing();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(() => JSON.parse(JSON.stringify(state.campaigns)) as MarketingCampaign[]);
  console.log("render campaigns count", campaigns.length, "first id", campaigns[0]?.id, campaigns[0]?.variants.direct.promotionId, campaigns[0]?.variants.ota.promotionId);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<MarketingCampaign | null>(null);
  const [bulk, setBulk] = useState<BulkScope | null>(null);
  const [over, setOverState] = useState<CampaignGroup | -1 | null>(null);
  const dirty = useMemo(() => JSON.stringify(campaigns) !== JSON.stringify(state.campaigns), [campaigns, state.campaigns]);
  const draftState = { ...state, campaigns };

  const updatePromotion = (campaignId: string, audience: AudienceKey, promotionId: string | null) => {
    console.log("updatePromotion", campaignId, audience, promotionId);
    setCampaigns((current) => {
      const next = JSON.parse(JSON.stringify(current)) as MarketingCampaign[];
      const campaign = next.find((item) => item.id === campaignId);
      if (!campaign) {
        console.log("campaign not found");
        return current;
      }
      campaign.variants[audience].promotionMode = promotionId ? "custom" : "none";
      campaign.variants[audience].promotionId = promotionId;
      const any = variantPromotionId(campaign, "direct") ?? variantPromotionId(campaign, "ota");
      campaign.promotionId = any;
      campaign.promotionMode = any ? "custom" : "none";
      console.log("updated", campaign.id, JSON.stringify(campaign.variants));
      return next;
    });
  };

  const save = () => {
    mutate((draft) => {
      draft.campaigns = JSON.parse(JSON.stringify(campaigns)) as MarketingCampaign[];
    });
    onClose();
  };

  const assignedIn = (group: CampaignGroup) =>
    campaigns.filter((c) => {
      const on = promotionAudiencesOn(c, promotion.id);
      return c.group === group && (on.direct || on.ota);
    });

  const totalAssigned = campaigns.filter((c) => {
    const on = promotionAudiencesOn(c, promotion.id);
    return on.direct || on.ota;
  }).length;

  const isFree = (c: MarketingCampaign) => AUDIENCES.some(({ key }) => !variantPromotionId(c, key));
  const q = query.trim().toLowerCase();
  const available = campaigns.filter(
    (c) =>
      isFree(c) &&
      (!q || c.name.toLowerCase().includes(q)),
  );

  /** Attach the promotion to every guest segment still free on a campaign. */
  const assignFree = (campaign: MarketingCampaign) => {
    console.log("assignFree", campaign.id, campaign.name);
    AUDIENCES.forEach(({ key }) => {
      if (!variantPromotionId(campaign, key)) updatePromotion(campaign.id, key, promotion.id);
    });
  };

  /** Drop a whole collection: only the free segments of each campaign join. */
  const dropCollection = (scope: BulkScope) => {
    const audiences = audiencesOf(scope);
    campaigns
      .filter((c) => audiences.some((a) => !variantPromotionId(c, a)))
      .forEach((c) => audiences.forEach((a) => {
         if (!variantPromotionId(c, a)) updatePromotion(c.id, a, promotion.id);
      }));
  };

  /** Dragging a campaign back onto the available column clears this promotion. */
  const unassign = (campaign: MarketingCampaign) => {
    const on = promotionAudiencesOn(campaign, promotion.id);
    AUDIENCES.forEach(({ key }) => {
      if (on[key]) updatePromotion(campaign.id, key, null);
    });
  };

  const allow = (event: React.DragEvent) => {
    const types = event.dataTransfer.types;
    if (!dragging && !bulk && !types.includes(CAMPAIGN_DRAG_TYPE) && !types.includes(CAMPAIGN_BULK_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const drop = (event: React.DragEvent, group: CampaignGroup | -1) => {
    event.preventDefault();
    const scope = (event.dataTransfer.getData(CAMPAIGN_BULK_DRAG_TYPE) as BulkScope) || bulk;
    if (scope) {
      if (group === -1) {
        const audiences = audiencesOf(scope);
        campaigns.forEach((c) =>
          audiences.forEach((a) => {
             if (variantPromotionId(c, a) === promotion.id) updatePromotion(c.id, a, null);
          }),
        );
      } else dropCollection(scope);
    } else {
      const id =
        event.dataTransfer.getData(CAMPAIGN_DRAG_TYPE) ||
        (event.dataTransfer.getData("text/plain").startsWith("bulk:") ? "" : event.dataTransfer.getData("text/plain")) ||
        dragging?.id;
      const campaign = campaigns.find((c) => c.id === id);
      if (campaign) (group === -1 ? unassign : assignFree)(campaign);
    }
    setDragging(null);
    setBulk(null);
    setOverState(null);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/70 p-2 sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="promotion-assignment-title" className="flex h-full max-h-none w-full max-w-none flex-col overflow-hidden rounded-lg border border-border bg-canvas shadow-float">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Assign campaigns</p>
          <h2 id="promotion-assignment-title" className="truncate text-[17px] font-semibold text-card-foreground">{promotion.name}</h2>
          <p className="truncate text-[11.5px] text-muted-foreground">
            {promotion.detail} · {promotion.code} · {totalAssigned} campaign{totalAssigned === 1 ? "" : "s"} carry this promo
          </p>
        </div>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </Button>
      </header>

      <p className="flex items-start gap-2 border-b border-border bg-brand-soft/50 px-4 py-2 text-[11.5px] text-muted-foreground sm:px-6">
        <Info size={13} className="mt-[1px] shrink-0 text-brand" />
        Drag campaigns into a message section — or use the bulk chips to add every free campaign at once. Each campaign
        carries one promo per guest segment, so a segment already used by another promo stays locked here.
      </p>

       <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assignment board</p>
          <p className="text-[11px] text-muted-foreground">Drag campaigns into a section · scroll for more sections</p>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 gap-4">
          {/* Fixed available-campaigns column */}
          <section
            onDragOver={(event) => {
              allow(event);
              setOverState(-1);
            }}
            onDragLeave={() => setOverState((c) => (c === -1 ? null : c))}
            onDrop={(event) => drop(event, -1)}
            className={`flex w-[250px] shrink-0 flex-col rounded-xl border p-4 transition-colors sm:w-[270px] ${
              over === -1 ? "border-brand bg-brand-soft" : "border-border bg-card"
            }`}
          >
            <div className="flex items-start gap-2 border-b border-border pb-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                <FileStack size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-card-foreground">Available campaigns</p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  {available.length} campaigns with a free guest segment
                </p>
              </div>
            </div>

            <div className="relative mt-2.5">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search campaigns"
                className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-2.5 text-[12px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <BulkDragChips
              count={available.length}
              onDragStart={(scope) => setBulk(scope)}
              onDragEnd={() => {
                setBulk(null);
                setOverState(null);
              }}
            />

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
              {available.map((campaign) => (
                <article
                  key={campaign.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(CAMPAIGN_DRAG_TYPE, campaign.id);
                    event.dataTransfer.setData("text/plain", campaign.id);
                    event.dataTransfer.effectAllowed = "copy";
                    setDragging(campaign);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOverState(null);
                  }}
                  onClick={() => assignFree(campaign)}
                  className={`cursor-grab rounded-md border bg-background px-2.5 py-2 shadow-sm transition-colors active:cursor-grabbing ${
                    dragging?.id === campaign.id ? "border-brand bg-brand-soft" : "border-border hover:border-brand/45"
                  }`}
                >
                  <p className="flex items-center gap-1.5 truncate text-[12px] font-medium text-card-foreground">
                    <GripVertical size={12} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">{campaign.name}</span>
                  </p>
                  <p className="truncate pl-[18px] text-[10.5px] text-muted-foreground">
                    {GROUP_META[campaign.group].title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1 pl-[18px]">
                    {AUDIENCES.map(({ key }) => {
                      const assignedPromotionId = variantPromotionId(campaign, key);
                      const blocker = blockedBy(draftState, campaign, key, promotion.id);
                      return (
                        <SegmentPill
                          key={key}
                          audience={key}
                          state={assignedPromotionId ? "erased" : "free"}
                          title={
                            blocker
                              ? `${AUDIENCE_LABEL[key]} guests already carry “${blocker}” on this campaign`
                              : assignedPromotionId === promotion.id
                                ? `${AUDIENCE_LABEL[key]} guests already carry this promo`
                              : `${AUDIENCE_LABEL[key]} guests are free on this campaign`
                          }
                        />
                      );
                    })}
                  </div>
                </article>
              ))}
              {available.length === 0 && (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
                  Drop here to remove this promo
                </p>
              )}
            </div>
          </section>

          {/* Horizontally scrollable message sections */}
          <div className="flex min-h-0 min-w-0 flex-1 gap-4 overflow-x-auto pb-1">
            {GROUPS.map((group) => {
              const list = assignedIn(group);
              return (
                <section
                  key={group}
                  onDragOver={(event) => {
                    allow(event);
                    setOverState(group);
                  }}
                  onDragLeave={() => setOverState((c) => (c === group ? null : c))}
                  onDrop={(event) => drop(event, group)}
                  className={`flex w-[290px] shrink-0 flex-col rounded-xl border p-4 transition-colors ${
                    over === group
                      ? "border-brand bg-brand-soft ring-2 ring-brand/30"
                      : "border-brand/25 bg-brand-soft/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
                    <p className="min-w-0 truncate text-[12.5px] font-semibold text-card-foreground">
                      {GROUP_META[group].title}
                    </p>
                    <span className="shrink-0 rounded-sm bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                      {list.length}
                    </span>
                  </div>

                  <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                    {list.map((campaign) => (
                       <AssignedRow key={campaign.id} campaign={campaign} promotion={promotion} state={draftState} onChange={updatePromotion} />
                    ))}
                    {list.length === 0 && (
                      <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
                        Drag a campaign here
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 sm:px-6">
        <p className="text-[11.5px] text-muted-foreground">{dirty ? "Unsaved assignment changes" : "No assignment changes"}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!dirty} onClick={save}><Check size={14} />Save assignment</Button>
        </div>
      </footer>
      </section>
    </div>
  );
}

function AssignedRow({
  campaign,
  promotion,
  state,
  onChange,
}: {
  campaign: MarketingCampaign;
  promotion: Promotion;
  state: MarketingState;
  onChange: (campaignId: string, audience: AudienceKey, promotionId: string | null) => void;
}) {
  const on = promotionAudiencesOn(campaign, promotion.id);
  const removeAll = () =>
    AUDIENCES.forEach(({ key }) => {
      if (on[key]) onChange(campaign.id, key, null);
    });

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(CAMPAIGN_DRAG_TYPE, campaign.id);
        event.dataTransfer.setData("text/plain", campaign.id);
        event.dataTransfer.effectAllowed = "copy";
      }}
      className="cursor-grab rounded-md border border-border bg-background px-2.5 py-2 active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <GripVertical size={12} className="mt-0.5 shrink-0 text-muted-foreground/60" />
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-card-foreground">{campaign.name}</p>
        <button
          type="button"
          onClick={removeAll}
          aria-label={`Remove ${campaign.name}`}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X size={13} />
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[18px]">
        {AUDIENCES.map(({ key }) => {
          const blocker = blockedBy(state, campaign, key, promotion.id);
          return (
            <SegmentPill
              key={key}
              audience={key}
              state={on[key] ? "on" : "erased"}
              disabled={Boolean(blocker)}
              title={
                blocker
                    ? `${AUDIENCE_LABEL[key]} guests already use “${blocker}” on this campaign. One promo per guest segment.`
                  : on[key]
                    ? `${AUDIENCE_LABEL[key]} guests receive this promo — untick to make this segment available again`
                    : `${AUDIENCE_LABEL[key]} guests are free again — tick to give them this promo`
              }
              onClick={(value) => onChange(campaign.id, key, value ? promotion.id : null)}
            />
          );
        })}
      </div>
    </div>
  );
}
