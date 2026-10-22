 import cds from '@sap/cds';
import * as mockS4 from './mock-s4-service.js';

const {SELECT, INSERT, UPDATE, DELETE} = cds.ql;

const {LCRequests,LCPOAllocations,LCBankSelections,LCBankSplits,LCApprovalNotes,LCApprovalNoteBanks,LCBillOfExchanges,LCAccountingReferences,LCStatusHistories,LCClosures,BankLimits,BankLimitReservations,BankLimitTransactions,POReservations,ExchangeRates,IntegrationMessages,FLCImportDocuments,CompanyCodes,Vendors,Plants,BankChargeRates} = cds.entities('com.sms.tradefinance');

export default cds.service.impl(function () {

  this.before('CREATE', 'LCRequests', async (req) => {
    const data = req.data;
    if(!data.companyCode_ID)
      req.error(400, 'Company Code is mandatory');

    if(!data.vendor_ID)
      req.error(400, 'Vendor is mandatory');

    if(!data.plant_ID)
      req.error(400, 'Plant is mandatory');

    if(!data.lcType)
      req.error(400, 'LC Type is mandatory');

    if(!['DOMESTIC', 'FOREIGN'].includes(data.lcType)){
      req.error(400, 'Invalid LC Type');
    }

        if(data.lcType === 'DOMESTIC' && !data.currency)
      req.error(400, 'Currency is mandatory');

    if(data.finalLCAmount != null && data.finalLCAmount < 0){
      req.error(400, 'LC amount cannot be negative');
    }
    data.requestDate ??= new Date().toISOString().substring(0, 10);
        data.status ??= 'DRAFT';

    if(data.lcType === 'FOREIGN'){
      if(!data.portOfLoading){
        req.error(400, 'Port of Loading is mandatory for Foreign LC');
      }
      if(!data.portOfDestination){
        req.error(400, 'Port of Destination is mandatory for Foreign LC');
      }
            data.gstApplicable = false;
            data.gstAmount = 0;
            data.gstOnInterest = 0;
            data.partialShipment = 'NOT_ALLOWED';
            data.currency = null;
            data.foreignAmount = null;
            data.finalLCAmount = null;
            data.exchangeRate = null;
            data.exchangeRateType = null;
            data.exchangeRateDate = null;
            data.exchangeRateSource = null;
            data.exchangeRateCapturedBy = null;
            data.inrEquivalent = null;
     }   
  });

    this.before('CREATE', 'LCPOAllocations', async (req) => {
        const { lc_ID: lcId, currency } = req.data;
        if (!lcId) return;

        const tx = cds.tx(req);
        const lc = await getLC(tx, lcId);
        if (!lc || lc.lcType !== 'FOREIGN') return;

        if (!req.data.poNumber?.trim()) {
            return req.error(400, 'Purchase order number is mandatory');
        }

        const existing = await tx.run(SELECT.from(LCPOAllocations).where({ lc_ID: lcId }));
        if (existing.length) {
            return req.error(400, 'A Foreign LC can have only one PO allocation');
        }

        let purchaseOrder;
        try {
            purchaseOrder = await mockS4.getPurchaseOrder(req.data.poNumber.trim());
        } catch (error) {
            return req.error(error.statusCode || 400, error.message);
        }
        const companyCode = await tx.run(SELECT.one.from(CompanyCodes).where({ ID: lc.companyCode_ID }));
        const vendor = await tx.run(SELECT.one.from(Vendors).where({ vendorCode: purchaseOrder.Supplier, active: true }));
        const plant = await tx.run(SELECT.one.from(Plants).where({ code: purchaseOrder.Plant, active: true }));

        if (!companyCode || companyCode.code.replace(/^SMS-/, '') !== String(purchaseOrder.CompanyCode)) {
            return req.error(400, 'The selected PO belongs to a different company code');
        }
        if (!vendor || vendor.ID !== lc.vendor_ID) {
            return req.error(400, 'The selected PO vendor does not match the LC vendor');
        }
        if (!plant || plant.ID !== lc.plant_ID) {
            return req.error(400, 'The selected PO plant does not match the LC plant');
        }

        const poAmount = Number(purchaseOrder.NetAmount);
        if (!Number.isFinite(poAmount) || poAmount <= 0 || !purchaseOrder.DocumentCurrency) {
            return req.error(400, 'The PO is missing a valid amount or currency');
        }

        Object.assign(req.data, {
            poDate: purchaseOrder.PurchaseOrderDate,
            vendorCode: purchaseOrder.Supplier,
            plantCode: purchaseOrder.Plant,
            poBasicValue: poAmount,
            alreadyCovered: Number(purchaseOrder.AlreadyCovered || 0),
            availableBalance: toMoney(poAmount - Number(purchaseOrder.AlreadyCovered || 0)),
            currency: purchaseOrder.DocumentCurrency
        });

        await tx.run(UPDATE(LCRequests).set({
            currency: purchaseOrder.DocumentCurrency,
            gstApplicable: false,
            gstAmount: 0,
            gstOnInterest: 0,
            partialShipment: 'NOT_ALLOWED'
        }).where({ ID: lcId }));
    });

  //submit LC(Letter of Credit)

  this.on('submitLC', async (req) => {
        const lcId = getLCId(req);
    const tx = cds.tx(req);
    const lc = await tx.run(SELECT.one.from(LCRequests).where({ ID: lcId}));

    if(!lc){
      return req.error(404, 'LC Request not found');
    }
    if(lc.status !== 'DRAFT' && lc.status !== 'SENT_BACK'){
      return req.error(400, `LC cannot be submitted from status ${lc.status}`);
    }

    //check po allocation
    const allocations = await tx.run(SELECT.from(LCPOAllocations).where({lc_ID: lcId}));

        if(!allocations.length){
      return req.error(400, 'At least one PO allocation is required');
    }
        if (lc.lcType === 'FOREIGN' && allocations.length !== 1) {
            return req.error(400, 'A Foreign LC must have exactly one PO allocation');
        }
    let totalAllocation = 0;
    for(const allocation of allocations){
      if(!allocation.currentAllocation || allocation.currentAllocation <= 0){
        return req.error(400, `Invalid allocation for PO ${allocation.poNumber}`);
      }
            if (allocation.availableBalance != null && Number(allocation.currentAllocation) > Number(allocation.availableBalance)) {
                return req.error(400, `Allocation exceeds available PO balance for ${allocation.poNumber}`);
            }
      totalAllocation += Number(allocation.currentAllocation);
    }
        if (lc.lcType === 'FOREIGN' && (!allocations[0].currency || !Number.isFinite(totalAllocation))) {
            return req.error(400, 'The selected PO must provide a valid currency and amount');
        }
        if(lc.lcType === 'DOMESTIC' && lc.finalLCAmount && totalAllocation > Number(lc.finalLCAmount)){
      return req.error(400, 'PO allocation exceeds LC amount');
    }
        const requestUpdates = { status: 'SUBMITTED' };
        if (lc.lcType === 'FOREIGN') {
            const existingPOReservations = await tx.run(SELECT.from(POReservations).where({
                poNumber: allocations[0].poNumber,
                status: 'RESERVED'
            }));
            const alreadyReserved = existingPOReservations.reduce(
                (total, reservation) => total + Number(reservation.reservedAmount || 0),
                0
            );
            if (totalAllocation + alreadyReserved > Number(allocations[0].availableBalance || 0)) {
                return req.error(400, 'FLC allocation exceeds the remaining unreserved PO balance');
            }

            Object.assign(requestUpdates, {
                currency: allocations[0].currency,
                foreignAmount: totalAllocation,
                finalLCAmount: totalAllocation,
                gstApplicable: false,
                gstAmount: 0,
                gstOnInterest: 0,
                partialShipment: 'NOT_ALLOWED'
            });
        }
        await tx.run(UPDATE(LCRequests).set(requestUpdates).where({ ID: lcId}));
        if (lc.lcType === 'FOREIGN') {
            await tx.run(INSERT.into(POReservations).entries({
                ID: cds.utils.uuid(),
                poNumber: allocations[0].poNumber,
                lcRequestId: lcId,
                reservedAmount: totalAllocation,
                currency: allocations[0].currency,
                status: 'RESERVED',
                reservedAt: new Date(),
                reason: `FLC ${lc.requestNo}`
            }));
            await tx.run(UPDATE(LCPOAllocations).set({ reservationStatus: 'RESERVED' }).where({ ID: allocations[0].ID }));
        }
    await addLCStatusHistory(tx, lcId, lc.status, 'SUBMITTED', 'SUBMIT', req.user?.id);
    return 'LC submitted successfully';
  });

    this.before('CREATE', 'LCBillOfExchanges', (req) => {
        req.error(405, 'Create Bills of Exchange through the createBoE action');
    });

    this.before('UPDATE', 'LCBillOfExchanges', async (req) => {
        const boeId = req.params?.[0]?.ID ?? req.data.ID;
        if (!boeId) return;
        const boe = await cds.run(SELECT.one.from(LCBillOfExchanges).where({ ID: boeId }));
        if (!boe) return;
        const lc = await cds.run(SELECT.one.from(LCRequests).where({ ID: boe.lc_ID }));
        if (lc?.lcType === 'FOREIGN' && req.user?.hasRole && !req.user.hasRole('Finance')) {
            req.error(403, 'Finance role is required to verify FLC acceptance facts');
        }
        if (req.data.status || req.data.acceptanceDate || req.data.financeAcceptanceConfirmedBy || req.data.financeAcceptanceConfirmedAt) {
            req.error(400, 'Use the Finance acceptance action to change BOE status');
        }
    });

    this.before('UPDATE', 'LCPOAllocations', async (req) => {
        const allocationId = req.params?.[0]?.ID ?? req.data.ID;
        if (!allocationId) return;
        const allocation = await cds.run(SELECT.one.from(LCPOAllocations).where({ ID: allocationId }));
        if (!allocation) return;
        const lc = await cds.run(SELECT.one.from(LCRequests).where({ ID: allocation.lc_ID }));
        if (lc && !['DRAFT', 'SENT_BACK'].includes(lc.status)) {
            req.error(400, 'PO allocation cannot be changed after LC submission');
        }
    });

    this.before('UPDATE', 'LCClosures', (req) => {
        if (req.data.status || req.data.closureDate) {
            req.error(400, 'Use the Finance closeLC action to finalize closure');
        }
    });

  //approve LC
  this.on('approveLC', async (req) => {
        const lcId = getLCId(req);
        const { remarks } = req.data;
    const tx = cds.tx(req);
    let lc = await getLC(tx, lcId);

    if(!lc)return req.error(404, 'LC not found');
    if(!['SUBMITTED', 'SENT_BACK'].includes(lc.status)){
      return req.error(400, `LC cannot be approved from ${lc.status}`);
    }
    await tx.run(UPDATE(LCRequests).set({status: 'APPROVED'}).where({ ID: lcId}));
    await addLCStatusHistory(tx,lcId, lc.status,'APPROVED', 'APPROVE', req.user?.id,remarks);
    return 'LC approved successfully';
  });

    this.before('CREATE', 'FLCImportDocuments', (req) => {
        req.data.verified = false;
        req.data.verifiedBy = null;
        req.data.verifiedAt = null;
        req.data.uploadedAt ??= new Date();
        req.data.uploadedBy ??= req.user?.id;
    });

    this.before('UPDATE', 'FLCImportDocuments', (req) => {
        if (req.data.verified === true) {
            req.data.verifiedBy = req.user?.id;
            req.data.verifiedAt = new Date();
        } else if (req.data.verified === false) {
            req.data.verifiedBy = null;
            req.data.verifiedAt = null;
        }
    });

    this.on('rejectLC', async (req) => {
        const lcId = getLCId(req);
        const { reason } = req.data;
        if (!reason?.trim()) {
            return req.error(400, 'Rejection reason is mandatory');
        }

        const tx = cds.tx(req);
        const lc = await getLC(tx, lcId);

        if (!lc) return req.error(404, 'LC not found');
        if (!['SUBMITTED', 'SENT_BACK'].includes(lc.status)) {
            return req.error(400, `LC cannot be rejected from ${lc.status}`);
        }

        await tx.run(UPDATE(LCRequests).set({ status: 'REJECTED' }).where({ ID: lcId }));
        await releaseLCBankReservations(tx, lcId, reason);
        await releasePOReservations(tx, lcId, reason);
        await addLCStatusHistory(tx, lcId, lc.status, 'REJECTED', 'REJECT', req.user?.id, reason);
        return 'LC rejected successfully';
    });

  //SEND BACK LC
  this.on('sendBackLC', async (req) => {
        const lcId = getLCId(req);
        const { reason } = req.data;
    if(!reason || !reason.trim()){
      return req.error(400, 'Send-back reason is mandatory');
    }
    const tx = cds.tx(req);
    const lc = await getLC(tx, lcId);

    if(!lc)return req.error(404, 'LC not found');
    await tx.run(UPDATE(LCRequests).set({status: 'SENT_BACK'}).where({ ID: lcId}));

    //Release bank reservation
    await releaseLCBankReservations(tx,lcId,reason);
    await releasePOReservations(tx, lcId, reason);
    await addLCStatusHistory(tx,lcId,lc.status,'SENT_BACK','SEND_BACK',req.user?.id,reason);
    return 'LC sent back successfully';
  });

  //select bank
  this.on('selectBank', async (req) => {
        const lcId = getLCId(req);
        const { bankId, selectionReason } = req.data;
    const tx = cds.tx(req);
        let lc = await getLC(tx, lcId);

    if(!lc)return req.error(404, 'LC noyt found');
        if (!selectionReason?.trim()) {
            return req.error(400, 'Reason for selecting the bank is mandatory');
        }
    if(!['APPROVED', 'BANK_SELECTION'].includes(lc.status)){
      return req.error(400, `Bank selection not allowed from ${lc.status}`);
    }
        const bankCurrency = lc.lcType === 'FOREIGN' ? 'INR' : lc.currency;
        const bankLimit = await tx.run(SELECT.one.from(BankLimits).where({
            bank_ID: bankId,
            companyCode_ID: lc.companyCode_ID,
            active: true,
            currency: bankCurrency,
            ...(lc.lcType === 'FOREIGN' ? { limitType: 'FOREIGN_LC' } : {})
        }));
    if(!bankLimit){
            return req.error(404, `No active ${bankCurrency} bank limit found`);
    }
        let requiredAmount;
        let fxSnapshot;
        if (lc.lcType === 'FOREIGN') {
            const foreignAmount = Number(lc.foreignAmount || 0);
            if (!Number.isFinite(foreignAmount) || foreignAmount <= 0) {
                return req.error(400, 'Foreign LC amount must be greater than zero');
            }
            const rateDate = new Date().toISOString().slice(0, 10);
            fxSnapshot = await getExchangeRate(tx, lc.currency, rateDate);
            if (!fxSnapshot) {
                return req.error(400, `No INR exchange rate found for ${lc.currency} on or before ${rateDate}`);
            }
            const exchangeRate = Number(fxSnapshot.rate);
            if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
                return req.error(400, 'The selected INR exchange rate is invalid');
            }
            requiredAmount = toMoney(foreignAmount * exchangeRate);
        } else {
            requiredAmount = calculateBankLimitAmount(lc);
        }
    const available = Number(bankLimit.sanctionedAmount || 0) - Number(bankLimit.utilisedAmount || 0) - Number(bankLimit.reservedAmount || 0);

    const chargeQuote = await calculateBankChargeQuote(tx, bankId, bankCurrency, requiredAmount);

    if(requiredAmount > available){
      return req.error(400, `Insufficient bank limit. Available: ${available}, Required: ${requiredAmount}`);
    }
        if (fxSnapshot) {
            await tx.run(UPDATE(LCRequests).set({
                exchangeRate: fxSnapshot.rate,
                exchangeRateType: fxSnapshot.rateType,
                exchangeRateDate: fxSnapshot.rateDate,
                exchangeRateSource: fxSnapshot.source,
                exchangeRateCapturedBy: req.user?.id,
                inrEquivalent: requiredAmount,
                gstApplicable: false,
                gstAmount: 0,
                gstOnInterest: 0
            }).where({ ID: lcId }));
            lc = { ...lc, exchangeRate: fxSnapshot.rate, inrEquivalent: requiredAmount };
        }
    //Deselect existing bank selections
        await tx.run(UPDATE(LCBankSelections).set({ selected: false}).where({ lc_ID: lcId}));
        const selection = await tx.run(SELECT.one.from(LCBankSelections).where({ lc_ID: lcId, bank_ID: bankId }));
        const selectionValues = {
            bankLimit_ID: bankLimit.ID,
            selected: true,
            sanctionedLimit: bankLimit.sanctionedAmount,
            utilisedLimit: bankLimit.utilisedAmount,
            reservedLimit: bankLimit.reservedAmount,
            availableLimit: available,
            selectionReason: selectionReason.trim(),
            ...chargeQuote
        };
        if (selection) {
            await tx.run(UPDATE(LCBankSelections).set(selectionValues).where({ ID: selection.ID }));
        } else {
            await tx.run(INSERT.into(LCBankSelections).entries({
                ID: cds.utils.uuid(), lc_ID: lcId, bank_ID: bankId, ...selectionValues
            }));
        }

    //update LC
    await tx.run(UPDATE(LCRequests).set({selectedBank_ID: bankId, drawnOnBank_ID: bankId, status: 'BANK_SELECTED'}).where({ ID: lcId}));
    await addLCStatusHistory(tx, lcId, lc.status, 'BANK_SELECTED', 'BANK_SELECT', req.user?.id);
    return 'Bank selected successfully';
  });

  //RESERVE BANK LIMIT
  this.on('reserveBankLimit', async (req) => {
        const lcId = getLCId(req);
    const tx = cds.tx(req);
    const lc = await getLC(tx, lcId);

    if(!lc)return req.error(404, 'LC not found');
    if(!lc.selectedBank_ID){
      return req.error(400, 'Bank must be selected firsdt');
    }
        const expectedCurrency = lc.lcType === 'FOREIGN' ? 'INR' : lc.currency;
        const bankLimit = await tx.run(SELECT.one.from(BankLimits).where({
            bank_ID: lc.selectedBank_ID,
            companyCode_ID: lc.companyCode_ID,
            currency: expectedCurrency,
            ...(lc.lcType === 'FOREIGN' ? { limitType: 'FOREIGN_LC' } : {}),
            active: true
        }));

    if(!bankLimit){
      return req.error(400, 'Bank limit not found');
    }
        const existingReservation = await tx.run(SELECT.one.from(BankLimitReservations).where({
            processType: 'LC', businessObjectId: lcId, status: 'RESERVED'
        }));
        if (existingReservation) {
            return req.error(400, 'LC bank limit is already reserved');
        }
                const amount = calculateBankLimitAmount(lc);
        if (!Number.isFinite(amount) || amount <= 0) {
            return req.error(400, 'LC bank reservation amount must be greater than zero');
        }
    const available =  Number(bankLimit.sanctionedAmount || 0) - Number(bankLimit.utilisedAmount || 0) - Number(bankLimit.reservedAmount || 0);
        
     if(amount > available){
      return req.error(400, 'Insufficient bank limit');
     }
    const beforeReserved = Number(bankLimit.reservedAmount || 0);
    const afterReserved = beforeReserved + amount;
    await tx.run(UPDATE(BankLimits).set({reservedAmount: afterReserved, 
      availableAmount: Number(bankLimit.sanctionedAmount || 0) - Number(bankLimit.utilisedAmount || 0) - afterReserved }).where({ID: bankLimit.ID}));
      const reservationId = cds.utils.uuid();
      await tx.run(INSERT.into(BankLimitReservations).entries({
                ID: reservationId,
                bankLimit_ID: bankLimit.ID,
                bank_ID: lc.selectedBank_ID,
                companyCode_ID: lc.companyCode_ID,
                processType: 'LC',
                businessObjectId: lcId,
                amount: amount,
                currency: bankLimit.currency,
                status: 'RESERVED',
                reservedAt: new Date(),
                reason: `LC ${lc.requestNo}`
      }));
      
      await tx.run(INSERT.into(BankLimitTransactions).entries({ ID: cds.utils.uuid(),
                bankLimit_ID: bankLimit.ID,
                bank_ID: lc.selectedBank_ID,
                companyCode_ID: lc.companyCode_ID,
                processType: 'LC',
                businessObjectId: lcId,
                transactionType: 'RESERVE',
                amount: amount,
                currency: bankLimit.currency,
                beforeUtilised:
                    bankLimit.utilisedAmount,
                afterUtilised:
                    bankLimit.utilisedAmount,
                beforeReserved:
                    beforeReserved,
                afterReserved:
                    afterReserved,
                transactionDate: new Date(),
                referenceNo: lc.requestNo,
                remarks: 'LC bank limit reserved' }));

      await tx.run(UPDATE(LCRequests).set({status: 'LIMIT_RESERVED'}).where({ ID: lcId}));
      await addLCStatusHistory(tx, lcId, lc.status, 'LIMIT_RESERVED', 'RESERVE_LIMIT', req.user?.id);
      return 'Bank limit reserved successfully';          
  });

  /* ============================================================
       CREATE APPROVAL NOTE
       ============================================================ */

    this.on('createApprovalNote', async (req) => {

        const lcId = getLCId(req);

        const tx = cds.tx(req);

        const lc = await getLC(tx, lcId);

        if (!lc)
            return req.error(404, 'LC not found');

        if (!['LIMIT_RESERVED', 'BANK_SELECTED'].includes(lc.status)) {
            return req.error( 400,'Approval Note cannot be created at current stage');
        }

        const existing = await tx.run(SELECT.one.from(LCApprovalNotes).where({ lc_ID: lcId }));

        if (existing) return existing.ID;
        const bankSelection = await tx.run(SELECT.one.from(LCBankSelections).where({ lc_ID: lcId, selected: true }));
        if (!bankSelection?.selectionReason?.trim()) {
            return req.error(400, 'Bank selection reason is required before creating the Approval Note');
        }
        const noteId = cds.utils.uuid();

        await tx.run(
            INSERT.into(LCApprovalNotes).entries({
                ID: noteId,
                lc_ID: lcId,
                noteNo: `LAN-${lc.requestNo}`,
                selectedBank_ID: lc.selectedBank_ID,
                finalLCAmount: lc.finalLCAmount,
                foreignCurrency: lc.lcType === 'FOREIGN' ? lc.currency : null,
                foreignAmount: lc.lcType === 'FOREIGN' ? lc.foreignAmount : null,
                openingExchangeRate: lc.lcType === 'FOREIGN' ? lc.exchangeRate : null,
                openingExchangeRateDate: lc.lcType === 'FOREIGN' ? lc.exchangeRateDate : null,
                openingINRAmount: lc.lcType === 'FOREIGN' ? lc.inrEquivalent : null,
                vertical_ID: lc.vertical_ID,
                site_ID: lc.plant_ID,
                remarks: bankSelection.selectionReason,
                status: 'DRAFT'
            })
        );

        if (lc.lcType === 'FOREIGN') {
            const limits = await tx.run(SELECT.from(BankLimits).where({
                companyCode_ID: lc.companyCode_ID,
                currency: 'INR',
                limitType: 'FOREIGN_LC',
                active: true
            }));
            for (const limit of limits) {
                const availableLimit = Number(limit.sanctionedAmount || 0)
                    - Number(limit.utilisedAmount || 0)
                    - Number(limit.reservedAmount || 0);
                const quote = await calculateBankChargeQuote(tx, limit.bank_ID, 'INR', Number(lc.inrEquivalent || 0));
                await tx.run(INSERT.into(LCApprovalNoteBanks).entries({
                    ID: cds.utils.uuid(),
                    note_ID: noteId,
                    bank_ID: limit.bank_ID,
                    availableLimit,
                    openingCommission: quote.openingCommission,
                    commitmentCharge: quote.commitmentCharge,
                    closingCharge: quote.closingCharge,
                    acceptanceCharge: quote.acceptanceCharge,
                    additionalCharges: quote.fixedCharges,
                    gstAmount: 0,
                    totalCharges: quote.totalCharges,
                    chargeQuoteStatus: quote.chargeQuoteStatus,
                    recommended: limit.bank_ID === lc.selectedBank_ID,
                    remarks: quote.chargeQuoteStatus
                }));
            }
        }

        await tx.run(UPDATE(LCRequests).set({status: 'APPROVAL_NOTE'}).where({ ID: lcId }));
        return noteId;
    });

    this.on('approveApprovalNote', async (req) => {
        const lcId = getLCId(req);
        const tx = cds.tx(req);
        const lc = await getLC(tx, lcId);
        if (!lc) return req.error(404, 'LC not found');
        const note = await tx.run(SELECT.one.from(LCApprovalNotes).where({ lc_ID: lcId }));
        if (!note) return req.error(404, 'LC Approval Note not found');
        if (note.status !== 'DRAFT') return req.error(400, `Approval Note cannot be approved from ${note.status}`);

        await tx.run(UPDATE(LCApprovalNotes).set({
            status: 'APPROVED',
            approvedBy: req.user?.id,
            approvedAt: new Date()
        }).where({ ID: note.ID }));
        return 'LC Approval Note approved';
    });


    /* ============================================================
       SEND TO BANK
       ============================================================ */

    this.on('sendToBank', async (req) => {

        const lcId = getLCId(req);

        const tx = cds.tx(req);

        const lc = await getLC(tx, lcId);

        if (!lc)
            return req.error(404, 'LC not found');

        if (lc.status !== 'APPROVAL_NOTE') {
            return req.error(400,'LC is not ready to send to bank');
        }

        const approvalNote = await tx.run(SELECT.one.from(LCApprovalNotes).where({lc_ID: lcId}));

        if (!approvalNote) {
            return req.error(400,'LC Approval Note is missing');
          }

        if (approvalNote.status !== 'APPROVED') {
            return req.error(400,'LC Approval Note must be approved');
        }
        await tx.run(UPDATE(LCRequests).set({status: 'SENT_TO_BANK'}).where({ ID: lcId }));
        await addLCStatusHistory(tx,lcId,lc.status,'SENT_TO_BANK', 'SEND_TO_BANK', req.user?.id);
        return 'LC sent to bank successfully';
    });

    this.on('recordLCIssuance', async (req) => {
        const lcId = getLCId(req);
        const { bankLCNumber, bankIssuedDate, bankExpiryDate } = req.data;
        const tx = cds.tx(req);
        const lc = await getLC(tx, lcId);

        if (!lc) return req.error(404, 'LC not found');
        if (lc.status !== 'SENT_TO_BANK') {
            return req.error(400, `Bank issuance cannot be recorded from ${lc.status}`);
        }
        if (!bankLCNumber?.trim() || !bankIssuedDate || !bankExpiryDate) {
            return req.error(400, 'Bank LC number, issue date, and expiry date are required');
        }
        if (new Date(bankExpiryDate) < new Date(bankIssuedDate)) {
            return req.error(400, 'Bank LC expiry date cannot precede issue date');
        }

        const reservation = await tx.run(SELECT.one.from(BankLimitReservations).where({
            processType: 'LC', businessObjectId: lcId, status: 'RESERVED'
        }));
        if (!reservation) return req.error(400, 'Reserved bank limit is required before issuance');

        const bankLimit = await tx.run(SELECT.one.from(BankLimits).where({ ID: reservation.bankLimit_ID }));
        if (!bankLimit) return req.error(400, 'Reserved bank limit record was not found');

        const amount = Number(reservation.amount || 0);
        const beforeUtilised = Number(bankLimit.utilisedAmount || 0);
        const beforeReserved = Number(bankLimit.reservedAmount || 0);
        const afterUtilised = beforeUtilised + amount;
        const afterReserved = Math.max(0, beforeReserved - amount);

        await tx.run(UPDATE(BankLimits).set({
            utilisedAmount: afterUtilised,
            reservedAmount: afterReserved,
            availableAmount: Number(bankLimit.sanctionedAmount || 0) - afterUtilised - afterReserved
        }).where({ ID: bankLimit.ID }));
        await tx.run(UPDATE(BankLimitReservations).set({
            status: 'CONSUMED', consumedAt: new Date()
        }).where({ ID: reservation.ID }));
        await tx.run(INSERT.into(BankLimitTransactions).entries({
            ID: cds.utils.uuid(),
            bankLimit_ID: bankLimit.ID,
            bank_ID: reservation.bank_ID,
            companyCode_ID: reservation.companyCode_ID,
            processType: 'LC',
            businessObjectId: lcId,
            transactionType: 'ISSUE',
            amount,
            currency: reservation.currency,
            beforeUtilised,
            afterUtilised,
            beforeReserved,
            afterReserved,
            transactionDate: new Date(),
            referenceNo: lc.requestNo,
            remarks: 'LC issued; reserved limit moved to utilised'
        }));

        await tx.run(UPDATE(LCRequests).set({
            bankLCNumber: bankLCNumber.trim(),
            bankIssuedDate,
            bankExpiryDate,
            status: 'BANK_ISSUED'
        }).where({ ID: lcId }));
        await addLCStatusHistory(tx, lcId, lc.status, 'BANK_ISSUED', 'RECORD_ISSUANCE', req.user?.id);
        return 'LC issuance recorded successfully';
    });

    /* ============================================================
       CREATE BOE
       ============================================================ */

    this.on('createBoE', async (req) => {
        const lcId = getLCId(req);
        const tx = cds.tx(req);
        const lc = await getLC(tx, lcId);
        if (!lc)
            return req.error(404, 'LC not found');

        if (!['BANK_ISSUED', 'ACTIVE'].includes(lc.status)) {
            return req.error(400,'BoE cannot be created at current LC status');
        }

        const existingBoE = await tx.run(SELECT.one.from(LCBillOfExchanges).where({ lc_ID: lcId }));
        if (lc.lcType === 'FOREIGN' && existingBoE) {
            return req.error(400, 'A Foreign LC can have only one Bill of Exchange');
        }

        let poAllocation;
        if (lc.lcType === 'FOREIGN') {
            const allocations = await tx.run(SELECT.from(LCPOAllocations).where({ lc_ID: lcId }));
            if (allocations.length !== 1) {
                return req.error(400, 'A Foreign LC must have exactly one PO allocation before BOE creation');
            }
            poAllocation = allocations[0];
            if (poAllocation.currency !== lc.currency) {
                return req.error(400, 'Foreign LC currency must match the selected PO currency');
            }
        }

        const boeId = cds.utils.uuid();

        await tx.run(
            INSERT.into(LCBillOfExchanges).entries({
                ID: boeId,
                lc_ID: lcId,
                requestDate: new Date(),
                currency: lc.currency,
                amount: lc.lcType === 'FOREIGN' ? lc.foreignAmount : lc.finalLCAmount,
                acceptanceType:
                    lc.lcType === 'FOREIGN'
                        ? 'FOREIGN_PO_BASED'
                        : 'DOMESTIC_INVOICE',
                status: 'DRAFT',
                isInvoiceBased:
                    lc.lcType === 'DOMESTIC',
                poNumber: poAllocation?.poNumber,
                vendorCode: poAllocation?.vendorCode
            })
        );

        return boeId;
    });


    /* ============================================================
       ACCEPT BOE
       ============================================================ */

    this.on('acceptBoE', async (req) => {

        const boeId = getBoEId(req);

        const tx = cds.tx(req);

        const boe = await tx.run(
            SELECT.one.from(LCBillOfExchanges)
                .where({ ID: boeId })
        );

        if (!boe)
            return req.error(404, 'BoE not found');

        if (boe.status !== 'DRAFT') {
            return req.error(
                400,
                'BoE cannot be accepted'
            );
        }

        const lc = await getLC(tx, boe.lc_ID);
        if (!lc) return req.error(404, 'LC not found for this BoE');

        if (lc.lcType === 'FOREIGN') {
            const acceptanceFacts = [
                boe.shipmentOccurred,
                boe.bankDocumentsReceived,
                boe.goodsAtPortOrInControl,
                boe.documentsComplete,
                boe.noMaterialDiscrepancy
            ];
            if (acceptanceFacts.some((fact) => !fact)) {
                return req.error(400, 'Finance must confirm shipment, bank receipt, goods control, complete documents, and no material discrepancy');
            }

            const documents = await tx.run(SELECT.from(FLCImportDocuments).where({ lc_ID: lc.ID }));
            const verifiedTypes = new Set(documents
                .filter((document) => document.verified && (document.content || document.storageKey))
                .map((document) => normalizeDocumentType(document.documentType)));
                const requiredTypes = [
                'COMMERCIAL_INVOICE',
                'BILL_OF_EXCHANGE',
                'BANK_ADVICE'
            ];
            const missingTypes = requiredTypes.filter((type) => !verifiedTypes.has(type));
                if (!verifiedTypes.has('BILL_OF_LADING') && !verifiedTypes.has('SHIPPING_DOCUMENT')) {
                    missingTypes.push('BILL_OF_LADING or SHIPPING_DOCUMENT');
                }
            const unverifiedRequired = documents.filter((document) => document.required && !document.verified);
            if (unverifiedRequired.length) {
                return req.error(400, 'Every document marked required must be verified before FLC acceptance');
            }
            if (missingTypes.length) {
                return req.error(400, `Verified FLC documents required before acceptance: ${missingTypes.join(', ')}`);
            }

            const allocation = await tx.run(SELECT.one.from(LCPOAllocations).where({ lc_ID: lc.ID }));
            if (!allocation) return req.error(400, 'A PO allocation is required for FLC acceptance');

            const existingReference = await tx.run(SELECT.one.from(LCAccountingReferences).where({
                boe_ID: boeId,
                accountingStage: 'FLC_ACCEPTANCE'
            }));
            if (!existingReference) {
                const companyCode = await tx.run(SELECT.one.from(CompanyCodes).where({ ID: lc.companyCode_ID }));
                const accountingReferenceId = cds.utils.uuid();
                const messageId = cds.utils.uuid();
                const payload = {
                    lcId: lc.ID,
                    boeId,
                    requestNo: lc.requestNo,
                    poNumber: allocation.poNumber,
                    vendorCode: allocation.vendorCode,
                    currency: lc.currency,
                    foreignAmount: Number(lc.foreignAmount),
                    exchangeRate: Number(lc.exchangeRate),
                    inrEquivalent: Number(lc.inrEquivalent),
                    entryPurpose: 'Temporary PO-based LC acceptance liability; no SAP invoice selected',
                    postingProfile: 'MOCK_ONLY_FINANCE_MAPPING_REQUIRED'
                };
                await tx.run(INSERT.into(LCAccountingReferences).entries({
                    ID: accountingReferenceId,
                    lc_ID: lc.ID,
                    boe_ID: boeId,
                    companyCode: companyCode?.code,
                    currency: lc.currency,
                    amount: lc.foreignAmount,
                    accountingStage: 'FLC_ACCEPTANCE',
                    status: 'PENDING_MOCK_POSTING',
                    remarks: 'No SAP invoice selected; finance must approve ledger mapping before live posting'
                }));
                await tx.run(INSERT.into(IntegrationMessages).entries({
                    ID: messageId,
                    messageType: 'FLC_ACCEPTANCE_POSTING',
                    businessObjectType: 'FOREIGN_LC',
                    businessObjectId: lc.ID,
                    direction: 'OUTBOUND',
                    idempotencyKey: `FLC_ACCEPTANCE_${boeId}`,
                    payload: JSON.stringify(payload),
                    status: 'PENDING',
                    retryCount: 0,
                    createdAt: new Date().toISOString()
                }));
            }
        }

        await tx.run(
            UPDATE(LCBillOfExchanges)
                .set({
                    status: 'ACCEPTED',
                    acceptanceDate: new Date(),
                    financeAcceptanceConfirmedBy: req.user?.id,
                    financeAcceptanceConfirmedAt: new Date()
                })
                .where({ ID: boeId })
        );

            if (lc.lcType === 'FOREIGN') {
                await tx.run(UPDATE(LCRequests).set({ status: 'ACTIVE' }).where({ ID: lc.ID }));
                await addLCStatusHistory(tx, lc.ID, lc.status, 'ACTIVE', 'BOE_ACCEPTED', req.user?.id);
            }

        return 'BoE accepted successfully';
    });


    /* ============================================================
       CLOSE LC
       ============================================================ */

    this.on('closeLC', async (req) => {

        const lcId = getLCId(req);

        const tx = cds.tx(req);

        const lc = await getLC(tx, lcId);

        if (!lc)
            return req.error(404, 'LC not found');

        if (lc.status === 'CLOSED') {
            return req.error(
                400,
                'LC is already closed'
            );
        }
        if (!['BANK_ISSUED', 'ACTIVE'].includes(lc.status)) {
            return req.error(400, `LC cannot be closed from ${lc.status}`);
        }

        const closure = await tx.run(SELECT.one.from(LCClosures).where({ lc_ID: lcId }));
        let closureUpdate;
        if (lc.lcType === 'FOREIGN') {
            if (!closure) return req.error(400, 'FLC closure record is required');
            if (!closure.bankClosed || !closure.accountingClosed) {
                return req.error(400, 'Bank and accounting closure must be confirmed before closing the FLC');
            }
            if (Number(closure.outstandingAmount || 0) !== 0) {
                return req.error(400, 'FLC cannot close while an outstanding amount remains');
            }
            const paymentRate = Number(closure.exchangeRateAtPayment || 0);
            const openingInr = Number(lc.inrEquivalent || 0);
            if (!Number.isFinite(paymentRate) || paymentRate <= 0 || openingInr <= 0) {
                return req.error(400, 'Valid payment FX rate and opening INR equivalent are required');
            }
            const paymentInr = toMoney(Number(lc.foreignAmount || 0) * paymentRate);
            closureUpdate = {
                status: 'CLOSED',
                closureDate: new Date().toISOString().slice(0, 10),
                openingINRAmount: openingInr,
                paymentINRAmount: paymentInr,
                exchangeDifference: toMoney(paymentInr - openingInr),
                foreignBankCharges: Number(closure.foreignBankCharges || 0)
            };
        } else {
            const openBoEs = await tx.run(SELECT.from(LCBillOfExchanges).where({
                lc_ID: lcId,
                status: { in: ['DRAFT', 'ACCEPTED', 'OPEN'] }
            }));
            if (openBoEs.length) return req.error(400, 'LC has open BoE records');
            closureUpdate = {
                accountingClosed: true,
                bankClosed: true,
                status: 'CLOSED',
                closureDate: new Date().toISOString().slice(0, 10)
            };
        }

        await tx.run(
            UPDATE(LCRequests)
                .set({
                    status: 'CLOSED'
                })
                .where({ ID: lcId })
        );

        if (closure) {
            await tx.run(UPDATE(LCClosures).set(closureUpdate).where({ ID: closure.ID }));
        }

        await releaseLCBankReservations(
            tx,
            lcId,
            'LC closed'
        );
        if (lc.lcType === 'FOREIGN') {
            await releaseConsumedLCLimit(tx, lcId, lc.requestNo);
            await releasePOReservations(tx, lcId, 'FLC closed');
        }

        await addLCStatusHistory(
            tx,
            lcId,
            lc.status,
            'CLOSED',
            'CLOSE',
            req.user?.id
        );

        return 'LC closed successfully';
    });

    this.on('recordForeignPayment', async (req) => {
        const lcId = getLCId(req);
        const { paymentDate, outstandingAmount = 0, foreignBankCharges = 0 } = req.data;
        const tx = cds.tx(req);
        const lc = await getLC(tx, lcId);

        if (!lc) return req.error(404, 'LC not found');
        if (lc.lcType !== 'FOREIGN') return req.error(400, 'Payment FX reconciliation is only for Foreign LCs');
        if (!['BANK_ISSUED', 'ACTIVE'].includes(lc.status)) {
            return req.error(400, `Payment cannot be recorded from ${lc.status}`);
        }
        if (!paymentDate) return req.error(400, 'Payment date is mandatory');
        if (Number(outstandingAmount) < 0 || Number(foreignBankCharges) < 0) {
            return req.error(400, 'Outstanding amount and bank charges cannot be negative');
        }

        const fx = await getExchangeRate(tx, lc.currency, paymentDate);
        if (!fx) return req.error(400, `No ${lc.currency}/INR exchange rate found on or before ${paymentDate}`);
        const paymentINRAmount = toMoney(Number(lc.foreignAmount) * Number(fx.rate));
        const existingClosure = await tx.run(SELECT.one.from(LCClosures).where({ lc_ID: lcId }));
        const values = {
            exchangeRateAtPayment: fx.rate,
            exchangeRateAtPaymentDate: fx.rateDate,
            exchangeRateAtPaymentType: fx.rateType,
            exchangeRateAtPaymentSource: fx.source,
            paymentINRAmount,
            openingINRAmount: Number(lc.inrEquivalent || 0),
            exchangeDifference: toMoney(paymentINRAmount - Number(lc.inrEquivalent || 0)),
            outstandingAmount: Number(outstandingAmount),
            foreignBankCharges: Number(foreignBankCharges),
            requestedDate: paymentDate,
            status: Number(outstandingAmount) === 0 ? 'PAYMENT_RECORDED' : 'PARTIALLY_PAID'
        };

        if (existingClosure) {
            await tx.run(UPDATE(LCClosures).set(values).where({ ID: existingClosure.ID }));
        } else {
            await tx.run(INSERT.into(LCClosures).entries({
                ID: cds.utils.uuid(), lc_ID: lcId, ...values
            }));
        }
        return 'Foreign LC payment reconciliation recorded';
    });


    /* ============================================================
       GENERIC UPDATE VALIDATION
       ============================================================ */

    this.before('UPDATE', 'LCRequests', async (req) => {

        const lcId = req.params?.[0]?.ID ?? req.data.ID;
        if (!lcId) return;

        const lc = await cds.run(
            SELECT.one.from(LCRequests)
                .where({ ID: lcId })
        );

        if (!lc)
            return;

        if (req.data.status && req.data.status !== lc.status) {
            req.error(400, 'Use an LC workflow action to change status');
        }

        if (lc.lcType === 'FOREIGN') {
            if (req.data.currency && req.data.currency !== lc.currency) {
                req.error(400, 'Foreign LC currency is controlled by the selected PO');
            }
            Object.assign(req.data, {
                gstApplicable: false,
                gstAmount: 0,
                gstOnInterest: 0,
                partialShipment: 'NOT_ALLOWED'
            });
        }

        const protectedStatuses = [
            'SENT_TO_BANK',
            'BANK_ISSUED',
            'CLOSED'
        ];

        if (protectedStatuses.includes(lc.status)) {
            req.error(
                400,
                `LC cannot be directly edited in ${lc.status} status`
            );
        }
    });
});


