namespace com.sms.tradefinance;

using {cuid,managed} from '@sap/cds/common';

entity CompanyCodes : cuid, managed {
    code        : String(10) @mandatory @assert.unique;
    name        : String(100) @mandatory;
    address     : LargeString;
    currency    : String(3);
    active      : Boolean default true;

    plants      : Composition of many Plants
                    on plants.companyCode = $self;
}

entity Plants : cuid, managed {
    code        : String(10) @mandatory;
    name        : String(100);
    companyCode : Association to CompanyCodes;
    address     : LargeString;
    active      : Boolean default true;
}

entity Verticals : cuid, managed {
    code        : String(30) @mandatory @assert.unique;
    name        : String(100) @mandatory;
    active      : Boolean default true;
}

entity BGTypes : cuid, managed {
    code        : String(30) @mandatory @assert.unique;
    name        : String(100) @mandatory;
    active      : Boolean default true;
}

type BGDeliveryMode : String enum {
    EBG = 'eBG';
    Physical = 'Physical';
};

entity Currencies : cuid, managed {
    code         : String(3) @mandatory @assert.unique;
    name         : String(100);
    decimalPlaces: Integer default 2;
    active       : Boolean default true;
}


/* ============================================================
   02. VENDOR MASTER
   ============================================================ */

entity Vendors : cuid, managed {
    vendorCode : String(20) @mandatory @assert.unique;
    name       : String(200) @mandatory;
    address    : LargeString;
    taxNumber  : String(30);
    country    : String(3);
    active     : Boolean default true;

    banks      : Composition of many VendorBanks
                   on banks.vendor = $self;
}

entity VendorBanks : cuid, managed {
    vendor    : Association to Vendors;

    bankName  : String(200);
    branch    : String(200);
    accountNo : String(100);
    swiftBic  : String(20);
    iban      : String(50);
    country   : String(3);

    active    : Boolean default true;
}


/* ============================================================
   03. BANK / HOUSE BANK / BANK ACCOUNT
   ============================================================ */

entity Banks : cuid, managed {
    bankCode  : String(20) @mandatory @assert.unique;
    bankName  : String(200) @mandatory;
    active    : Boolean default true;

    branches  : Composition of many BankBranches
                  on branches.bank = $self;

    houseBanks : Composition of many HouseBanks
                   on houseBanks.bank = $self;

    limits    : Composition of many BankLimits
                  on limits.bank = $self;

    charges   : Composition of many BankChargeRates
                  on charges.bank = $self;
}

entity BankBranches : cuid, managed {
    bank       : Association to Banks;

    branchCode : String(30);
    branchName : String(200);
    address    : LargeString;
    swiftBic   : String(20);
    active     : Boolean default true;
}

entity HouseBanks : cuid, managed {
    bank        : Association to Banks;
    companyCode : Association to CompanyCodes;

    houseBankId : String(30) @mandatory;
    description : String(200);

    active      : Boolean default true;

    accounts    : Composition of many BankAccounts
                    on accounts.houseBank = $self;
}

entity BankAccounts : cuid, managed {
    houseBank   : Association to HouseBanks;

    accountId   : String(50) @mandatory;
    accountNo   : String(100);
    currency    : String(3);
    accountType : String(30);

    active      : Boolean default true;
}


/* ============================================================
   04. BANK LIMIT
   ============================================================ */

entity BankLimits : cuid, managed {
    bank             : Association to Banks;
    companyCode      : Association to CompanyCodes;

    limitType        : String(30) @mandatory;
    currency         : String(3);

    sanctionedAmount : Decimal(18,2) default 0;
    utilisedAmount   : Decimal(18,2) default 0;
    reservedAmount   : Decimal(18,2) default 0;

    availableAmount  : Decimal(18,2) default 0;

    validFrom        : Date;
    validTo          : Date;

    active           : Boolean default true;
}

