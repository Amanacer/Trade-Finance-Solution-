
using BGService as service from '../../srv/bg-service';

annotate service.BGRequests with @(
    UI.FieldGroup #GeneralInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Label : 'Request Number', Value : requestNo },
            { $Type : 'UI.DataField', Label : 'Request Date', Value : requestDate },
            { $Type : 'UI.DataField', Label : 'Status', Value : status },
            { $Type : 'UI.DataField', Label : 'Vertical', Value : vertical.name },
            { $Type : 'UI.DataField', Label : 'Type of BG', Value : bgType.name },
            { $Type : 'UI.DataField', Label : 'eBG or Physical BG', Value : eBGOrPhysical },
            { $Type : 'UI.DataField', Label : 'BG Amount', Value : bgAmount },
            { $Type : 'UI.DataField', Label : 'Amount in Words', Value : bgAmountWords },
            { $Type : 'UI.DataField', Label : 'Tender Document Fee', Value : tenderDocumentFee },
            { $Type : 'UI.DataField', Label : 'Applicant Name', Value : applicantName },
            { $Type : 'UI.DataField', Label : 'Applicant Address', Value : applicantAddress },
            { $Type : 'UI.DataField', Label : 'Beneficiary Name', Value : beneficiaryName },
            { $Type : 'UI.DataField', Label : 'Beneficiary Address', Value : beneficiaryAddress },
            { $Type : 'UI.DataField', Label : 'Name of Work', Value : nameOfWork },
            { $Type : 'UI.DataField', Label : 'Issuing BG Bank', Value : issuingBank.bankName }
        ]
    },

    UI.FieldGroup #ValidityInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Label : 'Required Date', Value : requiredDate },
            { $Type : 'UI.DataField', Label : 'Validity (Years)', Value : validityYears },
            { $Type : 'UI.DataField', Label : 'Validity (Months)', Value : validityMonths },
            { $Type : 'UI.DataField', Label : 'Claim Period (Days)', Value : claimPeriod },
            { $Type : 'UI.DataField', Label : 'Claim Expiry Date', Value : claimExpiryDate }
        ]
    },

    UI.FieldGroup #BankFormatInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Label : 'Beneficiary Bank Details', Value : beneficiaryBankDetails },
            { $Type : 'UI.DataField', Label : 'Format Confirmed', Value : formatConfirmed },
            { $Type : 'UI.DataField', Label : 'Confirmed By', Value : formatConfirmedBy },
            { $Type : 'UI.DataField', Label : 'Confirmation Date', Value : formatConfirmedAt },
            { $Type : 'UI.DataField', Label : 'Format Remarks', Value : formatRemarks },
            { $Type : 'UI.DataField', Label : 'Bank BG Number', Value : bankBGNumber }
        ]
    },

    UI.FieldGroup #IssuanceInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Label : 'Issued Amount', Value : issuedAmount },
            { $Type : 'UI.DataField', Label : 'Bank Issued Date', Value : bankIssuedDate },
            { $Type : 'UI.DataField', Label : 'Bank Expiry Date', Value : bankExpiryDate },
            { $Type : 'UI.DataField', Label : 'Physical Original Received', Value : physicalReceived },
            { $Type : 'UI.DataField', Label : 'Physical Receipt Date', Value : physicalReceivedDate },
            { $Type : 'UI.DataField', Label : 'Physical Received By', Value : physicalReceivedBy },
            { $Type : 'UI.DataField', Label : 'Physical Storage Location', Value : physicalStorageLocation }
        ]
    },

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneralInfoFacet',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneralInfo'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ValidityInfoFacet',
            Label : 'Validity and Claim',
            Target : '@UI.FieldGroup#ValidityInfo'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'BankFormatInfoFacet',
            Label : 'Bank and Format Confirmation',
            Target : '@UI.FieldGroup#BankFormatInfo'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'IssuanceInfoFacet',
            Label : 'Issuance and Physical Receipt',
            Target : '@UI.FieldGroup#IssuanceInfo'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'DocumentsFacet',
            Label : 'Documents',
            Target : 'documents/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ApprovalsFacet',
            Label : 'Approval History',
            Target : 'approvals/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'FormatConfirmationsFacet',
            Label : 'Format Confirmations',
            Target : 'formatConfirmations/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'BankSelectionsFacet',
            Label : 'Bank Comparison',
            Target : 'bankSelections/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'AuditNoteFacet',
            Label : 'BG Audit Note',
            Target : 'auditNote/@UI.FieldGroup#AuditNote'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'AmendmentsFacet',
            Label : 'Amendments',
            Target : 'amendments/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ClosureFacet',
            Label : 'Closure',
            Target : 'closure/@UI.FieldGroup#Closure'
        }
    ],

   UI.LineItem : [
    { $Type: 'UI.DataField', Label: 'Request Number', Value: requestNo },
    { $Type: 'UI.DataField', Label: 'Request Date', Value: requestDate },
    { $Type: 'UI.DataField', Label: 'Applicant', Value: applicantName },
    { $Type: 'UI.DataField', Label: 'Beneficiary', Value: beneficiaryName },
    {
        $Type: 'UI.DataFieldForAnnotation',
        Label: 'Status',
        Target: '@UI.DataPoint#BGStatus'
    }
],

