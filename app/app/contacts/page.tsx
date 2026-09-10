"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGrid, Mail, Plus, Rows3, Search, Star, Users } from "@/components/ui/icons";
import { RelationshipBadge } from "@/components/common/badges";
import { PersonAvatar } from "@/components/common/company-avatar";
import { Column, DataTable, TableIdentity } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Segmented } from "@/components/common/form";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { RELATIONSHIP_CONFIG } from "@/lib/constants";
import { updateContact } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { daysFromToday, formatDueDate, formatRelative } from "@/lib/date";
import type { Company, Contact, Relationship } from "@/lib/types";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";

export default function ContactsPage() {
  const status = useStoreStatus();
  const { openQuickAdd } = useAppUI();

  const contacts = useCollection("contacts");
  const companies = useCollection("companies");
  const applications = useCollection("applications");

  const [query, setQuery] = React.useState("");
  const [relationship, setRelationship] = React.useState<Relationship | "all">("all");
  // A view preference is UI state, not workspace data, so it lives in localStorage.
  const [view, setView] = useLocalStorageState<"cards" | "table">("applyos:contacts-view", "cards");

  const rows = React.useMemo(() => {
    const byId = new Map(companies.map((company) => [company.id, company]));
    const needle = query.trim().toLowerCase();

    return contacts
      .map((contact) => ({
        contact,
        company: contact.companyId ? (byId.get(contact.companyId) ?? null) : null,
        linked: applications.filter((application) =>
          application.contactIds.includes(contact.id),
        ).length,
      }))
      .filter(({ contact, company }) => {
        if (relationship !== "all" && contact.relationship !== relationship) return false;
        if (!needle) return true;
        return [contact.name, contact.position, contact.email, company?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => {
        if (a.contact.favorite !== b.contact.favorite) return a.contact.favorite ? -1 : 1;
        return a.contact.name.localeCompare(b.contact.name);
      });
  }, [contacts, companies, applications, query, relationship]);

  if (status.status !== "ready") return <ListSkeleton rows={6} />;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Contacts"
        description="Recruiters, referrals and the people who can actually open a door."
        actions={
          <Button variant="primary" size="sm" onClick={() => openQuickAdd("contact")}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add contact</span>
          </Button>
        }
      >
        {contacts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1 sm:max-w-72">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Search people…"
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Segmented
              value={relationship}
              onChange={setRelationship}
              ariaLabel="Relationship"
              size="sm"
              options={[
                { value: "all", label: "All" },
                { value: "recruiter", label: "Recruiters" },
                { value: "referral", label: "Referrals" },
                { value: "hiring_manager", label: "Managers" },
              ]}
            />
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden font-mono text-[11px] text-muted-foreground tabular-nums sm:block">
                {rows.length}
              </span>
              <Segmented
                value={view}
                onChange={setView}
                ariaLabel="View"
                size="sm"
                options={[
                  { value: "cards", label: <LayoutGrid className="size-3.5" />, title: "Cards" },
                  { value: "table", label: <Rows3 className="size-3.5" />, title: "Table" },
                ]}
              />
            </div>
          </div>
        )}
      </PageHeader>

      {contacts.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Referrals convert better than anything else in a job search. Start with the people you already know."
            action={{ label: "Add a contact", onClick: () => openQuickAdd("contact") }}
          />
        </Surface>
      ) : rows.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Search}
            title="Nobody matches"
            description="Try a different name, company or relationship."
            action={{ label: "Clear search", onClick: () => setQuery("") }}
          />
        </Surface>
      ) : view === "table" ? (
        <DataTable
          rows={rows}
          getKey={({ contact }) => contact.id}
          getHref={({ contact }) => `/app/contacts/${contact.id}`}
          columns={CONTACT_COLUMNS}
        />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ contact, company, linked }) => {
            const overdue =
              contact.nextFollowUpAt && (daysFromToday(contact.nextFollowUpAt) ?? 1) <= 0;
            return (
              <Surface key={contact.id} interactive className="relative p-3.5">
                <div className="flex items-start gap-3">
                  <PersonAvatar name={contact.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/app/contacts/${contact.id}`} className="block min-w-0">
                      <h3 className="truncate font-runde text-sm font-semibold tracking-tight">
                        {contact.name}
                      </h3>
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        {[contact.position, company?.name].filter(Boolean).join(" · ") || "-"}
                      </p>
                      <span className="absolute inset-0" aria-hidden />
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateContact(contact.id, { favorite: !contact.favorite })}
                    aria-label={contact.favorite ? "Unstar" : "Star"}
                    className="relative z-10 cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Star
                      className={cn("size-3.5", contact.favorite && "fill-primary text-primary")}
                    />
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <RelationshipBadge relationship={contact.relationship} size="sm" />
                  {linked > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {linked} application{linked === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-foreground/[0.05] pt-2.5 text-[11px] font-medium">
                  <span className="text-muted-foreground">
                    {contact.lastContactedAt
                      ? `Last spoke ${formatRelative(contact.lastContactedAt)}`
                      : "Never contacted"}
                  </span>
                  {contact.nextFollowUpAt && (
                    <span
                      className={cn(
                        "font-mono tabular-nums",
                        overdue ? "text-tone-rose" : "text-muted-foreground",
                      )}
                    >
                      {formatDueDate(contact.nextFollowUpAt)}
                    </span>
                  )}
                </div>

                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    onClick={(event) => event.stopPropagation()}
                    className="relative z-10 mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Mail className="size-3" />
                    {contact.email}
                  </a>
                )}
              </Surface>
            );
          })}
        </div>
      )}

      {contacts.length > 0 && rows.length > 0 && (
        <p className="px-1 text-[11px] font-medium text-muted-foreground">
          {Object.values(RELATIONSHIP_CONFIG).length} relationship types · click anyone to see their
          full history.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Table view                                                                  */
/* -------------------------------------------------------------------------- */

interface ContactRow {
  contact: Contact;
  company: Company | null;
  linked: number;
}

const CONTACT_COLUMNS: Array<Column<ContactRow>> = [
  {
    key: "name",
    label: "Name",
    width: "minmax(0,2.2fr)",
    render: ({ contact, company }) => (
      <TableIdentity
        avatar={<PersonAvatar name={contact.name} size="sm" />}
        title={contact.name}
        subtitle={[contact.position, company?.name].filter(Boolean).join(" · ") || null}
      />
    ),
  },
  {
    key: "relationship",
    label: "Relationship",
    width: "9rem",
    hideBelow: "sm",
    render: ({ contact }) => <RelationshipBadge relationship={contact.relationship} size="sm" />,
  },
  {
    key: "email",
    label: "Email",
    width: "minmax(0,1.6fr)",
    hideBelow: "lg",
    render: ({ contact }) =>
      contact.email ? (
        <a
          href={`mailto:${contact.email}`}
          className="relative z-10 truncate text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {contact.email}
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">-</span>
      ),
  },
  {
    key: "apps",
    label: "Apps",
    width: "4rem",
    align: "right",
    hideBelow: "md",
    render: ({ linked }) => (
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{linked || "-"}</span>
    ),
  },
  {
    key: "last",
    label: "Last spoke",
    width: "7rem",
    align: "right",
    hideBelow: "md",
    render: ({ contact }) => (
      <span className="text-xs text-muted-foreground">
        {contact.lastContactedAt ? formatRelative(contact.lastContactedAt) : "Never"}
      </span>
    ),
  },
  {
    key: "next",
    label: "Follow-up",
    width: "6.5rem",
    align: "right",
    render: ({ contact }) => {
      if (!contact.nextFollowUpAt) return <span className="text-xs text-muted-foreground">-</span>;
      const overdue = (daysFromToday(contact.nextFollowUpAt) ?? 1) <= 0;
      return (
        <span
          className={cn(
            "text-xs font-medium whitespace-nowrap",
            overdue ? "text-tone-rose" : "text-muted-foreground",
          )}
        >
          {formatDueDate(contact.nextFollowUpAt)}
        </span>
      );
    },
  },
  {
    key: "star",
    label: "",
    width: "2rem",
    align: "right",
    render: ({ contact }) => (
      <button
        type="button"
        onClick={() => updateContact(contact.id, { favorite: !contact.favorite })}
        aria-label={contact.favorite ? "Unstar" : "Star"}
        className="relative z-10 cursor-pointer text-muted-foreground transition-colors hover:text-primary"
      >
        <Star className={cn("size-3.5", contact.favorite && "fill-primary text-primary")} />
      </button>
    ),
  },
];