entity BankLimitTransactions : cuid, managed {
    bankLimit          : Association to BankLimits;
    bank              : Association to Banks;
    companyCode        : Association to CompanyCodes;

    processType        : String(30);
    businessObjectId   : String(36);

    transactionType    : String(40);

    amount             : Decimal(18,2);
    currency           : String(3);

    beforeUtilised     : Decimal(18,2);
    afterUtilised      : Decimal(18,2);

    beforeReserved     : Decimal(18,2);
    afterReserved      : Decimal(18,2);

    transactionDate    : Timestamp;

    referenceNo        : String(100);
    remarks            : LargeString;
}


/* ============================================================
   05. BANK CHARGE / COMMISSION MASTER
   ============================================================ */

entity BankChargeRates : cuid, managed {
    bank            : Association to Banks;

    productType     : String(20) @mandatory;
    chargeType      : String(50) @mandatory;

    bgType          : String(50);

    ratePercent     : Decimal(9,4) default 0;
    fixedAmount     : Decimal(18,2) default 0;

    calculationBasis: String(30);
    /*
       FIXED
       PERCENT
       DAILY
       MONTHLY
       ANNUAL
       AMOUNT
    */

    minAmount       : Decimal(18,2);
    maxAmount       : Decimal(18,2);

    currency        : String(3);

    validFrom       : Date;
    validTo         : Date;

    active          : Boolean default true;
}


/* ============================================================
   06. EXCHANGE RATE
   ============================================================ */

entity ExchangeRates : cuid, managed {
    fromCurrency : String(3) @mandatory;
    toCurrency   : String(3) @mandatory;

    rate         : Decimal(18,8) @mandatory;
    rateType     : String(30);
    rateDate     : Date;

    source       : String(100);

    capturedAt   : Timestamp;
    capturedBy   : String(100);

    active       : Boolean default true;
}


/* ============================================================
   07. APPROVAL CONFIGURATION
   ============================================================ */

entity ApprovalMatrices : cuid, managed {
    processType : String(30) @mandatory;
    stage       : String(50) @mandatory;

    sequence    : Integer @mandatory;
    role        : String(100) @mandatory;

    companyCode : Association to CompanyCodes;
    vertical    : Association to Verticals;

    minAmount   : Decimal(18,2);
    maxAmount   : Decimal(18,2);

    active      : Boolean default true;
}

entity ApprovalInstances : cuid, managed {
    processType      : String(30) @mandatory;

    businessObjectType : String(50) @mandatory;
    businessObjectId   : String(36) @mandatory;

    stage            : String(50);
    sequence         : Integer;

    role             : String(100);
    assignedTo       : String(100);

    action           : String(30);
    status           : String(30);

    remarks          : LargeString;
    sendBackReason   : LargeString;

    startedAt        : Timestamp;
    actionAt         : Timestamp;
}


/* ============================================================
   08. GENERIC DOCUMENT MANAGEMENT
   ============================================================ */

entity Documents : cuid, managed {
    businessObjectType : String(50) @mandatory;
    businessObjectId   : String(36) @mandatory;

    documentType      : String(50) @mandatory;

    fileName          : String(255) @mandatory;
    mediaType         : String(100);

    storageProvider   : String(50);
    storageKey        : String(500);

    objectId          : String(200);

    documentVersion   : Integer default 1;

    stage             : String(50);

    mandatory         : Boolean default false;

    uploadedBy        : String(100);
    uploadedAt        : Timestamp;

    checksum          : String(128);

    active            : Boolean default true;
}


/* ============================================================
   09. BANK LIMIT RESERVATION
   ============================================================ */

entity BankLimitReservations : cuid, managed {
    bankLimit     : Association to BankLimits;
    bank          : Association to Banks;
    companyCode   : Association to CompanyCodes;

    processType   : String(30);
    businessObjectId : String(36);

    amount        : Decimal(18,2);
    currency      : String(3);

    status        : String(30);
    /*
       RESERVED
       CONSUMED
       RELEASED
       CANCELLED
    */

    reservedAt    : Timestamp;
    consumedAt    : Timestamp;
    releasedAt    : Timestamp;

    reason        : LargeString;
}