UI.DataPoint #BGStatus : {
    Title: 'Status',
    Value: status,
    Criticality: criticality
}
);

annotate service.BGRequests with @UI.Identification : [
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.submitBG', Label : 'Submit BG', @UI.Hidden : (status <> 'DRAFT' and status <> 'SENT_BACK') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.approveBG', Label : 'Approve', @UI.Hidden : (status <> 'SUBMITTED') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.rejectBG', Label : 'Reject', @UI.Hidden : (status <> 'SUBMITTED') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.sendBackBG', Label : 'Send Back', @UI.Hidden : (status <> 'SUBMITTED' and status <> 'APPROVED' and status <> 'FORMAT_REVIEW' and status <> 'FORMAT_CONFIRMED' and status <> 'LIMIT_RESERVED' and status <> 'AUDIT_NOTE') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.sendFormatToOperations', Label : 'Send Format to Operations', @UI.Hidden : (status <> 'APPROVED') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.confirmFormat', Label : 'Confirm Format', @UI.Hidden : (status <> 'FORMAT_REVIEW') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.compareBanks', Label : 'Compare Banks', @UI.Hidden : (status <> 'FORMAT_CONFIRMED') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.selectBank', Label : 'Select Issuing Bank', @UI.Hidden : (status <> 'FORMAT_CONFIRMED') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.createAuditNote', Label : 'Create BG Audit Note', @UI.Hidden : (status <> 'LIMIT_RESERVED') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.checkAuditNote', Label : 'Check BG Audit Note', @UI.Hidden : (status <> 'AUDIT_NOTE') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.approveAuditNote', Label : 'Approve BG Audit Note', @UI.Hidden : (status <> 'AUDIT_NOTE') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.sendToBank', Label : 'Send to Bank', @UI.Hidden : (status <> 'AUDIT_NOTE') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.recordIssuance', Label : 'Record Issuance', @UI.Hidden : (status <> 'SENT_TO_BANK') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.recordPhysicalReceipt', Label : 'Record Physical Receipt', @UI.Hidden : (status <> 'ACTIVE') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.recordPhysicalReturn', Label : 'Record Physical Return', @UI.Hidden : (status <> 'FINANCIALLY_CLOSED') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.createAmendment', Label : 'Create Amendment', @UI.Hidden : (status <> 'ACTIVE') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.requestClosure', Label : 'Request Closure', @UI.Hidden : (status <> 'ACTIVE') },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.closeBG', Label : 'Close BG', @UI.Hidden : (status <> 'ACTIVE' and status <> 'FINANCIALLY_CLOSED') },
];

