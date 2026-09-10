"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Plus, Send, Star, Trash2, Users } from "@/components/ui/icons";
import { FollowUpStatusBadge, RelationshipBadge, StatusBadge } from "@/components/common/badges";
import { CompanyAvatar, PersonAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { DateInput, EntityPicker, OptionSelect } from "@/components/common/form";
import { DetailRow, InlineText, NoteEditor } from "@/components/common/inline-edit";
import { ListSkeleton } from "@/components/common/loading";
import { SectionHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { ACTIVITY_CONFIG, RELATIONSHIP_CONFIG, SOURCE_CONFIG, TONE_DOT } from "@/lib/constants";
import { deleteContact, updateContact } from "@/lib/data/actions";
import { useCollection, useRecord, useStoreStatus } from "@/lib/data/hooks";
import { formatDateTime, formatDueDate, formatRelative, formatSmartDate } from "@/lib/date";
import { cn } from "@/lib/utils";

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const status = useStoreStatus();
  const { openQuickAdd, deleteWithUndo } = useAppUI();

  const contact = useRecord("contacts", id);
  const companies = useCollection("companies");
  const applications = useCollection("applications");
  const interviews = useCollection("interviews");
  const followUps = useCollection("followUps");
  const activities = useCollection("activities");

  if (status.status !== "ready") return <ListSkeleton rows={5} />;

  if (!contact) {
    return (
      <Surface className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={Users}
          title="This contact is gone"
          description="It may have been deleted."
          action={{ label: "Back to contacts", href: "/app/contacts" }}
        />
      </Surface>
    );
  }

  const company = companies.find((item) => item.id === contact.companyId) ?? null;
  const linkedApplications = applications.filter((application) =>
    application.contactIds.includes(contact.id),
  );
  const linkedInterviews = interviews.filter((interview) =>
    interview.interviewerContactIds.includes(contact.id),
  );
  const linkedFollowUps = followUps
    .filter((followUp) => followUp.contactId === contact.id)
    .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
  const history = activities
    .filter((activity) => activity.entityType === "contact" && activity.entityId === contact.id)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Link
        href="/app/contacts"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Contacts
      </Link>

      <div className="flex flex-wrap items-start gap-3">
        <PersonAvatar name={contact.name} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-runde text-xl font-semibold tracking-tight sm:text-2xl">
            {contact.name}
          </h1>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
            {contact.position ?? "-"}
            {company && (
              <>
                {" at "}
                <Link
                  href={`/app/companies/${company.id}`}
                  className="text-foreground transition-colors hover:text-primary"
                >
                  {company.name}
                </Link>
              </>
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RelationshipBadge relationship={contact.relationship} />
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.045] px-2.5 py-1 text-xs font-medium transition-colors hover:bg-foreground/[0.075]"
              >
                <Mail className="size-3" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.045] px-2.5 py-1 text-xs font-medium transition-colors hover:bg-foreground/[0.075]"
              >
                <Phone className="size-3" />
                {contact.phone}
              </a>
            )}
            {contact.linkedin && (
              <a
                href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.045] px-2.5 py-1 text-xs font-medium transition-colors hover:bg-foreground/[0.075]"
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={contact.favorite ? "Unstar contact" : "Star contact"}
            onClick={() => updateContact(contact.id, { favorite: !contact.favorite })}
          >
            <Star className={cn("size-3.5", contact.favorite && "fill-primary text-primary")} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openQuickAdd("follow_up", { contactId: contact.id })}
          >
            <Send className="size-3.5" />
            Follow up
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Delete contact"
            onClick={() => {
              deleteWithUndo(deleteContact(contact.id));
              router.push("/app/contacts");
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-5">
          <Surface className="overflow-hidden">
            <SectionHeader title="Details" className="border-b border-foreground/[0.06]" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
              <DetailRow label="Relationship">
                <OptionSelect
                  size="sm"
                  value={contact.relationship}
                  onChange={(value) => value && updateContact(contact.id, { relationship: value })}
                  options={RELATIONSHIP_CONFIG}
                />
              </DetailRow>
              <DetailRow label="Source">
                <OptionSelect
                  size="sm"
                  value={contact.source}
                  onChange={(value) => updateContact(contact.id, { source: value })}
                  options={SOURCE_CONFIG}
                  allowClear
                  placeholder="Not set"
                />
              </DetailRow>
              <DetailRow label="Company" className="col-span-2">
                <EntityPicker
                  value={contact.companyId}
                  onChange={(companyId) => updateContact(contact.id, { companyId })}
                  options={companies.map((item) => ({
                    value: item.id,
                    label: item.name,
                    icon: <CompanyAvatar name={item.name} domain={item.domain} size="xs" />,
                  }))}
                  placeholder="Not linked"
                  className="h-8 text-xs"
                />
              </DetailRow>
              <DetailRow label="Title" className="col-span-2">
                <InlineText
                  value={contact.position}
                  onCommit={(position) => updateContact(contact.id, { position })}
                  placeholder="Add a title"
                  ariaLabel="title"
                />
              </DetailRow>
              <DetailRow label="Email">
                <InlineText
                  type="email"
                  value={contact.email}
                  onCommit={(email) => updateContact(contact.id, { email })}
                  placeholder="Add email"
                  ariaLabel="email"
                />
              </DetailRow>
              <DetailRow label="Phone">
                <InlineText
                  value={contact.phone}
                  onCommit={(phone) => updateContact(contact.id, { phone })}
                  placeholder="Add phone"
                  ariaLabel="phone"
                />
              </DetailRow>
              <DetailRow label="LinkedIn" className="col-span-2">
                <InlineText
                  truncate
                  type="url"
                  value={contact.linkedin}
                  onCommit={(linkedin) => updateContact(contact.id, { linkedin })}
                  placeholder="Add profile URL"
                  ariaLabel="LinkedIn"
                />
              </DetailRow>
              <DetailRow label="Last contacted">
                <DateInput
                  value={contact.lastContactedAt}
                  onChange={(lastContactedAt) => updateContact(contact.id, { lastContactedAt })}
                  className="h-8 text-xs"
                />
              </DetailRow>
              <DetailRow label="Next follow-up">
                <DateInput
                  value={contact.nextFollowUpAt}
                  onChange={(nextFollowUpAt) => updateContact(contact.id, { nextFollowUpAt })}
                  className="h-8 text-xs"
                />
              </DetailRow>
            </div>
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader title="Notes" className="border-b border-foreground/[0.06]" />
            <div className="p-4">
              <NoteEditor
                value={contact.notes ?? ""}
                onCommit={(notes) => updateContact(contact.id, { notes: notes || null })}
                placeholder="How you met, what they care about, what they've offered to do."
                rows={7}
              />
            </div>
          </Surface>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-7">
          <Surface className="overflow-hidden">
            <SectionHeader
              title="Applications"
              count={linkedApplications.length}
              className="border-b border-foreground/[0.06]"
            />
            {linkedApplications.length === 0 ? (
              <EmptyState
                title="Not linked to anything yet"
                description="Link this person from an application to keep their history together."
                compact
              />
            ) : (
              <ul className="divide-y divide-foreground/[0.05]">
                {linkedApplications.map((application) => {
                  const applicationCompany = companies.find(
                    (item) => item.id === application.companyId,
                  );
                  return (
                    <li key={application.id}>
                      <Link
                        href={`/app/applications/${application.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                      >
                        <CompanyAvatar
                          name={applicationCompany?.name ?? "?"}
                          domain={applicationCompany?.domain}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {application.position}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {applicationCompany?.name}
                          </span>
                        </span>
                        <StatusBadge status={application.status} size="sm" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader
              title="Interaction history"
              count={linkedFollowUps.length + linkedInterviews.length}
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => openQuickAdd("follow_up", { contactId: contact.id })}
                >
                  <Plus className="size-3" />
                  Follow-up
                </Button>
              }
              className="border-b border-foreground/[0.06]"
            />
            {linkedFollowUps.length === 0 && linkedInterviews.length === 0 && history.length === 0 ? (
              <EmptyState
                icon={Send}
                title="Nothing logged yet"
                description="Follow-ups and interviews with this person show up here in order."
                compact
              />
            ) : (
              <ul className="divide-y divide-foreground/[0.05]">
                {linkedInterviews.map((interview) => (
                  <li key={interview.id}>
                    <Link
                      href={`/app/interviews/${interview.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT.violet)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">
                          Interviewed you · round {interview.round}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {formatDateTime(interview.scheduledAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {linkedFollowUps.map((followUp) => (
                  <li key={followUp.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT.cyan)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {followUp.subject ?? "Follow-up"}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {followUp.status === "pending"
                          ? `Due ${formatDueDate(followUp.dueDate)}`
                          : `Sent ${formatSmartDate(followUp.sentAt)}`}
                      </span>
                    </span>
                    <FollowUpStatusBadge status={followUp.status} size="sm" />
                  </li>
                ))}
                {history.map((activity) => {
                  const config = ACTIVITY_CONFIG[activity.type];
                  return (
                    <li key={activity.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[config.tone])} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{activity.title}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {formatRelative(activity.occurredAt)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}