entity POReservations : cuid, managed {
    poNumber          : String(30);
    lcRequestId       : String(36);

    reservedAmount    : Decimal(18,2);
    currency          : String(3);

    status            : String(30);

    reservedAt        : Timestamp;
    releasedAt        : Timestamp;

    reason            : LargeString;
}


/* ============================================================
   10. SAP EXTERNAL OBJECT REFERENCES
   ============================================================ */

entity SAPObjectReferences : cuid, managed {
    businessObjectType : String(50);
    businessObjectId   : String(36);

    sapObjectType      : String(50);
    externalId         : String(100);
    externalNumber     : String(100);

    companyCode        : String(10);
    fiscalYear         : String(4);

    systemId           : String(50);

    lastSyncedAt       : Timestamp;

    status             : String(30);
}


/* ============================================================
   11. DOMESTIC / FOREIGN LC
   ============================================================ */

entity LCRequests : cuid, managed {

    requestNo : String(30) @mandatory @assert.unique;

    lcType    : String(20) @mandatory;
    /*
       DOMESTIC
       FOREIGN
    */

    status    : String(40) default 'DRAFT';

    companyCode : Association to CompanyCodes;
    plant       : Association to Plants;
    vendor      : Association to Vendors;
    vertical    : Association to Verticals;

    requestDate : Date;

    /* LC 31D */
    expiryDate  : Date;
    expiryPlace : String(500);

    /* Applicant */
    applicantName    : String(500);
    applicantAddress : LargeString;

    /* Consignee */
    consigneeAddress : LargeString;

    /* Beneficiary */
    beneficiaryName    : String(500);
    beneficiaryAddress : LargeString;

    beneficiaryContactName : String(200);
    beneficiaryPhone       : String(50);
    beneficiaryEmail       : String(200);

    /* Currency / Amount */
    currency      : String(3);

    foreignAmount : Decimal(18,2);

    /* Exchange rate for FLC */
    exchangeRate       : Decimal(18,8);
    exchangeRateType   : String(30);
    exchangeRateDate   : Date;
    exchangeRateSource : String(100);
    exchangeRateCapturedBy : String(100);

    inrEquivalent : Decimal(18,2);

    /* LC clauses */

    variationClause : LargeString;

    creditAvailableWith : LargeString;

    usanceTerms : LargeString;

    drawnOnBank : Association to Banks;

    deferredPaymentTerms : LargeString;

    partialShipment : String(30);
    transshipment   : String(30);

    shipmentFrom : String(500);
    shipmentTo   : String(500);

    latestShipmentDate : Date;

    goodsDescription : LargeString;

    documentsRequired   : LargeString;
    additionalConditions: LargeString;

    chargesClause      : LargeString;
    presentationPeriod : LargeString;

    confirmationInstructions : String(30);

    advisedThroughBank : LargeString;

    note : LargeString;

    /* FLC specific */

    portOfLoading     : String(500);
    portOfDestination : String(500);

    incoterm : String(50);

    foreignBeneficiaryBank : LargeString;

    documentaryClauses46A : LargeString;
    documentaryClauses47A : LargeString;

    gstApplicable : Boolean default false;

    /* Amount calculation */

    materialBasicAmount : Decimal(18,2) default 0;

    gstAmount : Decimal(18,2) default 0;

    subtotalAmount : Decimal(18,2) default 0;

    tdsAmount : Decimal(18,2) default 0;

    balanceAmount : Decimal(18,2) default 0;

    interestAmount : Decimal(18,2) default 0;

    gstOnInterest : Decimal(18,2) default 0;

    debitNoteAmount : Decimal(18,2) default 0;

    tdsOnInterest : Decimal(18,2) default 0;

    finalLCAmount : Decimal(18,2) default 0;

    advanceAdjustment : Decimal(18,2) default 0;

    otherAdditions : Decimal(18,2) default 0;

    otherDeductions : Decimal(18,2) default 0;

    remarks : LargeString;

    /* Bank-issued LC */

    bankLCNumber   : String(100);

    bankIssuedDate : Date;
    bankExpiryDate : Date;

    selectedBank : Association to Banks;

    /* Child objects */

    poAllocations : Composition of many LCPOAllocations
        on poAllocations.lc = $self;

    amountComponents : Composition of many LCAmountComponents
        on amountComponents.lc = $self;

    bankSelections : Composition of many LCBankSelections
        on bankSelections.lc = $self;

    bankSplits : Composition of many LCBankSplits
        on bankSplits.lc = $self;

    approvalNote : Composition of one LCApprovalNotes
        on approvalNote.lc = $self;

    billOfExchange : Composition of many LCBillOfExchanges
        on billOfExchange.lc = $self;

    accountingRefs : Composition of many LCAccountingReferences
        on accountingRefs.lc = $self;

    importDocuments : Composition of many FLCImportDocuments
        on importDocuments.lc = $self;

    statusHistory : Composition of many LCStatusHistories
        on statusHistory.lc = $self;

    closure : Composition of one LCClosures
        on closure.lc = $self;
}


