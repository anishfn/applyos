"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, Plus, Send, Trash2 } from "@/components/ui/icons";
import { toast } from "sonner";
import { FollowUpStatusBadge } from "@/components/common/badges";
import { CompanyAvatar, PersonAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { DateInput, Segmented } from "@/components/common/form";
import { NoteEditor } from "@/components/common/inline-edit";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { FOLLOW_UP_TYPE_CONFIG } from "@/lib/constants";
import { deleteFollowUp, updateFollowUp } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { daysFromToday, formatDueDate, formatSmartDate } from "@/lib/date";
import type { FollowUp } from "@/lib/types";
import { cn } from "@/lib/utils";

type Scope = "due" | "pending" | "sent" | "all";

export default function FollowUpsPage() {
  const status = useStoreStatus();
  const { openQuickAdd, deleteWithUndo } = useAppUI();

  const followUps = useCollection("followUps");
  const applications = useCollection("applications");
  const companies = useCollection("companies");
  const contacts = useCollection("contacts");

  const [scope, setScope] = React.useState<Scope>("due");
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const dueCount = followUps.filter(
    (followUp) => followUp.status === "pending" && (daysFromToday(followUp.dueDate) ?? 1) <= 0,
  ).length;

  const visible = React.useMemo(() => {
    const filtered = followUps.filter((followUp) => {
      switch (scope) {
        case "due":
          return followUp.status === "pending" && (daysFromToday(followUp.dueDate) ?? 1) <= 0;
        case "pending":
          return followUp.status === "pending";
        case "sent":
          return followUp.status === "sent" || followUp.status === "replied";
        default:
          return true;
      }
    });
    return filtered.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  }, [followUps, scope]);

  if (status.status !== "ready") return <ListSkeleton rows={5} />;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Follow-ups"
        description={
          dueCount > 0
            ? `${dueCount} waiting to be sent. A nudge is usually all it takes.`
            : "Nothing waiting. Schedule the next one so it doesn't slip."
        }
        actions={
          <>
            <Segmented
              value={scope}
              onChange={setScope}
              ariaLabel="Follow-up scope"
              options={[
                { value: "due", label: `Due${dueCount ? ` · ${dueCount}` : ""}` },
                { value: "pending", label: "Pending" },
                { value: "sent", label: "Sent" },
                { value: "all", label: "All" },
              ]}
            />
            <Button variant="primary" size="sm" onClick={() => openQuickAdd("follow_up")}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Schedule</span>
            </Button>
          </>
        }
      />

      {visible.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Send}
            title={
              followUps.length === 0
                ? "No follow-ups yet"
                : scope === "due"
                  ? "Nothing due"
                  : "Nothing here"
            }
            description={
              followUps.length === 0
                ? "Write the message when you're calm, schedule it for a week out, and send it in one click when the day comes."
                : scope === "due"
                  ? "You're caught up. Every scheduled nudge is still in the future."
                  : "Switch the scope to see the rest."
            }
            action={{ label: "Schedule a follow-up", onClick: () => openQuickAdd("follow_up") }}
          />
        </Surface>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((followUp) => (
            <FollowUpRow
              key={followUp.id}
              followUp={followUp}
              application={applications.find((item) => item.id === followUp.applicationId) ?? null}
              company={
                companies.find(
                  (item) =>
                    item.id ===
                    applications.find((app) => app.id === followUp.applicationId)?.companyId,
                ) ?? null
              }
              contact={contacts.find((item) => item.id === followUp.contactId) ?? null}
              expanded={expanded === followUp.id}
              onToggle={() => setExpanded(expanded === followUp.id ? null : followUp.id)}
              onDelete={() => deleteWithUndo(deleteFollowUp(followUp.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FollowUpRow({
  followUp,
  application,
  company,
  contact,
  expanded,
  onToggle,
  onDelete,
}: {
  followUp: FollowUp;
  application: { id: string; position: string } | null;
  company: { id: string; name: string; domain?: string | null } | null;
  contact: { id: string; name: string; position?: string | null } | null;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const overdue = followUp.status === "pending" && (daysFromToday(followUp.dueDate) ?? 1) < 0;
  const config = FOLLOW_UP_TYPE_CONFIG[followUp.type];

  return (
    <Surface className={cn("overflow-hidden", overdue && "ring-tone-rose/25")}>
      <div className="flex flex-wrap items-center gap-3 p-3.5">
        {company ? (
          <CompanyAvatar name={company.name} domain={company.domain} size="md" />
        ) : contact ? (
          <PersonAvatar name={contact.name} size="md" />
        ) : (
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-foreground/[0.05] text-muted-foreground">
            <Send className="size-3.5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <button type="button" onClick={onToggle} className="block w-full cursor-pointer text-left">
            <span className="block truncate text-sm font-medium">
              {followUp.subject ?? config.label}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {[
                contact?.name,
                application ? `${application.position}${company ? ` · ${company.name}` : ""}` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Not linked to anything"}
            </span>
          </button>
        </div>

        <span className="hidden rounded-full bg-foreground/[0.045] px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:block">
          {config.label}
        </span>

        <FollowUpStatusBadge status={followUp.status} size="sm" />

        <DateInput
          value={followUp.dueDate}
          onChange={(dueDate) => dueDate && updateFollowUp(followUp.id, { dueDate })}
          className={cn("h-7 w-32 text-xs", overdue && "border-tone-rose/40 text-tone-rose")}
          aria-label="Send on"
        />

        <span
          className={cn(
            "hidden w-20 shrink-0 text-right font-mono text-[11px] tabular-nums md:block",
            overdue ? "text-tone-rose" : "text-muted-foreground",
          )}
        >
          {followUp.status === "pending" ? formatDueDate(followUp.dueDate) : formatSmartDate(followUp.sentAt)}
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          {followUp.status === "pending" && (
            <Button
              variant="primary"
              size="xs"
              onClick={() => {
                updateFollowUp(followUp.id, { status: "sent" });
                toast.success("Marked as sent", {
                  action: {
                    label: "Undo",
                    onClick: () => updateFollowUp(followUp.id, { status: "pending", sentAt: null }),
                  },
                });
              }}
            >
              Mark sent
            </Button>
          )}
          {followUp.status === "sent" && (
            <>
              <Button
                variant="outline"
                size="xs"
                onClick={() => updateFollowUp(followUp.id, { status: "replied" })}
              >
                They replied
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => updateFollowUp(followUp.id, { status: "no_response" })}
              >
                No reply
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-xs" onClick={onDelete} aria-label="Delete follow-up">
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-foreground/[0.06] p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-muted-foreground">
              Message
            </p>
            {followUp.message && (
              <Button
                variant="ghost"
                size="xs"
                onClick={async () => {
                  await navigator.clipboard.writeText(followUp.message ?? "");
                  toast.success("Copied to clipboard");
                }}
              >
                <Copy className="size-3" />
                Copy
              </Button>
            )}
          </div>
          <NoteEditor
            value={followUp.message ?? ""}
            onCommit={(message) => updateFollowUp(followUp.id, { message: message || null })}
            placeholder="Write it now so sending later is one click."
            rows={6}
          />
          {application && (
            <Link
              href={`/app/applications/${application.id}`}
              className="mt-2 inline-block text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Open {application.position} →
            </Link>
          )}
        </div>
      )}
    </Surface>
  );
}