annotate service.BGDocuments with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Document Type', Value : documentType },
    { $Type : 'UI.DataField', Label : 'Stage', Value : stage },
    { $Type : 'UI.DataField', Label : 'File Name', Value : fileName },
    { $Type : 'UI.DataField', Label : 'Version', Value : documentVersion },
    { $Type : 'UI.DataField', Label : 'Mandatory', Value : mandatory },
];

annotate service.BGDocuments with @UI.FieldGroup #DocumentUpload : {
    $Type : 'UI.FieldGroupType',
    Data : [
        { $Type : 'UI.DataField', Label : 'Document Type', Value : documentType },
        { $Type : 'UI.DataField', Label : 'Stage', Value : stage },
        { $Type : 'UI.DataField', Label : 'File Name', Value : fileName },
        { $Type : 'UI.DataField', Label : 'Media Type', Value : mediaType },
        { $Type : 'UI.DataField', Label : 'Document Content', Value : content },
        { $Type : 'UI.DataField', Label : 'Mandatory', Value : mandatory },
    ],
};

annotate service.BGApprovals with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Sequence', Value : sequence },
    { $Type : 'UI.DataField', Label : 'Role', Value : role },
    { $Type : 'UI.DataField', Label : 'Action', Value : action },
    { $Type : 'UI.DataField', Label : 'User', Value : userId },
    { $Type : 'UI.DataField', Label : 'Action Date', Value : actionAt },
    { $Type : 'UI.DataField', Label : 'Remarks', Value : remarks },
];

annotate service.BGFormatConfirmations with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Version', Value : version },
    { $Type : 'UI.DataField', Label : 'Status', Value : status },
    { $Type : 'UI.DataField', Label : 'Finance Remarks', Value : financeRemarks },
    { $Type : 'UI.DataField', Label : 'Operations Remarks', Value : operationsRemarks },
    { $Type : 'UI.DataField', Label : 'Confirmed By', Value : confirmedBy },
    { $Type : 'UI.DataField', Label : 'Confirmed At', Value : confirmedAt },
];

annotate service.BGBankSelections with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Bank', Value : bank_ID },
    { $Type : 'UI.DataField', Label : 'Sanctioned Limit', Value : sanctionedLimit },
    { $Type : 'UI.DataField', Label : 'Utilised Limit', Value : utilisedLimit },
    { $Type : 'UI.DataField', Label : 'Balance Limit', Value : availableLimit },
    { $Type : 'UI.DataField', Label : 'Commission Rate', Value : commissionRate },
    { $Type : 'UI.DataField', Label : 'Margin %', Value : marginPercent },
    { $Type : 'UI.DataField', Label : 'Fixed Charges', Value : fixedCharges },
    { $Type : 'UI.DataField', Label : 'GST', Value : gstOnCharges },
    { $Type : 'UI.DataField', Label : 'Total Charges', Value : totalCharges },
    { $Type : 'UI.DataField', Label : 'Selection Reason', Value : selectionReason },
];

annotate service.BGAuditNotes with @UI.FieldGroup #AuditNote : {
    $Type : 'UI.FieldGroupType',
    Data : [
        { $Type : 'UI.DataField', Label : 'Note Number', Value : noteNo },
        { $Type : 'UI.DataField', Label : 'Issuing Bank', Value : issuingBank_ID },
        { $Type : 'UI.DataField', Label : 'Beneficiary', Value : beneficiaryName },
        { $Type : 'UI.DataField', Label : 'Name of Work', Value : nameOfWork },
        { $Type : 'UI.DataField', Label : 'BG Amount', Value : bgAmount },
        { $Type : 'UI.DataField', Label : 'Validity From', Value : validityFrom },
        { $Type : 'UI.DataField', Label : 'Validity To', Value : validityTo },
        { $Type : 'UI.DataField', Label : 'Claim Period', Value : claimPeriod },
        { $Type : 'UI.DataField', Label : 'Commission', Value : commissionAmount },
        { $Type : 'UI.DataField', Label : 'Fixed Charges', Value : fixedCharges },
        { $Type : 'UI.DataField', Label : 'GST', Value : gstAmount },
        { $Type : 'UI.DataField', Label : 'Total Charges', Value : totalCharges },
        { $Type : 'UI.DataField', Label : 'Remarks', Value : remarks },
        { $Type : 'UI.DataField', Label : 'Status', Value : status },
    ],
};

