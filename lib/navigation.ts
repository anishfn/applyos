import {
  BarChart3,
  Bookmark,
  Building2,
  CalendarDays,
  Files,
  FileText,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  NotebookPen,
  Send,
  Settings,
  SquareKanban,
  Sunrise,
  Target,
  Users,
  Video,
  type IconComponent,
} from "@/components/ui/icons";
import type { NavCounts } from "./derive";

export interface NavItem {
  label: string;
  href: string;
  icon: IconComponent;
  /** `g` chord suffix, e.g. "d" means `G` then `D`. */
  chord?: string;
  /** Which badge count feeds this row. */
  badge?: keyof NavCounts;
  /** A badge that means "you're behind" renders in the warning tone. */
  badgeTone?: "neutral" | "warning";
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Today",
        href: "/app/today",
        icon: Sunrise,
        chord: "y",
        badge: "today",
        badgeTone: "warning",
        description: "Everything happening today",
      },
      {
        label: "Dashboard",
        href: "/app",
        icon: LayoutDashboard,
        chord: "d",
        description: "Command center",
      },
      {
        label: "Analytics",
        href: "/app/analytics",
        icon: BarChart3,
        chord: "n",
        description: "What's actually working",
      },
    ],
  },
  {
    label: "Pipeline",
    items: [
      {
        label: "Applications",
        href: "/app/applications",
        icon: FileText,
        chord: "a",
        badge: "applications",
        description: "Every application you've submitted",
      },
      {
        label: "Pipeline",
        href: "/app/pipeline",
        icon: SquareKanban,
        chord: "p",
        description: "Drag applications between stages",
      },
      {
        label: "Jobs",
        href: "/app/jobs",
        icon: Bookmark,
        chord: "j",
        badge: "jobs",
        description: "Saved jobs you haven't applied to",
      },
      {
        label: "Interviews",
        href: "/app/interviews",
        icon: Video,
        chord: "i",
        badge: "interviews",
        description: "Schedule, prep and log interviews",
      },
      {
        label: "Follow-ups",
        href: "/app/follow-ups",
        icon: Send,
        chord: "f",
        badge: "followUps",
        badgeTone: "warning",
        description: "Nudges waiting to be sent",
      },
      {
        label: "Contacts",
        href: "/app/contacts",
        icon: Users,
        chord: "c",
        description: "Recruiters, referrals and friends",
      },
      {
        label: "Companies",
        href: "/app/companies",
        icon: Building2,
        chord: "o",
        description: "Your relationship with each company",
      },
    ],
  },
  {
    label: "Plan",
    items: [
      {
        label: "Tasks",
        href: "/app/tasks",
        icon: ListTodo,
        chord: "t",
        badge: "tasks",
        badgeTone: "warning",
        description: "Everything you owe yourself",
      },
      {
        label: "Calendar",
        href: "/app/calendar",
        icon: CalendarDays,
        chord: "l",
        description: "Interviews, deadlines and follow-ups",
      },
      {
        label: "Goals",
        href: "/app/goals",
        icon: Target,
        chord: "g",
        description: "Weekly targets and progress",
      },
    ],
  },
  {
    label: "Library",
    items: [
      {
        label: "Resumes",
        href: "/app/resumes",
        icon: NotebookPen,
        chord: "r",
        description: "Versions and what they've won you",
      },
      {
        label: "Documents",
        href: "/app/documents",
        icon: Files,
        chord: "u",
        description: "Cover letters, portfolios, transcripts",
      },
      {
        label: "Stories",
        href: "/app/stories",
        icon: MessageSquare,
        chord: "s",
        description: "Your STAR story bank",
      },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/app/settings",
  icon: Settings,
  description: "Preferences, data and export",
};

export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  SETTINGS_ITEM,
];

/** Bottom bar on phones, the three things you actually open on the move. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  ALL_NAV_ITEMS.find((item) => item.href === "/app/today")!,
  ALL_NAV_ITEMS.find((item) => item.href === "/app/applications")!,
  ALL_NAV_ITEMS.find((item) => item.href === "/app/tasks")!,
  ALL_NAV_ITEMS.find((item) => item.href === "/app/interviews")!,
];

/** Longest-prefix match so `/app/applications/123` still lights up Applications. */
export function activeHref(pathname: string): string {
  const matches = ALL_NAV_ITEMS.map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length);
  return matches[0] ?? "";
}
