"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  Monitor,
  Moon,
  Sun,
  Trash2,
  Upload,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Field, FieldGrid, Segmented, TagsInput } from "@/components/common/form";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { CURRENCIES, WORK_MODE_CONFIG } from "@/lib/constants";
import { getProfile, updateProfile } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { seedDemoWorkspace } from "@/lib/data/seed";
import { store } from "@/lib/data/store";
import { exportCSV, exportEverything, exportJSON, parseWorkspaceFile } from "@/lib/export";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { applyTheme, THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";
import type { CollectionName, NotificationPreferences, WorkMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const NOTIFICATION_LABELS: Array<{
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}> = [
  { key: "interviewTomorrow", label: "Interview tomorrow", description: "The day before each round" },
  { key: "interviewInOneHour", label: "Interview in an hour", description: "A last-minute nudge" },
  { key: "followUpDue", label: "Follow-up due", description: "When a scheduled nudge comes up" },
  { key: "applicationDeadline", label: "Application deadline", description: "Before a posting closes" },
  { key: "taskOverdue", label: "Task overdue", description: "When something slips past its date" },
  { key: "offerDeadline", label: "Offer deadline", description: "Before a decision is due" },
  { key: "recruiterResponse", label: "Recruiter waiting", description: "When a reply is owed" },
  { key: "inactiveApplication", label: "Application gone quiet", description: "No movement in a while" },
];

const parseTheme = (raw: string): ThemeMode | null =>
  raw === "light" || raw === "dark" || raw === "system" ? raw : null;

const EXPORTABLE: Array<{ key: CollectionName; label: string }> = [
  { key: "applications", label: "Applications" },
  { key: "contacts", label: "Contacts" },
  { key: "companies", label: "Companies" },
  { key: "interviews", label: "Interviews" },
  { key: "tasks", label: "Tasks" },
  { key: "followUps", label: "Follow-ups" },
  { key: "jobs", label: "Jobs" },
];

export default function SettingsPage() {
  const status = useStoreStatus();
  const { adapterLabel } = useAppUI();
  const profiles = useCollection("profiles");
  const companies = useCollection("companies");

  const [theme, setStoredTheme] = useLocalStorageState<ThemeMode>(
    THEME_STORAGE_KEY,
    "dark",
    parseTheme,
  );
  const [confirmReset, setConfirmReset] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const profile = profiles[0] ?? getProfile();

  if (status.status !== "ready") return <ListSkeleton rows={5} />;

  const changeTheme = (next: ThemeMode) => {
    applyTheme(next);
    setStoredTheme(next);
  };

  const patchFit = (patch: Partial<typeof profile.fit>) =>
    updateProfile({ fit: { ...profile.fit, ...patch } });

  const patchNotifications = (patch: Partial<NotificationPreferences>) =>
    updateProfile({ notifications: { ...profile.notifications, ...patch } });

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader title="Settings" description="Your profile, preferences and your data." />

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-7">
          {/* Profile ---------------------------------------------------- */}
          <Surface className="overflow-hidden">
            <SectionHeader title="Profile" className="border-b border-foreground/[0.06]" />
            <div className="flex flex-col gap-3.5 p-4">
              <FieldGrid>
                <Field label="Name">
                  <Input
                    value={profile.name}
                    onChange={(event) => updateProfile({ name: event.target.value })}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={profile.email ?? ""}
                    placeholder="you@example.com"
                    onChange={(event) => updateProfile({ email: event.target.value || null })}
                  />
                </Field>
              </FieldGrid>
              <FieldGrid>
                <Field label="Headline">
                  <Input
                    value={profile.headline ?? ""}
                    placeholder="Product engineer, 7 years"
                    onChange={(event) => updateProfile({ headline: event.target.value || null })}
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={profile.location ?? ""}
                    placeholder="Berlin, DE"
                    onChange={(event) => updateProfile({ location: event.target.value || null })}
                  />
                </Field>
              </FieldGrid>
            </div>
          </Surface>

          {/* Search preferences ----------------------------------------- */}
          <Surface className="overflow-hidden">
            <SectionHeader
              title="Search preferences"
              action={
                <span className="text-[11px] font-medium text-muted-foreground">
                  Powers job fit scores
                </span>
              }
              className="border-b border-foreground/[0.06]"
            />
            <div className="flex flex-col gap-3.5 p-4">
              <Field label="Your skills" hint="Used to score how well a saved job matches you.">
                <TagsInput
                  value={profile.fit.skills}
                  onChange={(skills) => patchFit({ skills })}
                  placeholder="TypeScript…"
                />
              </Field>

              <Field label="Target roles" hint="Titles you're actually going for.">
                <TagsInput
                  value={profile.fit.desiredRoles}
                  onChange={(desiredRoles) => patchFit({ desiredRoles })}
                  placeholder="Senior Product Engineer…"
                />
              </Field>

              <Field label="Preferred locations">
                <TagsInput
                  value={profile.fit.locations}
                  onChange={(locations) => patchFit({ locations })}
                  placeholder="Remote · EU…"
                />
              </Field>

              <Field label="Work modes">
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(WORK_MODE_CONFIG).map((option) => {
                    const active = profile.fit.workModes.includes(option.value as WorkMode);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          patchFit({
                            workModes: active
                              ? profile.fit.workModes.filter((mode) => mode !== option.value)
                              : [...profile.fit.workModes, option.value as WorkMode],
                          })
                        }
                        className={cn(
                          "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-200",
                          active
                            ? "border-primary/40 bg-primary/15 text-foreground"
                            : "border-border/60 text-muted-foreground hover:bg-foreground/[0.045]",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <FieldGrid columns={3}>
                <Field label="Minimum salary">
                  <Input
                    type="number"
                    value={profile.fit.minSalary ?? ""}
                    placeholder="160000"
                    onChange={(event) =>
                      patchFit({ minSalary: event.target.value ? Number(event.target.value) : null })
                    }
                  />
                </Field>
                <Field label="Years of experience">
                  <Input
                    type="number"
                    value={profile.fit.experienceYears ?? ""}
                    placeholder="7"
                    onChange={(event) =>
                      patchFit({
                        experienceYears: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                </Field>
                <Field label="Currency">
                  <Segmented
                    value={profile.currency}
                    onChange={(currency) => updateProfile({ currency })}
                    ariaLabel="Currency"
                    size="sm"
                    options={CURRENCIES.slice(0, 4).map((code) => ({ value: code, label: code }))}
                  />
                </Field>
              </FieldGrid>

              <FieldGrid>
                <Field label="Target role">
                  <Input
                    value={profile.targetRole ?? ""}
                    placeholder="Staff Product Engineer"
                    onChange={(event) => updateProfile({ targetRole: event.target.value || null })}
                  />
                </Field>
                <Field label="Target salary">
                  <Input
                    type="number"
                    value={profile.targetSalary ?? ""}
                    placeholder="210000"
                    onChange={(event) =>
                      updateProfile({
                        targetSalary: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                </Field>
              </FieldGrid>

              <Field label="Target companies" hint="Applying to one of these counts toward your goal.">
                {companies.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add a company first.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {companies.map((company) => {
                      const active = profile.fit.preferredCompanyIds.includes(company.id);
                      return (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() =>
                            patchFit({
                              preferredCompanyIds: active
                                ? profile.fit.preferredCompanyIds.filter((id) => id !== company.id)
                                : [...profile.fit.preferredCompanyIds, company.id],
                            })
                          }
                          className={cn(
                            "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-200",
                            active
                              ? "border-primary/40 bg-primary/15 text-foreground"
                              : "border-border/60 text-muted-foreground hover:bg-foreground/[0.045]",
                          )}
                        >
                          {company.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>
            </div>
          </Surface>

          {/* Notifications ----------------------------------------------- */}
          <Surface className="overflow-hidden">
            <SectionHeader
              title="Notifications"
              action={
                <span className="text-[11px] font-medium text-muted-foreground">
                  Drive what appears in Needs you today
                </span>
              }
              className="border-b border-foreground/[0.06]"
            />
            <ul className="divide-y divide-foreground/[0.05]">
              {NOTIFICATION_LABELS.map((item) => (
                <li key={item.key} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(profile.notifications[item.key])}
                    aria-label={item.label}
                    onClick={() =>
                      patchNotifications({ [item.key]: !profile.notifications[item.key] })
                    }
                    className={cn(
                      "relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
                      profile.notifications[item.key] ? "bg-primary" : "bg-foreground/15",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-4 rounded-full bg-background shadow transition-[left] duration-200 ease-out",
                        profile.notifications[item.key] ? "left-4.5" : "left-0.5",
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 border-t border-foreground/[0.06] p-4 sm:grid-cols-2">
              <Field label="Suggest a follow-up after" hint="Days after applying.">
                <Input
                  type="number"
                  value={profile.notifications.followUpAfterDays}
                  onChange={(event) =>
                    patchNotifications({ followUpAfterDays: Number(event.target.value) || 7 })
                  }
                />
              </Field>
              <Field label="Flag as inactive after" hint="Days without any movement.">
                <Input
                  type="number"
                  value={profile.notifications.inactiveAfterDays}
                  onChange={(event) =>
                    patchNotifications({ inactiveAfterDays: Number(event.target.value) || 14 })
                  }
                />
              </Field>
            </div>
          </Surface>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-5">
          {/* Appearance --------------------------------------------------- */}
          <Surface className="overflow-hidden">
            <SectionHeader title="Appearance" className="border-b border-foreground/[0.06]" />
            <div className="flex flex-col gap-3 p-4">
              <Field label="Theme">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "system", label: "System", icon: Monitor },
                    ] as const
                  ).map((option) => {
                    const Icon = option.icon;
                    const active = theme === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => changeTheme(option.value)}
                        className={cn(
                          "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium",
                          "transition-colors duration-200 ease-out",
                          active
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border/70 text-muted-foreground hover:bg-foreground/[0.045] hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                        {option.label}
                        {active && <Check className="size-3 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Week starts on">
                <Segmented
                  value={String(profile.weekStartsOn)}
                  onChange={(value) => updateProfile({ weekStartsOn: value === "0" ? 0 : 1 })}
                  ariaLabel="Week start"
                  options={[
                    { value: "1", label: "Monday" },
                    { value: "0", label: "Sunday" },
                  ]}
                />
              </Field>
            </div>
          </Surface>

          {/* Data ---------------------------------------------------------- */}
          <Surface className="overflow-hidden">
            <SectionHeader
              title="Your data"
              action={
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Database className="size-3" />
                  {adapterLabel}
                </span>
              }
              className="border-b border-foreground/[0.06]"
            />
            <div className="flex flex-col gap-3 p-4">
              <p className="text-xs leading-5 font-medium text-muted-foreground">
                {adapterLabel.startsWith("Local")
                  ? "Everything lives in this browser. Add Supabase credentials to sync across devices. The schema is in supabase/migrations."
                  : "Your workspace is stored in your own Supabase project. Nothing leaves it."}
              </p>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                  Export
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="secondary" size="xs" onClick={() => exportEverything()}>
                    <Download className="size-3" />
                    Everything (JSON)
                  </Button>
                  {EXPORTABLE.map((item) => (
                    <Button
                      key={item.key}
                      variant="outline"
                      size="xs"
                      onClick={() => exportCSV(item.key)}
                    >
                      {item.label} CSV
                    </Button>
                  ))}
                  <Button variant="ghost" size="xs" onClick={() => exportJSON("applications")}>
                    Applications JSON
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                  Import
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    const database = parseWorkspaceFile(text);
                    event.target.value = "";
                    if (!database) {
                      toast.error("That doesn't look like an ApplyOS export");
                      return;
                    }
                    await store.replaceAll(database);
                    toast.success("Workspace imported");
                  }}
                />
                <Button variant="outline" size="xs" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-3" />
                  Import an ApplyOS export
                </Button>
                <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                  Importing replaces everything currently in this workspace.
                </p>
              </div>
            </div>
          </Surface>

          {/* Danger zone --------------------------------------------------- */}
          <Surface className="overflow-hidden">
            <SectionHeader title="Reset" className="border-b border-foreground/[0.06]" />
            <div className="flex flex-col gap-3 p-4">
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={async () => {
                  await seedDemoWorkspace();
                  toast.success("Demo workspace loaded");
                }}
              >
                Load the demo workspace
              </Button>
              <p className="text-[11px] font-medium text-muted-foreground">
                Replaces everything with a realistic sample search. Useful for trying things out.
              </p>

              <div className="border-t border-foreground/[0.06] pt-3">
                {confirmReset ? (
                  <div className="flex flex-col gap-2">
                    <p className="flex items-start gap-2 text-xs font-medium text-destructive">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      This deletes every application, contact, interview and note. It can&rsquo;t be
                      undone, so export first if you want a copy.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          await store.reset();
                          setConfirmReset(false);
                          toast.success("Workspace cleared");
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Delete everything
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start text-destructive"
                    onClick={() => setConfirmReset(true)}
                  >
                    Clear this workspace…
                  </Button>
                )}
              </div>
            </div>
          </Surface>

          <Surface className="p-4">
            <EmptyState
              title="ApplyOS is open source"
              description="Fork it, run it, change it. Your data stays yours, with no account and no server unless you point it at your own Supabase project."
              action={{ label: "Read the setup guide", href: "/#open-source" }}
              compact
            />
          </Surface>
        </div>
      </div>
    </div>
  );
}
