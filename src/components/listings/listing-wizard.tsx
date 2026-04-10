"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

import { type AuthUser } from "@/lib/auth/types";
import type { CommissionGuardData } from "@/lib/commissions/workflow";
import type { PenaltyGuardData } from "@/lib/penalties/workflow";
import {
  type ListingCategory,
  type ListingMedia,
  type ListingModel,
  type OwnerType,
  type OwnershipProofAsset,
} from "@/lib/domain";
import type { FeeSettingsSummary } from "@/lib/fee-settings/workflow";
import { formatRwf } from "@/lib/formatting/currency";
import { uploadListingImage, uploadOwnershipProof } from "@/lib/uploads/cloudinary-client";

const categoryOptions: Array<{ value: ListingCategory; label: string; description: string }> = [
  { value: "real_estate_rent", label: "Real Estate Rent", description: "Homes, apartments, and commercial spaces for rent." },
  { value: "real_estate_sale", label: "Real Estate Sale", description: "Land, homes, and buildings listed for sale." },
  { value: "vehicles_for_sale", label: "Vehicles for Sale", description: "Single vehicles sold directly by verified owners." },
  { value: "vehicle_resellers", label: "Vehicle Resellers", description: "Dealer or reseller inventory, always Model B." },
  { value: "furniture", label: "Furniture", description: "Home and office furniture from verified sellers." },
  { value: "made_in_rwanda", label: "Made in Rwanda", description: "Locally produced products and handcrafted goods." },
  { value: "home_appliances", label: "Home Appliances", description: "Appliances and electronics for home use." },
  { value: "business_industry", label: "Business and Industry", description: "Industrial items, machinery, and business assets." },
];

const ownerTypeOptions: Array<{ value: OwnerType; label: string; hint: string }> = [
  { value: "owner", label: "Owner", hint: "You own the asset and can list it directly." },
  { value: "manager", label: "Manager", hint: "You manage the asset on behalf of the owner." },
  { value: "third_party", label: "Third Party", hint: "You represent the owner with permission to list." },
];

const durationOptions = [1, 2, 3, 6, 12] as const;
const localStorageKey = "getownerinfo-listing-draft-v2";

type EligibilityResponse = {
  status: "ok";
  result: {
    eligibleForModelA: boolean;
    forcedModelB: boolean;
    thresholdRwf: number | null;
    reasons: string[];
    selectedModel: ListingModel;
    canChooseModelA: boolean;
  };
};

type DraftResponse = {
  status: "ok";
  draftId: string;
  created: boolean;
};

type SubmitDraftResponse = {
  status: "ok";
  listingId: string;
  listingStatus: string;
};

type WizardSnapshot = {
  draftId?: string;
  category: ListingCategory;
  ownerType: OwnerType;
  fullName: string;
  phone: string;
  email: string;
  approximateAreaLabel: string;
  district: string;
  upiNumber: string;
  streetAddress: string;
  houseNumber: string;
  priceRwf: string;
  units: string;
  requestedModel: ListingModel;
  durationMonths: (typeof durationOptions)[number];
  tokenFeeEnabled: boolean;
  title: string;
  description: string;
  features: string[];
  media: ListingMedia[];
  ownershipProof: OwnershipProofAsset | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isListingMedia(value: unknown): value is ListingMedia {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.assetId === "string" &&
    typeof value.publicId === "string" &&
    typeof value.url === "string" &&
    typeof value.originalFilename === "string" &&
    typeof value.isCover === "boolean"
  );
}

function isOwnershipProofAsset(value: unknown): value is OwnershipProofAsset {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.assetId === "string" &&
    typeof value.publicId === "string" &&
    typeof value.url === "string" &&
    typeof value.originalFilename === "string" &&
    value.deliveryType === "authenticated"
  );
}

function normalizeMedia(media: ListingMedia[]) {
  if (media.length === 0) {
    return [];
  }

  const coverId = media.find((item) => item.isCover)?.assetId ?? media[0].assetId;

  return media.map((item) => ({
    ...item,
    isCover: item.assetId === coverId,
  }));
}

