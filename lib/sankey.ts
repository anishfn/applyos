/**
 * The application flow, as a Sankey.
 *
 * A funnel says how many reached each stage. A Sankey says what happened to
 * everyone who did not, which is the more useful half of a job search: where
 * people stop replying, which stage rejects you most, how many are still open.
 *
 * Stages come from the activity history (`furthestRankByApplication`), so an
 * application that was rejected after a final round still flows through every
 * stage it actually passed.
 */
import { STATUS_RANK } from "@/lib/constants";
import type { Activity, Application, ID, Tone } from "@/lib/types";
import { furthestRankByApplication, reachedRank } from "@/lib/analytics";

export interface SankeyNode {
  id: string;
  label: string;
  /** Column, left to right. */
  layer: number;
  value: number;
  tone: Tone;
  /** Terminal nodes are outcomes, not stages. */
  terminal?: boolean;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  tone: Tone;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  total: number;
}

/** The stages an application passes through, in order. */
const STAGES = [
  { id: "applied", label: "Applied", rank: STATUS_RANK.applied },
  { id: "screening", label: "Screening", rank: STATUS_RANK.screening },
  { id: "interview", label: "Interview", rank: STATUS_RANK.interview },
  { id: "final_round", label: "Final round", rank: STATUS_RANK.final_round },
  { id: "offer", label: "Offer", rank: STATUS_RANK.offer },
] as const;

type Outcome = "rejected" | "ghosted" | "withdrawn" | "active" | "accepted";

function outcomeOf(application: Application): Outcome {
  if (application.status === "rejected") return "rejected";
  if (application.status === "ghosted") return "ghosted";
  if (application.status === "withdrawn") return "withdrawn";
  if (application.status === "accepted") return "accepted";
  return "active";
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  rejected: "Rejected",
  ghosted: "No reply",
  withdrawn: "Withdrawn",
  active: "Still open",
  accepted: "Accepted",
};

const OUTCOME_TONE: Record<Outcome, Tone> = {
  rejected: "rose",
  ghosted: "neutral",
  withdrawn: "amber",
  active: "blue",
  accepted: "primary",
};

const STAGE_TONE: Tone[] = ["blue", "cyan", "violet", "teal", "primary"];

/**
 * Builds the flow.
 *
 * Every application enters at the furthest stage it reached and then either
 * advances to the next stage or leaves through an outcome node attached to that
 * stage. Outcome nodes sit one layer to the right of the stage they belong to,
 * so a rejection at screening never gets confused with one at the final round.
 */
export function computeSankey(applications: Application[], activities: Activity[]): SankeyData {
  const furthest = furthestRankByApplication(activities);

  const submitted = applications.filter(
    (application) => reachedRank(application, furthest) >= STATUS_RANK.applied,
  );

  const reached = new Map<ID, number>();
  for (const application of submitted) reached.set(application.id, reachedRank(application, furthest));

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  STAGES.forEach((stage, index) => {
    const atOrPast = submitted.filter((application) => (reached.get(application.id) ?? -1) >= stage.rank);
    if (atOrPast.length === 0) return;

    nodes.push({
      id: stage.id,
      label: stage.label,
      layer: index * 2,
      value: atOrPast.length,
      tone: STAGE_TONE[index] ?? "neutral",
    });

    const next = STAGES[index + 1];

    // Everyone who stopped here, grouped by why.
    const stopped = atOrPast.filter(
      (application) => !next || (reached.get(application.id) ?? -1) < next.rank,
    );
    const byOutcome = new Map<Outcome, number>();
    for (const application of stopped) {
      const outcome = outcomeOf(application);
      // An accepted offer is the happy terminal, not a "stopped here".
      byOutcome.set(outcome, (byOutcome.get(outcome) ?? 0) + 1);
    }

    for (const [outcome, count] of byOutcome) {
      if (count === 0) continue;
      const id = `${stage.id}:${outcome}`;
      nodes.push({
        id,
        label: OUTCOME_LABEL[outcome],
        layer: index * 2 + 1,
        value: count,
        tone: OUTCOME_TONE[outcome],
        terminal: true,
      });
      links.push({ source: stage.id, target: id, value: count, tone: OUTCOME_TONE[outcome] });
    }

    if (next) {
      const advanced = atOrPast.filter(
        (application) => (reached.get(application.id) ?? -1) >= next.rank,
      ).length;
      if (advanced > 0) {
        links.push({
          source: stage.id,
          target: next.id,
          value: advanced,
          tone: STAGE_TONE[index + 1] ?? "neutral",
        });
      }
    }
  });

  return { nodes, links, total: submitted.length };
}
