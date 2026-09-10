"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  Plus,
  Star,
  Trash2,
  Video,
  X,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { InterviewStatusBadge, InterviewTypeBadge } from "@/components/common/badges";
import { CompanyAvatar, PersonAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { DateTimeInput, EntityPicker, NumberInput, OptionSelect, Segmented } from "@/components/common/form";
import { DetailRow, NoteEditor } from "@/components/common/inline-edit";
import { ListSkeleton } from "@/components/common/loading";
import { SectionHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import {
  COMPETENCY_CONFIG,
  INTERVIEW_STATUS_CONFIG,
  INTERVIEW_TYPE_CONFIG,
} from "@/lib/constants";
import { deleteInterview, updateInterview, updatePrep } from "@/lib/data/actions";
import { useCollection, useRecord, useStoreStatus } from "@/lib/data/hooks";
import { newId } from "@/lib/data/store";
import { formatDateTime, formatDuration, formatSmartDate } from "@/lib/date";
import type { PrepQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "prep" | "company" | "role" | "questions" | "stories" | "debrief";

export default function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const status = useStoreStatus();
  const { deleteWithUndo } = useAppUI();

  const interview = useRecord("interviews", id);
  const companies = useCollection("companies");
  const contacts = useCollection("contacts");
  const stories = useCollection("stories");
  const applications = useCollection("applications");

  const [tab, setTab] = React.useState<Tab>("company");

  if (status.status !== "ready") return <ListSkeleton rows={6} />;

  if (!interview) {
    return (
      <Surface className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={Video}
          title="This interview is gone"
          description="It may have been deleted."
          action={{ label: "Back to interviews", href: "/app/interviews" }}
        />
      </Surface>
    );
  }

  const company = companies.find((item) => item.id === interview.companyId) ?? null;
  const application = applications.find((item) => item.id === interview.applicationId) ?? null;
  const prep = interview.prep;
  const interviewers = interview.interviewerContactIds
    .map((contactId) => contacts.find((contact) => contact.id === contactId))
    .filter(Boolean);

  const setPrep = (patch: Parameters<typeof updatePrep>[1]) => updatePrep(interview.id, patch);

  const updateQuestions = (
    key: "questionsToAsk" | "expectedQuestions",
    next: PrepQuestion[],
  ) => setPrep({ [key]: next });

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Link
        href="/app/interviews"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Interviews
      </Link>

      {/* Header ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-start gap-3">
        <CompanyAvatar name={company?.name ?? "?"} domain={company?.domain} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/companies/${interview.companyId}`}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {company?.name ?? "Unknown company"}
            </Link>
            <span className="text-muted-foreground/40">·</span>
            {application ? (
              <Link
                href={`/app/applications/${application.id}`}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {interview.position}
              </Link>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">{interview.position}</span>
            )}
          </div>
          <h1 className="mt-0.5 font-runde text-xl font-semibold tracking-tight sm:text-2xl">
            Round {interview.round} · {INTERVIEW_TYPE_CONFIG[interview.type].label}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <InterviewTypeBadge type={interview.type} />
            <InterviewStatusBadge status={interview.status} />
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatDateTime(interview.scheduledAt)} · {formatDuration(interview.durationMinutes)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {interview.meetingUrl && (
            <Button
              variant="primary"
              size="sm"
              href={interview.meetingUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink className="size-3.5" />
              Join
            </Button>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Delete interview"
            onClick={() => {
              deleteWithUndo(deleteInterview(interview.id));
              router.push("/app/interviews");
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Details ----------------------------------------------------------- */}
      <Surface className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4">
        <DetailRow label="When">
          <DateTimeInput
            value={interview.scheduledAt}
            onChange={(value) => value && updateInterview(interview.id, { scheduledAt: value })}
            className="h-8 text-xs"
          />
        </DetailRow>
        <DetailRow label="Duration">
          <NumberInput
            value={interview.durationMinutes}
            min={15}
            step={15}
            suffix="min"
            onChange={(next) => updateInterview(interview.id, { durationMinutes: next ?? 45 })}
            className="h-8"
          />
        </DetailRow>
        <DetailRow label="Type">
          <OptionSelect
            size="sm"
            value={interview.type}
            onChange={(value) => value && updateInterview(interview.id, { type: value })}
            options={INTERVIEW_TYPE_CONFIG}
          />
        </DetailRow>
        <DetailRow label="Status">
          <OptionSelect
            size="sm"
            value={interview.status}
            onChange={(value) => value && updateInterview(interview.id, { status: value })}
            options={INTERVIEW_STATUS_CONFIG}
          />
        </DetailRow>
        <DetailRow label="Meeting link" className="col-span-2">
          <Input
            value={interview.meetingUrl ?? ""}
            placeholder="https://meet.google.com/…"
            onChange={(event) =>
              updateInterview(interview.id, { meetingUrl: event.target.value || null })
            }
            className="h-8 text-xs"
          />
        </DetailRow>
        <DetailRow label="Interviewers" className="col-span-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {interviewers.map(
              (contact) =>
                contact && (
                  <Link
                    key={contact.id}
                    href={`/app/contacts/${contact.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.05] py-0.5 pr-2 pl-0.5 text-xs font-medium transition-colors hover:bg-foreground/[0.08]"
                  >
                    <PersonAvatar name={contact.name} size="xs" />
                    {contact.name}
                  </Link>
                ),
            )}
            {interview.interviewerNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.05] py-0.5 pr-2 pl-0.5 text-xs font-medium"
              >
                <PersonAvatar name={name} size="xs" />
                {name}
              </span>
            ))}
            <EntityPicker
              value={null}
              onChange={(contactId) => {
                if (!contactId) return;
                updateInterview(interview.id, {
                  interviewerContactIds: [
                    ...new Set([...interview.interviewerContactIds, contactId]),
                  ],
                });
              }}
              options={contacts
                .filter((contact) => !interview.interviewerContactIds.includes(contact.id))
                .map((contact) => ({
                  value: contact.id,
                  label: contact.name,
                  sublabel: contact.position ?? undefined,
                }))}
              placeholder="Add"
              allowClear={false}
              className="h-7 w-32 text-xs"
            />
          </div>
        </DetailRow>
      </Surface>

      {/* Prep workspace ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-runde text-base font-semibold tracking-tight">Prep workspace</h2>
        <Segmented
          value={tab}
          onChange={setTab}
          ariaLabel="Prep section"
          options={[
            { value: "company", label: "Company" },
            { value: "role", label: "Role" },
            { value: "questions", label: "Questions" },
            { value: "stories", label: "Stories" },
            { value: "debrief", label: "Debrief" },
          ]}
        />
      </div>

      {tab === "company" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <PrepField
            label="Company overview"
            hint="What do they do, how do they make money, how big are they?"
            value={prep.companyOverview}
            onCommit={(companyOverview) => setPrep({ companyOverview })}
          />
          <PrepField
            label="Products"
            hint="What have you actually used? Have an opinion ready."
            value={prep.products}
            onCommit={(products) => setPrep({ products })}
          />
          <PrepField
            label="Competitors"
            hint="Who else is in this space, and why this one?"
            value={prep.competitors}
            onCommit={(competitors) => setPrep({ competitors })}
          />
          <PrepField
            label="Recent news"
            hint="Funding, launches, layoffs, anything from the last six months."
            value={prep.recentNews}
            onCommit={(recentNews) => setPrep({ recentNews })}
          />
          <PrepField
            label="Culture notes"
            hint="How they work, what they say they value, what people report."
            value={prep.cultureNotes}
            onCommit={(cultureNotes) => setPrep({ cultureNotes })}
            className="lg:col-span-2"
          />
          {company && (
            <Surface className="flex flex-wrap items-center gap-3 p-3 lg:col-span-2">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <p className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                Company notes and your full history with {company.name} live on their page.
              </p>
              <Button variant="outline" size="xs" href={`/app/companies/${company.id}`}>
                Open {company.name}
              </Button>
            </Surface>
          )}
        </div>
      )}

      {tab === "role" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <PrepField
            label="Responsibilities"
            hint="What will you actually be doing day to day?"
            value={prep.responsibilities}
            onCommit={(responsibilities) => setPrep({ responsibilities })}
          />
          <PrepField
            label="Required skills"
            hint="What they listed, and where you're strong or thin."
            value={prep.requiredSkills}
            onCommit={(requiredSkills) => setPrep({ requiredSkills })}
          />
          <PrepField
            label="Technologies"
            hint="Their stack. Note anything you'd need to brush up on."
            value={prep.technologies}
            onCommit={(technologies) => setPrep({ technologies })}
          />
          <PrepField
            label="Key requirements"
            hint="The two or three things this hire really turns on."
            value={prep.keyRequirements}
            onCommit={(keyRequirements) => setPrep({ keyRequirements })}
          />
        </div>
      )}

      {tab === "questions" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <QuestionList
            title="Questions to ask them"
            hint="Good questions are the cheapest signal you can send."
            questions={prep.questionsToAsk}
            onChange={(next) => updateQuestions("questionsToAsk", next)}
            placeholder="How do you decide what not to build?"
            suggestions={QUESTION_SUGGESTIONS}
          />
          <QuestionList
            title="Questions they'll ask you"
            hint="Write the answer down once and it stops being scary."
            questions={prep.expectedQuestions}
            onChange={(next) => updateQuestions("expectedQuestions", next)}
            placeholder="Walk me through a system you designed."
            withAnswers
            suggestions={EXPECTED_SUGGESTIONS[interview.type] ?? []}
          />
        </div>
      )}

      {tab === "stories" && (
        <Surface className="overflow-hidden">
          <SectionHeader
            title="STAR stories for this round"
            count={prep.storyIds.length}
            action={
              <Button variant="ghost" size="xs" href="/app/stories">
                Manage bank
              </Button>
            }
            className="border-b border-foreground/[0.06]"
          />
          {stories.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Your story bank is empty"
              description="Write three or four STAR stories once and reuse them in every behavioural round."
              action={{ label: "Build your story bank", href: "/app/stories" }}
              compact
            />
          ) : (
            <ul className="divide-y divide-foreground/[0.05]">
              {stories.map((story) => {
                const attached = prep.storyIds.includes(story.id);
                return (
                  <li key={story.id} className="flex items-start gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPrep({
                          storyIds: attached
                            ? prep.storyIds.filter((storyId) => storyId !== story.id)
                            : [...prep.storyIds, story.id],
                        })
                      }
                      aria-label={attached ? `Remove ${story.title}` : `Attach ${story.title}`}
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border transition-colors duration-200",
                        attached
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-foreground/25 hover:border-primary",
                      )}
                    >
                      {attached && <Check className="size-2.5" strokeWidth={3} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{story.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {story.result || story.situation}
                      </p>
                      {story.competencies.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {story.competencies.map((competency) => (
                            <span
                              key={competency}
                              className="rounded-full border border-foreground/[0.07] bg-foreground/[0.035] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              {COMPETENCY_CONFIG[competency].label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {story.favorite && <Star className="size-3.5 shrink-0 fill-primary text-primary" />}
                  </li>
                );
              })}
            </ul>
          )}
        </Surface>
      )}

      {tab === "debrief" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Surface className="overflow-hidden">
            <SectionHeader title="How did it go?" className="border-b border-foreground/[0.06]" />
            <div className="flex flex-col gap-3 p-4">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                  Your read
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateInterview(interview.id, {
                          rating: interview.rating === value ? null : value,
                        })
                      }
                      aria-label={`Rate ${value} out of 5`}
                      className="cursor-pointer p-0.5 transition-transform duration-200 hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "size-5",
                          (interview.rating ?? 0) >= value
                            ? "fill-primary text-primary"
                            : "text-foreground/20",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                  Feedback &amp; what you&rsquo;d change
                </p>
                <NoteEditor
                  value={interview.feedback ?? ""}
                  onCommit={(feedback) => updateInterview(interview.id, { feedback: feedback || null })}
                  placeholder="What did they dig into? What did you fumble? What would you say differently?"
                  rows={7}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["passed", "failed", "completed"] as const).map((next) => (
                  <Button
                    key={next}
                    variant={interview.status === next ? "primary" : "outline"}
                    size="sm"
                    onClick={() => {
                      updateInterview(interview.id, { status: next });
                      toast.success(`Marked as ${next}`);
                    }}
                  >
                    {INTERVIEW_STATUS_CONFIG[next].label}
                  </Button>
                ))}
              </div>
            </div>
          </Surface>

          <Surface className="overflow-hidden">
            <SectionHeader title="Notes" className="border-b border-foreground/[0.06]" />
            <div className="p-4">
              <NoteEditor
                value={interview.notes ?? ""}
                onCommit={(notes) => updateInterview(interview.id, { notes: notes || null })}
                placeholder="Logistics, names, anything the recruiter told you about the format."
                rows={12}
              />
            </div>
          </Surface>
        </div>
      )}

      <p className="px-1 text-[11px] font-medium text-muted-foreground">
        Scheduled {formatSmartDate(interview.createdAt)}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Prep pieces                                                                 */
/* -------------------------------------------------------------------------- */

function PrepField({
  label,
  hint,
  value,
  onCommit,
  className,
}: {
  label: string;
  hint: string;
  value: string;
  onCommit: (value: string) => void;
  className?: string;
}) {
  return (
    <Surface className={cn("overflow-hidden", className)}>
      <div className="border-b border-foreground/[0.06] px-4 py-2.5">
        <h3 className="font-runde text-sm font-semibold tracking-tight">{label}</h3>
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{hint}</p>
      </div>
      <div className="p-3">
        <NoteEditor value={value} onCommit={onCommit} placeholder="Nothing here yet…" rows={5} />
      </div>
    </Surface>
  );
}

function QuestionList({
  title,
  hint,
  questions,
  onChange,
  placeholder,
  withAnswers = false,
  suggestions = [],
}: {
  title: string;
  hint: string;
  questions: PrepQuestion[];
  onChange: (questions: PrepQuestion[]) => void;
  placeholder: string;
  withAnswers?: boolean;
  suggestions?: string[];
}) {
  const [draft, setDraft] = React.useState("");
  const [openAnswer, setOpenAnswer] = React.useState<string | null>(null);

  const add = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    onChange([...questions, { id: newId(), text: clean, done: false }]);
    setDraft("");
  };

  const unused = suggestions.filter(
    (suggestion) => !questions.some((question) => question.text === suggestion),
  );

  return (
    <Surface className="flex flex-col overflow-hidden">
      <div className="border-b border-foreground/[0.06] px-4 py-2.5">
        <h3 className="font-runde text-sm font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{hint}</p>
      </div>

      <ul className="divide-y divide-foreground/[0.05]">
        {questions.map((question) => (
          <li key={question.id} className="group px-4 py-2.5">
            <div className="flex items-start gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onChange(
                    questions.map((item) =>
                      item.id === question.id ? { ...item, done: !item.done } : item,
                    ),
                  )
                }
                aria-label={question.done ? "Mark as not ready" : "Mark as ready"}
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-200",
                  question.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-foreground/25 hover:border-primary",
                )}
              >
                {question.done && <Check className="size-2.5" strokeWidth={3} />}
              </button>
              <button
                type="button"
                onClick={() =>
                  withAnswers && setOpenAnswer(openAnswer === question.id ? null : question.id)
                }
                className={cn(
                  "min-w-0 flex-1 text-left text-xs leading-5 font-medium",
                  withAnswers && "cursor-pointer",
                  question.done && "text-muted-foreground line-through",
                )}
              >
                {question.text}
                {withAnswers && question.answer && !openAnswer && (
                  <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
                    {question.answer}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onChange(questions.filter((item) => item.id !== question.id))}
                aria-label="Remove question"
                className="cursor-pointer text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            {withAnswers && openAnswer === question.id && (
              <div className="mt-2 pl-6">
                <NoteEditor
                  value={question.answer ?? ""}
                  onCommit={(answer) =>
                    onChange(
                      questions.map((item) =>
                        item.id === question.id ? { ...item, answer } : item,
                      ),
                    )
                  }
                  placeholder="Draft your answer. Two or three sentences is plenty."
                  rows={4}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-foreground/[0.06] p-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            add(draft);
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={draft}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            className="h-8 text-xs"
          />
          <Button type="submit" variant="outline" size="icon-sm" aria-label="Add question">
            <Plus className="size-3.5" />
          </Button>
        </form>

        {unused.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/70">
              <Lightbulb className="size-3" />
              Suggestions
            </span>
            {unused.slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => add(suggestion)}
                className="cursor-pointer rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </Surface>
  );
}

const QUESTION_SUGGESTIONS = [
  "What does the first 90 days look like?",
  "How do you decide what not to build?",
  "Where does this team disagree most often?",
  "What would make you regret this hire in six months?",
  "How does work actually get prioritised here?",
];

const EXPECTED_SUGGESTIONS: Partial<Record<string, string[]>> = {
  behavioral: [
    "Tell me about a time you disagreed with a decision.",
    "Describe a project that failed.",
    "When have you had to influence without authority?",
  ],
  technical: [
    "Walk me through a system you built end to end.",
    "How would you debug a slow endpoint?",
  ],
  system_design: [
    "Design a rate limiter.",
    "How would you scale this to 10x traffic?",
  ],
  manager: [
    "What kind of manager do you work best with?",
    "How do you handle competing priorities?",
  ],
  recruiter_screen: [
    "Why are you looking to leave?",
    "What are you looking for in your next role?",
    "What are your salary expectations?",
  ],
};