/* ============================================================
   12. LC PO ALLOCATION
   ============================================================ */

entity LCPOAllocations : cuid, managed {

    lc : Association to LCRequests;

    poNumber : String(30) @mandatory;

    poDate : Date;

    vendorCode : String(20);
    plantCode  : String(10);

    poBasicValue : Decimal(18,2);

    alreadyCovered : Decimal(18,2) default 0;

    availableBalance : Decimal(18,2) default 0;

    currentAllocation : Decimal(18,2) default 0;

    currency : String(3);

    reservationStatus : String(30);
}


/* ============================================================
   13. LC AMOUNT COMPONENTS
   ============================================================ */

entity LCAmountComponents : cuid, managed {

    lc : Association to LCRequests;

    componentType : String(50);

    amount : Decimal(18,2);

    sign : String(5);

    sequence : Integer;

    editable : Boolean default true;

    printable : Boolean default true;

    remarks : LargeString;
}


/* ============================================================
   14. LC BANK SELECTION
   ============================================================ */

entity LCBankSelections : cuid, managed {

    lc : Association to LCRequests;

    bank : Association to Banks;

    bankLimit : Association to BankLimits;

    sanctionedLimit : Decimal(18,2);
    utilisedLimit   : Decimal(18,2);
    reservedLimit   : Decimal(18,2);
    availableLimit  : Decimal(18,2);

    marginPercent : Decimal(9,4);

    openingCommission : Decimal(18,2);

    commitmentCharge : Decimal(18,2);

    closingCharge : Decimal(18,2);

    acceptanceCharge : Decimal(18,2);

    fixedCharges : Decimal(18,2);

    stampPaperCharges : Decimal(18,2);

    gstOnCharges : Decimal(18,2);

    totalCharges : Decimal(18,2);

    chargeQuoteStatus : String(30);

    selected : Boolean default false;

    selectionReason : LargeString;

    reservation : Association to BankLimitReservations;
}


/* ============================================================
   15. LC APPROVAL NOTE
   ============================================================ */

entity LCApprovalNotes : cuid, managed {

    lc : Association to LCRequests;

    noteNo : String(50);

    foreignCurrency : String(3);

    foreignAmount : Decimal(18,2);

    openingExchangeRate : Decimal(18,8);

    openingExchangeRateDate : Date;

    openingINRAmount : Decimal(18,2);

    selectedBank : Association to Banks;

    finalLCAmount : Decimal(18,2);

    lcPeriodDays : Integer;

    usanceDays : Integer;

    totalLCPeriodDays : Integer;

    requestedSendDate : Date;

    vertical : Association to Verticals;

    site : Association to Plants;

    remarks : LargeString;

    status : String(30);

    checkedBy : String(100);
    checkedAt : Timestamp;

    approvedBy : String(100);
    approvedAt : Timestamp;

    bankComparisons : Composition of many LCApprovalNoteBanks
        on bankComparisons.note = $self;
}