annotate service.BGAuditNotes with @UI.Facets : [
    {
        $Type : 'UI.ReferenceFacet',
        ID : 'AuditNoteHeader',
        Label : 'Audit Note',
        Target : '@UI.FieldGroup#AuditNote'
    },
    {
        $Type : 'UI.ReferenceFacet',
        ID : 'BankComparison',
        Label : 'Bank Comparison',
        Target : 'bankComparisons/@UI.LineItem'
    }
];

annotate service.BGAuditNoteBanks with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Bank', Value : bank_ID },
    { $Type : 'UI.DataField', Label : 'Balance Limit', Value : availableLimit },
    { $Type : 'UI.DataField', Label : 'Commission Rate', Value : annualRate },
    { $Type : 'UI.DataField', Label : 'Commission', Value : commissionAmount },
    { $Type : 'UI.DataField', Label : 'Fixed Charges', Value : fixedCharges },
    { $Type : 'UI.DataField', Label : 'GST', Value : gstAmount },
    { $Type : 'UI.DataField', Label : 'Total Charges', Value : totalCharges },
    { $Type : 'UI.DataField', Label : 'Recommended', Value : recommended },
];

annotate service.BGAmendments with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Amendment Number', Value : amendmentNo },
    { $Type : 'UI.DataField', Label : 'Version', Value : version },
    { $Type : 'UI.DataField', Label : 'New Amount', Value : newAmount },
    { $Type : 'UI.DataField', Label : 'New Expiry', Value : newExpiryDate },
    { $Type : 'UI.DataField', Label : 'Status', Value : status },
    { $Type : 'UI.DataField', Label : 'Reason', Value : reason },
];

annotate service.BGAmendments with @UI.Identification : [
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.submitAmendment', Label : 'Submit Amendment' },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.approveAmendment', Label : 'Approve Amendment' },
    { $Type : 'UI.DataFieldForAction', Action : 'BGService.recordAmendmentIssuance', Label : 'Record Bank Amendment' }
];

annotate service.BGAmendments with @UI.FieldGroup #AmendmentForm : {
    $Type : 'UI.FieldGroupType',
    Data : [
        { $Type : 'UI.DataField', Label : 'New BG Amount', Value : newAmount },
        { $Type : 'UI.DataField', Label : 'New Expiry Date', Value : newExpiryDate },
        { $Type : 'UI.DataField', Label : 'New Claim Period', Value : newClaimPeriod },
        { $Type : 'UI.DataField', Label : 'New Beneficiary', Value : newBeneficiary },
        { $Type : 'UI.DataField', Label : 'Reason', Value : reason },
    ],
};

annotate service.BGAmendments with @UI.Facets : [
    { $Type : 'UI.ReferenceFacet', ID : 'AmendmentDetails', Label : 'Amendment Details', Target : '@UI.FieldGroup#AmendmentForm' }
];

