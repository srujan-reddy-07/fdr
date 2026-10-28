# FDR-Track — click-by-click demo guide

## 1. New FDR submission
1. Run the app and select **Institution User · Institution Demo** from the role selector.
2. Choose **New FDR submission**.
3. Select the institution, enter a unique reference, bank, amount and dates.
4. Submit. The new instrument is tagged `INSTITUTION_DECLARED`.
5. Note: document upload/OCR is not yet wired in this build; explain it as the next integration layer, not a working feature.

## 2. Validity tracking
1. Open **FDR Repository**.
2. Review the separate **Validity** and **Admin status** columns.
3. Use the maturity date to explain that validity is date-driven while admin status follows workflow actions.

## 3. Approaching maturity
1. Open **Maturity & Alerts**.
2. Point to instruments seeded for 20 days, 7 days, and already past maturity.
3. The current UI's simulate button is visual-only; do not claim a real scheduler ran. The persistent reminder rules are seeded and scheduler integration remains planned.

## 4. Renewal
1. Open **Renewals & Lineage**.
2. Review sample renewal-related instruments.
3. Explain that the `InstrumentLineage` database relation is seeded, while the guided create-renewal UI is a known limitation.

## 5. Discrepancy identification
1. Switch to **Scrutiny Officer**.
2. Open **Verification & Scrutiny**, then open an instrument.
3. Click **Run rules**. The rules engine creates discrepancies from the declared fields.
4. Use **Resolve discrepancies** and enter an officer note to close open items.

## 6. Authorised release processing
1. Open an instrument with custody `IN_CUSTODY` and no open discrepancy.
2. A release recommendation is blocked if the prerequisites are not met; this build's guided institution request form is not yet wired.
3. Switch to **Competent Authority** to demonstrate the approval/rejection action on a release-requested instrument.
4. Open **Audit Trail** and click **Verify audit chain** to verify the hash chain.

## Evaluation honesty
Clearly distinguish implemented features from simulated or incomplete adapters. All records are fictitious. Do not describe mock bank results as real verification or the date-simulation button as changing the backend clock.
