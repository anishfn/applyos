/**
 * The icon set.
 *
 * Hugeicons stroke-rounded: even 1.5px strokes, round caps and joins, drawn on
 * a 24px grid. One weight everywhere, so a dense table and a hero card look
 * like the same product.
 *
 * Everything is re-exported under one semantic name here. Swapping the family,
 * the weight or a single glyph is a change to this file and nothing else.
 */
import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlarmClockIcon,
  Alert02Icon,
  Analytics01Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowDownRight01Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowUp01Icon,
  ArrowUp02Icon,
  ArrowUpRight01Icon,
  Attachment01Icon,
  Bookmark02Icon,
  Building06Icon,
  BulbIcon,
  Calendar03Icon,
  CalendarCheckIn01Icon,
  Call02Icon,
  Cancel01Icon,
  CheckListIcon,
  CheckmarkCircle02Icon,
  CircleIcon as CircleGlyph,
  Clock01Icon,
  CommandIcon,
  Copy01Icon,
  DashboardSquare02Icon,
  Database01Icon,
  Delete02Icon,
  Download04Icon,
  Edit02Icon,
  File02Icon,
  Files01Icon,
  FilterIcon,
  FireIcon,
  GitForkIcon,
  Grid2X2Icon,
  HandshakeIcon,
  KanbanIcon,
  Link01Icon,
  LinkSquare02Icon,
  LockIcon,
  MagicWand01Icon,
  Mail01Icon,
  MapPinIcon,
  Message01Icon,
  Moon02Icon,
  MoreHorizontalIcon,
  NoteEditIcon,
  PartyIcon,
  PlusSignIcon,
  PreferenceHorizontalIcon,
  Rocket01Icon,
  RowsThreeIcon,
  Search01Icon,
  Sent02Icon,
  Settings02Icon,
  SidebarLeft01Icon,
  SparklesIcon,
  StarIcon,
  Sun03Icon,
  SunriseIcon,
  Target01Icon,
  Tick02Icon,
  UnfoldMoreIcon,
  Upload04Icon,
  UserMultiple02Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Overrides the family default. Rarely worth doing. */
  strokeWidth?: number;
}

/** What a component means when it stores an icon in a config object. */
export type IconComponent = React.ComponentType<IconProps>;

/**
 * 1.5px reads thin once an icon is scaled down to 14px, so the set runs a shade
 * heavier and matches the weight of the semibold labels beside it.
 */
const STROKE = 1.7;

function make(icon: IconSvgElement, name: string): IconComponent {
  const Wrapped = ({ strokeWidth = STROKE, ...props }: IconProps) => (
    <HugeiconsIcon icon={icon} strokeWidth={strokeWidth} {...props} />
  );
  Wrapped.displayName = name;
  return Wrapped;
}

