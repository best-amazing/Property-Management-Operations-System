export interface PipelineCategoryField {
  label: string;
  options: string[];
}

// Pipeline categories defined in the main seed. Shared so the categories-only
// seed (prisma/seedCategories.ts) updates existing pipelines with the same data.
export const PIPELINE_CATEGORY_FIELDS: Record<string, PipelineCategoryField> = {
  leasing: { label: "Category", options: ["New Lease", "Renewal", "Transfer"] },
  maintenance: { label: "Category", options: ["Plumbing", "Electrical", "HVAC", "General"] },
};