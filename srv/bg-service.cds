
using { com.sms.tradefinance as db } from '../db/schema';

@path: '/bg'
service BGService {

    @restrict: [
        { grant: 'READ', to: ['BGMaker', 'BGApprover', 'Finance', 'Admin', 'ReadOnly'] },
        { grant: 'CREATE', to: ['BGMaker', 'Admin'] },
        { grant: 'UPDATE', to: ['BGMaker', 'Finance', 'Admin'] },
        { grant: 'submitBG', to: ['BGMaker', 'Admin'] },
        { grant: ['approveBG', 'rejectBG'], to: ['BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin'] },
        { grant: 'sendBackBG', to: ['BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin'] },
        { grant: 'confirmFormat', to: ['BGMaker', 'Admin'] },
        { grant: ['sendFormatToOperations', 'compareBanks', 'selectBank', 'createAuditNote', 'checkAuditNote', 'approveAuditNote', 'sendToBank', 'recordIssuance', 'recordPhysicalReceipt', 'requestClosure', 'closeBG'], to: ['Finance', 'Admin'] },
        { grant: 'createAmendment', to: ['BGMaker', 'Admin'] }
    ]
    entity BGRequests as projection on db.BGRequests {
        *,
        virtual criticality : Integer
    } actions {
        @requires: 'BGMaker'
        action submitBG() returns String;
        action approveBG(remarks : String) returns String;
        action rejectBG(reason : String) returns String;
        action sendBackBG(reason : String) returns String;
        @requires: 'Finance'
        action sendFormatToOperations(remarks : String) returns String;
        @requires: 'BGMaker'
        action confirmFormat(remarks : String) returns String;
        @requires: 'Finance'
        action compareBanks() returns String;
        @requires: 'Finance'
        action selectBank(bankId : UUID, selectionReason : String) returns String;
        @requires: 'Finance'
        action createAuditNote() returns String;
        action checkAuditNote(remarks : String) returns String;
        action approveAuditNote(remarks : String) returns String;
        @requires: 'Finance'
        action sendToBank() returns String;
        @requires: 'Finance'
        action recordIssuance(
            bankBGNumber : String,
            bankIssuedDate : Date,
            bankExpiryDate : Date,
            issuedAmount : Decimal(18,2)
        ) returns String;
        @requires: 'Finance'
        action recordPhysicalReceipt(
            received : Boolean,
            receiptDate : Date,
            receivedBy : String,
            storageLocation : String
        ) returns String;
        @requires: 'BGMaker'
        action createAmendment() returns UUID;
        @requires: 'Finance'
        action closeBG() returns String;
        @requires: 'Finance'
        action requestClosure() returns String;
        @requires: 'Finance'
        action recordPhysicalReturn(returned : Boolean, returnDate : Date) returns String;
    };

    @restrict: [{ grant: 'READ', to: ['BGMaker', 'BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin', 'ReadOnly'] }]
    entity BGApprovals as projection on db.BGApprovals;
    @restrict: [{ grant: 'READ', to: ['BGMaker', 'BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin', 'ReadOnly'] }]
    entity BGFormatConfirmations as projection on db.BGFormatConfirmations;
    @restrict: [{ grant: 'READ', to: ['BGMaker', 'BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin', 'ReadOnly'] }]
    entity BGBankSelections as projection on db.BGBankSelections;
    @restrict: [{ grant: 'READ', to: ['BGMaker', 'BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin', 'ReadOnly'] }]
    entity BGAuditNotes as projection on db.BGAuditNotes;
    @restrict: [{ grant: 'READ', to: ['BGMaker', 'BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin', 'ReadOnly'] }]
    entity BGAuditNoteBanks as projection on db.BGAuditNoteBanks;
    @restrict: [
        { grant: 'READ', to: ['BGMaker', 'BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin', 'ReadOnly'] },
        { grant: 'CREATE', to: ['BGMaker', 'Finance', 'Admin'] },
        { grant: 'UPDATE', to: ['BGMaker', 'Finance', 'Admin'] }
    ]
    entity BGDocuments as projection on db.BGDocuments;

    @restrict: [
        { grant: 'READ', to: ['BGMaker', 'BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin', 'ReadOnly'] },
        { grant: 'CREATE', to: ['BGMaker', 'Admin'] },
        { grant: 'UPDATE', to: ['BGMaker', 'Admin'] }
    ]
    entity BGAmendments as projection on db.BGAmendments actions {
        @requires: 'BGMaker'
        action submitAmendment() returns String;
        action approveAmendment(remarks : String) returns String;
        @requires: 'Finance'
        action recordAmendmentIssuance(bankBGNumber : String, bankDocumentKey : String) returns String;
    };
    @restrict: [{ grant: 'READ', to: ['BGMaker', 'BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin', 'ReadOnly'] }]
    entity BGAmendmentApprovals as projection on db.BGAmendmentApprovals;

    @restrict: [{ grant: 'READ', to: ['BGMaker', 'BGApprover', 'BGSeniorApprover', 'BGFinanceApprover', 'BGAuthorizedSignatory', 'Finance', 'Admin', 'ReadOnly'] }]
    entity BGStatusHistories as projection on db.BGStatusHistories;
    @restrict: [
        { grant: 'READ', to: ['Finance', 'BGMaker', 'Admin'] },
        { grant: 'CREATE', to: ['Finance', 'Admin'] },
        { grant: 'UPDATE', to: ['Finance', 'Admin'] }
    ]
    entity BGClosures as projection on db.BGClosures;

    @restrict: [
        { grant: 'READ', to: ['Finance', 'Admin'] }
    ]
    @readonly
    entity BGMIS as select from db.BGRequests as bg
        left outer join db.Banks as bank on bank.ID = bg.issuingBank.ID
        left outer join db.BGTypes as bgType
            on bgType.ID = bg.bgType.ID or bgType.code = bg.bgType.ID
        left outer join db.Verticals as vertical
            on vertical.ID = bg.vertical.ID or vertical.code = bg.vertical.ID
        left outer join db.BGBankSelections as selection
            on selection.bg.ID = bg.ID and selection.selected = true {
            key bg.ID as ID,
            bg.requestNo,
            bg.requestDate,
            bg.status,
            vertical.name as vertical,
            bgType.name as bgType,
            bg.eBGOrPhysical,
            bg.bgAmount,
            bg.bankIssuedDate,
            bg.bankBGNumber,
            bank.bankName as issuingBank,
            selection.commissionRate,
            selection.marginPercent,
            selection.fixedCharges,
            selection.gstOnCharges,
            selection.totalCharges,
            bg.requiredDate,
            bg.bankExpiryDate,
            bg.claimExpiryDate,
            bg.physicalReceived
        };

    @restrict: [
        { grant: 'READ', to: ['Finance', 'Admin'] }
    ]
    @readonly
    entity BGBankLimitSummary as select from db.BankLimits as limit
        left outer join db.Banks as bank on bank.ID = limit.bank.ID {
            key limit.ID as ID,
            bank.bankName as bankName,
            limit.currency,
            limit.sanctionedAmount,
            limit.utilisedAmount,
            limit.reservedAmount,
            (limit.sanctionedAmount - limit.utilisedAmount - limit.reservedAmount) as balanceLimit : Decimal(18,2)
        }
        where limit.limitType = 'BG' and limit.active = true;

    @restrict: [
        { grant: 'READ', to: ['Finance', 'Admin'] }
    ]
    @readonly
    entity BGVerticalMovement as projection on db.Verticals {
        key ID,
        code,
        name,
        virtual openingAmount : Decimal(18,2),
        virtual issuedThisMonth : Decimal(18,2),
        virtual returnedThisMonth : Decimal(18,2),
        virtual closingAmount : Decimal(18,2)
    };

}
