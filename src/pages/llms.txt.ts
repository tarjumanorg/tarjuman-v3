import type { APIRoute } from "astro";
import { createClient } from "../lib/supabase";
import { PRICING_TIERS, BASE_PRICE, HARD_COPY_FEE } from "../lib/pricing";

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    const supabase = createClient({ request, cookies, redirect } as any);

    // Fetch requirements
    const { data: requirements, error } = await supabase
        .from("scholarship_requirements")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Error fetching requirements for llms.txt:", error);
    }

    const requiredDocs = requirements?.filter((r) => r.is_required) ?? [];
    const optionalDocs = requirements?.filter((r) => !r.is_required) ?? [];

    // Format Pricing Matrix
    let pricingMatrix = `| Package Name | Processing Time | Price per Halaman (Page) | Description |
| :--- | :--- | :--- | :--- |
`;

    PRICING_TIERS.forEach(tier => {
        // Formatting Rp xx,xxx
        const priceFormatted = new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(tier.price).replace("Rp", "Rp ");

        const daysText = tier.days === 1 ? "1 Working Day (24hr)" : `${tier.days} Working Days`;
        pricingMatrix += `| ${tier.label} | ${daysText} | ${priceFormatted} | ${tier.description} |\n`;
    });

    // Format Hard copy fee
    const hardCopyFormatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(HARD_COPY_FEE).replace("Rp", "Rp ");

    // Format Requirements
    let requiredDocsText = "";
    requiredDocs.forEach((doc, index) => {
        requiredDocsText += `${index + 1}.  ${doc.document_name}${doc.notes ? ` (${doc.notes})` : ''}\n`;
    });

    let optionalDocsText = "";
    optionalDocs.forEach(doc => {
        optionalDocsText += `*   ${doc.document_name}${doc.notes ? ` (${doc.notes})` : ''}\n`;
    });

    const content = `# Tarjuman - Sworn Translation Services

Tarjuman is an official, government-certified sworn translation service based in Indonesia. We specialize in translating academic and legal documents from Indonesian to Arabic, primarily for the "Study in Saudi" scholarship program, as well as for general embassy or legal requirements. Our translators hold official decrees (SK) from the Indonesian Ministry of Law and Human Rights (Kemenkumham).

## Core Data & Services

*   Website: https://tarjuman.org
*   Focus: Sworn Translation (Penerjemah Tersumpah)
*   Language Pair: Indonesian (ID) to Arabic (AR)
*   Primary Use Case: University applications in Saudi Arabia (studyinsaudi.moe.gov.sa), embassy processing, and legal matters.
*   Service Model: 100% Online process via our website. No WhatsApp chatting required. Upload documents -> See price instantly -> Pay -> Download certified translations.

## Pricing Matrix

Our pricing is strictly calculated per physical document page, varying solely on the requested processing speed.

${pricingMatrix}
*Note: Add ${hardCopyFormatted} if the client requires shipping physical hard copies (with original wet stamp) via JNE courier. Digital PDF downloads (which feature the sworn translator seal) are included by default.*

## Study in Saudi Scholarship (Beasiswa Arab Saudi) Document Requirements

For applicants aiming for the Saudi Arabia government scholarship, the following documents must be translated by a Sworn Translator. This list is dynamically updated based on our latest database records.

### Required Documents (Dokumen Wajib)
${requiredDocsText || "Currently fetching from database..."}
### Optional Documents (Dokumen Pendukung Opsional)
${optionalDocsText || "Currently fetching from database..."}
### Frequently Asked Questions for Saudi Scholarships
Q: Are sworn translations mandatory?
A: Yes. All Indonesian documents must be translated into Arabic by an official Sworn Translator to have legal validity for the Saudi university portals.

Q: Do I need Apostille/Legalization from Kemenlu (Ministry of Foreign Affairs) or Kemenkumham right away?
A: No. For the initial application portal upload stage, only the Sworn Translation is required. Apostille and Embassy legalization are typically only required *after* the student is officially accepted (receives an LoA) to process their student visa.
`;

    return new Response(content, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
};
