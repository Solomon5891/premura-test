// Tier classification from employee count. Computed at notification time
// rather than stored, so GTM can re-tune thresholds without a migration.

export type LeadTier =
  | "enterprise"
  | "mid_market"
  | "smb"
  | "startup"
  | "unknown";

export function tierFromEmployeeCount(
  count: number | null | undefined
): LeadTier {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return "unknown";
  }
  if (count >= 1001) return "enterprise";
  if (count >= 101) return "mid_market";
  if (count >= 11) return "smb";
  return "startup";
}

export function tierLabel(tier: LeadTier): string {
  switch (tier) {
    case "enterprise":
      return "Enterprise";
    case "mid_market":
      return "Mid-market";
    case "smb":
      return "SMB";
    case "startup":
      return "Startup";
    case "unknown":
      return "Unknown size";
  }
}