annotate service.BGClosures with @UI.FieldGroup #Closure : {
    $Type : 'UI.FieldGroupType',
    Data : [
        { $Type : 'UI.DataField', Label : 'Beneficiary Release Letter', Value : beneficiaryReleaseLetter },
        { $Type : 'UI.DataField', Label : 'Bank Closure Confirmation', Value : bankClosureConfirmation },
        { $Type : 'UI.DataField', Label : 'Bank Cancelled', Value : bankCancelled },
        { $Type : 'UI.DataField', Label : 'Limit Released', Value : limitReleased },
        { $Type : 'UI.DataField', Label : 'Closure Request Date', Value : closureRequestDate },
        { $Type : 'UI.DataField', Label : 'Financial Status', Value : financialStatus },
        { $Type : 'UI.DataField', Label : 'Document Status', Value : documentStatus },
        { $Type : 'UI.DataField', Label : 'Physical Original Returned', Value : physicalOriginalReturned },
        { $Type : 'UI.DataField', Label : 'Physical Return Date', Value : physicalReturnDate },
        { $Type : 'UI.DataField', Label : 'Remarks', Value : remarks },
    ],
};

annotate service.BGMIS with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Request Number', Value : requestNo },
    { $Type : 'UI.DataField', Label : 'Request Date', Value : requestDate },
    { $Type : 'UI.DataField', Label : 'Status', Value : status },
    { $Type : 'UI.DataField', Label : 'Vertical', Value : vertical },
    { $Type : 'UI.DataField', Label : 'BG Type', Value : bgType },
    { $Type : 'UI.DataField', Label : 'Issuing Bank', Value : issuingBank },
    { $Type : 'UI.DataField', Label : 'BG Amount', Value : bgAmount },
    { $Type : 'UI.DataField', Label : 'Commission Rate', Value : commissionRate },
    { $Type : 'UI.DataField', Label : 'Margin %', Value : marginPercent },
    { $Type : 'UI.DataField', Label : 'Fixed Charges', Value : fixedCharges },
    { $Type : 'UI.DataField', Label : 'GST', Value : gstOnCharges },
    { $Type : 'UI.DataField', Label : 'Total Charges', Value : totalCharges },
    { $Type : 'UI.DataField', Label : 'Bank BG Number', Value : bankBGNumber },
    { $Type : 'UI.DataField', Label : 'Bank Issued Date', Value : bankIssuedDate },
    { $Type : 'UI.DataField', Label : 'Bank Expiry Date', Value : bankExpiryDate },
    { $Type : 'UI.DataField', Label : 'Claim Expiry Date', Value : claimExpiryDate },
    { $Type : 'UI.DataField', Label : 'Physical Original Received', Value : physicalReceived },
];

annotate service.BGBankLimitSummary with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Bank', Value : bankName },
    { $Type : 'UI.DataField', Label : 'Currency', Value : currency },
    { $Type : 'UI.DataField', Label : 'Sanctioned', Value : sanctionedAmount },
    { $Type : 'UI.DataField', Label : 'Utilised', Value : utilisedAmount },
    { $Type : 'UI.DataField', Label : 'Reserved', Value : reservedAmount },
    { $Type : 'UI.DataField', Label : 'Balance', Value : balanceLimit },
];

annotate service.BGVerticalMovement with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Vertical', Value : name },
    { $Type : 'UI.DataField', Label : 'Opening', Value : openingAmount },
    { $Type : 'UI.DataField', Label : 'New BGs Issued', Value : issuedThisMonth },
    { $Type : 'UI.DataField', Label : 'BGs Returned', Value : returnedThisMonth },
    { $Type : 'UI.DataField', Label : 'Closing', Value : closingAmount },
];

annotate service.BGRequests with {
    status @Common.Label : 'Status';
    issuingBank @readonly;

    companyCode @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'CompanyCodes',
        Parameters : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : companyCode_ID, ValueListProperty : 'ID' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'code' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'name' }
        ]
    };

    vertical @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Verticals',
        Parameters : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : vertical_ID, ValueListProperty : 'ID' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'code' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'name' }
        ]
    };

    bgType @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'BGTypes',
        Parameters : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : bgType_ID, ValueListProperty : 'ID' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'code' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'name' }
        ]
    };

    plant @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Plants',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : plant_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'code'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'address'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'active'
            }
        ]
    }
};
