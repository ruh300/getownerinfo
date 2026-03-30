import type { WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type { ListingDocument, PaymentDocument } from "@/lib/domain";
import { getFeeSettingsSummary, resolveListingTokenFeeRwf } from "@/lib/fee-settings/workflow";
import { isListingPubliclyVisible } from "@/lib/listings/lifecycle";
import { getPublicListings, type PublicListingSummary } from "@/lib/listings/public";
import {
  getSeekerMatchConversationFeedForUser,
  type SeekerMatchConversationSummary,
} from "@/lib/seeker-requests/messaging";
import { getBuyerSeekerResponsesForUser, type SeekerResponseSummary } from "@/lib/seeker-requests/responses";
import { getBuyerSeekerRequestsForUser, type BuyerSeekerRequestSummary } from "@/lib/seeker-requests/workflow";

export type BuyerUnlockSummary = {
  listingId: string;
  title: string;
  category: ListingDocument["category"];
  status: ListingDocument["status"];
  priceRwf: number;
  approximateAreaLabel: string;
  unlockedAt: string;
  amountPaidRwf: number;
  ownerName: string;
  ownerPhone: string;
  stillActive: boolean;
  canViewPublicDetail: boolean;
};

export type BuyerPaymentSummary = {
  id: string;
  reference: string;
  purpose: PaymentDocument["purpose"];
  amountRwf: number;
  status: PaymentDocument["status"];
  listingId: string | null;
  linkedLabel: string | null;
  linkedPath: string | null;
  checkoutPath: string | null;
  checkoutExpiresAt: string | null;
  createdAt: string;
};

export type BuyerWorkspaceData = {
  stats: {
    unlockCount: number;
    totalSpentRwf: number;
    activeUnlockCount: number;
    paymentCount: number;
    pendingPaymentCount: number;
    seekerRequestCount: number;
    activeSeekerRequestCount: number;
  };
  unlockedListings: BuyerUnlockSummary[];
  pendingPayments: BuyerPaymentSummary[];
  recentPayments: BuyerPaymentSummary[];
  recommendedListings: PublicListingSummary[];
  seekerRequests: BuyerSeekerRequestSummary[];
  recentSeekerResponses: SeekerResponseSummary[];
  matchedSeekerConversations: SeekerMatchConversationSummary[];
};

function serializePayment(
  payment: WithId<PaymentDocument>,
  listingMap: Map<string, WithId<ListingDocument>>,
): BuyerPaymentSummary {
  const linkedListing = payment.listingId ? listingMap.get(payment.listingId.toString()) : null;

  return {
    id: payment._id.toString(),
    reference: payment.reference,
    purpose: payment.purpose,
    amountRwf: payment.amountRwf,
    status: payment.status,
    listingId: payment.listingId?.toString() ?? null,
    linkedLabel: linkedListing?.title ?? (payment.listingId ? `Listing ${payment.listingId.toString()}` : null),
    linkedPath: payment.listingId ? `/listings/${payment.listingId.toString()}` : null,
    checkoutPath: payment.checkoutUrl ?? null,
    checkoutExpiresAt: payment.checkoutExpiresAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

export async function getBuyerWorkspaceData(session: AuthSession): Promise<BuyerWorkspaceData> {
  const user = await ensureUserRecord(session);
  const tokenUnlocks = await getCollection("tokenUnlocks");
  const listings = await getCollection("listings");
  const payments = await getCollection("payments");
  const seekerRequests = await getCollection("seekerRequests");
  const feeSettings = await getFeeSettingsSummary();
  const now = new Date();
  const activePendingPaymentFilter = {
    userId: user._id,
    purpose: "token_fee" as const,
    status: "pending" as const,
    $or: [{ checkoutExpiresAt: { $gt: now } }, { checkoutExpiresAt: { $exists: false } }],
  };
  const unlockRecords = await tokenUnlocks
    .find({
      userId: user._id,
    })
    .sort({ unlockedAt: -1 })
    .limit(12)
    .toArray();
  const listingIds = unlockRecords.map((unlock) => unlock.listingId);
  const recentPayments = await payments
    .find({
      userId: user._id,
      purpose: "token_fee",
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
  const [pendingPayments, pendingPaymentCount] = await Promise.all([
    payments.find(activePendingPaymentFilter).sort({ createdAt: -1 }).limit(6).toArray(),
    payments.countDocuments(activePendingPaymentFilter),
  ]);
  const relatedListingIds = [
    ...listingIds,
    ...recentPayments.map((payment) => payment.listingId).filter((listingId): listingId is NonNullable<PaymentDocument["listingId"]> => Boolean(listingId)),
    ...pendingPayments.map((payment) => payment.listingId).filter((listingId): listingId is NonNullable<PaymentDocument["listingId"]> => Boolean(listingId)),
  ];
  const uniqueListingIds = [...new Map(relatedListingIds.map((listingId) => [listingId.toString(), listingId])).values()];
  const paymentMap = new Map(
    recentPayments
      .filter((payment) => payment.listingId)
      .map((payment) => [payment.listingId!.toString(), payment]),
  );
  const relatedListings = uniqueListingIds.length
    ? await listings
        .find({
          _id: { $in: uniqueListingIds },
        })
        .toArray()
    : [];
  const listingMap = new Map(relatedListings.map((listing) => [listing._id.toString(), listing]));
  const aggregate = await payments
    .aggregate<{ _id: null; totalSpentRwf: number; paymentCount: number }>([
      {
        $match: {
          userId: user._id,
          purpose: "token_fee",
          status: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalSpentRwf: { $sum: "$amountRwf" },
          paymentCount: { $sum: 1 },
        },
      },
    ])
    .toArray();
  const totals = aggregate[0] ?? {
    totalSpentRwf: 0,
    paymentCount: 0,
  };
  const [buyerSeekerRequests, recentSeekerResponses, matchedSeekerConversations, seekerRequestCount, activeSeekerRequestCount] =
    await Promise.all([
      getBuyerSeekerRequestsForUser(user._id),
      getBuyerSeekerResponsesForUser(user._id),
      getSeekerMatchConversationFeedForUser(user._id),
      seekerRequests.countDocuments({
        requesterUserId: user._id,
      }),
      seekerRequests.countDocuments({
        requesterUserId: user._id,
        status: "active",
        expiresAt: { $gt: new Date() },
      }),
    ]);

  const unlockedListingSummaries = unlockRecords
    .map((unlock) => {
      const listing = listingMap.get(unlock.listingId.toString());

      if (!listing) {
        return null;
      }

      const payment = paymentMap.get(unlock.listingId.toString());

      return {
        listingId: listing._id.toString(),
        title: listing.title,
        category: listing.category,
        status: listing.status,
        priceRwf: listing.priceRwf,
        approximateAreaLabel: listing.location.approximateAreaLabel,
        unlockedAt: unlock.unlockedAt.toISOString(),
        amountPaidRwf:
          payment?.amountRwf ??
          listing.tokenFeeRwf ??
          resolveListingTokenFeeRwf(feeSettings, listing.category, listing.model),
        ownerName: listing.ownerContact.fullName,
        ownerPhone: listing.ownerContact.phone,
        stillActive: listing.status === "active" && listing.verificationStatus === "approved",
        canViewPublicDetail: isListingPubliclyVisible(listing.status) && listing.verificationStatus === "approved",
      } satisfies BuyerUnlockSummary;
    })
    .filter((listing): listing is BuyerUnlockSummary => listing !== null);

  const recommendedListings = (await getPublicListings({})).slice(0, 4);

  return {
    stats: {
      unlockCount: unlockRecords.length,
      totalSpentRwf: totals.totalSpentRwf,
      activeUnlockCount: unlockedListingSummaries.filter((listing) => listing.stillActive).length,
      paymentCount: totals.paymentCount,
      pendingPaymentCount,
      seekerRequestCount,
      activeSeekerRequestCount,
    },
    unlockedListings: unlockedListingSummaries,
    pendingPayments: pendingPayments.map((payment) => serializePayment(payment, listingMap)),
    recentPayments: recentPayments.map((payment) => serializePayment(payment, listingMap)),
    recommendedListings,
    seekerRequests: buyerSeekerRequests,
    recentSeekerResponses,
    matchedSeekerConversations,
  };
}
