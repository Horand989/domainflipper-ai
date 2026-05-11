import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface DomainRecommendation {
  rank: number;
  domainName: string;
  trustFlow: number | null;
  citationFlow: number | null;
  trustRatio: string | null;
  majTopics: string | null;
  age: number | null;
  reasoning: string;
  sherlockAnalysis: string;
  dueDiligenceChecklist: string;
}

interface BrandingOptions {
  companyName?: string;
  companyLogoUrl?: string;
}

export async function generateAnalysisReportPDF(
  recommendations: DomainRecommendation[],
  branding: BrandingOptions = {}
): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Add company logo if provided
  if (branding.companyLogoUrl) {
    try {
      // In production, fetch and add logo
      // For now, just add placeholder
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("[Company Logo]", pageWidth - 50, yPosition);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  // Add title
  doc.setFontSize(24);
  doc.setTextColor(88, 28, 135); // Purple theme
  doc.text("Domain Analysis Report", 20, yPosition);
  yPosition += 15;

  // Add company name if provided
  if (branding.companyName) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Prepared by: ${branding.companyName}`, 20, yPosition);
    yPosition += 10;
  }

  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 15;

  // Add summary
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Executive Summary", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(60);
  const summaryText = `This report contains ${recommendations.length} domain recommendations based on comprehensive analysis of Trust Flow, Citation Flow, topical relevance, and historical usage patterns.`;
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 40);
  doc.text(splitSummary, 20, yPosition);
  yPosition += splitSummary.length * 5 + 10;

  // Add recommendations
  recommendations.forEach((rec, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Recommendation header
    doc.setFontSize(16);
    doc.setTextColor(88, 28, 135);
    doc.text(`#${rec.rank}: ${rec.domainName}`, 20, yPosition);
    yPosition += 8;

    // Metrics table
    const metricsData = [
      ["Trust Flow", rec.trustFlow?.toString() || "N/A"],
      ["Citation Flow", rec.citationFlow?.toString() || "N/A"],
      ["Trust Ratio", rec.trustRatio || "N/A"],
      ["Age", rec.age ? `${rec.age} years` : "N/A"],
      ["Topics", rec.majTopics || "N/A"],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [["Metric", "Value"]],
      body: metricsData,
      theme: "grid",
      headStyles: { fillColor: [88, 28, 135] },
      margin: { left: 20, right: 20 },
      tableWidth: "auto",
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;

    // Reasoning
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Analysis:", 20, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setTextColor(60);
    const reasoningLines = doc.splitTextToSize(rec.reasoning, pageWidth - 40);
    doc.text(reasoningLines, 20, yPosition);
    yPosition += reasoningLines.length * 5 + 5;

    // Sherlock Check
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Sherlock Check:", 20, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setTextColor(60);
    const sherlockLines = doc.splitTextToSize(rec.sherlockAnalysis, pageWidth - 40);
    doc.text(sherlockLines, 20, yPosition);
    yPosition += sherlockLines.length * 5 + 5;

    // Due Diligence
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Due Diligence Checklist:", 20, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setTextColor(60);
    const checklistLines = doc.splitTextToSize(rec.dueDiligenceChecklist, pageWidth - 40);
    doc.text(checklistLines, 20, yPosition);
    yPosition += checklistLines.length * 5 + 15;
  });

  // Add footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Return as buffer
  return Buffer.from(doc.output("arraybuffer"));
}