entity LCApprovalNoteBanks : cuid, managed {

    note : Association to LCApprovalNotes;

    bank : Association to Banks;

    availableLimit : Decimal(18,2);

    openingCommission : Decimal(18,2);

    commitmentCharge : Decimal(18,2);

    closingCharge : Decimal(18,2);

    acceptanceCharge : Decimal(18,2);

    additionalCharges : Decimal(18,2);

    gstAmount : Decimal(18,2);

    stampPaperCharges : Decimal(18,2);

    totalCharges : Decimal(18,2);

    foreignCurrency : String(3);

    foreignAmount : Decimal(18,2);

    openingINRAmount : Decimal(18,2);

    chargeQuoteStatus : String(30);

    recommended : Boolean default false;

    remarks : LargeString;
}


/* ============================================================
   16. LC BANK SPLIT
   ============================================================ */

entity LCBankSplits : cuid, managed {

    lc : Association to LCRequests;

    bank : Association to Banks;

    amount : Decimal(18,2);

    percentage : Decimal(9,4);

    reservation : Association to BankLimitReservations;

    remarks : LargeString;
}


/* ============================================================
   17. BILL OF EXCHANGE
   ============================================================ */

entity LCBillOfExchanges : cuid, managed {

    lc : Association to LCRequests;

    boeNumber : String(100);

    requestDate : Date;

    currency : String(3);

    amount : Decimal(18,2);

    acceptanceType : String(30);
    /*
       DOMESTIC_INVOICE
       FOREIGN_PO_BASED
    */

    poNumber : String(30);

    vendorCode : String(20);

    commercialInvoiceNo : String(100);

    commercialInvoiceDate : Date;

    acceptanceDate : Date;

    maturityDate : Date;

    documentReceivedDate : Date;

    shipmentDate : Date;

    shipmentOccurred : Boolean default false;
    bankDocumentsReceived : Boolean default false;
    goodsAtPortOrInControl : Boolean default false;
    documentsComplete : Boolean default false;
    noMaterialDiscrepancy : Boolean default false;
    financeAcceptanceConfirmedBy : String(100);
    financeAcceptanceConfirmedAt : Timestamp;

    isInvoiceBased : Boolean default false;

    customsStatus : String(30);

    goodsReceiptStatus : String(30);

    status : String(40);

    financeRemarks : LargeString;

    documents : Composition of many BOEDocuments
        on documents.boe = $self;

    invoiceAllocations : Composition of many BOEInvoiceAllocations
        on invoiceAllocations.boe = $self;
}


/* ============================================================
   18. DOMESTIC BOE -> SAP INVOICE
   ============================================================ */

entity BOEInvoiceAllocations : cuid, managed {

    boe : Association to LCBillOfExchanges;

    accountingDocNo : String(30);

    vendorInvoiceNo : String(100);

    invoiceDate : Date;

    poNumber : String(30);

    vendorCode : String(20);

    currency : String(3);

    invoiceAmount : Decimal(18,2);

    openAmount : Decimal(18,2);

    allocatedAmount : Decimal(18,2);

    debitNoteAmount : Decimal(18,2);

    clearingStatus : String(30);
}


/* ============================================================
   19. BOE DOCUMENTS
   ============================================================ */

entity BOEDocuments : cuid, managed {

    boe : Association to LCBillOfExchanges;

    documentType : String(50);

    fileName : String(255);

    mediaType : String(100);

    storageKey : String(500);

    mandatory : Boolean default false;

    uploadedBy : String(100);

    uploadedAt : Timestamp;

    checksum : String(128);
}


/* ============================================================
   20. FOREIGN LC IMPORT DOCUMENTS
   ============================================================ */

