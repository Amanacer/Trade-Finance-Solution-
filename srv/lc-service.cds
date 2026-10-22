using { com.sms.tradefinance as db } from '../db/schema';

service LCService {

    @restrict: [
        { grant: 'READ', to: ['LCMaker', 'LCApprover', 'Finance', 'ReadOnly', 'Admin'] },
        { grant: 'CREATE', to: ['LCMaker', 'Admin'] },
        { grant: 'UPDATE', to: ['LCMaker', 'Finance', 'Admin'] },
        { grant: 'submitLC', to: ['LCMaker', 'Admin'] },
        { grant: 'selectBank', to: ['Finance', 'Admin'] },
        { grant: 'createApprovalNote', to: ['Finance', 'Admin'] },
        { grant: 'approveApprovalNote', to: ['Finance', 'Admin'] },
        { grant: 'approveLC', to: ['LCApprover', 'Admin'] },
        { grant: 'rejectLC', to: ['LCApprover', 'Admin'] },
        { grant: 'sendBackLC', to: ['LCApprover', 'Admin'] },
        { grant: 'createBoE', to: ['Finance', 'Admin'] },
        { grant: 'closeLC', to: ['Finance', 'Admin'] },
        { grant: 'reserveBankLimit', to: ['Finance', 'Admin'] },
        { grant: 'sendToBank', to: ['Finance', 'Admin'] },
        { grant: 'recordLCIssuance', to: ['Finance', 'Admin'] },
        { grant: 'recordForeignPayment', to: ['Finance', 'Admin'] }
    ]
    entity LCRequests as projection on db.LCRequests actions {
        @requires: 'LCMaker'
        action submitLC() returns String;
        @requires: 'Finance'
        action selectBank(bankId : UUID, selectionReason : String) returns String;
        @requires: 'Finance'
        action createApprovalNote() returns String;
        @requires: 'Finance'
        action approveApprovalNote() returns String;
        @requires: 'LCApprover'
        action approveLC(remarks : String) returns String;
        @requires: 'LCApprover'
        action rejectLC(reason : String) returns String;
        @requires: 'LCApprover'
        action sendBackLC(reason : String) returns String;
        action createBoE() returns UUID;
        @requires: 'Finance'
        action closeLC() returns String;
        @requires: 'Finance'
        action reserveBankLimit() returns String;
        @requires: 'Finance'
        action sendToBank() returns String;
        @requires: 'Finance'
        action recordLCIssuance(
            bankLCNumber : String,
            bankIssuedDate : Date,
            bankExpiryDate : Date
        ) returns String;
        @requires: 'Finance'
        action recordForeignPayment(
            paymentDate : Date,
            outstandingAmount : Decimal(18,2),
            foreignBankCharges : Decimal(18,2)
        ) returns String;
    };
    @restrict: [
        { grant: 'READ', to: ['LCMaker', 'LCApprover', 'Finance', 'ReadOnly', 'Admin'] },
        { grant: 'CREATE', to: ['LCMaker', 'Admin'] },
        { grant: 'UPDATE', to: ['LCMaker', 'Finance', 'Admin'] }
    ]
    entity LCPOAllocations as projection on db.LCPOAllocations;
    entity LCAmountComponents as projection on db.LCAmountComponents;

    entity LCBankSelections as projection on db.LCBankSelections;
    entity LCBankSplits as projection on db.LCBankSplits;

    entity LCApprovalNotes as projection on db.LCApprovalNotes;
    entity LCApprovalNoteBanks as projection on db.LCApprovalNoteBanks;

    @restrict: [
        { grant: 'READ', to: ['LCMaker', 'LCApprover', 'Finance', 'ReadOnly', 'Admin'] },
        { grant: 'UPDATE', to: ['Finance', 'Admin'] },
        { grant: 'acceptBoE', to: ['Finance', 'Admin'] }
    ]
    entity LCBillOfExchanges as projection on db.LCBillOfExchanges actions {
        @requires: 'Finance'
        action acceptBoE() returns String;
    };
    entity BOEInvoiceAllocations as projection on db.BOEInvoiceAllocations;
    entity BOEDocuments as projection on db.BOEDocuments;

    @restrict: [
        { grant: 'READ', to: ['LCMaker', 'LCApprover', 'Finance', 'ReadOnly', 'Admin'] },
        { grant: 'CREATE', to: ['LCMaker', 'Finance', 'Admin'] },
        { grant: 'UPDATE', to: ['Finance', 'Admin'] }
    ]
    entity FLCImportDocuments as projection on db.FLCImportDocuments;

    entity LCAccountingReferences as projection on db.LCAccountingReferences;

    entity LCStatusHistories as projection on db.LCStatusHistories;
    @restrict: [
        { grant: 'READ', to: ['Finance', 'ReadOnly', 'Admin'] },
        { grant: 'CREATE', to: ['Finance', 'Admin'] },
        { grant: 'UPDATE', to: ['Finance', 'Admin'] }
    ]
    entity LCClosures as projection on db.LCClosures;

    @readonly
    entity ForeignLCMIS as select from db.LCRequests as lc
        left outer join db.LCClosures as closure on closure.lc = lc {
            key lc.ID as ID,
            lc.requestNo,
            lc.status,
            lc.currency,
            lc.foreignAmount,
            lc.exchangeRate as openingExchangeRate,
            lc.exchangeRateType as openingExchangeRateType,
            lc.exchangeRateDate as openingExchangeRateDate,
            lc.exchangeRateSource as openingExchangeRateSource,
            lc.exchangeRateCapturedBy,
            lc.inrEquivalent as openingINRAmount,
            lc.bankLCNumber,
            closure.exchangeRateAtPayment,
            closure.exchangeRateAtPaymentDate,
            closure.exchangeRateAtPaymentType,
            closure.exchangeRateAtPaymentSource,
            closure.paymentINRAmount,
            closure.exchangeDifference,
            closure.foreignBankCharges
        }
        where lc.lcType = 'FOREIGN';

}