export function ListingWizard({
  signedInUser,
  feeSettings,
  commissionGuard,
  penaltyGuard,
}: {
  signedInUser: AuthUser;
  feeSettings: FeeSettingsSummary;
  commissionGuard: CommissionGuardData;
  penaltyGuard: PenaltyGuardData;
}) {
  const [category, setCategory] = useState<ListingCategory>("real_estate_rent");
  const [ownerType, setOwnerType] = useState<OwnerType>("owner");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [approximateAreaLabel, setApproximateAreaLabel] = useState("");
  const [district, setDistrict] = useState("");
  const [upiNumber, setUpiNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [priceRwf, setPriceRwf] = useState("1500000");
  const [units, setUnits] = useState("1");
  const [requestedModel, setRequestedModel] = useState<ListingModel>("B");
  const [durationMonths, setDurationMonths] = useState<(typeof durationOptions)[number]>(1);
  const [tokenFeeEnabled, setTokenFeeEnabled] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [featureInput, setFeatureInput] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [media, setMedia] = useState<ListingMedia[]>([]);
  const [ownershipProof, setOwnershipProof] = useState<OwnershipProofAsset | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResponse["result"] | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [hasLoadedLocalDraft, setHasLoadedLocalDraft] = useState(false);

  const deferredCategory = useDeferredValue(category);
  const deferredUnits = useDeferredValue(units);
  const deferredPrice = useDeferredValue(priceRwf);

  const parsedUnits = Number.parseInt(units, 10);
  const parsedPrice = Number.parseInt(priceRwf, 10);
  const isEligibilityReady = Number.isInteger(parsedUnits) && parsedUnits > 0 && Number.isInteger(parsedPrice) && parsedPrice > 0;

  useEffect(() => {
    try {
      const rawSnapshot = window.localStorage.getItem(localStorageKey);

      if (!rawSnapshot) {
        setHasLoadedLocalDraft(true);
        return;
      }

      const snapshot = JSON.parse(rawSnapshot) as Partial<WizardSnapshot>;

      if (typeof snapshot.draftId === "string" && snapshot.draftId.trim()) setSavedDraftId(snapshot.draftId);
      if (typeof snapshot.category === "string") setCategory(snapshot.category);
      if (typeof snapshot.ownerType === "string") setOwnerType(snapshot.ownerType);
      if (typeof snapshot.fullName === "string") setFullName(snapshot.fullName);
      if (typeof snapshot.phone === "string") setPhone(snapshot.phone);
      if (typeof snapshot.email === "string") setEmail(snapshot.email);
      if (typeof snapshot.approximateAreaLabel === "string") setApproximateAreaLabel(snapshot.approximateAreaLabel);
      if (typeof snapshot.district === "string") setDistrict(snapshot.district);
      if (typeof snapshot.upiNumber === "string") setUpiNumber(snapshot.upiNumber);
      if (typeof snapshot.streetAddress === "string") setStreetAddress(snapshot.streetAddress);
      if (typeof snapshot.houseNumber === "string") setHouseNumber(snapshot.houseNumber);
      if (typeof snapshot.priceRwf === "string") setPriceRwf(snapshot.priceRwf);
      if (typeof snapshot.units === "string") setUnits(snapshot.units);
      if (snapshot.requestedModel === "A" || snapshot.requestedModel === "B") setRequestedModel(snapshot.requestedModel);
      if (typeof snapshot.durationMonths === "number" && durationOptions.includes(snapshot.durationMonths)) setDurationMonths(snapshot.durationMonths);
      if (typeof snapshot.tokenFeeEnabled === "boolean") setTokenFeeEnabled(snapshot.tokenFeeEnabled);
      if (typeof snapshot.title === "string") setTitle(snapshot.title);
      if (typeof snapshot.description === "string") setDescription(snapshot.description);
      if (Array.isArray(snapshot.features)) setFeatures(snapshot.features.filter((item): item is string => typeof item === "string").slice(0, 20));
      if (Array.isArray(snapshot.media)) setMedia(normalizeMedia(snapshot.media.filter(isListingMedia).slice(0, 10)));
      if (snapshot.ownershipProof && isOwnershipProofAsset(snapshot.ownershipProof)) setOwnershipProof(snapshot.ownershipProof);

      setLocalMessage("Restored your local browser draft.");
    } catch {
      setLocalMessage("Could not restore the saved browser draft.");
    } finally {
      setHasLoadedLocalDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalDraft) {
      return;
    }

    const snapshot: WizardSnapshot = {
      draftId: savedDraftId ?? undefined,
      category,
      ownerType,
      fullName,
      phone,
      email,
      approximateAreaLabel,
      district,
      upiNumber,
      streetAddress,
      houseNumber,
      priceRwf,
      units,
      requestedModel,
      durationMonths,
      tokenFeeEnabled,
      title,
      description,
      features,
      media,
      ownershipProof,
    };

    window.localStorage.setItem(localStorageKey, JSON.stringify(snapshot));
  }, [
    approximateAreaLabel,
    category,
    description,
    district,
    durationMonths,
    email,
    features,
    fullName,
    hasLoadedLocalDraft,
    houseNumber,
    media,
    ownerType,
    ownershipProof,
    phone,
    priceRwf,
    requestedModel,
    savedDraftId,
    streetAddress,
    title,
    tokenFeeEnabled,
    units,
    upiNumber,
  ]);

  useEffect(() => {
    setFullName((current) => current || signedInUser.fullName);
    setPhone((current) => current || signedInUser.phone || "");
    setEmail((current) => current || signedInUser.email || "");
  }, [signedInUser.email, signedInUser.fullName, signedInUser.phone]);

  useEffect(() => {
    if (!isEligibilityReady) {
      setEligibility(null);
      setEligibilityError("Enter a valid unit count and price to calculate the model.");
      return;
    }

    const controller = new AbortController();
    setEligibilityError(null);

    async function loadEligibility() {
      try {
        const params = new URLSearchParams({
          category: deferredCategory,
          units: deferredUnits,
          priceRwf: deferredPrice,
          requestedModel,
        });

        const response = await fetch(`/api/listings/eligibility?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not calculate listing eligibility.");
        }

        const data = (await response.json()) as EligibilityResponse;
        setEligibility(data.result);

        if (!data.result.eligibleForModelA && requestedModel === "A") {
          setRequestedModel("B");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setEligibility(null);
        setEligibilityError(error instanceof Error ? error.message : "Eligibility check failed.");
      }
    }

    void loadEligibility();

    return () => controller.abort();
  }, [deferredCategory, deferredPrice, deferredUnits, isEligibilityReady, requestedModel]);

  function addFeature() {
    const nextValue = featureInput.trim();

    if (!nextValue || features.includes(nextValue)) {
      setFeatureInput("");
      return;
    }

    setFeatures((current) => [...current, nextValue].slice(0, 20));
    setFeatureInput("");
  }

  function removeFeature(value: string) {
    setFeatures((current) => current.filter((feature) => feature !== value));
  }

  function setCoverImage(assetId: string) {
    setMedia((current) => normalizeMedia(current.map((item) => ({ ...item, isCover: item.assetId === assetId }))));
  }

  function removeImage(assetId: string) {
    setMedia((current) => normalizeMedia(current.filter((item) => item.assetId !== assetId)));
  }

  function removeOwnershipProof() {
    setOwnershipProof(null);
  }

  async function handleListingImageUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setUploadMessage(null);
    setUploadError(null);
    setIsUploadingImages(true);

    try {
      const selectedFiles = Array.from(files);
      const remainingSlots = Math.max(10 - media.length, 0);

      if (remainingSlots === 0) {
        throw new Error("You already uploaded the maximum of 10 listing images.");
      }

      const filesToUpload = selectedFiles.slice(0, remainingSlots);
      const uploadedAssets: ListingMedia[] = [];

      for (const file of filesToUpload) {
        const uploaded = await uploadListingImage(file);
        uploadedAssets.push(uploaded);
      }

      setMedia((current) => normalizeMedia([...current, ...uploadedAssets].slice(0, 10)));
      setUploadMessage(`Uploaded ${uploadedAssets.length} listing image${uploadedAssets.length > 1 ? "s" : ""}.`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function handleOwnershipProofUpload(file: File | null) {
    if (!file) {
      return;
    }

    setUploadMessage(null);
    setUploadError(null);
    setIsUploadingProof(true);

    try {
      const uploaded = await uploadOwnershipProof(file);
      setOwnershipProof(uploaded);
      setUploadMessage("Ownership proof uploaded successfully.");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Ownership proof upload failed.");
    } finally {
      setIsUploadingProof(false);
    }
  }

  function isFormReady() {
    return (
      fullName.trim().length > 1 &&
      phone.trim().length > 5 &&
      approximateAreaLabel.trim().length > 1 &&
      title.trim().length >= 10 &&
      description.trim().length >= 20 &&
      Number.isInteger(parsedUnits) &&
      parsedUnits > 0 &&
      Number.isInteger(parsedPrice) &&
      parsedPrice > 0
    );
  }

  function buildDraftPayload() {
    return {
      draftId: savedDraftId,
      ownerType,
      ownerContact: {
        fullName,
        phone,
        email,
      },
      category,
      title,
      description,
      priceRwf: parsedPrice,
      units: parsedUnits,
      requestedModel,
      durationMonths,
      tokenFeeEnabled,
      location: {
        approximateAreaLabel,
        district,
        upiNumber,
        streetAddress,
        houseNumber,
      },
      media,
      ownershipProof,
      features,
    };
  }

  async function saveDraftToServer(showSuccessMessage = true) {
    if (isBlockedByPenalty) {
      setDraftError("You have an unpaid penalty. Please resolve it to continue using the platform.");
      return null;
    }

    if (isBlockedByCommission) {
      setDraftError("Your commission payment is overdue. New listings are paused until this is resolved.");
      return null;
    }

    setDraftMessage(null);
    setDraftError(null);
    setIsSavingDraft(true);

    try {
      const response = await fetch("/api/listings/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildDraftPayload()),
      });

      const payload = (await response.json()) as DraftResponse & { message?: string; errors?: string[] };

      if (!response.ok) {
        const errorMessage = payload.errors?.join(" ") || payload.message || "Draft save failed.";
        throw new Error(errorMessage);
      }

      setSavedDraftId(payload.draftId);

      if (showSuccessMessage) {
        setDraftMessage(
          payload.created
            ? `Draft saved successfully. Draft ID: ${payload.draftId}`
            : `Draft updated successfully. Draft ID: ${payload.draftId}`,
        );
      }

      return payload.draftId;
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Draft save failed.");
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  }

  function saveDraft() {
    void saveDraftToServer(true);
  }

  async function submitForReview() {
    if (isBlockedByPenalty) {
      setDraftError("You have an unpaid penalty. Please resolve it to continue using the platform.");
      return;
    }

    if (isBlockedByCommission) {
      setDraftError("Your commission payment is overdue. New listings are paused until this is resolved.");
      return;
    }

    if (!isFormReady()) {
      setDraftError("Finish the required listing details before submitting for review.");
      return;
    }

    setDraftMessage(null);
    setDraftError(null);
    setIsSubmittingDraft(true);

    try {
      const draftId = savedDraftId ?? (await saveDraftToServer(false));

      if (!draftId) {
        throw new Error("Save the draft successfully before submitting it for review.");
      }

      const response = await fetch(`/api/listings/drafts/${draftId}/submit`, {
        method: "POST",
      });
      const payload = (await response.json()) as SubmitDraftResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Draft submission failed.");
      }

      setDraftMessage(`Draft submitted for admin review. Listing ID: ${payload.listingId}`);
      setLocalMessage("The draft is now linked to a pending review listing. You can still keep refining and resubmitting it if needed.");
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Draft submission failed.");
    } finally {
      setIsSubmittingDraft(false);
    }
  }

  const summaryModel = eligibility?.selectedModel ?? "B";
  const selectedCategoryLabel = categoryOptions.find((option) => option.value === category)?.label ?? category;
  const currentTokenFeeRwf = feeSettings.listingTokenFeeMatrix[category][summaryModel];
  const isBusy = isSavingDraft || isSubmittingDraft;
  const isBlockedByCommission = commissionGuard.blocked;
  const isBlockedByPenalty = penaltyGuard.blocked;
  const isBlockedFromListing = isBlockedByPenalty || isBlockedByCommission;
  const completenessItems = [
    { label: "Owner details", done: fullName.trim().length > 1 && phone.trim().length > 5 },
    { label: "Location", done: approximateAreaLabel.trim().length > 1 },
    { label: "Pricing", done: Number.isInteger(parsedPrice) && parsedPrice > 0 && Number.isInteger(parsedUnits) && parsedUnits > 0 },
    { label: "Listing copy", done: title.trim().length >= 10 && description.trim().length >= 20 },
    { label: "Images", done: media.length > 0 },
    { label: "Ownership proof", done: Boolean(ownershipProof) },
  ];

  return (
    <main className="page-shell mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]">
            Back to Home
          </Link>
          <p className="eyebrow text-[var(--primary-light)]">Listing creation</p>
          <h1 className="font-[var(--font-display)] text-4xl leading-tight text-white md:text-5xl">Start a trust-first listing draft.</h1>
          <p className="max-w-3xl text-base leading-7 text-[var(--dark-copy)]">
            Move from category selection to a review-ready draft with pricing guidance, autosave, media uploads, and
            admin-only proof handling.
          </p>
          {isBlockedByPenalty ? (
            <div className="max-w-3xl rounded-[20px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm leading-6 text-[#9c2d2d]">
              You have an unpaid penalty. New listings are paused until this is resolved. Current unpaid penalty balance:{" "}
              <span className="font-semibold">{formatRwf(penaltyGuard.unpaidAmountRwf)}</span>.
            </div>
          ) : null}
          {!isBlockedByPenalty && isBlockedByCommission ? (
            <div className="max-w-3xl rounded-[20px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm leading-6 text-[#9c2d2d]">
              Your commission payment is overdue. New listings are paused until this is resolved. Outstanding overdue balance:{" "}
              <span className="font-semibold">{formatRwf(commissionGuard.overdueAmountRwf)}</span>.
            </div>
          ) : null}
          <div className="inline-flex rounded-full border border-[rgba(184,196,194,0.18)] bg-[rgba(28,45,56,0.84)] px-4 py-2 text-sm font-medium text-[var(--primary-light)]">
            Signed in as {signedInUser.fullName} ({signedInUser.role})
          </div>
        </div>
        <div className="hero-panel px-5 py-4 text-white">
          <p className="eyebrow text-[var(--primary-light)]">Current recommendation</p>
          <p className="mt-2 font-[var(--font-display)] text-2xl text-[var(--primary)]">{summaryModel === "A" ? "Model A" : "Model B"}</p>
          <p className="mt-1 max-w-xs text-sm leading-6 text-[rgba(232,237,235,0.78)]">
            {eligibility?.eligibleForModelA ? "This listing can choose between exclusive commission flow and pay-to-list." : "The current inputs keep the listing on the pay-to-list path."}
          </p>
        </div>
      </div>

      {localMessage ? <div className="rounded-2xl border border-[rgba(26,92,138,0.2)] bg-[rgba(26,92,138,0.08)] px-4 py-3 text-sm text-[#1a5c8a]">{localMessage}</div> : null}

      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Step 1</p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl">Category and ownership</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {categoryOptions.map((option) => {
                const active = option.value === category;
                return (
                  <button key={option.value} type="button" onClick={() => setCategory(option.value)} className={`rounded-[22px] border p-4 text-left transition ${active ? "border-[var(--primary)] bg-[rgba(26,77,46,0.08)]" : "border-[var(--border)] bg-white"}`}>
                    <p className="font-semibold text-[var(--foreground)]">{option.label}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{option.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {ownerTypeOptions.map((option) => {
                const active = option.value === ownerType;
                return (
                  <button key={option.value} type="button" onClick={() => setOwnerType(option.value)} className={`rounded-[22px] border p-4 text-left transition ${active ? "border-[var(--primary)] bg-[var(--surface-alt)]" : "border-[var(--border)] bg-white"}`}>
                    <p className="font-semibold text-[var(--foreground)]">{option.label}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{option.hint}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Step 2</p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl">Owner contact and location</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" placeholder="Owner full name" />
              <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" placeholder="Phone number" />
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)] md:col-span-2" placeholder="Email address" />
              <input value={approximateAreaLabel} onChange={(event) => setApproximateAreaLabel(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" placeholder="Approximate area label" />
              <input value={district} onChange={(event) => setDistrict(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" placeholder="District" />
              <input value={upiNumber} onChange={(event) => setUpiNumber(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" placeholder="UPI number" />
              <input value={streetAddress} onChange={(event) => setStreetAddress(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" placeholder="Street address" />
              <input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" placeholder="House number" />
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Step 3</p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl">Pricing, duration, and model</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input value={units} onChange={(event) => setUnits(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" inputMode="numeric" placeholder="Units" />
              <input value={priceRwf} onChange={(event) => setPriceRwf(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" inputMode="numeric" placeholder="Price in Rwf" />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {durationOptions.map((duration) => (
                <button key={duration} type="button" onClick={() => setDurationMonths(duration)} className={`rounded-full border px-4 py-3 text-sm font-semibold transition ${durationMonths === duration ? "border-[var(--accent)] bg-[rgba(200,134,10,0.12)] text-[var(--accent)]" : "border-[var(--border)] bg-white text-[var(--foreground)]"}`}>
                  {duration} month{duration > 1 ? "s" : ""}
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => setRequestedModel("A")} disabled={!eligibility?.canChooseModelA} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${requestedModel === "A" ? "border-[var(--primary)] bg-[rgba(26,77,46,0.08)] text-[var(--primary)]" : "border-[var(--border)] bg-white text-[var(--foreground)]"} ${!eligibility?.canChooseModelA ? "cursor-not-allowed opacity-40" : ""}`}>Choose Model A</button>
              <button type="button" onClick={() => setRequestedModel("B")} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${requestedModel === "B" ? "border-[var(--primary)] bg-[rgba(26,77,46,0.08)] text-[var(--primary)]" : "border-[var(--border)] bg-white text-[var(--foreground)]"}`}>Choose Model B</button>
              <button type="button" onClick={() => setTokenFeeEnabled((current) => !current)} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${tokenFeeEnabled ? "border-[var(--accent)] bg-[rgba(200,134,10,0.12)] text-[var(--accent)]" : "border-[var(--border)] bg-white text-[var(--foreground)]"}`}>Buyer token fee {tokenFeeEnabled ? "enabled" : "disabled"}</button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              {tokenFeeEnabled
                ? `Current platform unlock fee for ${selectedCategoryLabel} / Model ${summaryModel}: ${formatRwf(currentTokenFeeRwf)}.`
                : "Buyer token unlock is currently disabled for this listing draft."}
            </p>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Step 4</p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl">Listing details</h2>
            <div className="mt-5 grid gap-4">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" placeholder="Listing title" />
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-40 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" placeholder="Describe what makes this listing worth unlocking." />
              <div className="flex flex-col gap-3 md:flex-row">
                <input value={featureInput} onChange={(event) => setFeatureInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addFeature(); } }} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]" placeholder="Add a feature" />
                <button type="button" onClick={addFeature} className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-light)]">Add feature</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {features.map((feature) => (
                  <button key={feature} type="button" onClick={() => removeFeature(feature)} className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-1.5 text-sm text-[var(--primary)]">
                    {feature} x
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Step 5</p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl">Media and ownership proof</h2>
            <div className="mt-5 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <label className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">Listing images</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Upload up to 10 JPG, PNG, or WEBP images. Keep each image under 5MB.</p>
                  </div>
                  <span className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">{isUploadingImages ? "Uploading..." : "Upload images"}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={isUploadingImages} onChange={(event) => { void handleListingImageUpload(event.target.files); event.currentTarget.value = ""; }} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {media.map((item) => (
                    <div key={item.assetId} className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-white">
                      <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url("${item.url}")` }} />
                      <div className="space-y-3 p-4">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.originalFilename}</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setCoverImage(item.assetId)} className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${item.isCover ? "bg-[rgba(26,77,46,0.12)] text-[var(--primary)]" : "border border-[var(--border)] text-[var(--muted)]"}`}>{item.isCover ? "Cover image" : "Set as cover"}</button>
                          <button type="button" onClick={() => removeImage(item.assetId)} className="rounded-full border border-[rgba(184,50,50,0.18)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#9c2d2d]">Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {media.length === 0 ? <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white px-4 py-6 text-sm text-[var(--muted)]">No listing images uploaded yet.</div> : null}
              </div>

              <div className="space-y-4">
                <label className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">Ownership proof</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Upload a JPG, PNG, or PDF document. This stays admin-only and is never shown to buyers.</p>
                  </div>
                  <span className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">{isUploadingProof ? "Uploading..." : "Upload proof"}</span>
                  <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" disabled={isUploadingProof} onChange={(event) => { void handleOwnershipProofUpload(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
                </label>
                <div className="rounded-[24px] border border-[var(--border)] bg-white p-4">
                  {ownershipProof ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{ownershipProof.originalFilename}</p>
                      <div className="rounded-2xl bg-[rgba(26,122,74,0.08)] px-3 py-2 text-xs font-medium text-[var(--primary)]">Admin-only upload stored as an authenticated Cloudinary asset.</div>
                      <button type="button" onClick={removeOwnershipProof} className="rounded-full border border-[rgba(184,50,50,0.18)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#9c2d2d]">Remove proof</button>
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-[var(--muted)]">No ownership proof uploaded yet. You can still save the draft now and add the proof before submission.</p>
                  )}
                </div>
              </div>
            </div>
            {uploadMessage ? <div className="mt-4 rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">{uploadMessage}</div> : null}
            {uploadError ? <div className="mt-4 rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">{uploadError}</div> : null}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-[rgba(26,77,46,0.14)] bg-[linear-gradient(180deg,rgba(26,77,46,0.98),rgba(20,92,56,1))] p-6 text-white shadow-[0_20px_50px_rgba(26,77,46,0.22)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.72)]">Eligibility engine</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl">{eligibility?.eligibleForModelA ? "Model A is available" : "Model B applies"}</h2>
            <p className="mt-3 text-sm leading-6 text-[rgba(255,255,255,0.84)]">{eligibilityError ? eligibilityError : "The recommendation updates automatically as you change category, units, and price."}</p>
            {eligibility?.thresholdRwf ? <div className="mt-5 rounded-2xl border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.08)] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.68)]">Model A threshold</p><p className="mt-2 text-lg font-semibold">{formatRwf(eligibility.thresholdRwf)}</p></div> : null}
            <ul className="mt-5 space-y-3 text-sm leading-6 text-[rgba(255,255,255,0.88)]">{eligibility?.reasons.map((reason) => <li key={reason}>- {reason}</li>)}</ul>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Draft summary</p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--muted)]">
              <div><p className="font-semibold text-[var(--foreground)]">Category</p><p>{selectedCategoryLabel}</p></div>
              <div><p className="font-semibold text-[var(--foreground)]">Owner</p><p>{fullName || "Add owner contact details."}</p></div>
              <div><p className="font-semibold text-[var(--foreground)]">Location</p><p>{approximateAreaLabel || "Add an approximate area label."}</p></div>
              <div><p className="font-semibold text-[var(--foreground)]">Pricing</p><p>{Number.isInteger(parsedPrice) && parsedPrice > 0 ? formatRwf(parsedPrice) : "Enter a valid price."}</p><p>{Number.isInteger(parsedUnits) && parsedUnits > 0 ? `${parsedUnits} unit(s)` : "Enter unit count."}</p></div>
              <div><p className="font-semibold text-[var(--foreground)]">Model preference</p><p>Requested: Model {requestedModel} - Recommended: Model {summaryModel}</p><p>{tokenFeeEnabled ? `Unlock fee: ${formatRwf(currentTokenFeeRwf)}` : "Unlock fee disabled"}</p></div>
              <div><p className="font-semibold text-[var(--foreground)]">Uploads</p><p>{media.length} listing image(s)</p><p>{ownershipProof ? "Ownership proof uploaded" : "Ownership proof pending"}</p></div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]">Completeness</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
                  {completenessItems.map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-3">
                      <span>{item.label}</span>
                      <span className={item.done ? "text-[var(--primary)]" : "text-[var(--muted)]"}>{item.done ? "Ready" : "Pending"}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-xs leading-5 text-[var(--muted)]">
                {savedDraftId ? `Server draft linked: ${savedDraftId}` : "No server draft linked yet. Save once to create the persistent draft record."}
              </div>
              <button type="button" disabled={!isFormReady() || isBusy || isBlockedFromListing} onClick={saveDraft} className={`w-full rounded-2xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${!isFormReady() || isBusy || isBlockedFromListing ? "cursor-not-allowed bg-[rgba(26,77,46,0.45)]" : "bg-[var(--primary)] hover:bg-[var(--primary-light)]"}`}>{isSavingDraft ? "Saving draft..." : "Save draft"}</button>
              <button type="button" disabled={!isFormReady() || isBusy || isBlockedFromListing} onClick={() => { void submitForReview(); }} className={`w-full rounded-2xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${!isFormReady() || isBusy || isBlockedFromListing ? "cursor-not-allowed bg-[rgba(200,134,10,0.45)]" : "bg-[var(--accent)] hover:bg-[#a06b08]"}`}>{isSubmittingDraft ? "Submitting for review..." : "Submit for review"}</button>
              <p className="text-xs leading-5 text-[var(--muted)]">Browser autosave is active. Persistent save and admin submission now use the same server-side draft record.</p>
              {draftMessage ? <div className="rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">{draftMessage}</div> : null}
              {draftError ? <div className="rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">{draftError}</div> : null}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