/* Content ---------------------------------------------------------------- */
export const AlarmClock = make(AlarmClockIcon, "AlarmClock");
export const AlertTriangle = make(Alert02Icon, "AlertTriangle");
export const BarChart3 = make(Analytics01Icon, "BarChart3");
export const Bookmark = make(Bookmark02Icon, "Bookmark");
export const Building2 = make(Building06Icon, "Building2");
export const CalendarClock = make(CalendarCheckIn01Icon, "CalendarClock");
export const CalendarDays = make(Calendar03Icon, "CalendarDays");
export const CheckCircle2 = make(CheckmarkCircle02Icon, "CheckCircle2");
export const Clock = make(Clock01Icon, "Clock");
export const Copy = make(Copy01Icon, "Copy");
export const Database = make(Database01Icon, "Database");
export const FileText = make(File02Icon, "FileText");
export const Files = make(Files01Icon, "Files");
export const Flame = make(FireIcon, "Flame");
export const Handshake = make(HandshakeIcon, "Handshake");
export const LayoutDashboard = make(DashboardSquare02Icon, "LayoutDashboard");
export const LayoutGrid = make(Grid2X2Icon, "LayoutGrid");
export const Lightbulb = make(BulbIcon, "Lightbulb");
export const ListTodo = make(CheckListIcon, "ListTodo");
export const Lock = make(LockIcon, "Lock");
export const Mail = make(Mail01Icon, "Mail");
export const MapPin = make(MapPinIcon, "MapPin");
export const MessageSquare = make(Message01Icon, "MessageSquare");
export const Monitor = make(DashboardSquare02Icon, "Monitor");
export const Moon = make(Moon02Icon, "Moon");
export const NotebookPen = make(NoteEditIcon, "NotebookPen");
export const PanelLeft = make(SidebarLeft01Icon, "PanelLeft");
export const Paperclip = make(Attachment01Icon, "Paperclip");
export const Party = make(PartyIcon, "Party");
export const Pencil = make(Edit02Icon, "Pencil");
export const Phone = make(Call02Icon, "Phone");
export const Rocket = make(Rocket01Icon, "Rocket");
export const Rows3 = make(RowsThreeIcon, "Rows3");
export const Send = make(Sent02Icon, "Send");
export const Settings = make(Settings02Icon, "Settings");
export const Sparkles = make(SparklesIcon, "Sparkles");
export const SquareKanban = make(KanbanIcon, "SquareKanban");
export const Star = make(StarIcon, "Star");
export const Sun = make(Sun03Icon, "Sun");
export const Sunrise = make(SunriseIcon, "Sunrise");
export const Target = make(Target01Icon, "Target");
export const Trash2 = make(Delete02Icon, "Trash2");
export const Users = make(UserMultiple02Icon, "Users");
export const Video = make(Video01Icon, "Video");
export const Wand2 = make(MagicWand01Icon, "Wand2");
export const Link2 = make(Link01Icon, "Link2");
export const GitFork = make(GitForkIcon, "GitFork");
export const Filter = make(FilterIcon, "Filter");
export const SlidersHorizontal = make(PreferenceHorizontalIcon, "SlidersHorizontal");
export const Command = make(CommandIcon, "Command");
export const Search = make(Search01Icon, "Search");
export const Download = make(Download04Icon, "Download");
export const Upload = make(Upload04Icon, "Upload");
export const ExternalLink = make(LinkSquare02Icon, "ExternalLink");

/* Chrome ----------------------------------------------------------------- */
export const Check = make(Tick02Icon, "Check");
export const Plus = make(PlusSignIcon, "Plus");
export const X = make(Cancel01Icon, "X");
export const MoreHorizontal = make(MoreHorizontalIcon, "MoreHorizontal");
export const ChevronDown = make(ArrowDown01Icon, "ChevronDown");
export const ChevronUp = make(ArrowUp01Icon, "ChevronUp");
export const ChevronLeft = make(ArrowLeft01Icon, "ChevronLeft");
export const ChevronRight = make(ArrowRight01Icon, "ChevronRight");
export const ChevronsUpDown = make(UnfoldMoreIcon, "ChevronsUpDown");
export const ArrowRight = make(ArrowRight02Icon, "ArrowRight");
export const ArrowLeft = make(ArrowLeft02Icon, "ArrowLeft");
export const ArrowUp = make(ArrowUp02Icon, "ArrowUp");
export const ArrowDown = make(ArrowDown02Icon, "ArrowDown");
export const ArrowUpRight = make(ArrowUpRight01Icon, "ArrowUpRight");
export const ArrowDownRight = make(ArrowDownRight01Icon, "ArrowDownRight");
export const Circle = make(CircleGlyph, "Circle");

/* Aliases kept so the shadcn primitives keep their original import names. */
export const CheckIcon = Check;
export const ChevronDownIcon = ChevronDown;
export const ChevronRightIcon = ChevronRight;
export const ChevronUpIcon = ChevronUp;
export const ChevronLeftIcon = ChevronLeft;
export const SearchIcon = Search;
export const XIcon = X;
export const CircleIcon = Circle;
