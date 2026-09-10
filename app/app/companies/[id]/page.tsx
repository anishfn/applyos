"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  ExternalLink,
  Plus,
  Star,
  Trash2,
  Users,
  Video,
} from "@/components/ui/icons";
import {
  InterviewStatusBadge,
  InterviewTypeBadge,
  RelationshipBadge,
  StatusBadge,
} from "@/components/common/badges";
import { CompanyAvatar, PersonAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { OptionSelect } from "@/components/common/form";
import { DetailRow, InlineText, NoteEditor } from "@/components/common/inline-edit";
import { ListSkeleton } from "@/components/common/loading";
import { SectionHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { COMPANY_SIZE_LABEL } from "@/lib/constants";
import { deleteCompany, updateCompany } from "@/lib/data/actions";
import { useCollection, useRecord, useStoreStatus } from "@/lib/data/hooks";
import { formatDateTime, formatRelative, formatSmartDate } from "@/lib/date";
import { formatSalary } from "@/lib/format";
import { COMPANY_SIZES } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const status = useStoreStatus();
  const { openQuickAdd, deleteWithUndo } = useAppUI();

  const company = useRecord("companies", id);
  const applications = useCollection("applications");
  const contacts = useCollection("contacts");
  const interviews = useCollection("interviews");
  const jobs = useCollection("jobs");

  if (status.status !== "ready") return <ListSkeleton rows={5} />;

  if (!company) {
    return (
      <Surface className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={Building2}
          title="This company is gone"
          description="It may have been deleted."
          action={{ label: "Back to companies", href: "/app/companies" }}
        />
      </Surface>
    );
  }

  const companyApplications = applications
    .filter((application) => application.companyId === company.id)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const companyContacts = contacts.filter((contact) => contact.companyId === company.id);
  const companyInterviews = interviews
    .filter((interview) => interview.companyId === company.id)
    .sort((a, b) => (a.scheduledAt < b.scheduledAt ? 1 : -1));
  const savedJobs = jobs.filter((job) => job.companyId === company.id && job.status === "saved");
  const offers = companyApplications.filter(
    (application) => application.status === "offer" || application.status === "accepted",
  );

  const website = company.website
    ? company.website.startsWith("http")
      ? company.website
      : `https://${company.website}`
    : null;
  const careers = company.careersUrl
    ? company.careersUrl.startsWith("http")
      ? company.careersUrl
      : `https://${company.careersUrl}`
    : null;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Link
        href="/app/companies"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Companies
      </Link>

      <div className="flex flex-wrap items-start gap-3">
        <CompanyAvatar name={company.name} domain={company.domain} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-runde text-xl font-semibold tracking-tight sm:text-2xl">
            {company.name}
          </h1>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
            {[company.industry, company.size ? COMPANY_SIZE_LABEL[company.size] : null, company.location]
              .filter(Boolean)
              .join(" · ") || "Add an industry and size below"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Rating
              value={company.rating}
              onChange={(rating) => updateCompany(company.id, { rating })}
            />
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.045] px-2.5 py-1 text-xs font-medium transition-colors hover:bg-foreground/[0.075]"
              >
                <ExternalLink className="size-3" />
                Website
              </a>
            )}
            {careers && (
              <a
                href={careers}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.045] px-2.5 py-1 text-xs font-medium transition-colors hover:bg-foreground/[0.075]"
              >
                <ExternalLink className="size-3" />
                Careers
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={company.favorite ? "Unstar company" : "Star company"}
            onClick={() => updateCompany(company.id, { favorite: !company.favorite })}
          >
            <Star className={cn("size-3.5", company.favorite && "fill-primary text-primary")} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openQuickAdd("application", { companyId: company.id })}
          >
            <Plus className="size-3.5" />
            Application
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Delete company"
            onClick={() => {
              deleteWithUndo(deleteCompany(company.id));
              router.push("/app/companies");
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Relationship summary --------------------------------------------- */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Applications", value: companyApplications.length },
          { label: "Interviews", value: companyInterviews.length },
          { label: "Contacts", value: companyContacts.length },
          { label: "Offers", value: offers.length },
        ].map((stat) => (
          <Surface key={stat.label} className="p-3.5">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 font-runde text-2xl leading-none font-semibold tabular-nums">
              {stat.value}
            </p>
          </Surface>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-7">
          <Surface className="overflow-hidden">
            <SectionHeader
              title="Applications"
              count={companyApplications.length}
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => openQuickAdd("application", { companyId: company.id })}
                >
                  <Plus className="size-3" />
                  Add
                </Button>
              }
              className="border-b border-foreground/[0.06]"
            />
            {companyApplications.length === 0 ? (
              <EmptyState
                title="You haven't applied here yet"
                description="Add an application and it'll show up in your pipeline."
                compact
              />
            ) : (
              <ul className="divide-y divide-foreground/[0.05]">
                {companyApplications.map((application) => (
                  <li key={application.id}>
                    <Link
                      href={`/app/applications/${application.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {application.position}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[
                            application.appliedAt
                              ? `Applied ${formatSmartDate(application.appliedAt)}`
                              : "Not submitted",
                            formatSalary(application.salary),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <StatusBadge status={application.status} size="sm" />
                      <span className="hidden w-16 shrink-0 text-right font-mono text-[11px] text-muted-foreground tabular-nums sm:block">
                        {formatRelative(application.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader
              title="Interviews"
              count={companyInterviews.length}
              className="border-b border-foreground/[0.06]"
            />
            {companyInterviews.length === 0 ? (
              <EmptyState icon={Video} title="No interviews yet" compact />
            ) : (
              <ul className="divide-y divide-foreground/[0.05]">
                {companyInterviews.map((interview) => (
                  <li key={interview.id}>
                    <Link
                      href={`/app/interviews/${interview.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                    >
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.05] font-mono text-[10px] font-semibold">
                        {interview.round}
                      </span>
                      <span className="min-w-0 flex-1">
                        <InterviewTypeBadge type={interview.type} size="sm" />
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {formatDateTime(interview.scheduledAt)}
                        </span>
                      </span>
                      <InterviewStatusBadge status={interview.status} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          {savedJobs.length > 0 && (
            <Surface className="overflow-hidden">
              <SectionHeader
                title="Saved jobs"
                count={savedJobs.length}
                action={
                  <Button variant="ghost" size="xs" href="/app/jobs">
                    Open jobs
                  </Button>
                }
                className="border-b border-foreground/[0.06]"
              />
              <ul className="divide-y divide-foreground/[0.05]">
                {savedJobs.map((job) => (
                  <li key={job.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Bookmark className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{job.title}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {formatSalary(job.salary) ?? "-"}
                    </span>
                  </li>
                ))}
              </ul>
            </Surface>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:col-span-5">
          <Surface className="overflow-hidden">
            <SectionHeader title="Details" className="border-b border-foreground/[0.06]" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
              <DetailRow label="Industry">
                <InlineText
                  value={company.industry}
                  onCommit={(industry) => updateCompany(company.id, { industry })}
                  placeholder="Add industry"
                  ariaLabel="industry"
                />
              </DetailRow>
              <DetailRow label="Size">
                <OptionSelect
                  size="sm"
                  value={company.size}
                  onChange={(size) => updateCompany(company.id, { size })}
                  options={COMPANY_SIZES.map((size) => ({
                    value: size,
                    label: COMPANY_SIZE_LABEL[size],
                    tone: "neutral" as const,
                  }))}
                  allowClear
                  placeholder="Not set"
                />
              </DetailRow>
              <DetailRow label="Location" className="col-span-2">
                <InlineText
                  value={company.location}
                  onCommit={(location) => updateCompany(company.id, { location })}
                  placeholder="Add location"
                  ariaLabel="location"
                />
              </DetailRow>
              <DetailRow label="Website" className="col-span-2">
                <InlineText
                  truncate
                  type="url"
                  value={company.website}
                  onCommit={(value) => updateCompany(company.id, { website: value })}
                  placeholder="Add website"
                  ariaLabel="website"
                />
              </DetailRow>
              <DetailRow label="Careers page" className="col-span-2">
                <InlineText
                  truncate
                  type="url"
                  value={company.careersUrl}
                  onCommit={(careersUrl) => updateCompany(company.id, { careersUrl })}
                  placeholder="Add careers URL"
                  ariaLabel="careers URL"
                />
              </DetailRow>
            </div>
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader
              title="Contacts"
              count={companyContacts.length}
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => openQuickAdd("contact", { companyId: company.id })}
                >
                  <Plus className="size-3" />
                  Add
                </Button>
              }
              className="border-b border-foreground/[0.06]"
            />
            {companyContacts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nobody here yet"
                description="Add the recruiter or anyone you know inside."
                compact
              />
            ) : (
              <ul className="divide-y divide-foreground/[0.05]">
                {companyContacts.map((contact) => (
                  <li key={contact.id}>
                    <Link
                      href={`/app/contacts/${contact.id}`}
                      className="flex items-center gap-2.5 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                    >
                      <PersonAvatar name={contact.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{contact.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {contact.position ?? "-"}
                        </span>
                      </span>
                      <RelationshipBadge relationship={contact.relationship} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader title="Notes" className="border-b border-foreground/[0.06]" />
            <div className="p-4">
              <NoteEditor
                value={company.notes ?? ""}
                onCommit={(notes) => updateCompany(company.id, { notes: notes || null })}
                placeholder="What you know about them: how they work, what people say, why you'd want this."
                rows={8}
              />
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}

function Rating({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  return (
    <span className="inline-flex items-center gap-0.5" role="group" aria-label="Company rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? null : star)}
          aria-label={`Rate ${star} out of 5`}
          className="cursor-pointer p-0.5 transition-transform duration-200 hover:scale-110"
        >
          <Star
            className={cn(
              "size-3.5",
              (value ?? 0) >= star ? "fill-primary text-primary" : "text-foreground/20",
            )}
          />
        </button>
      ))}
    </span>
  );
}
