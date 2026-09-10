"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, ExternalLink, LayoutGrid, Plus, Rows3, Search, Star } from "@/components/ui/icons";
import { StatusBadge } from "@/components/common/badges";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { Column, DataTable, TableIdentity } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Segmented } from "@/components/common/form";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { COMPANY_SIZE_LABEL, STATUS_RANK } from "@/lib/constants";
import { updateCompany } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import type { Application, Company } from "@/lib/types";
import { cn } from "@/lib/utils";

type Sort = "activity" | "name" | "applications";

export default function CompaniesPage() {
  const status = useStoreStatus();
  const { openQuickAdd } = useAppUI();

  const companies = useCollection("companies");
  const applications = useCollection("applications");
  const contacts = useCollection("contacts");
  const interviews = useCollection("interviews");

  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<Sort>("activity");
  const [view, setView] = useLocalStorageState<"cards" | "table">("applyos:companies-view", "cards");

  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    return companies
      .map((company) => {
        const companyApplications = applications.filter(
          (application) => application.companyId === company.id,
        );
        const furthest = companyApplications.reduce(
          (best, application) => Math.max(best, STATUS_RANK[application.status]),
          -1,
        );
        return {
          company,
          applications: companyApplications,
          contacts: contacts.filter((contact) => contact.companyId === company.id).length,
          interviews: interviews.filter((interview) => interview.companyId === company.id).length,
          furthest: companyApplications.find(
            (application) => STATUS_RANK[application.status] === furthest,
          ),
        };
      })
      .filter(({ company }) => {
        if (!needle) return true;
        return [company.name, company.industry, company.location, company.domain]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => {
        if (a.company.favorite !== b.company.favorite) return a.company.favorite ? -1 : 1;
        if (sort === "name") return a.company.name.localeCompare(b.company.name);
        if (sort === "applications") return b.applications.length - a.applications.length;
        const left = a.applications.reduce((max, item) => (item.updatedAt > max ? item.updatedAt : max), "");
        const right = b.applications.reduce((max, item) => (item.updatedAt > max ? item.updatedAt : max), "");
        return left < right ? 1 : -1;
      });
  }, [companies, applications, contacts, interviews, query, sort]);

  if (status.status !== "ready") return <ListSkeleton rows={6} />;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Companies"
        description="Every company you're talking to, and where each one stands."
        actions={
          <Button variant="primary" size="sm" onClick={() => openQuickAdd("company")}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add company</span>
          </Button>
        }
      >
        {companies.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1 sm:max-w-72">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Search companies…"
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Segmented
              value={sort}
              onChange={setSort}
              ariaLabel="Sort companies"
              size="sm"
              options={[
                { value: "activity", label: "Recent" },
                { value: "applications", label: "Most applied" },
                { value: "name", label: "A–Z" },
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

      {companies.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Building2}
            title="No companies yet"
            description="Companies are created automatically when you add an application. You can also add one you're targeting before you apply."
            action={{ label: "Add a company", onClick: () => openQuickAdd("company") }}
          />
        </Surface>
      ) : rows.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Search}
            title="No companies match"
            description="Try a different name or industry."
            action={{ label: "Clear search", onClick: () => setQuery("") }}
          />
        </Surface>
      ) : view === "table" ? (
        <DataTable
          rows={rows}
          getKey={({ company }) => company.id}
          getHref={({ company }) => `/app/companies/${company.id}`}
          columns={COMPANY_COLUMNS}
        />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ company, applications: companyApplications, contacts: contactCount, interviews: interviewCount, furthest }) => (
            <Surface key={company.id} interactive className="relative p-3.5">
              <div className="flex items-start gap-3">
                <CompanyAvatar name={company.name} domain={company.domain} size="lg" />
                <div className="min-w-0 flex-1">
                  <Link href={`/app/companies/${company.id}`} className="block min-w-0">
                    <h3 className="truncate font-runde text-sm font-semibold tracking-tight">
                      {company.name}
                    </h3>
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {[company.industry, company.size ? COMPANY_SIZE_LABEL[company.size] : null]
                        .filter(Boolean)
                        .join(" · ") || company.location || "-"}
                    </p>
                    <span className="absolute inset-0" aria-hidden />
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => updateCompany(company.id, { favorite: !company.favorite })}
                  aria-label={company.favorite ? "Unstar" : "Star"}
                  className="relative z-10 cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                >
                  <Star className={cn("size-3.5", company.favorite && "fill-primary text-primary")} />
                </button>
              </div>

              {furthest && (
                <div className="mt-2.5">
                  <StatusBadge status={furthest.status} size="sm" />
                </div>
              )}

              <dl className="mt-2.5 grid grid-cols-3 gap-2 border-t border-foreground/[0.05] pt-2.5">
                {[
                  { label: "Apps", value: companyApplications.length },
                  { label: "Contacts", value: contactCount },
                  { label: "Interviews", value: interviewCount },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-[11px] font-semibold text-muted-foreground">
                      {stat.label}
                    </dt>
                    <dd className="font-runde text-base font-semibold tabular-nums">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              {company.website && (
                <a
                  href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(event) => event.stopPropagation()}
                  className="relative z-10 mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="size-3" />
                  {company.domain ?? "Website"}
                </a>
              )}
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Table view                                                                  */
/* -------------------------------------------------------------------------- */

interface CompanyRow {
  company: Company;
  applications: Application[];
  contacts: number;
  interviews: number;
  furthest: Application | undefined;
}

const COMPANY_COLUMNS: Array<Column<CompanyRow>> = [
  {
    key: "name",
    label: "Company",
    width: "minmax(0,2.2fr)",
    render: ({ company }) => (
      <TableIdentity
        avatar={<CompanyAvatar name={company.name} domain={company.domain} size="sm" />}
        title={company.name}
        subtitle={
          [company.industry, company.size ? COMPANY_SIZE_LABEL[company.size] : null]
            .filter(Boolean)
            .join(" · ") ||
          company.location ||
          null
        }
      />
    ),
  },
  {
    key: "stage",
    label: "Furthest stage",
    width: "9.5rem",
    hideBelow: "sm",
    render: ({ furthest }) =>
      furthest ? (
        <StatusBadge status={furthest.status} size="sm" />
      ) : (
        <span className="text-xs text-muted-foreground">-</span>
      ),
  },
  {
    key: "location",
    label: "Location",
    width: "minmax(0,1.2fr)",
    hideBelow: "xl",
    render: ({ company }) => (
      <span className="truncate text-xs text-muted-foreground">{company.location ?? "-"}</span>
    ),
  },
  {
    key: "apps",
    label: "Apps",
    width: "4rem",
    align: "right",
    render: ({ applications }) => (
      <span className="font-mono text-xs tabular-nums">{applications.length}</span>
    ),
  },
  {
    key: "contacts",
    label: "Contacts",
    width: "5rem",
    align: "right",
    hideBelow: "md",
    render: ({ contacts }) => (
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{contacts || "-"}</span>
    ),
  },
  {
    key: "interviews",
    label: "Interviews",
    width: "5.5rem",
    align: "right",
    hideBelow: "md",
    render: ({ interviews }) => (
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {interviews || "-"}
      </span>
    ),
  },
  {
    key: "star",
    label: "",
    width: "2rem",
    align: "right",
    render: ({ company }) => (
      <button
        type="button"
        onClick={() => updateCompany(company.id, { favorite: !company.favorite })}
        aria-label={company.favorite ? "Unstar" : "Star"}
        className="relative z-10 cursor-pointer text-muted-foreground transition-colors hover:text-primary"
      >
        <Star className={cn("size-3.5", company.favorite && "fill-primary text-primary")} />
      </button>
    ),
  },
];
