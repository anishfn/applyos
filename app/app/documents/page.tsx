"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Files, Plus, Search, Trash2 } from "@/components/ui/icons";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { OptionSelect, Segmented } from "@/components/common/form";
import { InlineText } from "@/components/common/inline-edit";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { DOCUMENT_TYPE_CONFIG, TONE_DOT } from "@/lib/constants";
import { deleteCoverLetter, deleteDocument, updateCoverLetter, updateDocument } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { formatSmartDate } from "@/lib/date";
import type { DocumentType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "documents" | "cover_letters";

export default function DocumentsPage() {
  const status = useStoreStatus();
  const { openQuickAdd, deleteWithUndo } = useAppUI();

  const documents = useCollection("documents");
  const coverLetters = useCollection("coverLetters");
  const applications = useCollection("applications");
  const companies = useCollection("companies");

  const [tab, setTab] = React.useState<Tab>("documents");
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<DocumentType | "all">("all");

  const visibleDocuments = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents
      .filter((document) => (type === "all" ? true : document.type === type))
      .filter((document) =>
        needle
          ? `${document.name} ${document.notes ?? ""} ${document.tags.join(" ")}`
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [documents, query, type]);

  if (status.status !== "ready") return <ListSkeleton rows={5} />;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Documents"
        description="Portfolios, certificates, references and every cover letter you've written."
        actions={
          <>
            <Segmented
              value={tab}
              onChange={setTab}
              ariaLabel="Library section"
              options={[
                { value: "documents", label: "Documents" },
                { value: "cover_letters", label: "Cover letters" },
              ]}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => openQuickAdd(tab === "documents" ? "document" : "cover_letter")}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </>
        }
      >
        {tab === "documents" && documents.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1 sm:max-w-72">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Search documents…"
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <OptionSelect
              size="sm"
              value={type === "all" ? null : type}
              onChange={(value) => setType(value ?? "all")}
              options={DOCUMENT_TYPE_CONFIG}
              allowClear
              placeholder="All types"
              className="h-8 w-40 text-xs"
            />
          </div>
        )}
      </PageHeader>

      {tab === "documents" ? (
        documents.length === 0 ? (
          <Surface className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={Files}
              title="Nothing in the library"
              description="Keep links to your portfolio, certificates, references and transcripts here, and attach them to applications in one click."
              action={{ label: "Add a document", onClick: () => openQuickAdd("document") }}
            />
          </Surface>
        ) : visibleDocuments.length === 0 ? (
          <Surface className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={Search}
              title="Nothing matches"
              description="Try a different name or type."
              action={{ label: "Clear filters", onClick: () => { setQuery(""); setType("all"); } }}
            />
          </Surface>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleDocuments.map((document) => {
              const config = DOCUMENT_TYPE_CONFIG[document.type];
              const linked = applications.filter((application) =>
                document.applicationIds.includes(application.id),
              );
              return (
                <Surface key={document.id} className="flex flex-col p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE_DOT[config.tone])} />
                    <div className="min-w-0 flex-1">
                      <InlineText
                        value={document.name}
                        onCommit={(name) => name && updateDocument(document.id, { name })}
                        ariaLabel="document name"
                        className="-ml-1.5 font-runde"
                      />
                      <p className="px-1.5 text-[11px] font-medium text-muted-foreground">
                        {config.label} · added {formatSmartDate(document.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {document.url && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          href={document.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={`Open ${document.name}`}
                        >
                          <ExternalLink className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Delete ${document.name}`}
                        onClick={() => deleteWithUndo(deleteDocument(document.id))}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {document.notes && (
                    <p className="mt-2 px-1.5 text-xs leading-5 font-medium text-muted-foreground">
                      {document.notes}
                    </p>
                  )}

                  {linked.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1 border-t border-foreground/[0.05] pt-2.5">
                      {linked.map((application) => {
                        const company = companies.find((item) => item.id === application.companyId);
                        return (
                          <Link
                            key={application.id}
                            href={`/app/applications/${application.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.045] py-0.5 pr-2 pl-0.5 text-[11px] font-medium transition-colors hover:bg-foreground/[0.075]"
                          >
                            <CompanyAvatar name={company?.name ?? "?"} domain={company?.domain} size="xs" />
                            {company?.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </Surface>
              );
            })}
          </div>
        )
      ) : coverLetters.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Files}
            title="No cover letters yet"
            description="Write one good template with {{company}} and {{role}} placeholders, and tailoring takes two minutes instead of an hour."
            action={{ label: "Add a cover letter", onClick: () => openQuickAdd("cover_letter") }}
          />
        </Surface>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {coverLetters.map((letter) => {
            const company = companies.find((item) => item.id === letter.companyId);
            return (
              <Surface key={letter.id} className="overflow-hidden">
                <SectionHeader
                  title={
                    <span className="flex items-center gap-2">
                      {letter.name}
                      <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                        v{letter.version}
                      </span>
                      {letter.isTemplate && (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-ink">
                          Template
                        </span>
                      )}
                    </span>
                  }
                  action={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete ${letter.name}`}
                      onClick={() => deleteWithUndo(deleteCoverLetter(letter.id))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                  className="border-b border-foreground/[0.06]"
                />
                <div className="p-4">
                  {company && (
                    <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                      For {company.name}
                    </p>
                  )}
                  <textarea
                    defaultValue={letter.content}
                    onBlur={(event) => {
                      if (event.target.value !== letter.content) {
                        updateCoverLetter(letter.id, { content: event.target.value });
                      }
                    }}
                    rows={10}
                    className="w-full resize-none rounded-xl bg-foreground/[0.02] p-3 text-xs leading-6 font-medium outline-none focus:bg-foreground/[0.04]"
                  />
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}