entity FLCImportDocuments : cuid, managed {

    lc : Association to LCRequests;

    documentType : String(50) @mandatory;
    /*
       COMMERCIAL_INVOICE
       BILL_OF_LADING
       BILL_OF_ENTRY
       PACKING_LIST
       BILL_OF_EXCHANGE
       SHIPPING_DOCUMENT
       PI
       PO
       BANK_ADVICE
       OTHER
    */

    documentNumber : String(100);

    required : Boolean default false;

    documentDate : Date;

    fileName : String(255);

    mediaType : String(100);

    storageKey : String(500);

    @Core.MediaType: mediaType
    @Core.ContentDisposition.Filename: fileName
    content : LargeBinary;

    receivedDate : Date;

    verified : Boolean default false;

    verifiedBy : String(100);

    verifiedAt : Timestamp;

    remarks : LargeString;
}


/* ============================================================
   21. ACCOUNTING REFERENCES
   ============================================================ */

entity LCAccountingReferences : cuid, managed {

    lc : Association to LCRequests;

    boe : Association to LCBillOfExchanges;

    accountingDocNo : String(30);

    companyCode : String(10);

    fiscalYear : String(4);

    documentType : String(20);

    reference : String(100);

    postingDate : Date;

    currency : String(3);

    amount : Decimal(18,2);

    accountingStage : String(50);

    status : String(30);

    externalReference : String(200);

    remarks : LargeString;
}


/* ============================================================
   22. LC STATUS HISTORY
   ============================================================ */

entity LCStatusHistories : cuid, managed {

    lc : Association to LCRequests;

    fromStatus : String(40);

    toStatus : String(40);

    action : String(50);

    remarks : LargeString;

    performedBy : String(100);

    performedAt : Timestamp;
}


/* ============================================================
   23. LC CLOSURE
   ============================================================ */

entity LCClosures : cuid, managed {

    lc : Association to LCRequests;

    requestedDate : Date;

    bankClosed : Boolean default false;

    accountingClosed : Boolean default false;

    outstandingAmount : Decimal(18,2) default 0;

    exchangeRateAtPayment : Decimal(18,8);

    exchangeRateAtPaymentDate : Date;

    exchangeRateAtPaymentType : String(30);

    exchangeRateAtPaymentSource : String(100);

    paymentINRAmount : Decimal(18,2);

    openingINRAmount : Decimal(18,2);

    exchangeDifference : Decimal(18,2);

    foreignBankCharges : Decimal(18,2);

    closureDate : Date;

    closureRemarks : LargeString;

    status : String(30);
}


/* ============================================================
   24. BANK GUARANTEE
   ============================================================ */

entity BGRequests : cuid, managed {

    requestNo : String(30) @mandatory @assert.unique;

    requestDate : Date;

    status : String(40) default 'DRAFT';

    companyCode : Association to CompanyCodes;

    plant : Association to Plants;

    vertical : Association to Verticals;

    bgType : Association to BGTypes;

    eBGOrPhysical : BGDeliveryMode;

    bgAmount : Decimal(18,2);

    bgAmountWords : LargeString;

    tenderDocumentFee : Decimal(18,2);

    applicantName : String(500);

    applicantAddress : LargeString;

    beneficiaryName : String(500);

    beneficiaryAddress : LargeString;

    requiredDate : Date;

    validityYears : Integer;

    validityMonths : Integer;

    claimPeriod : LargeString;

    nameOfWork : LargeString;

    issuingBank : Association to Banks;

    beneficiaryBankDetails : LargeString;

    formatConfirmed : Boolean default false;

    formatConfirmedBy : String(100);

    formatConfirmedAt : Timestamp;

    formatRemarks : LargeString;

    bankBGNumber : String(100);

    bankIssuedDate : Date;

    bankExpiryDate : Date;

    bankIssuedBy : String(100);

    sentToBankAt : Timestamp;

    sentToBankBy : String(100);

    documentsSentAt : Timestamp;

    claimExpiryDate : Date;

    issuedAmount : Decimal(18,2);

    physicalReceived : Boolean default false;

    physicalReceivedDate : Date;

    physicalReceivedBy : String(100);

    physicalStorageLocation : String(500);

    reservation : Association to BankLimitReservations;

    approvals : Composition of many BGApprovals
        on approvals.bg = $self;

    formatConfirmations : Composition of many BGFormatConfirmations
        on formatConfirmations.bg = $self;

    bankSelections : Composition of many BGBankSelections
        on bankSelections.bg = $self;

    auditNote : Composition of one BGAuditNotes
        on auditNote.bg = $self;

    documents : Composition of many BGDocuments
        on documents.bg = $self;

    amendments : Composition of many BGAmendments
        on amendments.originalBG = $self;

    statusHistory : Composition of many BGStatusHistories
        on statusHistory.bg = $self;

    closure : Composition of one BGClosures
        on closure.bg = $self;
}


