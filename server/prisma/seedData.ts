export interface PipelineCategoryField {
  label: string;
  options: string[];
}

export interface PipelineTagField {
  label: string;
  options: string[];
}

// Pipeline categories from the reference design (pmos-pipeline-board html).
// Shared so the categories-only seed (prisma/seedCategories.ts) updates existing
// pipelines with the same data.
export const PIPELINE_CATEGORY_FIELDS: Record<string, PipelineCategoryField> = {
  leasing: { label: "Source", options: ["Zillow", "Apartments.com", "MLS", "Referral", "Drive-by", "Other"] },
  maintenance: { label: "Category", options: ["HVAC", "Plumbing", "Electrical", "General", "Appliance"] },
  turns: { label: "Turn Size", options: ["Light Turn", "Standard Turn", "Heavy Turn"] },
  escalation: { label: "Violation Type", options: ["Non-payment", "Noise", "Damage", "Lease Violation", "Illegal Activity", "Unauthorized Occupant", "Habitability"] },
};

// Tag/priority dropdowns per pipeline — values still live on the ticket's `tag`
// column so SLA/overdue tracking and card chips keep working.
export const PIPELINE_TAG_FIELDS: Record<string, PipelineTagField> = {
  leasing: { label: "Lead Temp", options: ["Hot", "Warm", "Cold"] },
  maintenance: { label: "Urgency", options: ["Emergency", "Urgent", "Routine"] },
  turns: { label: "Priority", options: ["Rush", "Standard"] },
  escalation: { label: "Severity", options: ["Severe", "Moderate", "Minor"] },
};