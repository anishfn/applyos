"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Link2, Sparkles, Wand2 } from "@/components/ui/icons";
import { toast } from "sonner";
import { CompanyAvatar, PersonAvatar } from "@/components/common/company-avatar";
import { FileChip, FileDrop } from "@/components/common/file-drop";
import {
  DateInput,
  DateTimeInput,
  NumberInput,
  EntityPicker,
  Field,
  FieldGrid,
  OptionSelect,
  Segmented,
  TagsInput,
  type PickerOption,
} from "@/components/common/form";
import { useAppUI, type QuickAddKind, type QuickAddOptions } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPETENCY_CONFIG,
  DOCUMENT_TYPE_CONFIG,
  EMPLOYMENT_TYPE_CONFIG,
  EVENT_TYPE_CONFIG,
  FOLLOW_UP_TYPE_CONFIG,
  GOAL_PERIOD_CONFIG,
  GOAL_TYPE_CONFIG,
  INTERVIEW_TYPE_CONFIG,
  MANUAL_GOAL_TYPES,
  PRIORITY_CONFIG,
  RELATIONSHIP_CONFIG,
  RESUME_VARIANT_CONFIG,
  SOURCE_CONFIG,
  STATUS_CONFIG,
  WORK_MODE_CONFIG,
} from "@/lib/constants";
import {
  createCompany,
  createContact,
  createCoverLetter,
  createDocument,
  createEvent,
  createFollowUp,
  createGoal,
  createInterview,
  createJob,
  createResume,
  createStory,
  createTask,
  createApplication,
  findOrCreateCompany,
  getProfile,
} from "@/lib/data/actions";
import { useCollection } from "@/lib/data/hooks";
import { addDays, toDateOnly, todayDateOnly } from "@/lib/date";
import { isLocalFile, openStoredFile, removeFile } from "@/lib/data/files";
import { domainFromUrl, parseJobUrl } from "@/lib/job-url";
import type {
  ApplicationStatus,
  Competency,
  DocumentType,
  EmploymentType,
  EventType,
  FollowUpType,
  GoalPeriod,
  GoalType,
  InterviewType,
  Priority,
  Relationship,
  ResumeVariant,
  SalaryRange,
  Source,
  WorkMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Shell                                                                       */
/* -------------------------------------------------------------------------- */

const TITLES: Record<QuickAddKind, { title: string; description: string }> = {
  application: { title: "Add application", description: "Paste a job link and the rest fills itself in." },
  job: { title: "Save a job", description: "Park it here until you're ready to apply." },
  task: { title: "Add task", description: "Something you owe yourself." },
  contact: { title: "Add contact", description: "Recruiters, referrals, hiring managers." },
  company: { title: "Add company", description: "Track your whole relationship in one place." },
  interview: { title: "Schedule interview", description: "Then build the prep workspace." },
  follow_up: { title: "Schedule follow-up", description: "A nudge you won't forget to send." },
  resume: { title: "Add resume version", description: "Track which version wins replies." },
  cover_letter: { title: "Add cover letter", description: "Reusable template or a one-off." },
  document: { title: "Add document", description: "Link or upload reference." },
  goal: { title: "Set a goal", description: "Progress is measured from your real data." },
  story: { title: "Add STAR story", description: "Reusable answer for behavioural rounds." },
  event: { title: "Add event", description: "Anything that belongs on the calendar." },
};

function QuickDialog({
  children,
  onSubmit,
  submitLabel,
  disabled,
  wide,
  footerExtra,
}: {
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
  wide?: boolean;
  footerExtra?: React.ReactNode;
}) {
  const { quickAdd, closeQuickAdd } = useAppUI();
  if (!quickAdd) return null;
  const copy = TITLES[quickAdd.kind];

  return (
    <DialogContent
      className={cn("max-h-[88vh] gap-0 overflow-hidden p-0", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
      showCloseButton={false}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled) onSubmit();
        }}
        // Enter alone would submit from a textarea mid-sentence, so the
        // shortcut is the usual modifier pair instead.
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !disabled) {
            event.preventDefault();
            onSubmit();
          }
        }}
        className="flex max-h-[88vh] flex-col"
      >
        <DialogHeader className="shrink-0 gap-1 px-6 pt-6 pb-4 text-left">
          <DialogTitle className="font-runde text-base font-semibold tracking-tight">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-xs font-medium">{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-1">
          <div className="flex flex-col gap-3.5">{children}</div>
        </div>

        <DialogFooter className="shrink-0 gap-2 px-6 pt-4 pb-6 sm:justify-between">
          <div className="hidden items-center gap-2 text-[11px] font-medium text-muted-foreground sm:flex">
            {footerExtra}
            {!footerExtra && (
              <span className="flex items-center gap-1">
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd>
                to save
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeQuickAdd}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={disabled}>
              {submitLabel}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** Renders whichever quick-add the app UI has open. */
export function QuickAddDialogs() {
  const { quickAdd, closeQuickAdd } = useAppUI();

  return (
    <Dialog open={quickAdd !== null} onOpenChange={(open) => !open && closeQuickAdd()}>
      {quickAdd && <QuickAddBody kind={quickAdd.kind} options={quickAdd.options} />}
    </Dialog>
  );
}

function QuickAddBody({ kind, options }: { kind: QuickAddKind; options: QuickAddOptions }) {
  switch (kind) {
    case "application":
      return <AddApplicationForm options={options} />;
    case "job":
      return <AddJobForm options={options} />;
    case "task":
      return <AddTaskForm options={options} />;
    case "contact":
      return <AddContactForm options={options} />;
    case "company":
      return <AddCompanyForm />;
    case "interview":
      return <AddInterviewForm options={options} />;
    case "follow_up":
      return <AddFollowUpForm options={options} />;
    case "resume":
      return <AddResumeForm />;
    case "cover_letter":
      return <AddCoverLetterForm options={options} />;
    case "document":
      return <AddDocumentForm options={options} />;
    case "goal":
      return <AddGoalForm />;
    case "story":
      return <AddStoryForm />;
    case "event":
      return <AddEventForm options={options} />;
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Shared pickers                                                              */
/* -------------------------------------------------------------------------- */

function useCompanyOptions(): PickerOption[] {
  const companies = useCollection("companies");
  return React.useMemo(
    () =>
      [...companies]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((company) => ({
          value: company.id,
          label: company.name,
          sublabel: company.industry ?? company.location ?? undefined,
          icon: <CompanyAvatar name={company.name} domain={company.domain} size="xs" />,
        })),
    [companies],
  );
}

function useApplicationOptions(): PickerOption[] {
  const applications = useCollection("applications");
  const companies = useCollection("companies");
  return React.useMemo(() => {
    const byId = new Map(companies.map((company) => [company.id, company]));
    return applications
      .filter((application) => !application.archived)
      .map((application) => {
        const company = byId.get(application.companyId);
        return {
          value: application.id,
          label: application.position,
          sublabel: company?.name,
          icon: <CompanyAvatar name={company?.name ?? "?"} domain={company?.domain} size="xs" />,
        };
      });
  }, [applications, companies]);
}

function useContactOptions(): PickerOption[] {
  const contacts = useCollection("contacts");
  const companies = useCollection("companies");
  return React.useMemo(() => {
    const byId = new Map(companies.map((company) => [company.id, company]));
    return contacts.map((contact) => ({
      value: contact.id,
      label: contact.name,
      sublabel: [contact.position, contact.companyId ? byId.get(contact.companyId)?.name : null]
        .filter(Boolean)
        .join(" · "),
      icon: <PersonAvatar name={contact.name} size="xs" />,
    }));
  }, [contacts, companies]);
}

function SalaryFields({
  salary,
  onChange,
}: {
  salary: SalaryRange;
  onChange: (salary: SalaryRange) => void;
}) {
  return (
    <Field label="Salary range">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Min"
          value={salary.min ?? ""}
          onChange={(event) =>
            onChange({ ...salary, min: event.target.value ? Number(event.target.value) : null })
          }
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Max"
          value={salary.max ?? ""}
          onChange={(event) =>
            onChange({ ...salary, max: event.target.value ? Number(event.target.value) : null })
          }
          className="flex-1"
        />
        <Segmented
          size="sm"
          ariaLabel="Salary period"
          value={salary.period}
          onChange={(period) => onChange({ ...salary, period })}
          options={[
            { value: "year", label: "yr" },
            { value: "month", label: "mo" },
            { value: "hour", label: "hr" },
          ]}
        />
      </div>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Application                                                                 */
/* -------------------------------------------------------------------------- */

const APPLIED_PRESETS: ApplicationStatus[] = ["wishlist", "preparing", "applied"];

function AddApplicationForm({ options }: { options: QuickAddOptions }) {
  const router = useRouter();
  const { closeQuickAdd } = useAppUI();
  const companyOptions = useCompanyOptions();
  const resumes = useCollection("resumes");
  const applications = useCollection("applications");
  const profile = getProfile();

  const [url, setUrl] = React.useState("");
  const [companyId, setCompanyId] = React.useState<string | null>(options.companyId ?? null);
  const [companyDraft, setCompanyDraft] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [status, setStatus] = React.useState<ApplicationStatus>("applied");
  const [priority, setPriority] = React.useState<Priority>("medium");
  const [source, setSource] = React.useState<Source | null>(null);
  const [location, setLocation] = React.useState("");
  const [workMode, setWorkMode] = React.useState<WorkMode | null>(null);
  const [employmentType, setEmploymentType] = React.useState<EmploymentType | null>(null);
  const [salary, setSalary] = React.useState<SalaryRange>({
    min: null,
    max: null,
    currency: profile.currency,
    period: "year",
  });
  const [appliedAt, setAppliedAt] = React.useState<string | null>(todayDateOnly());
  const [deadline, setDeadline] = React.useState<string | null>(null);
  const [resumeId, setResumeId] = React.useState<string | null>(
    resumes.find((resume) => resume.isDefault)?.id ?? null,
  );
  const [tags, setTags] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [referral, setReferral] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [autofilled, setAutofilled] = React.useState<string[]>([]);

  const tagSuggestions = React.useMemo(
    () => [...new Set(applications.flatMap((application) => application.tags))].slice(0, 8),
    [applications],
  );

  const positionRef = React.useRef<HTMLInputElement>(null);

  /** Fills whatever the link reveals, without ever clobbering typed input. */
  const applyUrl = React.useCallback(
    (value: string) => {
      const parsed = parseJobUrl(value);
      const filled: string[] = [];

      if (parsed.company && !companyId && !companyDraft) {
        setCompanyDraft(parsed.company);
        filled.push("company");
      }
      if (parsed.position && !position) {
        setPosition(parsed.position);
        filled.push("role");
      }
      if (parsed.source && !source) {
        setSource(parsed.source);
        filled.push("source");
      }
      if (parsed.workMode && !workMode) {
        setWorkMode(parsed.workMode);
        filled.push("work mode");
      }
      setAutofilled(filled);
      if (filled.length > 0 && !position && parsed.position) {
        // Focus lands where the user still has something to do.
        requestAnimationFrame(() => positionRef.current?.focus());
      }
    },
    [companyDraft, companyId, position, source, workMode],
  );

  const resolvedCompanyName = companyId
    ? (companyOptions.find((option) => option.value === companyId)?.label ?? "")
    : companyDraft;

  const canSubmit = position.trim().length > 0 && resolvedCompanyName.trim().length > 0;

  const submit = () => {
    const application = createApplication({
      companyId: companyId ?? undefined,
      companyName: companyId ? undefined : companyDraft.trim(),
      position: position.trim(),
      jobUrl: url.trim() || null,
      location: location.trim() || null,
      workMode,
      employmentType,
      salary,
      appliedAt: status === "applied" ? appliedAt : null,
      deadline,
      status,
      priority,
      source,
      referral,
      resumeId,
      tags,
      notes: notes.trim() || null,
    });
    closeQuickAdd();
    toast.success(`${application.position} added`, {
      description: resolvedCompanyName,
      action: { label: "Open", onClick: () => router.push(`/app/applications/${application.id}`) },
    });
  };

  return (
    <QuickDialog
      onSubmit={submit}
      submitLabel="Add application"
      disabled={!canSubmit}
      footerExtra={
        autofilled.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-primary">
            <Wand2 className="size-3.5" />
            Filled {autofilled.join(", ")} from the link
          </span>
        ) : (
          <span>Only company and role are required</span>
        )
      }
    >
      <Field label="Job link" hint="Paste it and we'll pull out what we can.">
        <div className="relative">
          <Link2 className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            autoFocus
            placeholder="https://jobs.lever.co/company/role"
            onChange={(event) => {
              setUrl(event.target.value);
              if (event.target.value.length > 12) applyUrl(event.target.value);
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text");
              if (pasted) requestAnimationFrame(() => applyUrl(pasted));
            }}
            className="pl-8"
          />
        </div>
      </Field>

      <FieldGrid>
        <Field label="Company" required>
          {companyId ? (
            <EntityPicker
              value={companyId}
              onChange={setCompanyId}
              options={companyOptions}
              placeholder="Select company"
              searchPlaceholder="Search companies…"
              emptyLabel="No companies yet"
              onCreate={(name) => findOrCreateCompany(name).id}
              createLabel="Create company"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                value={companyDraft}
                placeholder="Stripe"
                onChange={(event) => setCompanyDraft(event.target.value)}
              />
              {companyOptions.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  title="Pick an existing company"
                  onClick={() => setCompanyId(companyOptions[0].value)}
                >
                  <Sparkles className="size-3.5" />
                </Button>
              )}
            </div>
          )}
        </Field>
        <Field label="Role" required>
          <Input
            ref={positionRef}
            value={position}
            placeholder="Product Engineer"
            onChange={(event) => setPosition(event.target.value)}
          />
        </Field>
      </FieldGrid>

      <Field label="Stage">
        <Segmented
          value={status}
          onChange={setStatus}
          ariaLabel="Application stage"
          options={APPLIED_PRESETS.map((value) => ({
            value,
            label: STATUS_CONFIG[value].label,
          }))}
        />
      </Field>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="cursor-pointer self-start text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          + Add salary, location, resume and more
        </button>
      ) : (
        <div className="flex flex-col gap-3.5 border-t border-border/60 pt-3.5">
          <FieldGrid>
            <Field label="Priority">
              <OptionSelect value={priority} onChange={(v) => setPriority(v ?? "medium")} options={PRIORITY_CONFIG} />
            </Field>
            <Field label="Source">
              <OptionSelect value={source} onChange={setSource} options={SOURCE_CONFIG} allowClear placeholder="Where from?" />
            </Field>
          </FieldGrid>

          <FieldGrid>
            <Field label="Location">
              <Input value={location} placeholder="Remote · EU" onChange={(event) => setLocation(event.target.value)} />
            </Field>
            <Field label="Work mode">
              <OptionSelect value={workMode} onChange={setWorkMode} options={WORK_MODE_CONFIG} allowClear placeholder="Any" />
            </Field>
          </FieldGrid>

          <SalaryFields salary={salary} onChange={setSalary} />

          <FieldGrid>
            <Field label="Employment type">
              <OptionSelect
                value={employmentType}
                onChange={setEmploymentType}
                options={EMPLOYMENT_TYPE_CONFIG}
                allowClear
                placeholder="Any"
              />
            </Field>
            <Field label="Resume used">
              <EntityPicker
                value={resumeId}
                onChange={setResumeId}
                options={resumes.map((resume) => ({
                  value: resume.id,
                  label: `${resume.name} v${resume.version}`,
                  sublabel: RESUME_VARIANT_CONFIG[resume.variant].label,
                }))}
                placeholder={resumes.length ? "Pick a version" : "No resumes yet"}
                searchPlaceholder="Search resumes…"
                emptyLabel="Add one under Resumes"
              />
            </Field>
          </FieldGrid>

          <FieldGrid>
            <Field label="Date applied">
              <DateInput value={appliedAt} onChange={setAppliedAt} />
            </Field>
            <Field label="Deadline">
              <DateInput value={deadline} onChange={setDeadline} />
            </Field>
          </FieldGrid>

          <Field label="Tags">
            <TagsInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
          </Field>

          <Field label="Notes">
            <Textarea
              value={notes}
              rows={3}
              placeholder="Why this one? Who referred you? What matters here?"
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          <CheckboxField checked={referral} onChange={setReferral}>
            This came through a referral
          </CheckboxField>
        </div>
      )}
    </QuickDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Job                                                                         */
/* -------------------------------------------------------------------------- */

function AddJobForm({ options }: { options: QuickAddOptions }) {
  const { closeQuickAdd } = useAppUI();
  const companyOptions = useCompanyOptions();
  const profile = getProfile();

  const [url, setUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [companyId, setCompanyId] = React.useState<string | null>(options.companyId ?? null);
  const [companyDraft, setCompanyDraft] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [workMode, setWorkMode] = React.useState<WorkMode | null>(null);
  const [source, setSource] = React.useState<Source | null>(null);
  const [deadline, setDeadline] = React.useState<string | null>(null);
  const [skills, setSkills] = React.useState<string[]>([]);
  const [experienceYears, setExperienceYears] = React.useState("");
  const [salary, setSalary] = React.useState<SalaryRange>({
    min: null,
    max: null,
    currency: profile.currency,
    period: "year",
  });
  const [description, setDescription] = React.useState("");

  const applyUrl = (value: string) => {
    const parsed = parseJobUrl(value);
    if (parsed.company && !companyId && !companyDraft) setCompanyDraft(parsed.company);
    if (parsed.position && !title) setTitle(parsed.position);
    if (parsed.source && !source) setSource(parsed.source);
    if (parsed.workMode && !workMode) setWorkMode(parsed.workMode);
  };

  const companyName = companyId
    ? (companyOptions.find((option) => option.value === companyId)?.label ?? "")
    : companyDraft;
  const canSubmit = title.trim().length > 0 && companyName.trim().length > 0;

  const submit = () => {
    createJob({
      title: title.trim(),
      companyId: companyId ?? undefined,
      companyName: companyId ? undefined : companyDraft.trim(),
      url: url.trim() || null,
      location: location.trim() || null,
      workMode,
      source,
      deadline,
      skills,
      salary,
      description: description.trim() || null,
      experienceYears: experienceYears ? Number(experienceYears) : null,
    });
    closeQuickAdd();
    toast.success(`${title.trim()} saved`, { description: companyName });
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Save job" disabled={!canSubmit}>
      <Field label="Job link">
        <Input
          value={url}
          autoFocus
          placeholder="https://boards.greenhouse.io/company/jobs/123"
          onChange={(event) => {
            setUrl(event.target.value);
            if (event.target.value.length > 12) applyUrl(event.target.value);
          }}
        />
      </Field>

      <FieldGrid>
        <Field label="Company" required>
          {companyId ? (
            <EntityPicker
              value={companyId}
              onChange={setCompanyId}
              options={companyOptions}
              placeholder="Select company"
              onCreate={(name) => findOrCreateCompany(name).id}
            />
          ) : (
            <Input
              value={companyDraft}
              placeholder="Linear"
              onChange={(event) => setCompanyDraft(event.target.value)}
            />
          )}
        </Field>
        <Field label="Job title" required>
          <Input value={title} placeholder="Staff Engineer" onChange={(event) => setTitle(event.target.value)} />
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Location">
          <Input value={location} placeholder="Berlin" onChange={(event) => setLocation(event.target.value)} />
        </Field>
        <Field label="Work mode">
          <OptionSelect value={workMode} onChange={setWorkMode} options={WORK_MODE_CONFIG} allowClear placeholder="Any" />
        </Field>
      </FieldGrid>

      <SalaryFields salary={salary} onChange={setSalary} />

      <FieldGrid>
        <Field label="Source">
          <OptionSelect value={source} onChange={setSource} options={SOURCE_CONFIG} allowClear placeholder="Where from?" />
        </Field>
        <Field label="Deadline">
          <DateInput value={deadline} onChange={setDeadline} />
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Years of experience">
          <Input
            type="number"
            inputMode="numeric"
            value={experienceYears}
            placeholder="5"
            onChange={(event) => setExperienceYears(event.target.value)}
          />
        </Field>
        <Field label="Skills" hint="Used for the fit score.">
          <TagsInput value={skills} onChange={setSkills} placeholder="React…" />
        </Field>
      </FieldGrid>

      <Field label="Job description" hint="Paste it here. Fit scoring reads it.">
        <Textarea
          value={description}
          rows={4}
          placeholder="Responsibilities, requirements, tech stack…"
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
    </QuickDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Task                                                                        */
/* -------------------------------------------------------------------------- */

function AddTaskForm({ options }: { options: QuickAddOptions }) {
  const { closeQuickAdd } = useAppUI();
  const applicationOptions = useApplicationOptions();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState<string | null>(options.date ?? todayDateOnly());
  const [priority, setPriority] = React.useState<Priority>("medium");
  const [applicationId, setApplicationId] = React.useState<string | null>(options.applicationId ?? null);

  const submit = () => {
    createTask({
      title: title.trim(),
      description: description.trim() || null,
      dueDate,
      priority,
      relatedType: applicationId ? "application" : null,
      relatedId: applicationId,
    });
    closeQuickAdd();
    toast.success("Task added");
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Add task" disabled={title.trim().length === 0}>
      <Field label="Task" required>
        <Input
          value={title}
          autoFocus
          placeholder="Send thank-you note to Priya"
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <FieldGrid>
        <Field label="Due">
          <DateInput value={dueDate} onChange={setDueDate} />
        </Field>
        <Field label="Priority">
          <OptionSelect value={priority} onChange={(v) => setPriority(v ?? "medium")} options={PRIORITY_CONFIG} />
        </Field>
      </FieldGrid>
      <Field label="Related application">
        <EntityPicker
          value={applicationId}
          onChange={setApplicationId}
          options={applicationOptions}
          placeholder="Not linked"
          searchPlaceholder="Search applications…"
          emptyLabel="No applications yet"
        />
      </Field>
      <Field label="Notes">
        <Textarea
          value={description}
          rows={3}
          placeholder="Anything you'll want to remember."
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
    </QuickDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Contact                                                                     */
/* -------------------------------------------------------------------------- */

function AddContactForm({ options }: { options: QuickAddOptions }) {
  const { closeQuickAdd } = useAppUI();
  const companyOptions = useCompanyOptions();

  const [name, setName] = React.useState("");
  const [companyId, setCompanyId] = React.useState<string | null>(options.companyId ?? null);
  const [position, setPosition] = React.useState("");
  const [relationship, setRelationship] = React.useState<Relationship>("recruiter");
  const [email, setEmail] = React.useState("");
  const [linkedin, setLinkedin] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");

  const submit = () => {
    createContact({
      name: name.trim(),
      companyId,
      position: position.trim() || null,
      relationship,
      email: email.trim() || null,
      linkedin: linkedin.trim() || null,
      phone: phone.trim() || null,
      nextFollowUpAt,
      notes: notes.trim() || null,
    });
    closeQuickAdd();
    toast.success(`${name.trim()} added`);
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Add contact" disabled={name.trim().length === 0}>
      <FieldGrid>
        <Field label="Name" required>
          <Input value={name} autoFocus placeholder="Priya Raman" onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Relationship">
          <OptionSelect
            value={relationship}
            onChange={(value) => setRelationship(value ?? "recruiter")}
            options={RELATIONSHIP_CONFIG}
          />
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Company">
          <EntityPicker
            value={companyId}
            onChange={setCompanyId}
            options={companyOptions}
            placeholder="Not linked"
            onCreate={(companyName) => findOrCreateCompany(companyName).id}
            createLabel="Create company"
          />
        </Field>
        <Field label="Title">
          <Input value={position} placeholder="Technical Recruiter" onChange={(event) => setPosition(event.target.value)} />
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Email">
          <Input type="email" value={email} placeholder="priya@company.com" onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="LinkedIn">
          <Input value={linkedin} placeholder="linkedin.com/in/…" onChange={(event) => setLinkedin(event.target.value)} />
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Phone">
          <Input value={phone} placeholder="+1 555 0100" onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="Next follow-up">
          <DateInput value={nextFollowUpAt} onChange={setNextFollowUpAt} />
        </Field>
      </FieldGrid>

      <Field label="Notes">
        <Textarea
          value={notes}
          rows={3}
          placeholder="How you met, what they care about."
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
    </QuickDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Company                                                                     */
/* -------------------------------------------------------------------------- */

function AddCompanyForm() {
  const { closeQuickAdd } = useAppUI();
  const [name, setName] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [careersUrl, setCareersUrl] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const submit = () => {
    createCompany({
      name: name.trim(),
      website: website.trim() || null,
      careersUrl: careersUrl.trim() || null,
      domain: domainFromUrl(website) ?? undefined,
      industry: industry.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    });
    closeQuickAdd();
    toast.success(`${name.trim()} added`);
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Add company" disabled={name.trim().length === 0}>
      <Field label="Name" required>
        <Input value={name} autoFocus placeholder="Linear" onChange={(event) => setName(event.target.value)} />
      </Field>
      <FieldGrid>
        <Field label="Website">
          <Input value={website} placeholder="linear.app" onChange={(event) => setWebsite(event.target.value)} />
        </Field>
        <Field label="Careers page">
          <Input value={careersUrl} placeholder="linear.app/careers" onChange={(event) => setCareersUrl(event.target.value)} />
        </Field>
      </FieldGrid>
      <FieldGrid>
        <Field label="Industry">
          <Input value={industry} placeholder="Developer tools" onChange={(event) => setIndustry(event.target.value)} />
        </Field>
        <Field label="Location">
          <Input value={location} placeholder="Remote" onChange={(event) => setLocation(event.target.value)} />
        </Field>
      </FieldGrid>
      <Field label="Notes">
        <Textarea value={notes} rows={3} placeholder="Why you'd want to work here." onChange={(event) => setNotes(event.target.value)} />
      </Field>
    </QuickDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Interview                                                                   */
/* -------------------------------------------------------------------------- */

function AddInterviewForm({ options }: { options: QuickAddOptions }) {
  const router = useRouter();
  const { closeQuickAdd } = useAppUI();
  const applicationOptions = useApplicationOptions();
  const contactOptions = useContactOptions();

  const defaultTime = React.useMemo(() => {
    const date = options.date ? new Date(`${options.date}T10:00`) : new Date();
    if (!options.date) {
      date.setDate(date.getDate() + 1);
      date.setHours(10, 0, 0, 0);
    }
    return date.toISOString();
  }, [options.date]);

  const [applicationId, setApplicationId] = React.useState<string | null>(options.applicationId ?? null);
  const [scheduledAt, setScheduledAt] = React.useState<string | null>(defaultTime);
  const [type, setType] = React.useState<InterviewType>("recruiter_screen");
  const [duration, setDuration] = React.useState("45");
  const [meetingUrl, setMeetingUrl] = React.useState("");
  const [interviewerIds, setInterviewerIds] = React.useState<string | null>(null);
  const [interviewerName, setInterviewerName] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const canSubmit = Boolean(applicationId && scheduledAt);

  const submit = () => {
    if (!applicationId || !scheduledAt) return;
    const interview = createInterview({
      applicationId,
      scheduledAt,
      type,
      durationMinutes: Number(duration) || 45,
      meetingUrl: meetingUrl.trim() || null,
      interviewerContactIds: interviewerIds ? [interviewerIds] : [],
      interviewerNames: interviewerName.trim() ? [interviewerName.trim()] : [],
      notes: notes.trim() || null,
    });
    closeQuickAdd();
    if (interview) {
      toast.success("Interview scheduled", {
        description: "Prep workspace is ready.",
        action: { label: "Prep", onClick: () => router.push(`/app/interviews/${interview.id}`) },
      });
    }
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Schedule" disabled={!canSubmit}>
      <Field label="Application" required>
        <EntityPicker
          value={applicationId}
          onChange={setApplicationId}
          options={applicationOptions}
          placeholder={applicationOptions.length ? "Which application?" : "Add an application first"}
          searchPlaceholder="Search applications…"
          emptyLabel="No applications yet"
          allowClear={false}
        />
      </Field>

      <Field label="When" required>
        <DateTimeInput value={scheduledAt} onChange={setScheduledAt} />
      </Field>

      <FieldGrid>
        <Field label="Duration">
          <NumberInput
            value={Number(duration) || 45}
            min={15}
            step={15}
            suffix="min"
            onChange={(next) => setDuration(String(next ?? 45))}
          />
        </Field>
        <Field label="Type">
          <OptionSelect value={type} onChange={(value) => setType(value ?? "recruiter_screen")} options={INTERVIEW_TYPE_CONFIG} />
        </Field>
      </FieldGrid>

      <Field label="Meeting link">
        <Input value={meetingUrl} placeholder="meet.google.com/…" onChange={(event) => setMeetingUrl(event.target.value)} />
      </Field>

      <FieldGrid>
        <Field label="Interviewer (contact)">
          <EntityPicker
            value={interviewerIds}
            onChange={setInterviewerIds}
            options={contactOptions}
            placeholder="Not linked"
            searchPlaceholder="Search contacts…"
            emptyLabel="No contacts yet"
          />
        </Field>
        <Field label="Interviewer name" hint="If they're not a saved contact.">
          <Input value={interviewerName} placeholder="Sam Chen" onChange={(event) => setInterviewerName(event.target.value)} />
        </Field>
      </FieldGrid>

      <Field label="Notes">
        <Textarea value={notes} rows={3} placeholder="Format, what to expect, who set it up." onChange={(event) => setNotes(event.target.value)} />
      </Field>
    </QuickDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Follow-up                                                                   */
/* -------------------------------------------------------------------------- */

function AddFollowUpForm({ options }: { options: QuickAddOptions }) {
  const { closeQuickAdd } = useAppUI();
  const applicationOptions = useApplicationOptions();
  const contactOptions = useContactOptions();
  const profile = getProfile();

  const [type, setType] = React.useState<FollowUpType>("application");
  const [applicationId, setApplicationId] = React.useState<string | null>(options.applicationId ?? null);
  const [contactId, setContactId] = React.useState<string | null>(options.contactId ?? null);
  const [dueDate, setDueDate] = React.useState<string>(
    options.date ?? toDateOnly(addDays(new Date(), profile.notifications.followUpAfterDays)),
  );
  const [channel, setChannel] = React.useState<"email" | "linkedin" | "phone" | "other">("email");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");

  const submit = () => {
    createFollowUp({ type, applicationId, contactId, dueDate, channel, subject: subject.trim() || null, message: message.trim() || null });
    closeQuickAdd();
    toast.success("Follow-up scheduled");
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Schedule" disabled={!dueDate}>
      <Field label="Type">
        <OptionSelect value={type} onChange={(value) => setType(value ?? "application")} options={FOLLOW_UP_TYPE_CONFIG} />
      </Field>
      <FieldGrid>
        <Field label="Application">
          <EntityPicker
            value={applicationId}
            onChange={setApplicationId}
            options={applicationOptions}
            placeholder="Not linked"
            searchPlaceholder="Search applications…"
            emptyLabel="No applications yet"
          />
        </Field>
        <Field label="Contact">
          <EntityPicker
            value={contactId}
            onChange={setContactId}
            options={contactOptions}
            placeholder="Not linked"
            searchPlaceholder="Search contacts…"
            emptyLabel="No contacts yet"
          />
        </Field>
      </FieldGrid>
      <FieldGrid>
        <Field label="Send on" required>
          <DateInput value={dueDate} onChange={(value) => setDueDate(value ?? todayDateOnly())} />
        </Field>
        <Field label="Channel">
          <Segmented
            value={channel}
            onChange={setChannel}
            ariaLabel="Channel"
            options={[
              { value: "email", label: "Email" },
              { value: "linkedin", label: "LinkedIn" },
              { value: "phone", label: "Phone" },
            ]}
          />
        </Field>
      </FieldGrid>
      <Field label="Subject">
        <Input value={subject} placeholder="Following up on Product Engineer" onChange={(event) => setSubject(event.target.value)} />
      </Field>
      <Field label="Draft" hint="Write it now so sending later takes one click.">
        <Textarea value={message} rows={5} placeholder="Hi Priya, just checking in on…" onChange={(event) => setMessage(event.target.value)} />
      </Field>
    </QuickDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Library items                                                               */
/* -------------------------------------------------------------------------- */

function AddResumeForm() {
  const { closeQuickAdd } = useAppUI();
  const [name, setName] = React.useState("");
  const [variant, setVariant] = React.useState<ResumeVariant>("general");
  const [version, setVersion] = React.useState(1);
  const [fileUrl, setFileUrl] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileSize, setFileSize] = React.useState<number | null>(null);
  const [notes, setNotes] = React.useState("");

  const uploaded = isLocalFile(fileUrl);

  const submit = () => {
    createResume({
      name: name.trim(),
      variant,
      version: version || 1,
      fileUrl: fileUrl.trim() || null,
      fileName,
      fileSize,
      notes: notes.trim() || null,
    });
    closeQuickAdd();
    toast.success("Resume version added");
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Add resume" disabled={name.trim().length === 0}>
      <FieldGrid>
        <Field label="Name" required>
          <Input value={name} autoFocus placeholder="Software Engineer" onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Version">
          <NumberInput value={version} min={1} onChange={(next) => setVersion(next ?? 1)} />
        </Field>
      </FieldGrid>
      <Field label="Variant">
        <OptionSelect value={variant} onChange={(value) => setVariant(value ?? "general")} options={RESUME_VARIANT_CONFIG} />
      </Field>

      <Field label="The file" hint="Upload a PDF, or paste a link to where it lives.">
        {uploaded && fileName ? (
          <FileChip
            name={fileName}
            size={fileSize}
            onOpen={() => void openStoredFile(fileUrl)}
            onRemove={() => {
              void removeFile(fileUrl);
              setFileUrl("");
              setFileName(null);
              setFileSize(null);
            }}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <FileDrop
              compact
              label="Drop a PDF, or click to choose"
              onFile={(file) => {
                setFileUrl(file.ref);
                setFileName(file.name);
                setFileSize(file.size);
                if (!name.trim()) setName(file.name.replace(/\.[a-z]+$/i, ""));
              }}
            />
            <Input
              value={fileUrl}
              placeholder="or https://docs.google.com/…"
              onChange={(event) => setFileUrl(event.target.value)}
            />
          </div>
        )}
      </Field>

      <Field label="What's different about it">
        <Textarea value={notes} rows={3} placeholder="Systems-heavy, leads with the platform work." onChange={(event) => setNotes(event.target.value)} />
      </Field>
    </QuickDialog>
  );
}

function AddCoverLetterForm({ options }: { options: QuickAddOptions }) {
  const { closeQuickAdd } = useAppUI();
  const companyOptions = useCompanyOptions();
  const [name, setName] = React.useState("");
  const [isTemplate, setIsTemplate] = React.useState(true);
  const [companyId, setCompanyId] = React.useState<string | null>(options.companyId ?? null);
  const [content, setContent] = React.useState("");

  const submit = () => {
    createCoverLetter({ name: name.trim(), isTemplate, companyId, content });
    closeQuickAdd();
    toast.success("Cover letter added");
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Add cover letter" disabled={name.trim().length === 0} wide>
      <FieldGrid>
        <Field label="Name" required>
          <Input value={name} autoFocus placeholder="Product-led template" onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Kind">
          <Segmented
            value={isTemplate ? "template" : "specific"}
            onChange={(value) => setIsTemplate(value === "template")}
            ariaLabel="Cover letter kind"
            options={[
              { value: "template", label: "Template" },
              { value: "specific", label: "Company-specific" },
            ]}
          />
        </Field>
      </FieldGrid>
      {!isTemplate && (
        <Field label="Company">
          <EntityPicker value={companyId} onChange={setCompanyId} options={companyOptions} placeholder="Which company?" />
        </Field>
      )}
      <Field label="Content" hint="Use {{company}} and {{role}} as placeholders.">
        <Textarea value={content} rows={10} placeholder="Dear hiring team at {{company}}…" onChange={(event) => setContent(event.target.value)} />
      </Field>
    </QuickDialog>
  );
}

function AddDocumentForm({ options }: { options: QuickAddOptions }) {
  const { closeQuickAdd } = useAppUI();
  const applicationOptions = useApplicationOptions();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<DocumentType>("other");
  const [url, setUrl] = React.useState("");
  const [applicationId, setApplicationId] = React.useState<string | null>(options.applicationId ?? null);
  const [notes, setNotes] = React.useState("");

  const submit = () => {
    createDocument({
      name: name.trim(),
      type,
      url: url.trim() || null,
      applicationIds: applicationId ? [applicationId] : [],
      notes: notes.trim() || null,
    });
    closeQuickAdd();
    toast.success("Document added");
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Add document" disabled={name.trim().length === 0}>
      <FieldGrid>
        <Field label="Name" required>
          <Input value={name} autoFocus placeholder="AWS certification" onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Type">
          <OptionSelect value={type} onChange={(value) => setType(value ?? "other")} options={DOCUMENT_TYPE_CONFIG} />
        </Field>
      </FieldGrid>
      <Field label="Link" required>
        <Input value={url} placeholder="https://…" onChange={(event) => setUrl(event.target.value)} />
      </Field>
      <Field label="Attach to application">
        <EntityPicker
          value={applicationId}
          onChange={setApplicationId}
          options={applicationOptions}
          placeholder="Not attached"
          searchPlaceholder="Search applications…"
          emptyLabel="No applications yet"
        />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} rows={2} onChange={(event) => setNotes(event.target.value)} />
      </Field>
    </QuickDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Goal & story                                                                */
/* -------------------------------------------------------------------------- */

function AddGoalForm() {
  const { closeQuickAdd } = useAppUI();
  const [type, setType] = React.useState<GoalType>("applications");
  const [target, setTarget] = React.useState("15");
  const [period, setPeriod] = React.useState<GoalPeriod>("week");
  const [label, setLabel] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const manual = MANUAL_GOAL_TYPES.includes(type);

  const submit = () => {
    createGoal({
      type,
      target: Number(target) || 1,
      period,
      label: label.trim() || GOAL_TYPE_CONFIG[type].label,
      notes: notes.trim() || null,
      manualProgress: manual ? 0 : null,
    });
    closeQuickAdd();
    toast.success("Goal set");
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Set goal" disabled={!target}>
      <Field label="What are you tracking">
        <OptionSelect value={type} onChange={(value) => setType(value ?? "applications")} options={GOAL_TYPE_CONFIG} />
      </Field>
      <FieldGrid>
        <Field label="Target" required>
          <Input type="number" inputMode="numeric" value={target} autoFocus onChange={(event) => setTarget(event.target.value)} />
        </Field>
        <Field label="Per">
          <OptionSelect value={period} onChange={(value) => setPeriod(value ?? "week")} options={GOAL_PERIOD_CONFIG} />
        </Field>
      </FieldGrid>
      <Field label="Label" hint={manual ? "Progress on this one is entered by hand." : "Progress is measured from your data."}>
        <Input value={label} placeholder={GOAL_TYPE_CONFIG[type].label} onChange={(event) => setLabel(event.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} rows={2} onChange={(event) => setNotes(event.target.value)} />
      </Field>
    </QuickDialog>
  );
}

function AddStoryForm() {
  const { closeQuickAdd } = useAppUI();
  const [title, setTitle] = React.useState("");
  const [situation, setSituation] = React.useState("");
  const [task, setTask] = React.useState("");
  const [action, setAction] = React.useState("");
  const [result, setResult] = React.useState("");
  const [competencies, setCompetencies] = React.useState<Competency[]>([]);

  const submit = () => {
    createStory({ title: title.trim(), situation, task, action, result, competencies });
    closeQuickAdd();
    toast.success("Story saved to your bank");
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Save story" disabled={title.trim().length === 0} wide>
      <Field label="Title" required>
        <Input value={title} autoFocus placeholder="Rescued the migration nobody owned" onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <Field label="Competencies" hint="Tag it so you can find it mid-interview.">
        <div className="flex flex-wrap gap-1.5">
          {Object.values(COMPETENCY_CONFIG).map((option) => {
            const active = competencies.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setCompetencies(
                    active
                      ? competencies.filter((item) => item !== option.value)
                      : [...competencies, option.value],
                  )
                }
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-200",
                  active
                    ? "border-primary/40 bg-primary/15 text-foreground"
                    : "border-border/70 text-muted-foreground hover:bg-foreground/[0.045] hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Situation">
        <Textarea value={situation} rows={2} placeholder="Where were you, what was going on?" onChange={(event) => setSituation(event.target.value)} />
      </Field>
      <Field label="Task">
        <Textarea value={task} rows={2} placeholder="What were you responsible for?" onChange={(event) => setTask(event.target.value)} />
      </Field>
      <Field label="Action">
        <Textarea value={action} rows={3} placeholder="What did you actually do?" onChange={(event) => setAction(event.target.value)} />
      </Field>
      <Field label="Result" hint="Numbers make this land.">
        <Textarea value={result} rows={2} placeholder="Cut deploy time 40%, shipped two weeks early." onChange={(event) => setResult(event.target.value)} />
      </Field>
    </QuickDialog>
  );
}

function AddEventForm({ options }: { options: QuickAddOptions }) {
  const { closeQuickAdd } = useAppUI();
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<EventType>("networking");
  const [startAt, setStartAt] = React.useState<string | null>(
    options.date ? new Date(`${options.date}T10:00`).toISOString() : new Date().toISOString(),
  );
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const submit = () => {
    if (!startAt) return;
    createEvent({ title: title.trim(), type, startAt, location: location.trim() || null, notes: notes.trim() || null });
    closeQuickAdd();
    toast.success("Added to calendar");
  };

  return (
    <QuickDialog onSubmit={submit} submitLabel="Add event" disabled={title.trim().length === 0 || !startAt}>
      <Field label="Title" required>
        <Input value={title} autoFocus placeholder="Coffee with Dana" onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <FieldGrid>
        <Field label="Type">
          <OptionSelect value={type} onChange={(value) => setType(value ?? "custom")} options={EVENT_TYPE_CONFIG} />
        </Field>
        <Field label="When" required>
          <DateTimeInput value={startAt} onChange={setStartAt} />
        </Field>
      </FieldGrid>
      <Field label="Location or link">
        <Input value={location} placeholder="Blue Bottle, Hayes Valley" onChange={(event) => setLocation(event.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} rows={2} onChange={(event) => setNotes(event.target.value)} />
      </Field>
    </QuickDialog>
  );
}
