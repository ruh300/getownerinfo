import type { SeekerRequestDurationDays } from "@/lib/domain";

export const seekerViewTokenFeeRwf = 10_000;

export function getSeekerPostFeeRwf(durationDays: SeekerRequestDurationDays) {
  if (durationDays === 7) {
    return 5_000;
  }

  if (durationDays === 14) {
    return 10_000;
  }

  return 20_000;
}
