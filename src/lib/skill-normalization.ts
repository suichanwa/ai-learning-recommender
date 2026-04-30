export interface SkillCorrection {
  original: string;
  suggestion: string;
  reason: "alias" | "typo";
}

export interface NormalizedSkillResult {
  normalizedSkills: string[];
  corrections: SkillCorrection[];
}

const aliasMap: Record<string, string> = {
  js: "JavaScript",
  ts: "TypeScript",
  ml: "Machine Learning",
  ai: "Artificial Intelligence",
  db: "Databases",
  sql: "SQL",
  node: "Node.js",
  reactjs: "React",
  nextjs: "Next.js",
};

const canonicalTopics = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Machine Learning",
  "Artificial Intelligence",
  "Graphic Design",
  "Databases",
  "SQL",
  "Python",
  "HTML",
  "CSS",
  "Data Structures",
  "Algorithms",
];

function normalizeKey(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function titleCase(input: string): string {
  return input
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }

  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, previous + cost);
      previous = current;
    }
  }
  return dp[b.length];
}

function closestCanonicalSkill(input: string): string | null {
  const normalized = normalizeKey(input);
  let best: { topic: string; distance: number } | null = null;

  for (const topic of canonicalTopics) {
    const distance = levenshteinDistance(normalized, normalizeKey(topic));
    if (!best || distance < best.distance) {
      best = { topic, distance };
    }
  }

  if (!best) {
    return null;
  }

  const length = Math.max(normalized.length, best.topic.length);
  const ratio = best.distance / Math.max(1, length);
  const strongMatch = best.distance <= 2 || ratio <= 0.25;
  return strongMatch ? best.topic : null;
}

export function normalizeSkills(inputSkills: string[]): NormalizedSkillResult {
  const corrections: SkillCorrection[] = [];
  const normalizedSkills = inputSkills.map((skillRaw) => {
    const trimmed = skillRaw.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      return "";
    }

    const key = normalizeKey(trimmed);
    const aliased = aliasMap[key];
    if (aliased) {
      if (aliased !== trimmed) {
        corrections.push({
          original: trimmed,
          suggestion: aliased,
          reason: "alias",
        });
      }
      return aliased;
    }

    const exact = canonicalTopics.find((topic) => normalizeKey(topic) === key);
    if (exact) {
      return exact;
    }

    const suggested = closestCanonicalSkill(trimmed);
    if (suggested && normalizeKey(suggested) !== key) {
      corrections.push({
        original: trimmed,
        suggestion: suggested,
        reason: "typo",
      });
      return suggested;
    }

    return titleCase(trimmed);
  });

  return {
    normalizedSkills: normalizedSkills.filter(Boolean),
    corrections,
  };
}
