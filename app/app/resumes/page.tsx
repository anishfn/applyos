"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, FileText, NotebookPen, Plus, Star, Trash2 } from "@/components/ui/icons";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { FileChip, FileDrop } from "@/components/common/file-drop";
import { OptionSelect } from "@/components/common/form";
import { InlineText, NoteEditor } from "@/components/common/inline-edit";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { ProgressBar } from "@/components/common/charts";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { RESUME_VARIANT_CONFIG } from "@/lib/constants";
import { computeBreakdown } from "@/lib/analytics";
import { createResume, deleteResume, updateResume } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { isLocalFile, openStoredFile, removeFile } from "@/lib/data/files";
import { formatSmartDate } from "@/lib/date";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ResumesPage() {
  const status = useStoreStatus();
  const { openQuickAdd, deleteWithUndo } = useAppUI();

  const resumes = useCollection("resumes");
  const applications = useCollection("applications");
  const companies = useCollection("companies");
  const interviews = useCollection("interviews");
  const activities = useCollection("activities");
  const contacts = useCollection("contacts");
  const followUps = useCollection("followUps");

  const performance = React.useMemo(
    () =>
      new Map(
        computeBreakdown(
          { applications, interviews, activities, companies, contacts, followUps, resumes },
          "resume",
          "all",
        ).map((entry) => [entry.key, entry]),
      ),
    [applications, interviews, activities, companies, contacts, followUps, resumes],
  );

  /** A dropped file is enough to create a version: name it after the file. */
  const addFromFile = (file: { ref: string; name: string; size: number }) => {
    const name = file.name.replace(/\.[a-z]+$/i, "");
    createResume({ name, fileUrl: file.ref, fileName: file.name, fileSize: file.size });
    toast.success(`${name} added`, { description: "Set the variant and notes whenever you like." });
  };

  if (status.status !== "ready") return <ListSkeleton rows={4} />;

  const best = [...performance.values()]
    .filter((entry) => entry.key !== "none" && entry.total >= 4)
    .sort((a, b) => (b.responseRate ?? 0) - (a.responseRate ?? 0))[0];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Resumes"
        description="Track which version you sent where, and which one actually gets replies."
        actions={
          <Button variant="primary" size="sm" onClick={() => openQuickAdd("resume")}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add version</span>
          </Button>
        }
      />

      {best && (
        <Surface className="flex flex-wrap items-center gap-3 p-3">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-ink">
            <Star className="size-3.5" />
          </span>
          <p className="min-w-0 flex-1 text-xs font-medium">
            <span className="font-semibold">{best.label}</span> has the highest response rate at{" "}
            {formatPercent(best.responseRate ?? 0)} across {best.total} applications.
          </p>
          <Button variant="ghost" size="xs" href="/app/analytics">
            See the breakdown
          </Button>
        </Surface>
      )}

      {resumes.length === 0 ? (
        <Surface className="flex flex-1 flex-col items-center justify-center gap-5 p-8">
          <EmptyState
            icon={NotebookPen}
            title="No resume versions yet"
            description="Most people have three or four: a general one, and tailored versions per role type. Track them here and ApplyOS tells you which one performs."
          />
          <div className="w-full max-w-md">
            <FileDrop
              label="Drop a PDF here to add your first version"
              hint="Or paste a Google Drive link after you add it. Files stay in this browser."
              onFile={addFromFile}
            />
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => openQuickAdd("resume")}>
                <Plus className="size-4" />
                Add a version by hand
              </Button>
            </div>
          </div>
        </Surface>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <FileDrop
            compact
            className="lg:col-span-2"
            label="Drop a PDF to add another version"
            hint="Files are stored in this browser, not uploaded anywhere."
            onFile={addFromFile}
          />
          {resumes.map((resume) => {
            const stats = performance.get(resume.id);
            const used = applications.filter((application) => application.resumeId === resume.id);

            return (
              <Surface key={resume.id} className="overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/[0.05] text-muted-foreground">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <InlineText
                        value={resume.name}
                        onCommit={(name) => name && updateResume(resume.id, { name })}
                        ariaLabel="resume name"
                        className="-ml-1.5 w-auto font-runde"
                      />
                      <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                        v{resume.version}
                      </span>
                      {resume.isDefault && (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-ink">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 px-1.5 text-[11px] font-medium text-muted-foreground">
                      Created {formatSmartDate(resume.createdAt)} · updated{" "}
                      {formatSmartDate(resume.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {resume.fileUrl && !isLocalFile(resume.fileUrl) && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        href={resume.fileUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label="Open resume"
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={resume.isDefault ? "Already default" : "Make default"}
                      onClick={() => {
                        updateResume(resume.id, { isDefault: true });
                        toast.success(`${resume.name} is now your default`);
                      }}
                    >
                      <Star className={cn("size-3.5", resume.isDefault && "fill-primary text-primary")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete ${resume.name}`}
                      onClick={() => deleteWithUndo(deleteResume(resume.id))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="px-4 pb-3">
                  {resume.fileUrl && isLocalFile(resume.fileUrl) ? (
                    <FileChip
                      name={resume.fileName ?? "Resume.pdf"}
                      size={resume.fileSize}
                      onOpen={() => {
                        void openStoredFile(resume.fileUrl!).then((found) => {
                          if (!found) toast.error("That file is no longer in this browser");
                        });
                      }}
                      onRemove={() => {
                        void removeFile(resume.fileUrl!);
                        updateResume(resume.id, { fileUrl: null, fileName: null, fileSize: null });
                      }}
                    />
                  ) : resume.fileUrl ? (
                    <a
                      href={resume.fileUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="size-3" />
                      {resume.fileUrl.replace(/^https?:\/\//, "").slice(0, 48)}
                    </a>
                  ) : (
                    <FileDrop
                      compact
                      label="Attach the PDF"
                      onFile={(file) =>
                        updateResume(resume.id, {
                          fileUrl: file.ref,
                          fileName: file.name,
                          fileSize: file.size,
                        })
                      }
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 px-4 pb-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Variant
                    </p>
                    <div className="mt-1">
                      <OptionSelect
                        size="sm"
                        value={resume.variant}
                        onChange={(variant) => variant && updateResume(resume.id, { variant })}
                        options={RESUME_VARIANT_CONFIG}
                      />
                    </div>
                  </div>
                  <Stat label="Sent with" value={used.length} />
                  <Stat
                    label="Responses"
                    value={stats?.responded ?? 0}
                    hint={stats?.responseRate != null ? formatPercent(stats.responseRate) : undefined}
                  />
                  <Stat label="Interviews" value={stats?.interviewed ?? 0} />
                </div>

                {stats && stats.total > 0 && (
                  <div className="px-4 pb-3">
                    <ProgressBar value={(stats.responseRate ?? 0) || 0} />
                  </div>
                )}

                <div className="border-t border-foreground/[0.06] p-3">
                  <NoteEditor
                    value={resume.notes ?? ""}
                    onCommit={(notes) => updateResume(resume.id, { notes: notes || null })}
                    placeholder="What's different about this version? When do you send it?"
                    rows={2}
                  />
                </div>

                {used.length > 0 && (
                  <div className="border-t border-foreground/[0.06]">
                    <SectionHeader title="Sent with" count={used.length} />
                    <ul className="max-h-40 overflow-y-auto pb-2">
                      {used.slice(0, 8).map((application) => {
                        const company = companies.find((item) => item.id === application.companyId);
                        return (
                          <li key={application.id}>
                            <Link
                              href={`/app/applications/${application.id}`}
                              className="flex items-center gap-2 px-4 py-1.5 text-xs transition-colors duration-200 hover:bg-foreground/[0.025]"
                            >
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {application.position}
                              </span>
                              <span className="shrink-0 truncate text-muted-foreground">
                                {company?.name}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-runde text-lg leading-none font-semibold tabular-nums">
        {value}
        {hint && <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">{hint}</span>}
      </p>
    </div>
  );
}
