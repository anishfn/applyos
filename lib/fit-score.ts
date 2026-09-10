import { salaryMidpoint } from "./format";
import type { Company, FitPreferences, Job, SalaryRange, WorkMode } from "./types";

/**
 * Optional job fit scoring.
 *
 * Deliberately transparent rather than clever: every component is a simple,
 * explainable ratio, and the function returns `null` when the profile hasn't
 * been filled in enough to say anything meaningful. A confident-looking 68%
 * derived from no preferences would be worse than no score at all.
 *
 * @see lib/ai/provider.ts, an AI provider can replace this with a semantic
 * match without any caller changing.
 */

export interface FitComponent {
  key: "skills" | "experience" | "location" | "salary" | "role" | "company";
  label: string;
  /** 0–1, or null when there isn't enough information to judge. */
  score: number | null;
  weight: number;
  detail: string;
}

export interface FitScore {
  /** 0–100. */
  overall: number;
  components: FitComponent[];
  missingSkills: string[];
  matchedSkills: string[];
  /** How much of the profile was actually usable, 0–1. */
  confidence: number;
}

const WEIGHTS = {
  skills: 0.34,
  experience: 0.2,
  location: 0.15,
  salary: 0.15,
  role: 0.11,
  company: 0.05,
} as const;

const normalize = (value: string) => value.trim().toLowerCase().replace(/[.\-_/]/g, "");

/** "React.js" matches "react", "Node" matches "Node.js". */
const skillsMatch = (a: string, b: string) => {
  const left = normalize(a);
  const right = normalize(b);
  return left === right || left.includes(right) || right.includes(left);
};

export interface FitInput {
  skills: string[];
  experienceYears?: number | null;
  location?: string | null;
  workMode?: WorkMode | null;
  salary?: SalaryRange | null;
  title: string;
  company?: Company | null;
}