/* ================================================================
   HELPER FUNCTIONS
   ================================================================ */

async function getLC(tx, lcId) {

    return tx.run(
        SELECT.one.from(LCRequests)
            .where({ ID: lcId })
    );
}

function getLCId(req) {
    return req.params?.[0]?.ID ?? req.data?.lcId;
}

function getBoEId(req) {
    return req.params?.[0]?.ID ?? req.data?.boeId;
}


function calculateBankLimitAmount(lc) {

    /*
     * Domestic:
     * LC amount is normally already in bank-limit currency.
     *
     * Foreign:
     * final amount must be converted to bank-limit currency.
     */

    if (lc.lcType === 'FOREIGN') {
        if (lc.inrEquivalent != null && Number(lc.inrEquivalent) > 0) {
            return Number(lc.inrEquivalent);
        }
        if (!lc.exchangeRate || !lc.foreignAmount) return 0;
        return toMoney(Number(lc.foreignAmount) * Number(lc.exchangeRate));
    }

    return Number(lc.finalLCAmount || 0);
}

async function getExchangeRate(tx, fromCurrency, rateDate) {
    if (fromCurrency === 'INR') {
        return { rate: 1, rateType: 'SPOT', rateDate, source: 'INR base currency' };
    }

    return tx.run(
        SELECT.one.from(ExchangeRates)
            .where({
                fromCurrency,
                toCurrency: 'INR',
                active: true,
                rateDate: { '<=': rateDate }
            })
            .orderBy('rateDate desc')
    );
}

