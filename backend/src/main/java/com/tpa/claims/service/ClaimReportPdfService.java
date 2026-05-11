package com.tpa.claims.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.HeaderFooter;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ExtractedClaimData;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.repository.ExtractedClaimDataRepository;
import com.tpa.client.entity.ClientClaimValidation;
import com.tpa.client.repository.ClientClaimValidationRepository;
import com.tpa.customer.entity.Customer;
import com.tpa.customer.repository.CustomerRepository;
import com.tpa.exception.ResourceNotFoundException;
import com.tpa.exception.ValidationException;
import com.tpa.fmg.entity.FmgClaimDecision;
import com.tpa.fmg.entity.FmgClaimDecisionRule;
import com.tpa.fmg.entity.FmgManualReview;
import com.tpa.fmg.repository.FmgClaimDecisionRepository;
import com.tpa.fmg.repository.FmgManualReviewRepository;
import com.tpa.rules.dto.RuleOutcome;
import com.tpa.timeline.dto.TimelineEntryDto;
import com.tpa.timeline.service.ClaimTimelineService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class ClaimReportPdfService {

    private final ClaimRepository claimRepository;
    private final ExtractedClaimDataRepository extractedClaimDataRepository;
    private final CustomerRepository customerRepository;
    private final ClaimTimelineService claimTimelineService;
    private final ClientClaimValidationRepository clientClaimValidationRepository;
    private final FmgClaimDecisionRepository fmgClaimDecisionRepository;
    private final FmgManualReviewRepository fmgManualReviewRepository;

    // ── Colour Palette ───────────────────────────────────────────────────
    private static final Color BRAND_DARK   = new Color(15, 23, 42);    // slate-900
    private static final Color BRAND_ACCENT = new Color(79, 70, 229);   // indigo-600
    private static final Color SECTION_BG   = new Color(248, 250, 252); // slate-50
    private static final Color TABLE_HEADER = new Color(30, 41, 59);    // slate-800
    private static final Color BORDER_COLOR = new Color(226, 232, 240); // slate-200
    private static final Color SUCCESS_BG   = new Color(220, 252, 231); // green-100
    private static final Color SUCCESS_TEXT  = new Color(22, 101, 52);   // green-800
    private static final Color DANGER_BG    = new Color(254, 226, 226); // red-100
    private static final Color DANGER_TEXT   = new Color(153, 27, 27);   // red-800
    private static final Color MUTED_TEXT   = new Color(100, 116, 139); // slate-500
    private static final Color WHITE        = Color.WHITE;

    // ── Fonts ────────────────────────────────────────────────────────────
    private static final Font TITLE_FONT       = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, BRAND_DARK);
    private static final Font SUBTITLE_FONT    = FontFactory.getFont(FontFactory.HELVETICA, 11, MUTED_TEXT);
    private static final Font SECTION_FONT     = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, BRAND_ACCENT);
    private static final Font LABEL_FONT       = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, MUTED_TEXT);
    private static final Font VALUE_FONT       = FontFactory.getFont(FontFactory.HELVETICA, 10, BRAND_DARK);
    private static final Font TABLE_HEAD_FONT  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, WHITE);
    private static final Font TABLE_CELL_FONT  = FontFactory.getFont(FontFactory.HELVETICA, 9, BRAND_DARK);
    private static final Font FOOTER_FONT      = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, MUTED_TEXT);
    private static final Font STATUS_FONT_OK   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, SUCCESS_TEXT);
    private static final Font STATUS_FONT_FAIL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, DANGER_TEXT);
    private static final Font REJECT_TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, DANGER_TEXT);
    private static final Font REJECT_BODY_FONT = FontFactory.getFont(FontFactory.HELVETICA, 9, BRAND_DARK);
    private static final Font CODE_FONT        = FontFactory.getFont(FontFactory.COURIER_BOLD, 9, DANGER_TEXT);

    private static final DateTimeFormatter DT_FMT  = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    public ClaimReportPdfService(
            ClaimRepository claimRepository,
            ExtractedClaimDataRepository extractedClaimDataRepository,
            CustomerRepository customerRepository,
            ClaimTimelineService claimTimelineService,
            ClientClaimValidationRepository clientClaimValidationRepository,
            FmgClaimDecisionRepository fmgClaimDecisionRepository,
            FmgManualReviewRepository fmgManualReviewRepository
    ) {
        this.claimRepository = claimRepository;
        this.extractedClaimDataRepository = extractedClaimDataRepository;
        this.customerRepository = customerRepository;
        this.claimTimelineService = claimTimelineService;
        this.clientClaimValidationRepository = clientClaimValidationRepository;
        this.fmgClaimDecisionRepository = fmgClaimDecisionRepository;
        this.fmgManualReviewRepository = fmgManualReviewRepository;
    }

    // ── Public API ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] generateClaimReport(UUID claimId, UUID userId) {
        Customer customer = customerRepository.findByUser_Id(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));

        Claim claim = claimRepository.findByIdAndCustomerIdWithPolicyDetails(claimId, customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found."));

        String stage = claim.getStage().name();
        if (!"COMPLETED".equals(stage) && !"CARRIER".equals(stage) && !"CARRIER_REVIEW".equals(stage)) {
            throw new ValidationException("Report is only available for completed or finalized claims.");
        }

        ExtractedClaimData extractedData = extractedClaimDataRepository.findByClaim_Id(claimId).orElse(null);
        List<TimelineEntryDto> timeline = claimTimelineService.getClaimTimeline(claimId);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 40, 40, 50, 60);
            PdfWriter.getInstance(document, baos);

            // Footer
            HeaderFooter footer = new HeaderFooter(
                    new Phrase("Confidential — TPA Insurance Claim Processing System  |  Page ", FOOTER_FONT), true);
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.setBorder(Rectangle.TOP);
            footer.setBorderColor(BORDER_COLOR);
            document.setFooter(footer);

            document.open();

            // ── Cover Header ─────────────────────────────────────────────
            addCoverHeader(document, claim);

            // ── Claim Summary ────────────────────────────────────────────
            addClaimSummary(document, claim);

            // ── Extracted Data ───────────────────────────────────────────
            if (extractedData != null) {
                addExtractedDataSection(document, extractedData);
            }

            // ── Final Outcome ────────────────────────────────────────────
            addOutcomeSection(document, claim);

            // ── Timeline ─────────────────────────────────────────────────
            addTimelineSection(document, timeline);

            // ── Closing ──────────────────────────────────────────────────
            addClosingNote(document);

            document.close();
            return baos.toByteArray();
        } catch (ValidationException ve) {
            throw ve;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report.", e);
        }
    }

    // ── Section Builders ─────────────────────────────────────────────────

    private void addCoverHeader(Document doc, Claim claim) throws Exception {
        Paragraph brand = new Paragraph("TPA INSURANCE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, BRAND_ACCENT));
        brand.setAlignment(Element.ALIGN_LEFT);
        doc.add(brand);

        Paragraph title = new Paragraph("Insurance Claim Settlement Report", TITLE_FONT);
        title.setSpacingBefore(4);
        doc.add(title);

        Paragraph sub = new Paragraph(
                "Claim #" + claim.getClaimNumber() + "  •  Generated on " + LocalDateTime.now().format(DT_FMT),
                SUBTITLE_FONT
        );
        sub.setSpacingAfter(6);
        doc.add(sub);

        // Divider line
        PdfPTable divider = new PdfPTable(1);
        divider.setWidthPercentage(100);
        PdfPCell divCell = new PdfPCell();
        divCell.setBorder(Rectangle.BOTTOM);
        divCell.setBorderColor(BRAND_ACCENT);
        divCell.setBorderWidth(2f);
        divCell.setFixedHeight(4);
        divider.addCell(divCell);
        doc.add(divider);

        doc.add(spacer(12));
    }

    private void addClaimSummary(Document doc, Claim claim) throws Exception {
        addSectionHeading(doc, "CLAIM SUMMARY");

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.2f, 2f, 1.2f, 2f});

        addKvPair(table, "Claim Number", claim.getClaimNumber());
        addKvPair(table, "Policy Number", claim.getCustomerPolicy().getUniquePolicyNumber());
        addKvPair(table, "Customer", claim.getCustomer().getFullName());
        addKvPair(table, "Email", claim.getCustomer().getEmail());
        addKvPair(table, "Policy Name", claim.getCustomerPolicy().getPolicy().getPolicyName());
        addKvPair(table, "Carrier", claim.getCustomerPolicy().getPolicy().getCarrier().getCarrierName());
        addKvPair(table, "Submission Date", claim.getSubmissionDate() != null ? claim.getSubmissionDate().format(DT_FMT) : "—");
        addKvPair(table, "Current Stage", humanize(claim.getStage().name()));

        doc.add(table);
        doc.add(spacer(10));
    }

    private void addExtractedDataSection(Document doc, ExtractedClaimData data) throws Exception {
        addSectionHeading(doc, "EXTRACTED CLAIM DETAILS (OCR)");

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.2f, 2f, 1.2f, 2f});

        addKvPair(table, "Patient Name", data.getPatientName());
        addKvPair(table, "Hospital", data.getHospitalName());
        addKvPair(table, "Diagnosis", data.getDiagnosis());
        addKvPair(table, "Claim Type", data.getClaimType());
        addKvPair(table, "Admission Date", data.getAdmissionDate() != null ? data.getAdmissionDate().format(DATE_FMT) : "—");
        addKvPair(table, "Discharge Date", data.getDischargeDate() != null ? data.getDischargeDate().format(DATE_FMT) : "—");
        addKvPair(table, "Bill Number", data.getBillNumber());
        addKvPair(table, "Bill Date", data.getBillDate() != null ? data.getBillDate().format(DATE_FMT) : "—");
        addKvPair(table, "Claimed Amount", data.getClaimedAmount() != null ? "₹ " + data.getClaimedAmount().toPlainString() : "—");
        addKvPair(table, "Bill Amount", data.getTotalBillAmount() != null ? "₹ " + data.getTotalBillAmount().toPlainString() : "—");

        doc.add(table);
        doc.add(spacer(10));
    }

    private void addOutcomeSection(Document doc, Claim claim) throws Exception {
        addSectionHeading(doc, "FINAL OUTCOME");

        boolean isApproved = "APPROVED".equals(claim.getStatus().name()) || "PAID".equals(claim.getStatus().name());
        boolean isRejected = "REJECTED".equals(claim.getStatus().name());

        Color bgColor = isApproved ? SUCCESS_BG : (isRejected ? DANGER_BG : SECTION_BG);
        Font statusFont = isApproved ? STATUS_FONT_OK : (isRejected ? STATUS_FONT_FAIL : VALUE_FONT);

        PdfPTable outcomeBox = new PdfPTable(1);
        outcomeBox.setWidthPercentage(100);

        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(bgColor);
        cell.setBorderColor(isApproved ? new Color(134, 239, 172) : (isRejected ? new Color(252, 165, 165) : BORDER_COLOR));
        cell.setBorderWidth(1f);
        cell.setPadding(14);

        Paragraph statusLine = new Paragraph(
                "Decision: " + humanize(claim.getStatus().name()),
                statusFont
        );

        Paragraph stageLine = new Paragraph(
                "Stage: " + humanize(claim.getStage().name()),
                FontFactory.getFont(FontFactory.HELVETICA, 10, isApproved ? SUCCESS_TEXT : (isRejected ? DANGER_TEXT : BRAND_DARK))
        );
        stageLine.setSpacingBefore(4);

        cell.addElement(statusLine);
        cell.addElement(stageLine);

        // ── Rejection Cause Diagnostic Logic ─────────────────────────────
        if (isRejected) {
            Paragraph separator = new Paragraph("—".repeat(70), FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED_TEXT));
            separator.setSpacingBefore(8);
            separator.setSpacingAfter(8);
            cell.addElement(separator);

            boolean causeFound = false;

            // Cause 1: FMG Automated Rule failure
            FmgClaimDecision decision = fmgClaimDecisionRepository.findByClaimIdWithTriggeredRules(claim.getId()).orElse(null);
            if (decision != null && "REJECTED".equals(decision.getRecommendedDecision().name())) {
                List<FmgClaimDecisionRule> rejectRules = decision.getTriggeredRules().stream()
                        .filter(r -> r.getRuleOutcome() == RuleOutcome.REJECT)
                        .toList();
                if (!rejectRules.isEmpty()) {
                    causeFound = true;
                    Paragraph causeTitle = new Paragraph("PRIMARY CAUSE: AUTOMATED RULE ENGINE REJECTION", REJECT_TITLE_FONT);
                    causeTitle.setSpacingAfter(6);
                    cell.addElement(causeTitle);

                    for (FmgClaimDecisionRule rule : rejectRules) {
                        Paragraph rPara = new Paragraph();
                        rPara.add(new Phrase("[" + rule.getRuleCode() + "] ", CODE_FONT));
                        rPara.add(new Phrase(rule.getRuleName() + " — ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, BRAND_DARK)));
                        rPara.add(new Phrase(rule.getMessage(), REJECT_BODY_FONT));
                        rPara.setSpacingAfter(4);
                        cell.addElement(rPara);
                    }
                }
            }

            // Cause 2: FMG Manual Review overrule
            if (!causeFound) {
                FmgManualReview manualReview = fmgManualReviewRepository.findByClaimId(claim.getId()).orElse(null);
                if (manualReview != null && "REJECTED".equals(manualReview.getManualDecision().name())) {
                    causeFound = true;
                    Paragraph causeTitle = new Paragraph("PRIMARY CAUSE: MANUAL FMG REVIEWER OVERRULE", REJECT_TITLE_FONT);
                    causeTitle.setSpacingAfter(4);
                    cell.addElement(causeTitle);

                    Paragraph rNotes = new Paragraph("\"" + manualReview.getReviewerNotes() + "\"", FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9, BRAND_DARK));
                    rNotes.setSpacingAfter(4);
                    cell.addElement(rNotes);

                    String reviewerName = manualReview.getReviewedBy() != null ? manualReview.getReviewedBy() : "FMG Reviewer";
                    String reviewedDate = manualReview.getReviewedAt() != null ? manualReview.getReviewedAt().format(DT_FMT) : "";
                    Paragraph rMeta = new Paragraph("Reviewed by " + reviewerName + " on " + reviewedDate, FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED_TEXT));
                    cell.addElement(rMeta);
                }
            }

            // Cause 3: Client Pre-validation mismatch
            if (!causeFound) {
                ClientClaimValidation validation = clientClaimValidationRepository.findByClaim_Id(claim.getId()).orElse(null);
                if (validation != null && "FAILED".equals(validation.getValidationStatus().name())) {
                    causeFound = true;
                    Paragraph causeTitle = new Paragraph("PRIMARY CAUSE: CLIENT PRE-VALIDATION FAILURE", REJECT_TITLE_FONT);
                    causeTitle.setSpacingAfter(4);
                    cell.addElement(causeTitle);

                    Paragraph rReason = new Paragraph(validation.getRejectionReason() != null ? validation.getRejectionReason() : "Failed to satisfy essential policy validation rules.", REJECT_BODY_FONT);
                    rReason.setSpacingAfter(4);
                    cell.addElement(rReason);

                    String validatorName = validation.getValidatedBy() != null ? validation.getValidatedBy() : "Client Administrator";
                    String validatedDate = validation.getValidatedAt() != null ? validation.getValidatedAt().format(DT_FMT) : "";
                    Paragraph rMeta = new Paragraph("Validated by " + validatorName + " on " + validatedDate, FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED_TEXT));
                    cell.addElement(rMeta);
                }
            }

            // Cause 4: Carrier Decline
            if (!causeFound) {
                Paragraph causeTitle = new Paragraph("PRIMARY CAUSE: CARRIER SETTLEMENT DECLINE", REJECT_TITLE_FONT);
                causeTitle.setSpacingAfter(4);
                cell.addElement(causeTitle);

                Paragraph desc = new Paragraph("The claim was declined during carrier-stage review or bank settlement processing.", REJECT_BODY_FONT);
                cell.addElement(desc);
            }
        }

        outcomeBox.addCell(cell);
        doc.add(outcomeBox);
        doc.add(spacer(10));
    }

    private void addTimelineSection(Document doc, List<TimelineEntryDto> timeline) throws Exception {
        addSectionHeading(doc, "PROCESSING TIMELINE");

        PdfPTable table = new PdfPTable(new float[]{1.6f, 1.2f, 1.2f, 3f});
        table.setWidthPercentage(100);

        // Table header row
        addTableHeaderCell(table, "Timestamp");
        addTableHeaderCell(table, "Stage");
        addTableHeaderCell(table, "Status");
        addTableHeaderCell(table, "Description");

        boolean alternate = false;
        for (TimelineEntryDto entry : timeline) {
            Color rowBg = alternate ? SECTION_BG : WHITE;

            addTableCell(table, entry.timestamp() != null ? entry.timestamp().format(DT_FMT) : "—", rowBg);
            addTableCell(table, humanize(entry.stage() != null ? entry.stage().name() : "—"), rowBg);
            addTableCell(table, humanize(entry.status() != null ? entry.status().name() : "—"), rowBg);
            addTableCell(table, entry.description() != null ? entry.description() : "—", rowBg);

            alternate = !alternate;
        }

        doc.add(table);
        doc.add(spacer(10));
    }

    private void addClosingNote(Document doc) throws Exception {
        Paragraph note = new Paragraph(
                "This is a system-generated document. No signature is required. For queries, contact your TPA administrator.",
                FOOTER_FONT
        );
        note.setAlignment(Element.ALIGN_CENTER);
        note.setSpacingBefore(20);
        doc.add(note);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private void addSectionHeading(Document doc, String text) throws Exception {
        Paragraph heading = new Paragraph(text, SECTION_FONT);
        heading.setSpacingBefore(6);
        heading.setSpacingAfter(6);
        doc.add(heading);
    }

    private void addKvPair(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, LABEL_FONT));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPaddingBottom(8);
        labelCell.setPaddingTop(4);
        labelCell.setBackgroundColor(WHITE);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value != null ? value : "—", VALUE_FONT));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPaddingBottom(8);
        valueCell.setPaddingTop(4);
        valueCell.setBackgroundColor(WHITE);
        table.addCell(valueCell);
    }

    private void addTableHeaderCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, TABLE_HEAD_FONT));
        cell.setBackgroundColor(TABLE_HEADER);
        cell.setPadding(8);
        cell.setBorderColor(TABLE_HEADER);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text, Color bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(text, TABLE_CELL_FONT));
        cell.setBackgroundColor(bgColor);
        cell.setPadding(7);
        cell.setBorderColor(BORDER_COLOR);
        cell.setBorderWidth(0.5f);
        table.addCell(cell);
    }

    private Paragraph spacer(float height) {
        Paragraph p = new Paragraph(" ");
        p.setSpacingAfter(height);
        return p;
    }

    private String humanize(String value) {
        if (value == null) return "—";
        String[] parts = value.toLowerCase().split("_");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (!part.isEmpty()) {
                sb.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1)).append(" ");
            }
        }
        return sb.toString().trim();
    }
}
