"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileText, Upload, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { formatBytes, putFile } from "@/lib/data/files";
import { cn } from "@/lib/utils";

/**
 * Drop a file, or click to pick one.
 *
 * Handles the whole local-storage round trip and hands the caller back a
 * reference to save on the record, so a form only has to store a string.
 */
export function FileDrop({
  onFile,
  accept = ".pdf,.doc,.docx",
  label = "Drop a PDF here, or click to choose",
  hint,
  className,
  compact = false,
}: {
  onFile: (file: { ref: string; name: string; size: number }) => void;
  accept?: string;
  label?: string;
  hint?: string;
  className?: string;
  compact?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const accepted = React.useMemo(
    () => accept.split(",").map((part) => part.trim().toLowerCase()),
    [accept],
  );

  const take = async (file: File | undefined) => {
    if (!file) return;
    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!accepted.includes(extension)) {
      toast.error("That file type isn't supported", { description: `Try ${accept}.` });
      return;
    }
    setBusy(true);
    try {
      onFile(await putFile(file));
    } catch (error) {
      toast.error("Couldn't save that file", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void take(event.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center",
        "transition-colors duration-200 ease-out",
        "hover:border-foreground/25 hover:bg-foreground/[0.02]",
        "focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none",
        dragging && "border-primary/60 bg-primary/[0.05]",
        busy && "pointer-events-none opacity-60",
        compact ? "gap-1 px-4 py-4" : "gap-2 px-6 py-8",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-foreground/[0.05] text-muted-foreground",
          compact ? "size-7" : "size-9",
        )}
      >
        <Upload className={compact ? "size-3.5" : "size-4"} />
      </span>
      <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
        {busy ? "Saving…" : label}
      </p>
      {hint && <p className="text-[11px] font-medium text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          void take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}

/** The chip that stands in for an attached file once one exists. */
export function FileChip({
  name,
  size,
  onOpen,
  onRemove,
  className,
}: {
  name: string;
  size?: number | null;
  onOpen: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full bg-foreground/[0.05] py-1 pr-1 pl-2.5 edge",
        className,
      )}
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 cursor-pointer truncate text-xs font-medium transition-colors hover:text-primary-ink"
      >
        {name}
      </button>
      {size != null && (
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {formatBytes(size)}
        </span>
      )}
      {onRemove && (
        <Button variant="ghost" size="icon-xs" aria-label="Remove file" onClick={onRemove}>
          <X className="size-3" />
        </Button>
      )}
    </span>
  );
}
