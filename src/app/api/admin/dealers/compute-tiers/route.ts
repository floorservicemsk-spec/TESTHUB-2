import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Define type locally to avoid build-time prisma import
type DealerTier = "TIER1" | "TIER2" | "TIER3" | "TIER4";

// Lazy prisma import to avoid build-time issues
const getPrisma = async () => {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma;
};


// Tier thresholds based on monthly turnover
const TIER_THRESHOLDS: Record<DealerTier, number> = {
  TIER1: 0,
  TIER2: 100000,
  TIER3: 500000,
  TIER4: 1000000,
};

function computeTier(monthlyTurnover: number): DealerTier {
  if (monthlyTurnover >= TIER_THRESHOLDS.TIER4) return "TIER4";
  if (monthlyTurnover >= TIER_THRESHOLDS.TIER3) return "TIER3";
  if (monthlyTurnover >= TIER_THRESHOLDS.TIER2) return "TIER2";
  return "TIER1";
}

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Get all dealer profiles
    const profiles = await (await getPrisma()).dealerProfile.findMany();

    let updated = 0;

    for (const profile of profiles) {
      const newAutoTier = computeTier(profile.monthlyTurnover);
      
      // Determine current tier - use manual tier if enabled and not expired
      let newCurrentTier: DealerTier = newAutoTier;
      
      if (profile.manualTierEnabled && profile.manualTier) {
        const expiresAt = profile.manualTierExpiresAt;
        if (!expiresAt || new Date(expiresAt) > new Date()) {
          // Manual tier is still valid
          newCurrentTier = profile.manualTier as DealerTier;
        } else {
          // Manual tier expired, disable it
          await (await getPrisma()).dealerProfile.update({
            where: { id: profile.id },
            data: {
              manualTierEnabled: false,
              manualTier: null,
              manualTierExpiresAt: null,
            },
          });
        }
      }

      // Update if changed
      if (profile.autoTier !== newAutoTier || profile.currentTier !== newCurrentTier) {
        await (await getPrisma()).dealerProfile.update({
          where: { id: profile.id },
          data: {
            autoTier: newAutoTier,
            currentTier: newCurrentTier,
          },
        });
        updated++;
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Error computing dealer tiers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to compute tiers" },
      { status: 500 }
    );
  }
}