export function scoreFit(input: FitInput, preferences: FitPreferences): FitScore | null {
  const components: FitComponent[] = [];
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  /* Skills ---------------------------------------------------------------- */
  if (input.skills.length > 0 && preferences.skills.length > 0) {
    for (const required of input.skills) {
      if (preferences.skills.some((owned) => skillsMatch(owned, required))) matchedSkills.push(required);
      else missingSkills.push(required);
    }
    components.push({
      key: "skills",
      label: "Skills",
      score: matchedSkills.length / input.skills.length,
      weight: WEIGHTS.skills,
      detail: `${matchedSkills.length} of ${input.skills.length} listed skills`,
    });
  } else {
    components.push({
      key: "skills",
      label: "Skills",
      score: null,
      weight: WEIGHTS.skills,
      detail: input.skills.length === 0 ? "No skills on the job" : "No skills in your profile",
    });
  }

  /* Experience ------------------------------------------------------------ */
  if (input.experienceYears != null && preferences.experienceYears != null) {
    const gap = preferences.experienceYears - input.experienceYears;
    // Meeting the bar is full marks; being under it degrades a year at a time.
    const score = gap >= 0 ? 1 : Math.max(0, 1 + gap / 4);
    components.push({
      key: "experience",
      label: "Experience",
      score,
      weight: WEIGHTS.experience,
      detail:
        gap >= 0
          ? `You have ${preferences.experienceYears}y, they want ${input.experienceYears}y`
          : `${Math.abs(gap)}y short of the ${input.experienceYears}y asked for`,
    });
  } else {
    components.push({
      key: "experience",
      label: "Experience",
      score: null,
      weight: WEIGHTS.experience,
      detail: "Not enough information",
    });
  }

  /* Location & work mode --------------------------------------------------- */
  const wantsRemote = preferences.workModes.includes("remote");
  if (preferences.locations.length > 0 || preferences.workModes.length > 0) {
    let score = 0.5;
    let detail = "Partial match";

    if (input.workMode && preferences.workModes.includes(input.workMode)) {
      score = 1;
      detail = `${input.workMode === "remote" ? "Remote" : input.workMode} matches your preference`;
    } else if (input.workMode === "remote" && wantsRemote) {
      score = 1;
      detail = "Fully remote";
    } else if (input.location && preferences.locations.length > 0) {
      const matched = preferences.locations.some(
        (preferred) =>
          normalize(input.location ?? "").includes(normalize(preferred)) ||
          normalize(preferred).includes(normalize(input.location ?? "")),
      );
      score = matched ? 1 : 0.2;
      detail = matched ? `${input.location} is on your list` : `${input.location} isn't on your list`;
    } else if (input.workMode) {
      score = 0.3;
      detail = `${input.workMode} isn't your preference`;
    }

    components.push({ key: "location", label: "Location", score, weight: WEIGHTS.location, detail });
  } else {
    components.push({
      key: "location",
      label: "Location",
      score: null,
      weight: WEIGHTS.location,
      detail: "No location preference set",
    });
  }

  /* Salary ----------------------------------------------------------------- */
  const offered = input.salary ? (input.salary.max ?? salaryMidpoint(input.salary)) : null;
  if (offered != null && preferences.minSalary != null && preferences.minSalary > 0) {
    const ratio = offered / preferences.minSalary;
    const score = Math.max(0, Math.min(1, ratio >= 1 ? 1 : 1 - (1 - ratio) * 2));
    components.push({
      key: "salary",
      label: "Salary",
      score,
      weight: WEIGHTS.salary,
      detail:
        ratio >= 1
          ? "Meets your target"
          : `${Math.round((1 - ratio) * 100)}% below your target`,
    });
  } else {
    components.push({
      key: "salary",
      label: "Salary",
      score: null,
      weight: WEIGHTS.salary,
      detail: offered == null ? "No salary listed" : "No target salary set",
    });
  }

  /* Role ------------------------------------------------------------------- */
  if (preferences.desiredRoles.length > 0) {
    const title = normalize(input.title);
    const exact = preferences.desiredRoles.some((role) => {
      const target = normalize(role);
      return title.includes(target) || target.includes(title);
    });
    // Otherwise score on word overlap, so "Frontend Engineer" still rates highly
    // against a posting called "Senior Frontend Engineer, Platform".
    const titleWords = new Set(input.title.toLowerCase().split(/\W+/).filter(Boolean));
    const overlap = preferences.desiredRoles.map((role) => {
      const roleWords = role.toLowerCase().split(/\W+/).filter(Boolean);
      if (roleWords.length === 0) return 0;
      return roleWords.filter((word) => titleWords.has(word)).length / roleWords.length;
    });
    const score = exact ? 1 : Math.max(0, ...overlap);
    components.push({
      key: "role",
      label: "Role",
      score,
      weight: WEIGHTS.role,
      detail:
        score >= 0.99
          ? "Exactly what you're looking for"
          : score > 0.4
            ? "Close to your target role"
            : "Different from your target roles",
    });
  } else {
    components.push({
      key: "role",
      label: "Role",
      score: null,
      weight: WEIGHTS.role,
      detail: "No target roles set",
    });
  }

  /* Company ---------------------------------------------------------------- */
  if (input.company) {
    const preferred =
      preferences.preferredCompanyIds.includes(input.company.id) || input.company.favorite;
    const rating = input.company.rating != null ? input.company.rating / 5 : null;
    const score = preferred ? 1 : (rating ?? 0.5);
    components.push({
      key: "company",
      label: "Company",
      score,
      weight: WEIGHTS.company,
      detail: preferred
        ? "On your target list"
        : rating != null
          ? `You rated them ${input.company.rating}/5`
          : "No signal either way",
    });
  } else {
    components.push({
      key: "company",
      label: "Company",
      score: null,
      weight: WEIGHTS.company,
      detail: "Unknown company",
    });
  }

  /* Roll-up ---------------------------------------------------------------- */
  const scored = components.filter((component) => component.score != null);
  const availableWeight = scored.reduce((sum, component) => sum + component.weight, 0);
  if (availableWeight === 0) return null;

  const weighted = scored.reduce(
    (sum, component) => sum + (component.score as number) * component.weight,
    0,
  );

  return {
    overall: Math.round((weighted / availableWeight) * 100),
    components,
    missingSkills,
    matchedSkills,
    confidence: availableWeight,
  };
}

/** Convenience wrapper for a saved job. */
export function scoreJob(
  job: Job,
  company: Company | null,
  preferences: FitPreferences,
): FitScore | null {
  return scoreFit(
    {
      skills: job.skills,
      experienceYears: job.experienceYears,
      location: job.location,
      workMode: job.workMode,
      salary: job.salary,
      title: job.title,
      company,
    },
    preferences,
  );
}

/** Whether the profile has enough filled in for scores to mean anything. */
export const hasFitPreferences = (preferences: FitPreferences): boolean =>
  preferences.skills.length > 0 ||
  preferences.desiredRoles.length > 0 ||
  preferences.locations.length > 0 ||
  preferences.minSalary != null;
