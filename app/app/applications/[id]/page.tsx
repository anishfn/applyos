"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  ListTodo,
  MoreHorizontal,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Users,
  Video,
} from "@/components/ui/icons";
import { toast } from "sonner";
import {
  FollowUpStatusBadge,
  InterviewStatusBadge,
  InterviewTypeBadge,
  PriorityBadge,
  RelationshipBadge,
  StatusBadge,
} from "@/components/common/badges";
import { CompanyAvatar, PersonAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { DateInput, EntityPicker, OptionSelect, TagsInput } from "@/components/common/form";
import { DetailRow, InlineText, NoteEditor } from "@/components/common/inline-edit";
import { ListSkeleton } from "@/components/common/loading";
import { SectionHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Surface } from "@/components/ui/surface";
import {
  ACTIVITY_CONFIG,
  EMPLOYMENT_TYPE_CONFIG,
  PRIORITY_CONFIG,
  SOURCE_CONFIG,
  STATUS_CONFIG,
  TONE_DOT,
  WORK_MODE_CONFIG,
} from "@/lib/constants";
import {
  archiveApplication,
  completeNextAction,
  createNote,
  deleteApplication,
  detachDocumentFromApplication,
  setApplicationStatus,
  toggleTask,
  updateApplication,
  updateFollowUp,
  updateNote,
} from "@/lib/data/actions";
import { useCollection, useRecord, useStoreStatus } from "@/lib/data/hooks";
import { formatDateTime, formatDueDate, formatRelative, formatSmartDate, isPastDate } from "@/lib/date";
import { formatSalaryFull } from "@/lib/format";
import type { SalaryRange } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const status = useStoreStatus();
  const { openQuickAdd, deleteWithUndo } = useAppUI();

  const application = useRecord("applications", id);
  const companies = useCollection("companies");
  const contacts = useCollection("contacts");
  const interviews = useCollection("interviews");
  const tasks = useCollection("tasks");
  const followUps = useCollection("followUps");
  const documents = useCollection("documents");
  const resumes = useCollection("resumes");
  const coverLetters = useCollection("coverLetters");
  const activities = useCollection("activities");
  const notes = useCollection("notes");

  const company = companies.find((item) => item.id === application?.companyId) ?? null;

  const related = React.useMemo(() => {
    if (!application) {
      return { interviews: [], tasks: [], followUps: [], documents: [], activities: [], note: null };
    }
    return {
      interviews: interviews
        .filter((interview) => interview.applicationId === application.id)
        .sort((a, b) => (a.scheduledAt < b.scheduledAt ? 1 : -1)),
      tasks: tasks.filter(
        (task) => task.relatedType === "application" && task.relatedId === application.id,
      ),
      followUps: followUps
        .filter((followUp) => followUp.applicationId === application.id)
        .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1)),
      documents: documents.filter((document) =>
        document.applicationIds.includes(application.id),
      ),
      activities: activities
        .filter(
          (activity) =>
            (activity.entityType === "application" && activity.entityId === application.id) ||
            (activity.meta as { applicationId?: string }).applicationId === application.id,
        )
        .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)),
      note: notes.find(
        (note) => note.entityType === "application" && note.entityId === application.id,
      ) ?? null,
    };
  }, [application, interviews, tasks, followUps, documents, activities, notes]);

  if (status.status !== "ready") return <ListSkeleton rows={6} />;

  if (!application) {
    return (
      <Surface className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={FileText}
          title="This application is gone"
          description="It may have been deleted. Everything else is still where you left it."
          action={{ label: "Back to applications", href: "/app/applications" }}
        />
      </Surface>
    );
  }

  const resume = resumes.find((item) => item.id === application.resumeId);
  const coverLetter = coverLetters.find((item) => item.id === application.coverLetterId);
  const linkedContacts = contacts.filter((contact) =>
    application.contactIds.includes(contact.id),
  );
  const overdueAction = application.nextActionDate
    ? isPastDate(application.nextActionDate)
    : false;

  const patchSalary = (patch: Partial<SalaryRange>) =>
    updateApplication(application.id, { salary: { ...application.salary, ...patch } });

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* Header ---------------------------------------------------------- */}
      <div className="flex flex-1 flex-col gap-3">
        <Link
          href="/app/applications"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Applications
        </Link>

        <div className="flex flex-wrap items-start gap-3">
          <CompanyAvatar name={company?.name ?? "?"} domain={company?.domain} size="xl" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/app/companies/${application.companyId}`}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {company?.name ?? "Unknown company"}
              </Link>
              {application.archived && (
                <span className="rounded-full bg-foreground/[0.07] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Archived
                </span>
              )}
            </div>
            <h1 className="mt-0.5 font-runde text-xl font-semibold tracking-tight sm:text-2xl">
              {application.position}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPicker application={application} />
              <PriorityPicker application={application} />
              {application.referral && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary-ink">
                  Referral{application.referredBy ? ` · ${application.referredBy}` : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {application.jobUrl && (
              <Button variant="outline" size="sm" href={application.jobUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="size-3.5" />
                <span className="hidden sm:inline">Job posting</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="More actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => openQuickAdd("interview", { applicationId: application.id })}>
                  <Video className="size-3.5" />
                  Schedule interview
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openQuickAdd("follow_up", { applicationId: application.id })}>
                  <Send className="size-3.5" />
                  Schedule follow-up
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openQuickAdd("task", { applicationId: application.id })}>
                  <ListTodo className="size-3.5" />
                  Add task
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openQuickAdd("document", { applicationId: application.id })}>
                  <Paperclip className="size-3.5" />
                  Attach document
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    archiveApplication(application.id, !application.archived);
                    toast(application.archived ? "Restored" : "Archived");
                  }}
                >
                  {application.archived ? "Restore" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    deleteWithUndo(deleteApplication(application.id));
                    router.push("/app/applications");
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Next action ------------------------------------------------------ */}
      <Surface
        className={cn(
          "flex flex-wrap items-center gap-3 p-3.5",
          overdueAction && "ring-tone-rose/25",
        )}
      >
        <span
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
            overdueAction ? "bg-tone-rose/12 text-tone-rose" : "bg-primary/15 text-primary-ink",
          )}
        >
          <Check className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Next action
          </p>
          <InlineText
            value={application.nextAction}
            onCommit={(value) => updateApplication(application.id, { nextAction: value })}
            placeholder="What's the next move?"
            ariaLabel="next action"
            className="-ml-1.5"
          />
        </div>
        <div className="flex items-center gap-2">
          <DateInput
            value={application.nextActionDate}
            onChange={(value) => updateApplication(application.id, { nextActionDate: value })}
            className={cn("h-8 w-36 text-xs", overdueAction && "border-tone-rose/40 text-tone-rose")}
            aria-label="Next action date"
          />
          {application.nextAction && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const previousAction = application.nextAction;
                const previousDate = application.nextActionDate;
                completeNextAction(application.id);
                toast.success("Done", {
                  action: {
                    label: "Undo",
                    onClick: () =>
                      updateApplication(application.id, {
                        nextAction: previousAction,
                        nextActionDate: previousDate,
                      }),
                  },
                });
              }}
            >
              Complete
            </Button>
          )}
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Left ---------------------------------------------------------- */}
        <div className="flex flex-col gap-3 lg:col-span-7">
          <Surface className="overflow-hidden">
            <SectionHeader title="Overview" className="border-b border-foreground/[0.06]" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-3">
              <DetailRow label="Salary">
                <div className="flex items-center gap-1 px-1.5">
                  <input
                    type="number"
                    value={application.salary.min ?? ""}
                    placeholder="Min"
                    onChange={(event) =>
                      patchSalary({ min: event.target.value ? Number(event.target.value) : null })
                    }
                    className="w-16 rounded-md bg-transparent py-0.5 font-mono text-sm tabular-nums outline-none focus:bg-foreground/[0.05]"
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="number"
                    value={application.salary.max ?? ""}
                    placeholder="Max"
                    onChange={(event) =>
                      patchSalary({ max: event.target.value ? Number(event.target.value) : null })
                    }
                    className="w-16 rounded-md bg-transparent py-0.5 font-mono text-sm tabular-nums outline-none focus:bg-foreground/[0.05]"
                  />
                </div>
                {formatSalaryFull(application.salary) && (
                  <p className="px-1.5 text-[11px] text-muted-foreground">
                    {formatSalaryFull(application.salary)}
                  </p>
                )}
              </DetailRow>

              <DetailRow label="Location">
                <InlineText
                  value={application.location}
                  onCommit={(value) => updateApplication(application.id, { location: value })}
                  placeholder="Add location"
                  ariaLabel="location"
                />
              </DetailRow>

              <DetailRow label="Work mode">
                <OptionSelect
                  size="sm"
                  value={application.workMode}
                  onChange={(value) => updateApplication(application.id, { workMode: value })}
                  options={WORK_MODE_CONFIG}
                  allowClear
                  placeholder="Not set"
                />
              </DetailRow>

              <DetailRow label="Employment">
                <OptionSelect
                  size="sm"
                  value={application.employmentType}
                  onChange={(value) => updateApplication(application.id, { employmentType: value })}
                  options={EMPLOYMENT_TYPE_CONFIG}
                  allowClear
                  placeholder="Not set"
                />
              </DetailRow>

              <DetailRow label="Source">
                <OptionSelect
                  size="sm"
                  value={application.source}
                  onChange={(value) => updateApplication(application.id, { source: value })}
                  options={SOURCE_CONFIG}
                  allowClear
                  placeholder="Not set"
                />
              </DetailRow>

              <DetailRow label="Job URL">
                <InlineText
                  truncate
                  type="url"
                  value={application.jobUrl}
                  onCommit={(value) => updateApplication(application.id, { jobUrl: value })}
                  placeholder="Add link"
                  ariaLabel="job URL"
                />
              </DetailRow>

              <DetailRow label="Date applied">
                <DateInput
                  value={application.appliedAt}
                  onChange={(value) => updateApplication(application.id, { appliedAt: value })}
                  className="h-8 text-xs"
                />
              </DetailRow>

              <DetailRow label="Deadline">
                <DateInput
                  value={application.deadline}
                  onChange={(value) => updateApplication(application.id, { deadline: value })}
                  className={cn(
                    "h-8 text-xs",
                    application.deadline && isPastDate(application.deadline) && "border-tone-rose/40",
                  )}
                />
              </DetailRow>

              <DetailRow label="Resume used">
                <EntityPicker
                  value={application.resumeId}
                  onChange={(value) => updateApplication(application.id, { resumeId: value })}
                  options={resumes.map((item) => ({
                    value: item.id,
                    label: `${item.name} v${item.version}`,
                  }))}
                  placeholder={resumes.length ? "Attach a version" : "No resumes yet"}
                  className="h-8 text-xs"
                />
              </DetailRow>

              <DetailRow label="Cover letter" className="col-span-2 sm:col-span-1">
                <EntityPicker
                  value={application.coverLetterId}
                  onChange={(value) => updateApplication(application.id, { coverLetterId: value })}
                  options={coverLetters.map((item) => ({ value: item.id, label: item.name }))}
                  placeholder={coverLetters.length ? "Attach a letter" : "None yet"}
                  className="h-8 text-xs"
                />
              </DetailRow>

              <DetailRow label="Tags" className="col-span-2">
                <div className="px-1.5">
                  <TagsInput
                    value={application.tags}
                    onChange={(tags) => updateApplication(application.id, { tags })}
                  />
                </div>
              </DetailRow>
            </div>
            {(resume || coverLetter) && (
              <div className="flex flex-wrap items-center gap-2 border-t border-foreground/[0.06] px-4 py-2.5 text-xs font-medium text-muted-foreground">
                {resume && (
                  <span>
                    Resume used:{" "}
                    <Link href="/app/resumes" className="text-foreground transition-colors hover:text-primary">
                      {resume.name} v{resume.version}
                    </Link>
                  </span>
                )}
                {resume && coverLetter && <span className="h-3 w-px bg-foreground/12" />}
                {coverLetter && <span>Cover letter: {coverLetter.name}</span>}
              </div>
            )}
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader title="Notes" className="border-b border-foreground/[0.06]" />
            <div className="p-4">
              <NoteEditor
                value={related.note?.body ?? ""}
                onCommit={(body) => {
                  if (related.note) updateNote(related.note.id, { body });
                  else if (body.trim())
                    createNote({ entityType: "application", entityId: application.id, body });
                }}
                placeholder="What did the recruiter say? What matters about this one? Anything you want in front of you before the next call."
                rows={7}
              />
            </div>
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader
              title="Timeline"
              count={related.activities.length}
              className="border-b border-foreground/[0.06]"
            />
            {related.activities.length === 0 ? (
              <EmptyState title="Nothing logged yet" description="Status changes show up here automatically." compact />
            ) : (
              <ol className="relative px-4 py-3">
                <span aria-hidden className="absolute top-5 bottom-5 left-[1.4rem] w-px bg-foreground/[0.08]" />
                {related.activities.map((activity) => {
                  const config = ACTIVITY_CONFIG[activity.type];
                  return (
                    <li key={activity.id} className="relative flex gap-3 py-1.5">
                      <span className={cn("z-10 mt-1 size-2 shrink-0 rounded-full ring-4 ring-card", TONE_DOT[config.tone])} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium">{activity.title}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {config.label} · {formatRelative(activity.occurredAt)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Surface>
        </div>

        {/* Right --------------------------------------------------------- */}
        <div className="flex flex-col gap-3 lg:col-span-5">
          <Surface className="overflow-hidden">
            <SectionHeader
              title="Interviews"
              count={related.interviews.length}
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => openQuickAdd("interview", { applicationId: application.id })}
                >
                  <Plus className="size-3" />
                  Schedule
                </Button>
              }
              className="border-b border-foreground/[0.06]"
            />
            {related.interviews.length === 0 ? (
              <EmptyState
                icon={Video}
                title="No interviews yet"
                description="When one gets booked, schedule it here and a prep workspace comes with it."
                compact
              />
            ) : (
              <ul className="divide-y divide-foreground/[0.05]">
                {related.interviews.map((interview) => (
                  <li key={interview.id}>
                    <Link
                      href={`/app/interviews/${interview.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                    >
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.05] font-mono text-[11px] font-semibold">
                        {interview.round}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <InterviewTypeBadge type={interview.type} size="sm" />
                        </span>
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

          <Surface className="overflow-hidden">
            <SectionHeader
              title="Contacts"
              count={linkedContacts.length}
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => openQuickAdd("contact", { companyId: application.companyId })}
                >
                  <Plus className="size-3" />
                  Add
                </Button>
              }
              className="border-b border-foreground/[0.06]"
            />
            <div className="p-3">
              <EntityPicker
                value={null}
                onChange={(contactId) => {
                  if (!contactId) return;
                  updateApplication(application.id, {
                    contactIds: [...new Set([...application.contactIds, contactId])],
                  });
                  toast.success("Contact linked");
                }}
                options={contacts
                  .filter((contact) => !application.contactIds.includes(contact.id))
                  .map((contact) => ({
                    value: contact.id,
                    label: contact.name,
                    sublabel: contact.position ?? undefined,
                    icon: <PersonAvatar name={contact.name} size="xs" />,
                  }))}
                placeholder="Link an existing contact…"
                searchPlaceholder="Search contacts…"
                emptyLabel="No other contacts"
                allowClear={false}
                className="h-8 text-xs"
              />
            </div>
            {linkedContacts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nobody linked"
                description="Add the recruiter or hiring manager so their history lives alongside this role."
                compact
              />
            ) : (
              <ul className="divide-y divide-foreground/[0.05] border-t border-foreground/[0.05]">
                {linkedContacts.map((contact) => (
                  <li key={contact.id} className="group flex items-center gap-2.5 px-4 py-2.5">
                    <PersonAvatar name={contact.name} size="sm" />
                    <Link href={`/app/contacts/${contact.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{contact.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {contact.position ?? "-"}
                      </span>
                    </Link>
                    <RelationshipBadge relationship={contact.relationship} size="sm" />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Unlink ${contact.name}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() =>
                        updateApplication(application.id, {
                          contactIds: application.contactIds.filter((cid) => cid !== contact.id),
                        })
                      }
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader
              title="Follow-ups"
              count={related.followUps.length}
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => openQuickAdd("follow_up", { applicationId: application.id })}
                >
                  <Plus className="size-3" />
                  Schedule
                </Button>
              }
              className="border-b border-foreground/[0.06]"
            />
            {related.followUps.length === 0 ? (
              <EmptyState icon={Send} title="No follow-ups" description="Schedule one so it never slips." compact />
            ) : (
              <ul className="divide-y divide-foreground/[0.05]">
                {related.followUps.map((followUp) => (
                  <li key={followUp.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {followUp.subject ?? "Follow-up"}
                      </span>
                      <span
                        className={cn(
                          "block font-mono text-[11px] tabular-nums",
                          followUp.status === "pending" && isPastDate(followUp.dueDate)
                            ? "text-tone-rose"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatDueDate(followUp.dueDate)}
                      </span>
                    </span>
                    <FollowUpStatusBadge status={followUp.status} size="sm" />
                    {followUp.status === "pending" && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          updateFollowUp(followUp.id, { status: "sent" });
                          toast.success("Marked as sent");
                        }}
                      >
                        Sent
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader
              title="Tasks"
              count={related.tasks.filter((task) => task.status !== "completed").length}
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => openQuickAdd("task", { applicationId: application.id })}
                >
                  <Plus className="size-3" />
                  Add
                </Button>
              }
              className="border-b border-foreground/[0.06]"
            />
            {related.tasks.length === 0 ? (
              <EmptyState icon={ListTodo} title="No tasks" description="Break the next step into something you can finish." compact />
            ) : (
              <ul className="divide-y divide-foreground/[0.05]">
                {related.tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      aria-label={`Toggle ${task.title}`}
                      className={cn(
                        "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-200",
                        task.status === "completed"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-foreground/25 hover:border-primary",
                      )}
                    >
                      {task.status === "completed" && <Check className="size-2.5" strokeWidth={3} />}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-xs font-medium",
                          task.status === "completed" && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </span>
                      {task.dueDate && (
                        <span className="block font-mono text-[11px] text-muted-foreground tabular-nums">
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                    </span>
                    <PriorityBadge priority={task.priority} />
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader
              title="Documents"
              count={related.documents.length}
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => openQuickAdd("document", { applicationId: application.id })}
                >
                  <Plus className="size-3" />
                  Attach
                </Button>
              }
              className="border-b border-foreground/[0.06]"
            />
            {related.documents.length === 0 ? (
              <EmptyState icon={Paperclip} title="Nothing attached" description="Portfolios, references, take-home submissions." compact />
            ) : (
              <ul className="divide-y divide-foreground/[0.05]">
                {related.documents.map((document) => (
                  <li key={document.id} className="group flex items-center gap-2.5 px-4 py-2.5">
                    <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{document.name}</span>
                    {document.url && (
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={`Open ${document.name}`}
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Detach ${document.name}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => detachDocumentFromApplication(document.id, application.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <p className="px-1 text-[11px] font-medium text-muted-foreground">
            Added {formatSmartDate(application.createdAt)} · updated {formatRelative(application.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Header pickers                                                              */
/* -------------------------------------------------------------------------- */

function StatusPicker({ application }: { application: { id: string; status: keyof typeof STATUS_CONFIG } }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="cursor-pointer rounded-full transition-opacity duration-200 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <StatusBadge status={application.status} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-48 overflow-y-auto">
        {Object.values(STATUS_CONFIG).map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => {
              if (option.value === application.status) return;
              const previous = application.status;
              setApplicationStatus(application.id, option.value);
              toast.success(`Moved to ${option.label}`, {
                action: {
                  label: "Undo",
                  onClick: () => setApplicationStatus(application.id, previous),
                },
              });
            }}
          >
            <StatusBadge status={option.value} size="sm" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityPicker({
  application,
}: {
  application: { id: string; priority: keyof typeof PRIORITY_CONFIG };
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-foreground/[0.07] bg-foreground/[0.045] px-2.5 py-1 text-xs font-medium transition-colors duration-200 hover:bg-foreground/[0.075]"
        >
          <PriorityBadge priority={application.priority} showLabel />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {Object.values(PRIORITY_CONFIG).map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => updateApplication(application.id, { priority: option.value })}
          >
            <PriorityBadge priority={option.value} showLabel />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