/* ============================================================
   25. BG APPROVAL
   ============================================================ */

entity BGApprovals : cuid, managed {

    bg : Association to BGRequests;

    sequence : Integer;

    role : String(100);

    action : String(30);

    userId : String(100);

    actionAt : Timestamp;

    remarks : LargeString;

    sendBackReason : LargeString;

    status : String(30);
}


/* ============================================================
   26. BG FORMAT CONFIRMATION
   ============================================================ */

entity BGFormatConfirmations : cuid, managed {

    bg : Association to BGRequests;

    version : Integer;

    customerFormatDocument : String(500);

    bankClausesDocument : String(500);

    financeRemarks : LargeString;

    operationsRemarks : LargeString;

    operationsConfirmedBy : String(100);

    operationsConfirmedAt : Timestamp;

    status : String(30);

    confirmedBy : String(100);

    confirmedAt : Timestamp;
}


/* ============================================================
   27. BG BANK SELECTION
   ============================================================ */

entity BGBankSelections : cuid, managed {

    bg : Association to BGRequests;

    bank : Association to Banks;

    bankLimit : Association to BankLimits;

    sanctionedLimit : Decimal(18,2);

    utilisedLimit : Decimal(18,2);

    reservedLimit : Decimal(18,2);

    availableLimit : Decimal(18,2);

    commissionRate : Decimal(9,4);

    marginPercent : Decimal(9,4);

    fixedCharges : Decimal(18,2);

    gstOnCharges : Decimal(18,2);

    totalCharges : Decimal(18,2);

    selected : Boolean default false;

    selectionReason : LargeString;

    reservation : Association to BankLimitReservations;
}


/* ============================================================
   28. BG AUDIT NOTE
   ============================================================ */

entity BGAuditNotes : cuid, managed {

    bg : Association to BGRequests;

    noteNo : String(50);

    issuingBank : Association to Banks;

    beneficiaryName : String(500);

    nameOfWork : LargeString;

    bgType : String(50);

    vertical : String(100);

    bgAmount : Decimal(18,2);

    validityFrom : Date;

    validityTo : Date;

    claimPeriod : LargeString;

    periodDays : Integer;

    annualRate : Decimal(9,4);

    commissionAmount : Decimal(18,2);

    fixedCharges : Decimal(18,2);

    gstAmount : Decimal(18,2);

    totalCharges : Decimal(18,2);

    remarks : LargeString;

    status : String(30);

    checkedBy : String(100);

    checkedAt : Timestamp;

    approvedBy : String(100);

    approvedAt : Timestamp;

    bankComparisons : Composition of many BGAuditNoteBanks
        on bankComparisons.note = $self;
}

entity BGAuditNoteBanks : cuid, managed {

    note : Association to BGAuditNotes;

    bank : Association to Banks;

    availableLimit : Decimal(18,2);

    annualRate : Decimal(9,4);

    commissionAmount : Decimal(18,2);

    fixedCharges : Decimal(18,2);

    gstAmount : Decimal(18,2);

    totalCharges : Decimal(18,2);

    chargeQuoteStatus : String(30);

    recommended : Boolean default false;

    remarks : LargeString;
}


/* ============================================================
   29. BG DOCUMENTS
   ============================================================ */

