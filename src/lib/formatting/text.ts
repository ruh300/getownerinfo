import type { ListingCategory } from "@/lib/domain";

export const categoryLabels: Record<ListingCategory, string> = {
  real_estate_rent: "Real Estate Rent",
  real_estate_sale: "Real Estate Sale",
  vehicles_for_sale: "Vehicles for Sale",
  vehicle_resellers: "Vehicle Resellers",
  furniture: "Furniture",
  made_in_rwanda: "Made in Rwanda",
  home_appliances: "Home Appliances",
  business_industry: "Business and Industry",
};

export function getCategoryLabel(category: ListingCategory) {
  return categoryLabels[category];
}

export function humanizeEnum(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
