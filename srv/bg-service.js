
import cds from '@sap/cds';

const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;

const { BGRequests, BGApprovals, BGFormatConfirmations, BGBankSelections, BGAuditNotes, BGAuditNoteBanks, BGAmendments, BGAmendmentApprovals, BGStatusHistories, BGClosures, BGDocuments, BankLimits, BankLimitReservations, BankLimitTransactions, ApprovalMatrices, ApprovalInstances, BankChargeRates, BGTypes } = cds.entities('com.sms.tradefinance');

export default cds.service.impl(function () {

    // =========================================================
    // CREATE BG - VALIDATION
    // =========================================================

    this.before('CREATE', 'BGRequests', async (req) => {
        const data = req.data;
        const companyCode = data.companyCode_ID
            ? await cds.run(SELECT.one.from(cds.entities('com.sms.tradefinance').CompanyCodes)
                .where({ ID: data.companyCode_ID }))
            : null;

        if (!data.companyCode_ID)
            req.error(400, 'Company code is mandatory');

        if (!data.vertical_ID)
            req.error(400, 'Vertical is mandatory');

        if (!data.bgType_ID)
            req.error(400, 'BG Type is mandatory');

        if (!data.bgAmount || Number(data.bgAmount) <= 0)
            req.error(400, 'BG amount must be greater than zero');

        if (!data.requiredDate)
            req.error(400, 'Required date is mandatory');

        if (!data.beneficiaryName)
            req.error(400, 'Beneficiary name is mandatory');

        if (!/^(E-?BG|PHYSICAL)$/i.test(String(data.eBGOrPhysical || '').trim()))
            req.error(400, 'Choose either eBG or Physical BG');
        data.eBGOrPhysical = /physical/i.test(String(data.eBGOrPhysical || '')) ? 'Physical' : 'eBG';
        if (Number(data.tenderDocumentFee || 0) < 0)
            req.error(400, 'Tender/document fee cannot be negative');
        if (Number(data.validityYears || 0) < 0 || Number(data.validityMonths || 0) < 0)
            req.error(400, 'BG validity years and months cannot be negative');
        if (!Number(data.validityYears || 0) && !Number(data.validityMonths || 0))
            req.error(400, 'BG validity period is mandatory');

        data.requestDate ??= new Date().toISOString().substring(0, 10);
        data.applicantName ??= companyCode?.name;
        data.applicantAddress ??= companyCode?.address;
        data.status = 'DRAFT';
        data.issuingBank_ID = null;
    });

    this.before('UPDATE', 'BGRequests', async (req) => {
        const bgId = req.params?.[0]?.ID ?? req.data.ID;
        if (!bgId) return;
        const bg = await cds.run(SELECT.one.from(BGRequests).where({ ID: bgId }));
        if (!bg) return;
        if (req.data.status != null && req.data.status !== bg.status)
            return req.error(400, 'Use a BG workflow action to change status');
        if (!['DRAFT', 'SENT_BACK'].includes(bg.status))
            return req.error(400, `BG request fields cannot be edited in ${bg.status} status`);
        if (req.data.issuingBank_ID != null)
            return req.error(400, 'Issuing bank is assigned by the Finance bank-selection action');
        if (req.data.bgAmount != null && Number(req.data.bgAmount) <= 0)
            return req.error(400, 'BG amount must be greater than zero');
        if (req.data.tenderDocumentFee != null && Number(req.data.tenderDocumentFee) < 0)
            return req.error(400, 'Tender/document fee cannot be negative');
    });

    this.before('CREATE', 'BGDocuments', (req) => {
        if (!req.data.bg_ID) return req.error(400, 'BG request is required for an attachment');
        if (!req.data.documentType?.trim()) return req.error(400, 'Document type is mandatory');
        if (!req.data.fileName?.trim()) return req.error(400, 'Document file name is mandatory');
        if (!req.data.content && !req.data.storageKey?.trim())
            return req.error(400, 'Document content or a storage reference is required');
        req.data.uploadedBy ??= req.user?.id;
        req.data.uploadedAt ??= new Date();
        req.data.documentVersion ??= 1;
    });

    this.before('CREATE', 'BGAmendments', async (req) => {
        const bgId = req.data.originalBG_ID;
        if (!bgId) return req.error(400, 'Original BG is mandatory for an amendment');
        const bg = await cds.run(SELECT.one.from(BGRequests).where({ ID: bgId }));
        if (!bg || !['ISSUED', 'ACTIVE'].includes(bg.status))
            return req.error(400, 'Amendments can be created only for issued or active BGs');
        const previous = await cds.run(SELECT.one.from(BGAmendments)
            .where({ originalBG_ID: bgId }).orderBy('version desc'));
        Object.assign(req.data, {
            amendmentNo: `AMD-${bg.requestNo}-${Date.now()}`,
            version: Number(previous?.version || 0) + 1,
            amendmentDate: new Date(),
            previousAmount: bg.bgAmount,
            previousExpiryDate: bg.bankExpiryDate,
            previousClaimPeriod: bg.claimPeriod,
            previousBeneficiary: bg.beneficiaryName,
            status: 'DRAFT',
            bankBGNumber: bg.bankBGNumber
        });
    });

    this.before('UPDATE', 'BGAmendments', async (req) => {
        const amendmentId = req.params?.[0]?.ID ?? req.data.ID;
        const amendment = amendmentId
            ? await cds.run(SELECT.one.from(BGAmendments).where({ ID: amendmentId }))
            : null;
        if (amendment && amendment.status !== 'DRAFT')
            return req.error(400, 'Amendment terms are immutable after submission');
        if (req.data.status) return req.error(400, 'Use the amendment workflow actions to change amendment status');
        if (req.data.previousAmount != null || req.data.previousExpiryDate || req.data.previousClaimPeriod || req.data.previousBeneficiary)
            return req.error(400, 'Original BG values in an amendment snapshot are immutable');
        if (req.data.newAmount != null && Number(req.data.newAmount) <= 0)
            return req.error(400, 'Amended BG amount must be greater than zero');
    });

    this.before('UPDATE', 'BGClosures', (req) => {
        const workflowFields = [
            'status', 'bankCancelled', 'limitReleased', 'financialStatus', 'documentStatus',
            'financialClosureDate', 'documentClosureDate', 'physicalOriginalReturned', 'physicalReturnDate'
        ];
        if (workflowFields.some((field) => Object.hasOwn(req.data, field)))
            return req.error(400, 'Use BG closure workflow actions to update closure status and original-return tracking');
    });

    // =========================================================
    // SUBMIT BG
    // =========================================================

    this.on('submitBG', async (req) => {
        const bgId = getBGId(req);
        const tx = cds.tx(req);

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG Request not found');

        if (!['DRAFT', 'SENT_BACK'].includes(bg.status))
            return req.error(400, `BG cannot be submitted from ${bg.status}`);

        const documentRows = await tx.run(SELECT.from(BGDocuments).where({ bg_ID: bgId }));
        const hasBankPurposeDocument = ['AGREEMENT', 'LOI', 'TENDER_NOTICE'].some((type) =>
            documentRows.some((document) =>
                document.documentType === type && (document.content || document.storageKey)
            )
        );
        if (!hasBankPurposeDocument)
            return req.error(400, 'Attach an Agreement, LOI, or Tender Notice before submitting the BG');
        if (Number(bg.tenderDocumentFee || 0) > 0 && !documentRows.some((document) =>
            document.documentType === 'TENDER_FEE_PROOF' && (document.content || document.storageKey)
        )) {
            return req.error(400, 'Tender fee proof is required when a tender/document fee is entered');
        }
        if (documentRows.some((document) => document.mandatory && !(document.content || document.storageKey)))
            return req.error(400, 'All mandatory BG attachments must contain a file or storage reference');

        const approvalRoute = await getBGApprovalRoute(tx, bg);
        if (!approvalRoute.length)
            return req.error(400, 'No active BG approval route is configured for this company, vertical, and amount');

        await tx.run(UPDATE(ApprovalInstances).set({ status: 'CANCELLED' }).where({
            processType: 'BG',
            businessObjectId: bgId,
            status: { in: ['PENDING', 'WAITING'] }
        }));
        await tx.run(INSERT.into(ApprovalInstances).entries(approvalRoute.map((step, index) => ({
            ID: cds.utils.uuid(),
            processType: 'BG',
            businessObjectType: 'BGRequests',
            businessObjectId: bgId,
            stage: 'APPROVAL',
            sequence: step.sequence,
            role: step.role,
            status: index === 0 ? 'PENDING' : 'WAITING',
            startedAt: index === 0 ? new Date() : null
        }))));

        await tx.run(
            UPDATE(BGRequests)
                .set({ status: 'SUBMITTED' })
                .where({ ID: bgId })
        );

        await addBGHistory(
            tx, bgId, bg.status, 'SUBMITTED',
            'SUBMIT', req.user?.id
        );

        return 'BG submitted successfully';
    });

    // =========================================================
    // APPROVE BG
    // =========================================================

    this.on('approveBG', async (req) => {
        const bgId = getBGId(req);
        const { remarks } = req.data;
        const tx = cds.tx(req);

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        if (bg.status !== 'SUBMITTED')
            return req.error(400, 'BG is not ready for approval');

        const currentStep = await tx.run(SELECT.one.from(ApprovalInstances).where({
            processType: 'BG',
            businessObjectId: bgId,
            stage: 'APPROVAL',
            status: 'PENDING'
        }).orderBy('sequence asc'));
        if (!currentStep)
            return req.error(400, 'No pending approval step is assigned to this BG');
        if (!hasBGRole(req.user, currentStep.role))
            return req.error(403, `The ${currentStep.role} role is required for this approval step`);

        await tx.run(UPDATE(ApprovalInstances).set({
            action: 'APPROVE',
            actionAt: new Date(),
            assignedTo: req.user?.id,
            remarks,
            status: 'APPROVED'
        }).where({ ID: currentStep.ID }));

        const nextStep = await tx.run(SELECT.one.from(ApprovalInstances).where({
            processType: 'BG',
            businessObjectId: bgId,
            stage: 'APPROVAL',
            status: 'WAITING'
        }).orderBy('sequence asc'));
        if (nextStep) {
            await tx.run(UPDATE(ApprovalInstances).set({
                status: 'PENDING',
                startedAt: new Date()
            }).where({ ID: nextStep.ID }));
        }

        const remainingSteps = await tx.run(SELECT.one.from(ApprovalInstances).where({
            processType: 'BG',
            businessObjectId: bgId,
            stage: 'APPROVAL',
            status: { in: ['PENDING', 'WAITING'] }
        }));
        if (!remainingSteps) {
            await tx.run(UPDATE(BGRequests).set({ status: 'APPROVED' }).where({ ID: bgId }));
        }

        await tx.run(
            INSERT.into(BGApprovals).entries({
                ID: cds.utils.uuid(),
                bg_ID: bgId,
                action: 'APPROVE',
                userId: req.user?.id,
                actionAt: new Date(),
                remarks,
                status: 'APPROVED'
            })
        );

        await addBGHistory(
            tx, bgId, bg.status, remainingSteps ? 'SUBMITTED' : 'APPROVED',
            'APPROVE', req.user?.id, remarks
        );

        return 'BG approved successfully';
    });

    // =========================================================
    // REJECT BG
    // =========================================================

    this.on('rejectBG', async (req) => {
        const bgId = getBGId(req);
        const { reason } = req.data;
        const tx = cds.tx(req);

        if (!reason?.trim())
            return req.error(400, 'Rejection reason is mandatory');

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        if (bg.status !== 'SUBMITTED')
            return req.error(400, 'BG cannot be rejected at this stage');

        const approvalStep = await tx.run(SELECT.one.from(ApprovalInstances).where({
            processType: 'BG', businessObjectId: bgId, stage: 'APPROVAL', status: 'PENDING'
        }).orderBy('sequence asc'));
        if (!approvalStep)
            return req.error(400, 'No pending approval step is assigned to this BG');
        if (!hasBGRole(req.user, approvalStep.role))
            return req.error(403, `The ${approvalStep.role} role is required to reject this BG`);

        await tx.run(
            UPDATE(BGRequests)
                .set({ status: 'REJECTED' })
                .where({ ID: bgId })
        );

        await tx.run(
            INSERT.into(BGApprovals).entries({
                ID: cds.utils.uuid(),
                bg_ID: bgId,
                action: 'REJECT',
                userId: req.user?.id,
                actionAt: new Date(),
                remarks: reason,
                status: 'REJECTED'
            })
        );

        await tx.run(UPDATE(ApprovalInstances).set({
            action: 'REJECT', actionAt: new Date(), assignedTo: req.user?.id,
            remarks: reason, status: 'REJECTED'
        }).where({ ID: approvalStep.ID }));
        await tx.run(UPDATE(ApprovalInstances).set({ status: 'CANCELLED' }).where({
            processType: 'BG', businessObjectId: bgId, status: { in: ['PENDING', 'WAITING'] }
        }));

        await releaseBGLimit(tx, bgId, reason);

        await addBGHistory(
            tx, bgId, bg.status, 'REJECTED',
            'REJECT', req.user?.id, reason
        );

        return 'BG rejected successfully';
    });

    // =========================================================
    // SEND BACK BG
    // =========================================================

    this.on('sendBackBG', async (req) => {
        const bgId = getBGId(req);
        const { reason } = req.data;
        const tx = cds.tx(req);

        if (!reason?.trim())
            return req.error(400, 'Send-back reason is mandatory');

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        const financeStage = ['FORMAT_REVIEW', 'FORMAT_CONFIRMED', 'BANK_SELECTED', 'LIMIT_RESERVED', 'AUDIT_NOTE'].includes(bg.status);
        if (!['SUBMITTED', 'FORMAT_REVIEW', 'FORMAT_CONFIRMED', 'BANK_SELECTED', 'LIMIT_RESERVED', 'AUDIT_NOTE', 'APPROVED'].includes(bg.status))
            return req.error(400, 'BG cannot be sent back at this stage');
        if (financeStage && !hasBGRole(req.user, 'Finance'))
            return req.error(403, 'Finance role is required to send back a BG after approval');
        if (bg.status === 'SUBMITTED') {
            const approvalStep = await tx.run(SELECT.one.from(ApprovalInstances).where({
                processType: 'BG', businessObjectId: bgId, stage: 'APPROVAL', status: 'PENDING'
            }).orderBy('sequence asc'));
            if (!approvalStep || !hasBGRole(req.user, approvalStep.role))
                return req.error(403, 'The current approval role is required to send back this BG');
        }

        await tx.run(
            UPDATE(BGRequests)
                .set({ status: 'SENT_BACK' })
                .where({ ID: bgId })
        );

        await tx.run(
            INSERT.into(BGApprovals).entries({
                ID: cds.utils.uuid(),
                bg_ID: bgId,
                action: 'SEND_BACK',
                userId: req.user?.id,
                actionAt: new Date(),
                remarks: reason,
                status: 'SENT_BACK'
            })
        );

        await releaseBGLimit(tx, bgId, reason);

        await tx.run(UPDATE(ApprovalInstances).set({ status: 'CANCELLED' }).where({
            processType: 'BG', businessObjectId: bgId, status: { in: ['PENDING', 'WAITING'] }
        }));
        await tx.run(UPDATE(BGBankSelections).set({ selected: false }).where({ bg_ID: bgId }));
        await tx.run(UPDATE(BGRequests).set({
            issuingBank_ID: null,
            formatConfirmed: false,
            formatConfirmedBy: null,
            formatConfirmedAt: null
        }).where({ ID: bgId }));

        await addBGHistory(
            tx, bgId, bg.status, 'SENT_BACK',
            'SEND_BACK', req.user?.id, reason
        );

        return 'BG sent back successfully';
    });

    // =========================================================
    // SEND FINAL WORDING TO OPERATIONS
    // =========================================================

    this.on('sendFormatToOperations', async (req) => {
        const bgId = getBGId(req);
        const { remarks } = req.data;
        const tx = cds.tx(req);

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        if (!['APPROVED', 'FORMAT_REVIEW'].includes(bg.status))
            return req.error(400, 'Final BG wording cannot be sent at this stage');

        const pendingConfirmation = await tx.run(SELECT.one.from(BGFormatConfirmations).where({
            bg_ID: bgId, status: 'PENDING_OPERATIONS'
        }));
        if (pendingConfirmation)
            return req.error(400, 'A BG format version is already awaiting Operations confirmation');

        const finalWording = await getBGDocument(tx, bgId, 'FINAL_BG_WORDING');
        if (!finalWording)
            return req.error(400, 'Upload the final BG wording with bank clauses before sending it to Operations');

        const existing = await tx.run(
            SELECT.one.from(BGFormatConfirmations)
                .where({ bg_ID: bgId })
                .orderBy('version desc')
        );

        const version = existing
            ? Number(existing.version || 0) + 1
            : 1;

        await tx.run(
            INSERT.into(BGFormatConfirmations).entries({
                ID: cds.utils.uuid(),
                bg_ID: bgId,
                version,
                financeRemarks: remarks,
                bankClausesDocument: finalWording.ID,
                status: 'PENDING_OPERATIONS',
                confirmedBy: req.user?.id,
                confirmedAt: new Date()
            })
        );

        await tx.run(
            UPDATE(BGRequests)
                .set({
                    formatConfirmed: false,
                    formatRemarks: remarks,
                    status: 'FORMAT_REVIEW'
                })
                .where({ ID: bgId })
        );

        await addBGHistory(
            tx, bgId, bg.status, 'FORMAT_REVIEW',
            'SEND_FORMAT_TO_OPERATIONS', req.user?.id, remarks
        );

        return 'Final BG wording sent to Operations';
    });

    // CONFIRM FINAL WORDING AS OPERATIONS
    this.on('confirmFormat', async (req) => {
        const bgId = getBGId(req);
        const { remarks } = req.data;
        const tx = cds.tx(req);
        const bg = await getBG(tx, bgId);
        if (!bg) return req.error(404, 'BG not found');
        if (bg.status !== 'FORMAT_REVIEW')
            return req.error(400, 'There is no final BG wording awaiting Operations confirmation');

        const confirmation = await tx.run(SELECT.one.from(BGFormatConfirmations).where({
            bg_ID: bgId,
            status: 'PENDING_OPERATIONS'
        }).orderBy('version desc'));
        if (!confirmation)
            return req.error(400, 'No Finance-submitted format version is awaiting confirmation');
        if (confirmation.confirmedBy === req.user?.id)
            return req.error(403, 'Operations confirmation must be completed by a different user');

        await tx.run(UPDATE(BGFormatConfirmations).set({
            status: 'CONFIRMED',
            operationsRemarks: remarks,
            operationsConfirmedBy: req.user?.id,
            operationsConfirmedAt: new Date()
        }).where({ ID: confirmation.ID }));
        await tx.run(UPDATE(BGRequests).set({
            formatConfirmed: true,
            formatConfirmedBy: req.user?.id,
            formatConfirmedAt: new Date(),
            formatRemarks: remarks,
            status: 'FORMAT_CONFIRMED'
        }).where({ ID: bgId }));
        await addBGHistory(tx, bgId, bg.status, 'FORMAT_CONFIRMED', 'OPERATIONS_CONFIRM_FORMAT', req.user?.id, remarks);
        return 'Final BG wording confirmed by Operations';
    });

    // =========================================================
    // SELECT BANK
    // =========================================================

    this.on('compareBanks', async (req) => {
        const bgId = getBGId(req);
        const tx = cds.tx(req);
        const bg = await getBG(tx, bgId);
        if (!bg) return req.error(404, 'BG not found');
        if (bg.status !== 'FORMAT_CONFIRMED')
            return req.error(400, 'Bank comparison is available after Operations confirms the BG wording');
        const limits = await tx.run(SELECT.from(BankLimits).where({
            companyCode_ID: bg.companyCode_ID,
            limitType: 'BG',
            active: true
        }));
        if (!limits.length) return req.error(400, 'No active BG bank limits are configured for this company');

        await tx.run(DELETE.from(BGBankSelections).where({ bg_ID: bgId, selected: false }));
        for (const limit of limits) {
            const available = Number(limit.sanctionedAmount || 0)
                - Number(limit.utilisedAmount || 0)
                - Number(limit.reservedAmount || 0);
            const quote = await getBGChargeQuote(tx, bg, limit.bank_ID, getBGValidityDays(bg));
            await tx.run(INSERT.into(BGBankSelections).entries({
                ID: cds.utils.uuid(),
                bg_ID: bgId,
                bank_ID: limit.bank_ID,
                bankLimit_ID: limit.ID,
                sanctionedLimit: limit.sanctionedAmount,
                utilisedLimit: limit.utilisedAmount,
                reservedLimit: limit.reservedAmount,
                availableLimit: available,
                commissionRate: quote.annualRate,
                marginPercent: quote.marginPercent,
                fixedCharges: quote.fixedCharges,
                gstOnCharges: quote.gstAmount,
                totalCharges: quote.totalCharges,
                chargeQuoteStatus: quote.chargeQuoteStatus,
                selected: false,
                remarks: quote.chargeQuoteStatus
            }));
        }
        return 'Bank headroom and charge comparisons refreshed';
    });

    this.on('selectBank', async (req) => {
        const bgId = getBGId(req);
        const { bankId, selectionReason } = req.data;
        const tx = cds.tx(req);

        if (!bankId)
            return req.error(400, 'Bank is mandatory');
        if (!selectionReason?.trim())
            return req.error(400, 'Bank selection reason is mandatory');

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        const existingReservation = await tx.run(
            SELECT.one.from(BankLimitReservations).where({
                processType: 'BG',
                businessObjectId: bgId,
                status: 'RESERVED'
            })
        );

        if (existingReservation)
            return req.error(400, 'Bank cannot be changed after the BG limit is reserved');

        if (bg.status !== 'FORMAT_CONFIRMED')
            return req.error(400, 'Bank selection is allowed only after Operations confirms the format');

        const bankLimit = await tx.run(
            SELECT.one.from(BankLimits).where({
                bank_ID: bankId,
                companyCode_ID: bg.companyCode_ID,
                limitType: 'BG',
                active: true
            })
        );

        if (!bankLimit)
            return req.error(400, 'Bank limit not found');

        const amount = Number(bg.bgAmount);

        const available =
            Number(bankLimit.sanctionedAmount || 0) -
            Number(bankLimit.utilisedAmount || 0) -
            Number(bankLimit.reservedAmount || 0);

        if (amount > available)
            return req.error(400, `Insufficient BG limit. Available: ${available}`);

        const quote = await getBGChargeQuote(tx, bg, bankId, getBGValidityDays(bg));
        if (quote.chargeQuoteStatus !== 'AVAILABLE')
            return req.error(400, `No active BG charge master is configured for bank ${bankId} and this BG type`);

        await tx.run(
            UPDATE(BGBankSelections)
                .set({ selected: false })
                .where({ bg_ID: bgId })
        );

        const selection = await tx.run(
            SELECT.one.from(BGBankSelections)
                .where({ bg_ID: bgId, bank_ID: bankId })
        );

        const selectionData = {
            selected: true,
            bankLimit_ID: bankLimit.ID,
            sanctionedLimit: bankLimit.sanctionedAmount,
            utilisedLimit: bankLimit.utilisedAmount,
            reservedLimit: bankLimit.reservedAmount,
            availableLimit: available,
            selectionReason: selectionReason.trim(),
            commissionRate: quote.annualRate,
            marginPercent: quote.marginPercent,
            fixedCharges: quote.fixedCharges,
            gstOnCharges: quote.gstAmount,
            totalCharges: quote.totalCharges
        };

        if (selection) {
            await tx.run(
                UPDATE(BGBankSelections)
                    .set(selectionData)
                    .where({ ID: selection.ID })
            );
        } else {
            await tx.run(
                INSERT.into(BGBankSelections).entries({
                    ID: cds.utils.uuid(),
                    bg_ID: bgId,
                    bank_ID: bankId,
                    ...selectionData
                })
            );
        }

        const beforeReserved = Number(bankLimit.reservedAmount || 0);
        const afterReserved = beforeReserved + amount;
        const limitUpdated = await tx.run(
            UPDATE(BankLimits)
                .set({
                    reservedAmount: afterReserved,
                    availableAmount: Number(bankLimit.sanctionedAmount || 0)
                        - Number(bankLimit.utilisedAmount || 0)
                        - afterReserved
                })
                .where({
                    ID: bankLimit.ID,
                    reservedAmount: bankLimit.reservedAmount,
                    utilisedAmount: bankLimit.utilisedAmount
                })
        );
        if (!limitUpdated)
            return req.error(409, 'Bank limit changed during selection; refresh the bank comparison and retry');
        await tx.run(
            INSERT.into(BankLimitReservations).entries({
                ID: cds.utils.uuid(),
                bankLimit_ID: bankLimit.ID,
                bank_ID: bankId,
                companyCode_ID: bg.companyCode_ID,
                processType: 'BG',
                businessObjectId: bgId,
                amount,
                currency: bankLimit.currency,
                status: 'RESERVED',
                reservedAt: new Date(),
                reason: `BG ${bg.requestNo}`
            })
        );
        await tx.run(
            INSERT.into(BankLimitTransactions).entries({
                ID: cds.utils.uuid(),
                bankLimit_ID: bankLimit.ID,
                bank_ID: bankId,
                companyCode_ID: bg.companyCode_ID,
                processType: 'BG',
                businessObjectId: bgId,
                transactionType: 'RESERVE',
                amount,
                currency: bankLimit.currency,
                beforeUtilised: bankLimit.utilisedAmount,
                afterUtilised: bankLimit.utilisedAmount,
                beforeReserved,
                afterReserved,
                transactionDate: new Date(),
                referenceNo: bg.requestNo,
                remarks: 'BG limit reserved on bank selection'
            })
        );

        const requestUpdated = await tx.run(
            UPDATE(BGRequests)
                .set({
                    issuingBank_ID: bankId,
                    status: 'LIMIT_RESERVED'
                })
                .where({ ID: bgId, status: 'FORMAT_CONFIRMED' })
        );
        if (!requestUpdated)
            return req.error(409, 'BG status changed during bank selection; refresh the request and retry');

        await addBGHistory(
            tx, bgId, bg.status, 'BANK_SELECTED',
            'SELECT_BANK', req.user?.id
        );

        return 'BG bank selected successfully';
    });

    // =========================================================
    // RESERVE BG LIMIT
    // =========================================================

    this.on('reserveBGLimit', async (req) => {
        const bgId = getBGId(req);
        const tx = cds.tx(req);

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        if (!bg.issuingBank_ID)
            return req.error(400, 'Issuing bank is not selected');

        if (['ISSUED', 'ACTIVE', 'CLOSED', 'REJECTED'].includes(bg.status))
            return req.error(400, 'BG limit cannot be reserved at this stage');

        const bankLimit = await tx.run(
            SELECT.one.from(BankLimits).where({
                bank_ID: bg.issuingBank_ID,
                companyCode_ID: bg.companyCode_ID,
                active: true
            })
        );

        if (!bankLimit)
            return req.error(400, 'Bank limit not found');

        const existingReservation = await tx.run(
            SELECT.one.from(BankLimitReservations).where({
                processType: 'BG',
                businessObjectId: bgId,
                status: 'RESERVED'
            })
        );

        if (existingReservation)
            return 'BG limit is already reserved';

        const amount = Number(bg.bgAmount);

        const available =
            Number(bankLimit.sanctionedAmount || 0) -
            Number(bankLimit.utilisedAmount || 0) -
            Number(bankLimit.reservedAmount || 0);

        if (amount > available)
            return req.error(400, 'Insufficient bank limit');

        const beforeReserved = Number(bankLimit.reservedAmount || 0);
        const afterReserved = beforeReserved + amount;

        await tx.run(
            UPDATE(BankLimits)
                .set({
                    reservedAmount: afterReserved,
                    availableAmount:
                        Number(bankLimit.sanctionedAmount || 0) -
                        Number(bankLimit.utilisedAmount || 0) -
                        afterReserved
                })
                .where({ ID: bankLimit.ID })
        );

        await tx.run(
            INSERT.into(BankLimitReservations).entries({
                ID: cds.utils.uuid(),
                bankLimit_ID: bankLimit.ID,
                bank_ID: bg.issuingBank_ID,
                companyCode_ID: bg.companyCode_ID,
                processType: 'BG',
                businessObjectId: bgId,
                amount,
                currency: bankLimit.currency,
                status: 'RESERVED',
                reservedAt: new Date(),
                reason: `BG ${bg.requestNo}`
            })
        );

        await tx.run(
            INSERT.into(BankLimitTransactions).entries({
                ID: cds.utils.uuid(),
                bankLimit_ID: bankLimit.ID,
                bank_ID: bg.issuingBank_ID,
                companyCode_ID: bg.companyCode_ID,
                processType: 'BG',
                businessObjectId: bgId,
                transactionType: 'RESERVE',
                amount,
                currency: bankLimit.currency,
                beforeUtilised: bankLimit.utilisedAmount,
                afterUtilised: bankLimit.utilisedAmount,
                beforeReserved,
                afterReserved,
                transactionDate: new Date(),
                referenceNo: bg.requestNo,
                remarks: 'BG limit reserved'
            })
        );

        await tx.run(
            UPDATE(BGRequests)
                .set({ status: 'LIMIT_RESERVED' })
                .where({ ID: bgId })
        );

        await addBGHistory(
            tx, bgId, bg.status, 'LIMIT_RESERVED',
            'RESERVE_LIMIT', req.user?.id
        );

        return 'BG limit reserved successfully';
    });

    // =========================================================
    // CREATE AUDIT NOTE
    // =========================================================

    this.on('createAuditNote', async (req) => {
        const bgId = getBGId(req);
        const tx = cds.tx(req);

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        if (bg.status !== 'LIMIT_RESERVED')
            return req.error(400, 'BG audit note can be created only after limit reservation');

        const existing = await tx.run(
            SELECT.one.from(BGAuditNotes).where({ bg_ID: bgId })
        );

        if (existing)
            return existing.ID;

        if (!bg.issuingBank_ID)
            return req.error(400, 'Issuing bank is mandatory');

        if (!bg.formatConfirmed)
            return req.error(400, 'Operations must confirm the bank format before creating the audit note');

        const reservation = await tx.run(SELECT.one.from(BankLimitReservations).where({
            processType: 'BG', businessObjectId: bgId, status: 'RESERVED'
        }));
        if (!reservation)
            return req.error(400, 'BG limit must be reserved at bank selection');

        const selection = await tx.run(SELECT.one.from(BGBankSelections).where({
            bg_ID: bgId, selected: true
        }));
        if (!selection?.selectionReason?.trim())
            return req.error(400, 'Bank selection reason is required');

        const validityFrom = bg.requiredDate || bg.requestDate;
        const validityTo = addValidityMonths(validityFrom, bg.validityYears, bg.validityMonths);
        const periodDays = validityFrom && validityTo
            ? Math.ceil((new Date(`${validityTo}T00:00:00Z`) - new Date(`${validityFrom}T00:00:00Z`)) / 86400000)
            : 0;
        const selectedQuote = await getBGChargeQuote(tx, bg, bg.issuingBank_ID, periodDays);

        const noteId = cds.utils.uuid();

        await tx.run(
            INSERT.into(BGAuditNotes).entries({
                ID: noteId,
                bg_ID: bgId,
                noteNo: `BGAN-${bg.requestNo}`,
                issuingBank_ID: bg.issuingBank_ID,
                beneficiaryName: bg.beneficiaryName,
                nameOfWork: bg.nameOfWork,
                bgType: (await tx.run(SELECT.one.from(BGTypes).where({ ID: bg.bgType_ID })))?.code,
                vertical: bg.vertical_ID,
                bgAmount: bg.bgAmount,
                validityFrom,
                validityTo,
                claimPeriod: bg.claimPeriod,
                periodDays,
                annualRate: selectedQuote.annualRate,
                commissionAmount: selectedQuote.commissionAmount,
                fixedCharges: selectedQuote.fixedCharges,
                gstAmount: selectedQuote.gstAmount,
                totalCharges: selectedQuote.totalCharges,
                remarks: selection.selectionReason,
                status: 'DRAFT'
            })
        );

        const candidateLimits = await tx.run(SELECT.from(BankLimits).where({
            companyCode_ID: bg.companyCode_ID,
            limitType: 'BG',
            active: true
        }));
        for (const limit of candidateLimits) {
            const availableLimit = Number(limit.sanctionedAmount || 0)
                - Number(limit.utilisedAmount || 0)
                - Number(limit.reservedAmount || 0);
            const bankQuote = await getBGChargeQuote(tx, bg, limit.bank_ID, periodDays);
            await tx.run(INSERT.into(BGAuditNoteBanks).entries({
                ID: cds.utils.uuid(),
                note_ID: noteId,
                bank_ID: limit.bank_ID,
                availableLimit,
                annualRate: bankQuote.annualRate,
                commissionAmount: bankQuote.commissionAmount,
                fixedCharges: bankQuote.fixedCharges,
                gstAmount: bankQuote.gstAmount,
                totalCharges: bankQuote.totalCharges,
                chargeQuoteStatus: bankQuote.chargeQuoteStatus,
                recommended: limit.bank_ID === bg.issuingBank_ID,
                remarks: bankQuote.chargeQuoteStatus
            }));
        }

        await tx.run(
            UPDATE(BGRequests)
                .set({ status: 'AUDIT_NOTE' })
                .where({ ID: bgId })
        );

        await addBGHistory(
            tx, bgId, bg.status, 'AUDIT_NOTE',
            'CREATE_AUDIT_NOTE', req.user?.id
        );

        return noteId;
    });

    this.on('checkAuditNote', async (req) => {
        const bgId = getBGId(req);
        const { remarks } = req.data;
        const tx = cds.tx(req);
        const note = await tx.run(SELECT.one.from(BGAuditNotes).where({ bg_ID: bgId }));
        if (!note) return req.error(404, 'BG audit note not found');
        if (note.status !== 'DRAFT')
            return req.error(400, 'Only a draft BG audit note can be checked');
        if (note.createdBy === req.user?.id)
            return req.error(403, 'The audit-note checker must be different from its preparer');
        await tx.run(UPDATE(BGAuditNotes).set({
            status: 'CHECKED',
            checkedBy: req.user?.id,
            checkedAt: new Date(),
            remarks: remarks || note.remarks
        }).where({ ID: note.ID }));
        await addBGHistory(tx, bgId, 'AUDIT_NOTE', 'AUDIT_NOTE', 'CHECK_AUDIT_NOTE', req.user?.id, remarks);
        return 'BG audit note checked';
    });

    this.on('approveAuditNote', async (req) => {
        const bgId = getBGId(req);
        const { remarks } = req.data;
        const tx = cds.tx(req);
        const note = await tx.run(SELECT.one.from(BGAuditNotes).where({ bg_ID: bgId }));
        if (!note) return req.error(404, 'BG audit note not found');
        if (note.status !== 'CHECKED')
            return req.error(400, 'BG audit note must be checked before approval');
        if (note.checkedBy === req.user?.id || note.createdBy === req.user?.id)
            return req.error(403, 'Audit-note approval must be completed by a separate Finance user');
        await tx.run(UPDATE(BGAuditNotes).set({
            status: 'APPROVED',
            approvedBy: req.user?.id,
            approvedAt: new Date(),
            remarks: remarks || note.remarks
        }).where({ ID: note.ID }));
        await addBGHistory(tx, bgId, 'AUDIT_NOTE', 'AUDIT_NOTE', 'APPROVE_AUDIT_NOTE', req.user?.id, remarks);
        return 'BG audit note approved';
    });

    // =========================================================
    // SEND TO BANK
    // =========================================================

    this.on('sendToBank', async (req) => {
        const bgId = getBGId(req);
        const tx = cds.tx(req);

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        if (!bg.formatConfirmed)
            return req.error(400, 'BG format must be confirmed');

        const auditNote = await tx.run(SELECT.one.from(BGAuditNotes).where({ bg_ID: bgId }));
        if (auditNote?.status !== 'APPROVED')
            return req.error(400, 'BG audit note must be checked and approved before sending to bank');

        if (!bg.issuingBank_ID)
            return req.error(400, 'Issuing bank is mandatory');

        if (!['AUDIT_NOTE', 'LIMIT_RESERVED'].includes(bg.status))
            return req.error(400, 'BG is not ready to send to bank');

        const reservation = await tx.run(
            SELECT.one.from(BankLimitReservations).where({
                processType: 'BG',
                businessObjectId: bgId,
                status: 'RESERVED'
            })
        );

        if (!reservation)
            return req.error(400, 'BG limit must be reserved before sending to bank');

        const finalWording = await getBGDocument(tx, bgId, 'FINAL_BG_WORDING');
        if (!finalWording)
            return req.error(400, 'Final BG wording document is required before sending to bank');
        const requestLetter = await getBGDocument(tx, bgId, 'SIGNED_BG_REQUEST_LETTER');
        if (!requestLetter)
            return req.error(400, 'Signed BG request letter is required before sending to bank');

        await tx.run(
            UPDATE(BGRequests)
                .set({
                    status: 'SENT_TO_BANK',
                    sentToBankAt: new Date(),
                    sentToBankBy: req.user?.id,
                    documentsSentAt: new Date()
                })
                .where({ ID: bgId })
        );

        await addBGHistory(
            tx, bgId, bg.status, 'SENT_TO_BANK',
            'SEND_TO_BANK', req.user?.id
        );

        return 'BG sent to bank successfully';
    });

    // =========================================================
    // RECORD ISSUANCE
    // =========================================================

    this.on('recordIssuance', async (req) => {
        const bgId = getBGId(req);
        const { bankBGNumber, bankIssuedDate, bankExpiryDate, issuedAmount } = req.data;
        const tx = cds.tx(req);

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        if (bg.status !== 'SENT_TO_BANK')
            return req.error(400, 'BG is not pending bank issuance');

        if (!bankBGNumber?.trim() || !bankIssuedDate || !bankExpiryDate)
            return req.error(400, 'Bank BG number and actual issue/expiry dates are required');
        if (new Date(bankExpiryDate) < new Date(bankIssuedDate))
            return req.error(400, 'Bank expiry date cannot precede bank issue date');
        if (!await getBGDocument(tx, bgId, 'BANK_ISSUED_BG'))
            return req.error(400, 'Upload the bank-issued BG before recording issuance');

        const reservation = await tx.run(
            SELECT.one.from(BankLimitReservations).where({
                processType: 'BG',
                businessObjectId: bgId,
                status: 'RESERVED'
            })
        );

        if (!reservation)
            return req.error(400, 'BG limit reservation not found');

        const bankLimit = await tx.run(
            SELECT.one.from(BankLimits).where({
                ID: reservation.bankLimit_ID
            })
        );

        if (!bankLimit)
            return req.error(400, 'Bank limit record not found');

        const amount = Number(reservation.amount || 0);
        const beforeUtilised = Number(bankLimit.utilisedAmount || 0);
        const beforeReserved = Number(bankLimit.reservedAmount || 0);

        const afterUtilised = beforeUtilised + amount;
        const afterReserved = Math.max(0, beforeReserved - amount);

        await tx.run(
            UPDATE(BankLimits)
                .set({
                    utilisedAmount: afterUtilised,
                    reservedAmount: afterReserved,
                    availableAmount:
                        Number(bankLimit.sanctionedAmount || 0) -
                        afterUtilised -
                        afterReserved
                })
                .where({ ID: bankLimit.ID })
        );

        await tx.run(
            UPDATE(BankLimitReservations)
                .set({
                    status: 'CONSUMED',
                    consumedAt: new Date()
                })
                .where({ ID: reservation.ID })
        );

        await tx.run(
            INSERT.into(BankLimitTransactions).entries({
                ID: cds.utils.uuid(),
                bankLimit_ID: bankLimit.ID,
                bank_ID: reservation.bank_ID,
                companyCode_ID: reservation.companyCode_ID,
                processType: 'BG',
                businessObjectId: bgId,
                transactionType: 'ISSUE',
                amount,
                currency: reservation.currency,
                beforeUtilised,
                afterUtilised,
                beforeReserved,
                afterReserved,
                transactionDate: new Date(),
                referenceNo: bg.requestNo,
                remarks: 'BG issued; reserved limit moved to utilised'
            })
        );

        await tx.run(
            UPDATE(BGRequests)
                .set({
                    status: 'ACTIVE',
                    bankBGNumber: bankBGNumber.trim(),
                    bankIssuedDate,
                    bankExpiryDate,
                    bankIssuedBy: req.user?.id,
                    issuedAmount: issuedAmount ?? bg.bgAmount
                })
                .where({ ID: bgId })
        );

        await addBGHistory(
            tx, bgId, bg.status, 'ISSUED',
            'ISSUE', req.user?.id
        );

        return 'BG issuance recorded successfully';
    });

    // =========================================================
    // CREATE AMENDMENT
    // =========================================================

    this.on('createAmendment', async (req) => {
        const bgId = getBGId(req);
        const tx = cds.tx(req);

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        if (!['ISSUED', 'ACTIVE'].includes(bg.status))
            return req.error(400, 'Amendment is allowed only for issued/active BG');

        const previousAmendment = await tx.run(
            SELECT.one.from(BGAmendments)
                .where({ originalBG_ID: bgId })
                .orderBy('version desc')
        );

        const amendmentId = cds.utils.uuid();
        const version = Number(previousAmendment?.version || 0) + 1;

        await tx.run(
            INSERT.into(BGAmendments).entries({
                ID: amendmentId,
                originalBG_ID: bgId,
                amendmentNo: `AMD-${bg.requestNo}-${Date.now()}`,
                version,
                amendmentDate: new Date(),
                previousAmount: bg.bgAmount,
                previousExpiryDate: bg.bankExpiryDate,
                previousClaimPeriod: bg.claimPeriod,
                previousBeneficiary: bg.beneficiaryName,
                status: 'DRAFT',
                bankBGNumber: bg.bankBGNumber
            })
        );

        await addBGHistory(
            tx, bgId, bg.status, bg.status,
            'CREATE_AMENDMENT', req.user?.id
        );

        return amendmentId;
    });

    this.on('submitAmendment', async (req) => {
        const amendmentId = req.params?.[0]?.ID ?? req.data?.amendmentId;
        const tx = cds.tx(req);
        const amendment = await tx.run(SELECT.one.from(BGAmendments).where({ ID: amendmentId }));
        if (!amendment) return req.error(404, 'BG amendment not found');
        if (amendment.status !== 'DRAFT') return req.error(400, 'Only a draft amendment can be submitted');
        if (!amendment.reason?.trim()) return req.error(400, 'Amendment reason is mandatory');
        if (amendment.newAmount == null && !amendment.newExpiryDate && !amendment.newClaimPeriod && !amendment.newBeneficiary)
            return req.error(400, 'At least one amended BG term is required');

        const bg = await getBG(tx, amendment.originalBG_ID);
        if (!bg || !['ACTIVE', 'ISSUED'].includes(bg.status))
            return req.error(400, 'The original BG must remain active while an amendment is processed');
        const route = await getBGApprovalRoute(tx, bg);
        if (!route.length) return req.error(400, 'No BG amendment approval route is configured');
        await tx.run(UPDATE(ApprovalInstances).set({ status: 'CANCELLED' }).where({
            processType: 'BG_AMENDMENT', businessObjectId: amendmentId, status: { in: ['PENDING', 'WAITING'] }
        }));
        await tx.run(INSERT.into(ApprovalInstances).entries(route.map((step, index) => ({
            ID: cds.utils.uuid(),
            processType: 'BG_AMENDMENT',
            businessObjectType: 'BGAmendments',
            businessObjectId: amendmentId,
            stage: 'APPROVAL',
            sequence: step.sequence,
            role: step.role,
            status: index === 0 ? 'PENDING' : 'WAITING',
            startedAt: index === 0 ? new Date() : null
        }))));
        await tx.run(UPDATE(BGAmendments).set({ status: 'SUBMITTED' }).where({ ID: amendmentId }));
        await tx.run(INSERT.into(BGAmendmentApprovals).entries({
            ID: cds.utils.uuid(), amendment_ID: amendmentId, sequence: 0,
            userId: req.user?.id, action: 'SUBMIT', actionAt: new Date(), status: 'SUBMITTED'
        }));
        return 'BG amendment submitted for approval';
    });

    this.on('approveAmendment', async (req) => {
        const amendmentId = req.params?.[0]?.ID ?? req.data?.amendmentId;
        const { remarks } = req.data;
        const tx = cds.tx(req);
        const amendment = await tx.run(SELECT.one.from(BGAmendments).where({ ID: amendmentId }));
        if (!amendment) return req.error(404, 'BG amendment not found');
        if (amendment.status !== 'SUBMITTED') return req.error(400, 'Amendment is not awaiting approval');
        const step = await tx.run(SELECT.one.from(ApprovalInstances).where({
            processType: 'BG_AMENDMENT', businessObjectId: amendmentId, status: 'PENDING'
        }).orderBy('sequence asc'));
        if (!step) return req.error(400, 'No pending amendment approval step exists');
        if (!hasBGRole(req.user, step.role)) return req.error(403, `The ${step.role} role is required`);
        await tx.run(UPDATE(ApprovalInstances).set({
            action: 'APPROVE', actionAt: new Date(), assignedTo: req.user?.id, remarks, status: 'APPROVED'
        }).where({ ID: step.ID }));
        await tx.run(INSERT.into(BGAmendmentApprovals).entries({
            ID: cds.utils.uuid(), amendment_ID: amendmentId, sequence: step.sequence,
            role: step.role, userId: req.user?.id, action: 'APPROVE', remarks,
            actionAt: new Date(), status: 'APPROVED'
        }));
        const next = await tx.run(SELECT.one.from(ApprovalInstances).where({
            processType: 'BG_AMENDMENT', businessObjectId: amendmentId, status: 'WAITING'
        }).orderBy('sequence asc'));
        if (next) {
            await tx.run(UPDATE(ApprovalInstances).set({ status: 'PENDING', startedAt: new Date() }).where({ ID: next.ID }));
        } else {
            await tx.run(UPDATE(BGAmendments).set({ status: 'APPROVED' }).where({ ID: amendmentId }));
        }
        return next ? 'Amendment approval recorded; next approval is pending' : 'BG amendment approved';
    });

    this.on('recordAmendmentIssuance', async (req) => {
        const amendmentId = req.params?.[0]?.ID ?? req.data?.amendmentId;
        const { bankBGNumber, bankDocumentKey } = req.data;
        const tx = cds.tx(req);
        const amendment = await tx.run(SELECT.one.from(BGAmendments).where({ ID: amendmentId }));
        if (!amendment) return req.error(404, 'BG amendment not found');
        if (amendment.status !== 'APPROVED') return req.error(400, 'Amendment approvals must complete before bank submission');
        if (!bankBGNumber?.trim() || !bankDocumentKey?.trim())
            return req.error(400, 'Bank reference and amended BG document are required');
        const bg = await getBG(tx, amendment.originalBG_ID);
        const delta = amendment.newAmount == null ? 0 : Number(amendment.newAmount) - Number(bg.bgAmount);
        const reservation = await tx.run(SELECT.one.from(BankLimitReservations).where({
            processType: 'BG', businessObjectId: bg.ID, status: 'CONSUMED'
        }));
        if (delta !== 0 && !reservation) return req.error(400, 'Active BG utilisation record is required for amount changes');
        if (delta > 0) {
            const limit = await tx.run(SELECT.one.from(BankLimits).where({ ID: reservation.bankLimit_ID }));
            const beforeUtilised = Number(limit.utilisedAmount || 0);
            const available = Number(limit.sanctionedAmount || 0) - Number(limit.utilisedAmount || 0) - Number(limit.reservedAmount || 0);
            if (delta > available) return req.error(400, `Insufficient bank limit for amendment increase. Available: ${available}`);
            const afterUtilised = beforeUtilised + delta;
            await tx.run(UPDATE(BankLimits).set({
                utilisedAmount: afterUtilised,
                availableAmount: available - delta
            }).where({ ID: limit.ID }));
            await tx.run(INSERT.into(BankLimitTransactions).entries({
                ID: cds.utils.uuid(), bankLimit_ID: limit.ID, bank_ID: bg.issuingBank_ID,
                companyCode_ID: bg.companyCode_ID, processType: 'BG', businessObjectId: bg.ID,
                transactionType: 'AMENDMENT_INCREASE', amount: delta, currency: limit.currency,
                beforeUtilised, afterUtilised, beforeReserved: limit.reservedAmount,
                afterReserved: limit.reservedAmount, transactionDate: new Date(),
                referenceNo: amendment.amendmentNo, remarks: 'BG amount increased by approved amendment'
            }));
        } else if (delta < 0) {
            const limit = await tx.run(SELECT.one.from(BankLimits).where({ ID: reservation.bankLimit_ID }));
            const beforeUtilised = Number(limit.utilisedAmount || 0);
            const afterUtilised = Math.max(0, beforeUtilised + delta);
            await tx.run(UPDATE(BankLimits).set({
                utilisedAmount: afterUtilised,
                availableAmount: Number(limit.sanctionedAmount || 0)
                    - afterUtilised
                    - Number(limit.reservedAmount || 0)
            }).where({ ID: limit.ID }));
            await tx.run(INSERT.into(BankLimitTransactions).entries({
                ID: cds.utils.uuid(), bankLimit_ID: limit.ID, bank_ID: bg.issuingBank_ID,
                companyCode_ID: bg.companyCode_ID, processType: 'BG', businessObjectId: bg.ID,
                transactionType: 'AMENDMENT_DECREASE', amount: Math.abs(delta), currency: limit.currency,
                beforeUtilised, afterUtilised, beforeReserved: limit.reservedAmount,
                afterReserved: limit.reservedAmount, transactionDate: new Date(),
                referenceNo: amendment.amendmentNo, remarks: 'BG amount decreased by approved amendment'
            }));
        }
        if (reservation && amendment.newAmount != null) {
            await tx.run(UPDATE(BankLimitReservations).set({ amount: amendment.newAmount }).where({ ID: reservation.ID }));
        }
        await tx.run(UPDATE(BGRequests).set({
            ...(amendment.newAmount != null ? { bgAmount: amendment.newAmount, issuedAmount: amendment.newAmount } : {}),
            ...(amendment.newExpiryDate ? { bankExpiryDate: amendment.newExpiryDate } : {}),
            ...(amendment.newClaimPeriod ? { claimPeriod: amendment.newClaimPeriod } : {})
        }).where({ ID: bg.ID }));
        await tx.run(UPDATE(BGAmendments).set({
            status: 'ISSUED', bankBGNumber: bankBGNumber.trim(), bankDocumentKey: bankDocumentKey.trim()
        }).where({ ID: amendmentId }));
        return 'Bank amendment recorded and BG exposure updated';
    });

    // =========================================================
    // CLOSE BG
    // =========================================================

    this.on('requestClosure', async (req) => {
        const bgId = getBGId(req);
        const tx = cds.tx(req);
        const bg = await getBG(tx, bgId);
        if (!bg) return req.error(404, 'BG not found');
        if (!['ACTIVE', 'ISSUED'].includes(bg.status))
            return req.error(400, 'Closure can be requested only for an active BG');
        if (!await getBGDocument(tx, bgId, 'BENEFICIARY_RELEASE_LETTER'))
            return req.error(400, 'Beneficiary release letter is required before requesting bank closure');
        const existing = await tx.run(SELECT.one.from(BGClosures).where({ bg_ID: bgId }));
        if (existing && ['REQUESTED', 'FINANCIAL_CLOSED'].includes(existing.status))
            return req.error(400, 'A bank closure request is already open for this BG');
        const values = {
            closureRequestDate: new Date().toISOString().slice(0, 10),
            beneficiaryReleaseLetter: 'BG_DOCUMENT:BENEFICIARY_RELEASE_LETTER',
            bankCancelled: false,
            limitReleased: false,
            financialStatus: 'OPEN',
            documentStatus: /physical/i.test(String(bg.eBGOrPhysical || '')) ? 'OPEN' : 'NOT_APPLICABLE',
            status: 'REQUESTED'
        };
        if (existing) {
            await tx.run(UPDATE(BGClosures).set(values).where({ ID: existing.ID }));
        } else {
            await tx.run(INSERT.into(BGClosures).entries({ ID: cds.utils.uuid(), bg_ID: bgId, ...values }));
        }
        await addBGHistory(tx, bgId, bg.status, bg.status, 'REQUEST_BANK_CLOSURE', req.user?.id);
        return 'Bank closure request recorded';
    });

    this.on('closeBG', async (req) => {
        const bgId = getBGId(req);
        const tx = cds.tx(req);

        const bg = await getBG(tx, bgId);

        if (!bg)
            return req.error(404, 'BG not found');

        if (!['ISSUED', 'ACTIVE', 'FINANCIALLY_CLOSED'].includes(bg.status))
            return req.error(400, 'BG cannot be financially closed at this stage');

        const closure = await tx.run(
            SELECT.one.from(BGClosures).where({ bg_ID: bgId })
        );

        if (!closure)
            return req.error(400, 'BG closure record not found');

        if (!['REQUESTED', 'DOCUMENT_FOLLOW_UP'].includes(closure.status))
            return req.error(400, 'Submit a bank closure request before confirming cancellation');
        if (!await getBGDocument(tx, bgId, 'BANK_CLOSURE_CONFIRMATION'))
            return req.error(400, 'Bank closure confirmation is mandatory');

        if (closure.financialStatus !== 'CLOSED') {
            await releaseBGLimit(tx, bgId, 'Bank confirmed BG cancellation');
        }
        const isPhysical = /physical/i.test(String(bg.eBGOrPhysical || ''));
        const documentStatus = isPhysical && !closure.physicalOriginalReturned ? 'OPEN' : 'CLOSED';
        const requestStatus = documentStatus === 'CLOSED' ? 'CLOSED' : 'FINANCIALLY_CLOSED';
        await tx.run(UPDATE(BGRequests).set({ status: requestStatus }).where({ ID: bgId }));
        await tx.run(UPDATE(BGClosures).set({
            bankCancelled: true,
            limitReleased: true,
            financialStatus: 'CLOSED',
            documentStatus,
            financialClosureDate: new Date(),
            ...(documentStatus === 'CLOSED' ? { documentClosureDate: new Date() } : {}),
            status: documentStatus === 'CLOSED' ? 'CLOSED' : 'DOCUMENT_FOLLOW_UP'
        }).where({ bg_ID: bgId }));

        await addBGHistory(
            tx, bgId, bg.status, requestStatus,
            'FINANCIAL_CLOSE_BG', req.user?.id
        );

        return documentStatus === 'CLOSED'
            ? 'BG financial and document closure completed'
            : 'BG financially closed; physical original follow-up remains open';
    });

    this.on('recordPhysicalReceipt', async (req) => {
        const bgId = getBGId(req);
        const { received, receiptDate, receivedBy, storageLocation } = req.data;
        const tx = cds.tx(req);
        const bg = await getBG(tx, bgId);
        if (!bg) return req.error(404, 'BG not found');
        if (!/physical/i.test(String(bg.eBGOrPhysical || '')))
            return req.error(400, 'Physical original tracking applies only to physical BGs');
        if (!['ACTIVE', 'ISSUED'].includes(bg.status))
            return req.error(400, 'Physical original receipt can be recorded only after issuance');
        if (received && (!receiptDate || !receivedBy?.trim() || !storageLocation?.trim()))
            return req.error(400, 'Receipt date, received-by user, and storage location are required');
        await tx.run(UPDATE(BGRequests).set({
            physicalReceived: Boolean(received),
            physicalReceivedDate: received ? receiptDate : null,
            physicalReceivedBy: received ? receivedBy.trim() : null,
            physicalStorageLocation: received ? storageLocation.trim() : null
        }).where({ ID: bgId }));
        return received ? 'Physical BG receipt recorded' : 'Physical BG receipt marked outstanding';
    });

    this.on('recordPhysicalReturn', async (req) => {
        const bgId = getBGId(req);
        const { returned, returnDate } = req.data;
        const tx = cds.tx(req);
        const bg = await getBG(tx, bgId);
        if (!bg) return req.error(404, 'BG not found');
        if (!/physical/i.test(String(bg.eBGOrPhysical || '')))
            return req.error(400, 'Physical original return tracking applies only to physical BGs');
        if (!returned || !returnDate)
            return req.error(400, 'Confirm the original was returned and provide the return date');
        const closure = await tx.run(SELECT.one.from(BGClosures).where({ bg_ID: bgId }));
        if (!closure?.bankCancelled)
            return req.error(400, 'Bank cancellation must be confirmed before recording the physical return');
        const finalStatus = closure.financialStatus === 'CLOSED' ? 'CLOSED' : 'OPEN';
        await tx.run(UPDATE(BGClosures).set({
            physicalOriginalReturned: true,
            physicalReturnDate: returnDate,
            documentStatus: 'CLOSED',
            documentClosureDate: new Date(),
            status: finalStatus === 'CLOSED' ? 'CLOSED' : 'DOCUMENT_CLOSED'
        }).where({ ID: closure.ID }));
        if (finalStatus === 'CLOSED') {
            await tx.run(UPDATE(BGRequests).set({ status: 'CLOSED' }).where({ ID: bgId }));
            await addBGHistory(tx, bgId, bg.status, 'CLOSED', 'RETURN_PHYSICAL_ORIGINAL', req.user?.id);
        }
        return 'Physical original return recorded';
    });

    this.after('READ', 'BGVerticalMovement', async (data) => {
        const rows = Array.isArray(data) ? data : data ? [data] : [];
        if (!rows.length) return;
        const now = new Date();
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        const monthStartText = monthStart.toISOString().slice(0, 10);
        const nextMonthText = nextMonth.toISOString().slice(0, 10);
        const [bgRows, closures] = await Promise.all([
            cds.run(SELECT.from(BGRequests)),
            cds.run(SELECT.from(BGClosures))
        ]);
        const closureByBG = new Map(closures.map((closure) => [closure.bg_ID, closure]));

        for (const row of rows) {
            const verticalBGs = bgRows.filter((bg) =>
                (bg.vertical_ID === row.ID || bg.vertical_ID === row.code) && bg.bankIssuedDate
            );
            const openingAmount = verticalBGs.reduce((total, bg) => {
                const closure = closureByBG.get(bg.ID);
                const closedBeforeMonth = closure?.financialClosureDate
                    && String(closure.financialClosureDate).slice(0, 10) < monthStartText;
                return String(bg.bankIssuedDate).slice(0, 10) < monthStartText && !closedBeforeMonth
                    ? total + Number(bg.issuedAmount || bg.bgAmount || 0)
                    : total;
            }, 0);
            const issuedThisMonth = verticalBGs.reduce((total, bg) => {
                const issuedDate = String(bg.bankIssuedDate).slice(0, 10);
                return issuedDate >= monthStartText && issuedDate < nextMonthText
                    ? total + Number(bg.issuedAmount || bg.bgAmount || 0)
                    : total;
            }, 0);
            const returnedThisMonth = verticalBGs.reduce((total, bg) => {
                const closedDate = String(closureByBG.get(bg.ID)?.financialClosureDate || '').slice(0, 10);
                return closedDate >= monthStartText && closedDate < nextMonthText
                    ? total + Number(bg.issuedAmount || bg.bgAmount || 0)
                    : total;
            }, 0);
            row.openingAmount = toMoney(openingAmount);
            row.issuedThisMonth = toMoney(issuedThisMonth);
            row.returnedThisMonth = toMoney(returnedThisMonth);
            row.closingAmount = toMoney(openingAmount + issuedThisMonth - returnedThisMonth);
        }
    });

    // =========================================================
    // STATUS CRITICALITY FOR FIORI
    // =========================================================

   this.after('READ', 'BGRequests', (data) => {
    const setCriticality = (row) => {
        if (!row) return;

        switch (row.status) {
            // Green: successful / completed
            case 'APPROVED':
            case 'ISSUED':
            case 'ACTIVE':
            case 'CLOSED':
                row.criticality = 3;
                break;

            // Orange: processing / pending
            case 'SUBMITTED':
            case 'UNDER_REVIEW':
            case 'FORMAT_REVIEW':
            case 'FORMAT_CONFIRMED':
            case 'BANK_SELECTED':
            case 'LIMIT_RESERVED':
            case 'AUDIT_NOTE':
            case 'SENT_TO_BANK':
                row.criticality = 2;
                break;

            // Red: rejected / failed
            case 'REJECTED':
            case 'EXPIRED':
            case 'CANCELLED':
                row.criticality = 1;
                break;

            // Neutral: draft / unknown
            case 'DRAFT':
            case 'SENT_BACK':
            default:
                row.criticality = 0;
        }
    };

    if (Array.isArray(data)) {
        data.forEach(setCriticality);
    } else {
        setCriticality(data);
    }
});

    // =========================================================
    // HELPER: GET BG
    // =========================================================

    async function getBG(tx, bgId) {
        return tx.run(
            SELECT.one.from(BGRequests).where({ ID: bgId })
        );
    }

    async function getBGDocument(tx, bgId, documentType) {
        return tx.run(SELECT.one.from(BGDocuments).where({ bg_ID: bgId, documentType }));
    }

    function toMoney(amount) {
        return Number(Number(amount || 0).toFixed(2));
    }

    async function getBGChargeQuote(tx, bg, bankId, periodDays = 365) {
        const bgType = await tx.run(SELECT.one.from(BGTypes).where({ ID: bg.bgType_ID }));
        const today = new Date().toISOString().slice(0, 10);
        const masterRows = await tx.run(SELECT.from(BankChargeRates).where({
            bank_ID: bankId,
            productType: 'BG',
            active: true
        }));
        const applicableRows = masterRows.filter((row) =>
            (!row.bgType || row.bgType === bgType?.code)
            && (!row.validFrom || row.validFrom <= today)
            && (!row.validTo || row.validTo >= today)
        );
        if (!applicableRows.length) {
            return {
                annualRate: 0,
                marginPercent: 0,
                commissionAmount: 0,
                fixedCharges: 0,
                gstAmount: 0,
                totalCharges: 0,
                chargeQuoteStatus: 'MISSING_RATE'
            };
        }

        const principal = Number(bg.bgAmount || 0);
        const commissionRows = applicableRows.filter((row) =>
            /COMMISSION|ISSUANCE|PROCESSING/.test(String(row.chargeType || '').toUpperCase())
            && !/MARGIN/.test(String(row.chargeType || '').toUpperCase())
        );
        const marginRows = applicableRows.filter((row) =>
            /MARGIN/.test(String(row.chargeType || '').toUpperCase())
        );
        const fixedRows = applicableRows.filter((row) =>
            !/MARGIN/.test(String(row.chargeType || '').toUpperCase())
        );
        const annualRate = commissionRows.reduce((total, row) => total + Number(row.ratePercent || 0), 0);
        const commissionAmount = toMoney(commissionRows.reduce((total, row) => {
            const basis = String(row.calculationBasis || '').toUpperCase();
            const prorata = basis === 'ANNUAL' || basis === 'YEARLY' || basis === 'PERCENTAGE'
                ? Math.max(Number(periodDays || 0), 0) / 365
                : 1;
            const rateAmount = principal * Number(row.ratePercent || 0) / 100 * prorata;
            return total + clampCharge(rateAmount, row.minAmount, row.maxAmount);
        }, 0));
        const fixedCharges = toMoney(fixedRows.reduce((total, row) =>
            total + clampCharge(Number(row.fixedAmount || 0), row.minAmount, row.maxAmount), 0));
        const marginPercent = marginRows.reduce((total, row) => total + Number(row.ratePercent || 0), 0);
        const gstAmount = toMoney((commissionAmount + fixedCharges) * 0.18);
        return {
            annualRate,
            marginPercent,
            commissionAmount,
            fixedCharges,
            gstAmount,
            totalCharges: toMoney(commissionAmount + fixedCharges + gstAmount),
            chargeQuoteStatus: 'AVAILABLE'
        };
    }

    function clampCharge(amount, minAmount, maxAmount) {
        let result = Number(amount || 0);
        if (minAmount != null) result = Math.max(result, Number(minAmount));
        if (maxAmount != null) result = Math.min(result, Number(maxAmount));
        return result;
    }

    function addValidityMonths(startDate, years = 0, months = 0) {
        if (!startDate) return null;
        const [year, month, day] = String(startDate).slice(0, 10).split('-').map(Number);
        if (![year, month, day].every(Number.isFinite)) return null;
        const targetMonth = month - 1 + Number(years || 0) * 12 + Number(months || 0);
        const targetYear = year + Math.floor(targetMonth / 12);
        const normalizedMonth = ((targetMonth % 12) + 12) % 12;
        const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
        return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)))
            .toISOString().slice(0, 10);
    }

    function getBGValidityDays(bg) {
        const startDate = bg.requiredDate || bg.requestDate;
        const expiryDate = addValidityMonths(startDate, bg.validityYears, bg.validityMonths);
        if (!startDate || !expiryDate) return 365;
        return Math.max(1, Math.ceil(
            (new Date(`${expiryDate}T00:00:00Z`) - new Date(`${String(startDate).slice(0, 10)}T00:00:00Z`)) / 86400000
        ));
    }

    async function getBGApprovalRoute(tx, bg) {
        const amount = Number(bg.bgAmount);
        const matrices = await tx.run(SELECT.from(ApprovalMatrices).where({
            processType: 'BG',
            stage: 'APPROVAL',
            active: true
        }));
        const matching = matrices.filter((matrix) =>
            (!matrix.companyCode_ID || matrix.companyCode_ID === bg.companyCode_ID)
            && (!matrix.vertical_ID || matrix.vertical_ID === bg.vertical_ID)
            && (matrix.minAmount == null || Number(matrix.minAmount) <= amount)
            && (matrix.maxAmount == null || Number(matrix.maxAmount) >= amount)
        );
        if (!matching.length) return [];

        const specificity = Math.max(...matching.map((matrix) =>
            Number(Boolean(matrix.companyCode_ID)) + Number(Boolean(matrix.vertical_ID))
        ));
        return matching
            .filter((matrix) =>
                Number(Boolean(matrix.companyCode_ID)) + Number(Boolean(matrix.vertical_ID)) === specificity
            )
            .sort((left, right) => Number(left.sequence) - Number(right.sequence));
    }

    function hasBGRole(user, role) {
        const roleAliases = {
            BG_MAKER: ['BGMaker'],
            BG_APPROVER: ['BGApprover'],
            BG_SENIOR_APPROVER: ['BGSeniorApprover'],
            BG_FINANCE_APPROVER: ['BGFinanceApprover', 'Finance'],
            BG_AUTHORIZED_SIGNATORY: ['BGAuthorizedSignatory']
        };
        const acceptedRoles = [role, ...(roleAliases[role] || [])];
        return Boolean(user?.is?.('Admin') || acceptedRoles.some((acceptedRole) => user?.is?.(acceptedRole)));
    }

    function getBGId(req) {
        return req.params?.[0]?.ID ?? req.data?.bgId;
    }

    // =========================================================
    // HELPER: ADD STATUS HISTORY
    // =========================================================

    async function addBGHistory(
        tx,
        bgId,
        fromStatus,
        toStatus,
        action,
        performedBy,
        remarks
    ) {
        await tx.run(
            INSERT.into(BGStatusHistories).entries({
                ID: cds.utils.uuid(),
                bg_ID: bgId,
                fromStatus,
                toStatus,
                action,
                remarks,
                performedBy,
                performedAt: new Date()
            })
        );
    }

    // =========================================================
    // HELPER: RELEASE BG LIMIT
    // =========================================================

    async function releaseBGLimit(tx, bgId, reason) {
        const reservations = await tx.run(
            SELECT.from(BankLimitReservations).where({
                processType: 'BG',
                businessObjectId: bgId,
                status: { in: ['RESERVED', 'CONSUMED', 'UTILISED'] }
            })
        );

        for (const reservation of reservations) {
            const bankLimit = await tx.run(
                SELECT.one.from(BankLimits)
                    .where({ ID: reservation.bankLimit_ID })
            );

            if (!bankLimit)
                continue;

            const beforeReserved = Number(bankLimit.reservedAmount || 0);
            const beforeUtilised = Number(bankLimit.utilisedAmount || 0);
            const amount = Number(reservation.amount || 0);
            const isReserved = reservation.status === 'RESERVED';
            const afterReserved = isReserved ? Math.max(0, beforeReserved - amount) : beforeReserved;
            const afterUtilised = isReserved ? beforeUtilised : Math.max(0, beforeUtilised - amount);

            await tx.run(
                UPDATE(BankLimits)
                    .set({
                        reservedAmount: afterReserved,
                        utilisedAmount: afterUtilised,
                        availableAmount:
                            Number(bankLimit.sanctionedAmount || 0) -
                            afterUtilised -
                            afterReserved
                    })
                    .where({ ID: bankLimit.ID })
            );

            await tx.run(
                UPDATE(BankLimitReservations)
                    .set({
                        status: 'RELEASED',
                        releasedAt: new Date(),
                        reason
                    })
                    .where({ ID: reservation.ID })
            );

            await tx.run(
                INSERT.into(BankLimitTransactions).entries({
                    ID: cds.utils.uuid(),
                    bankLimit_ID: bankLimit.ID,
                    bank_ID: reservation.bank_ID,
                    companyCode_ID: reservation.companyCode_ID,
                    processType: 'BG',
                    businessObjectId: bgId,
                    transactionType: isReserved ? 'RELEASE' : 'UTILISATION_RELEASE',
                    amount,
                    currency: reservation.currency,
                    beforeUtilised,
                    afterUtilised,
                    beforeReserved,
                    afterReserved,
                    transactionDate: new Date(),
                    referenceNo: bgId,
                    remarks: reason
                })
            );
        }
    }
});