function normalizeDocumentType(documentType) {
    const normalized = String(documentType || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const aliases = {
        COMMERCIALINVOICE: 'COMMERCIAL_INVOICE',
        BILLOFEXCHANGE: 'BILL_OF_EXCHANGE',
        BILLOFLADING: 'BILL_OF_LADING',
        BILLOFENTRY: 'BILL_OF_ENTRY',
        PACKINGLIST: 'PACKING_LIST',
        SHIPPINGDOCUMENT: 'SHIPPING_DOCUMENT',
        BANKADVICE: 'BANK_ADVICE',
        PROFORMAINVOICE: 'PROFORMA_INVOICE',
        PURCHASEORDER: 'PURCHASE_ORDER'
    };
    return aliases[normalized] || normalized;
}

function toMoney(amount) {
    return Number(Number(amount).toFixed(2));
}

async function calculateBankChargeQuote(tx, bankId, currency, amount) {
    const today = new Date().toISOString().slice(0, 10);
    const rates = await tx.run(SELECT.from(BankChargeRates).where({ bank_ID: bankId, active: true }));
    const eligibleRates = rates.filter((rate) =>
        ['LC', 'FLC', 'FOREIGN_LC'].includes(String(rate.productType).toUpperCase())
        && (!rate.currency || rate.currency === currency)
        && (!rate.validFrom || rate.validFrom <= today)
        && (!rate.validTo || rate.validTo >= today)
    );

    const charges = {
        openingCommission: 0,
        commitmentCharge: 0,
        closingCharge: 0,
        acceptanceCharge: 0,
        fixedCharges: 0,
        gstOnCharges: 0,
        totalCharges: 0,
        chargeQuoteStatus: eligibleRates.length ? 'CALCULATED' : 'PENDING_FINANCE_QUOTE'
    };

    for (const rate of eligibleRates) {
        const basis = String(rate.calculationBasis || '').toUpperCase();
        let charge;
        if (basis === 'FIXED') {
            charge = Number(rate.fixedAmount || 0);
        } else if (basis === 'PERCENT' || basis === 'PERCENTAGE') {
            charge = Number(amount) * Number(rate.ratePercent || 0) / 100;
        } else {
            charges.chargeQuoteStatus = 'MANUAL_REVIEW';
            continue;
        }

        if (rate.minAmount != null) charge = Math.max(charge, Number(rate.minAmount));
        if (rate.maxAmount != null) charge = Math.min(charge, Number(rate.maxAmount));
        const chargeType = String(rate.chargeType || '').toUpperCase();
        const field = chargeType.includes('OPEN') ? 'openingCommission'
            : chargeType.includes('COMMIT') ? 'commitmentCharge'
                : chargeType.includes('CLOS') ? 'closingCharge'
                    : chargeType.includes('ACCEPT') ? 'acceptanceCharge'
                        : 'fixedCharges';
        charges[field] = toMoney(charges[field] + charge);
    }

    charges.totalCharges = toMoney(
        charges.openingCommission
        + charges.commitmentCharge
        + charges.closingCharge
        + charges.acceptanceCharge
        + charges.fixedCharges
        + charges.gstOnCharges
    );
    return charges;
}


async function addLCStatusHistory(
    tx,
    lcId,
    fromStatus,
    toStatus,
    action,
    performedBy,
    remarks
) {

    await tx.run(
        INSERT.into(LCStatusHistories).entries({
            ID: cds.utils.uuid(),
            lc_ID: lcId,
            fromStatus,
            toStatus,
            action,
            remarks,
            performedBy,
            performedAt: new Date()
        })
    );
}


async function releaseLCBankReservations(
    tx,
    lcId,
    reason
) {

    const reservations = await tx.run(
        SELECT.from(BankLimitReservations)
            .where({
                processType: 'LC',
                businessObjectId: lcId,
                status: 'RESERVED'
            })
    );

    for (const reservation of reservations) {

        const bankLimit = await tx.run(
            SELECT.one.from(BankLimits)
                .where({
                    ID: reservation.bankLimit_ID
                })
        );

        if (!bankLimit)
            continue;

        const beforeReserved =
            Number(bankLimit.reservedAmount || 0);

        const amount =
            Number(reservation.amount || 0);

        const afterReserved =
            Math.max(0, beforeReserved - amount);

        await tx.run(
            UPDATE(BankLimits)
                .set({
                    reservedAmount: afterReserved,
                    availableAmount:
                        Number(bankLimit.sanctionedAmount || 0)
                        - Number(bankLimit.utilisedAmount || 0)
                        - afterReserved
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
                .where({
                    ID: reservation.ID
                })
        );

        await tx.run(
            INSERT.into(BankLimitTransactions).entries({
                ID: cds.utils.uuid(),
                bankLimit_ID: bankLimit.ID,
                bank_ID: reservation.bank_ID,
                companyCode_ID: reservation.companyCode_ID,
                processType: 'LC',
                businessObjectId: lcId,
                transactionType: 'RELEASE',
                amount,
                currency: reservation.currency,
                beforeUtilised:
                    bankLimit.utilisedAmount,
                afterUtilised:
                    bankLimit.utilisedAmount,
                beforeReserved,
                afterReserved,
                transactionDate: new Date(),
                referenceNo: lcId,
                remarks: reason
            })
        );
    }
}

async function releaseConsumedLCLimit(tx, lcId, referenceNo) {
    const reservations = await tx.run(SELECT.from(BankLimitReservations).where({
        processType: 'LC', businessObjectId: lcId, status: 'CONSUMED'
    }));

    for (const reservation of reservations) {
        const bankLimit = await tx.run(SELECT.one.from(BankLimits).where({ ID: reservation.bankLimit_ID }));
        if (!bankLimit) continue;

        const beforeUtilised = Number(bankLimit.utilisedAmount || 0);
        const amount = Number(reservation.amount || 0);
        const afterUtilised = Math.max(0, beforeUtilised - amount);
        const availableAmount = Number(bankLimit.sanctionedAmount || 0)
            - afterUtilised
            - Number(bankLimit.reservedAmount || 0);

        await tx.run(UPDATE(BankLimits).set({
            utilisedAmount: afterUtilised,
            availableAmount
        }).where({ ID: bankLimit.ID }));
        await tx.run(UPDATE(BankLimitReservations).set({
            status: 'RELEASED', releasedAt: new Date(), reason: 'FLC closed after manual settlement'
        }).where({ ID: reservation.ID }));
        await tx.run(INSERT.into(BankLimitTransactions).entries({
            ID: cds.utils.uuid(),
            bankLimit_ID: bankLimit.ID,
            bank_ID: reservation.bank_ID,
            companyCode_ID: reservation.companyCode_ID,
            processType: 'LC',
            businessObjectId: lcId,
            transactionType: 'RELEASE',
            amount,
            currency: reservation.currency,
            beforeUtilised,
            afterUtilised,
            beforeReserved: bankLimit.reservedAmount,
            afterReserved: bankLimit.reservedAmount,
            transactionDate: new Date(),
            referenceNo,
            remarks: 'FLC limit released at closure after user-confirmed bank and accounting settlement'
        }));
    }
}


async function releasePOReservations(
    tx,
    lcId,
    reason
) {

    await tx.run(
        UPDATE(POReservations)
            .set({
                status: 'RELEASED',
                releasedAt: new Date(),
                reason
            })
            .where({
                lcRequestId: lcId,
                status: 'RESERVED'
            })
    );
}