entity BGDocuments : cuid, managed {

    bg : Association to BGRequests;

    documentType : String(50);

    fileName : String(255);

    mediaType : String(100);

    storageKey : String(500);

    @Core.MediaType: mediaType
    @Core.ContentDisposition.Filename: fileName
    content : LargeBinary;

    documentVersion : Integer default 1;

    stage : String(50);

    mandatory : Boolean default false;

    uploadedBy : String(100);

    uploadedAt : Timestamp;

    checksum : String(128);
}


/* ============================================================
   30. BG AMENDMENT
   ============================================================ */

entity BGAmendments : cuid, managed {

    originalBG : Association to BGRequests;

    amendmentNo : String(50);

    version : Integer;

    amendmentDate : Date;

    previousAmount : Decimal(18,2);

    newAmount : Decimal(18,2);

    amountDifference : Decimal(18,2);

    previousExpiryDate : Date;

    newExpiryDate : Date;

    previousClaimPeriod : LargeString;

    newClaimPeriod : LargeString;

    previousBeneficiary : String(500);

    newBeneficiary : String(500);

    reason : LargeString;

    status : String(40);

    bankBGNumber : String(100);

    bankDocumentKey : String(500);

    approvals : Composition of many BGAmendmentApprovals
        on approvals.amendment = $self;
}

entity BGAmendmentApprovals : cuid, managed {

    amendment : Association to BGAmendments;

    sequence : Integer;

    role : String(100);

    userId : String(100);

    action : String(30);

    remarks : LargeString;

    actionAt : Timestamp;

    status : String(30);
}


/* ============================================================
   31. BG STATUS HISTORY
   ============================================================ */

entity BGStatusHistories : cuid, managed {

    bg : Association to BGRequests;

    fromStatus : String(40);

    toStatus : String(40);

    action : String(50);

    remarks : LargeString;

    performedBy : String(100);

    performedAt : Timestamp;
}


/* ============================================================
   32. BG CLOSURE
   ============================================================ */

entity BGClosures : cuid, managed {

    bg : Association to BGRequests;

    closureRequestDate : Date;

    beneficiaryReleaseLetter : String(500);

    bankClosureConfirmation : String(500);

    physicalOriginalReturned : Boolean default false;

    physicalReturnDate : Date;

    bankCancelled : Boolean default false;

    limitReleased : Boolean default false;

    financialStatus : String(30);

    documentStatus : String(30);

    financialClosureDate : Date;

    documentClosureDate : Date;

    remarks : LargeString;

    status : String(30);
}


/* ============================================================
   33. GENERIC AUDIT LOG
   ============================================================ */

entity AuditLogs : cuid {

    entityName : String(100);

    entityId : String(36);

    action : String(50);

    fieldName : String(100);

    oldValue : LargeString;

    newValue : LargeString;

    performedBy : String(100);

    performedAt : Timestamp;

    correlationId : String(100);

    ipAddress : String(100);
}


/* ============================================================
   34. INTEGRATION OUTBOX / MESSAGE LOG
   ============================================================ */

entity IntegrationMessages : cuid, managed {

    messageType : String(50) @mandatory;

    businessObjectType : String(50);

    businessObjectId : String(36);

    direction : String(20);
    /*
       OUTBOUND
       INBOUND
    */

    idempotencyKey : String(100) @assert.unique;

    payload : LargeString;

    status : String(30);
    /*
       PENDING
       PROCESSING
       SUCCESS
       FAILED
       RETRY
    */

    retryCount : Integer default 0;

    externalReference : String(200);

    errorMessage : LargeString;

    createdAt : Timestamp;

    processedAt : Timestamp;
}


/* ============================================================
   35. REPORT RUNS
   ============================================================ */

entity ReportRuns : cuid, managed {

    reportType : String(50);

    requestedBy : String(100);

    fromDate : Date;

    toDate : Date;

    filterJson : LargeString;

    fileName : String(255);

    storageKey : String(500);

    status : String(30);

    generatedAt : Timestamp;

    errorMessage : LargeString;
}