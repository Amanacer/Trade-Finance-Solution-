using LCService as service from '../../srv/lc-service';
annotate service.LCRequests with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'requestNo',
                Value : requestNo,
            },
            {
                $Type : 'UI.DataField',
                Label : 'lcType',
                Value : lcType,
            },
            {
                $Type : 'UI.DataField',
                Label : 'status',
                Value : status,
            },
            {
                $Type : 'UI.DataField',
                Label : 'requestDate',
                Value : requestDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'expiryDate',
                Value : expiryDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'expiryPlace',
                Value : expiryPlace,
            },
            {
                $Type : 'UI.DataField',
                Label : 'applicantName',
                Value : applicantName,
            },
            {
                $Type : 'UI.DataField',
                Label : 'applicantAddress',
                Value : applicantAddress,
            },
            {
                $Type : 'UI.DataField',
                Label : 'consigneeAddress',
                Value : consigneeAddress,
            },
            {
                $Type : 'UI.DataField',
                Label : 'beneficiaryName',
                Value : beneficiaryName,
            },
            {
                $Type : 'UI.DataField',
                Label : 'beneficiaryAddress',
                Value : beneficiaryAddress,
            },
            {
                $Type : 'UI.DataField',
                Label : 'beneficiaryContactName',
                Value : beneficiaryContactName,
            },
            {
                $Type : 'UI.DataField',
                Label : 'beneficiaryPhone',
                Value : beneficiaryPhone,
            },
            {
                $Type : 'UI.DataField',
                Label : 'beneficiaryEmail',
                Value : beneficiaryEmail,
            },
            {
                $Type : 'UI.DataField',
                Label : 'currency',
                Value : currency,
            },
            {
                $Type : 'UI.DataField',
                Label : 'foreignAmount',
                Value : foreignAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'exchangeRate',
                Value : exchangeRate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'exchangeRateType',
                Value : exchangeRateType,
            },
            {
                $Type : 'UI.DataField',
                Label : 'exchangeRateDate',
                Value : exchangeRateDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'exchangeRateSource',
                Value : exchangeRateSource,
            },
            {
                $Type : 'UI.DataField',
                Label : 'exchangeRateCapturedBy',
                Value : exchangeRateCapturedBy,
            },
            {
                $Type : 'UI.DataField',
                Label : 'inrEquivalent',
                Value : inrEquivalent,
            },
            {
                $Type : 'UI.DataField',
                Label : 'variationClause',
                Value : variationClause,
            },
            {
                $Type : 'UI.DataField',
                Label : 'creditAvailableWith',
                Value : creditAvailableWith,
            },
            {
                $Type : 'UI.DataField',
                Label : 'usanceTerms',
                Value : usanceTerms,
            },
            {
                $Type : 'UI.DataField',
                Label : 'deferredPaymentTerms',
                Value : deferredPaymentTerms,
            },
            {
                $Type : 'UI.DataField',
                Label : 'partialShipment',
                Value : partialShipment,
            },
            {
                $Type : 'UI.DataField',
                Label : 'transshipment',
                Value : transshipment,
            },
            {
                $Type : 'UI.DataField',
                Label : 'shipmentFrom',
                Value : shipmentFrom,
            },
            {
                $Type : 'UI.DataField',
                Label : 'shipmentTo',
                Value : shipmentTo,
            },
            {
                $Type : 'UI.DataField',
                Label : 'latestShipmentDate',
                Value : latestShipmentDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'goodsDescription',
                Value : goodsDescription,
            },
            {
                $Type : 'UI.DataField',
                Label : 'documentsRequired',
                Value : documentsRequired,
            },
            {
                $Type : 'UI.DataField',
                Label : 'additionalConditions',
                Value : additionalConditions,
            },
            {
                $Type : 'UI.DataField',
                Label : 'chargesClause',
                Value : chargesClause,
            },
            {
                $Type : 'UI.DataField',
                Label : 'presentationPeriod',
                Value : presentationPeriod,
            },
            {
                $Type : 'UI.DataField',
                Label : 'confirmationInstructions',
                Value : confirmationInstructions,
            },
            {
                $Type : 'UI.DataField',
                Label : 'advisedThroughBank',
                Value : advisedThroughBank,
            },
            {
                $Type : 'UI.DataField',
                Label : 'note',
                Value : note,
            },
            {
                $Type : 'UI.DataField',
                Label : 'portOfLoading',
                Value : portOfLoading,
            },
            {
                $Type : 'UI.DataField',
                Label : 'portOfDestination',
                Value : portOfDestination,
            },
            {
                $Type : 'UI.DataField',
                Label : 'incoterm',
                Value : incoterm,
            },
            {
                $Type : 'UI.DataField',
                Label : 'foreignBeneficiaryBank',
                Value : foreignBeneficiaryBank,
            },
            {
                $Type : 'UI.DataField',
                Label : 'documentaryClauses46A',
                Value : documentaryClauses46A,
            },
            {
                $Type : 'UI.DataField',
                Label : 'documentaryClauses47A',
                Value : documentaryClauses47A,
            },
            {
                $Type : 'UI.DataField',
                Label : 'materialBasicAmount',
                Value : materialBasicAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'subtotalAmount',
                Value : subtotalAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'tdsAmount',
                Value : tdsAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'balanceAmount',
                Value : balanceAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'interestAmount',
                Value : interestAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'debitNoteAmount',
                Value : debitNoteAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'tdsOnInterest',
                Value : tdsOnInterest,
            },
            {
                $Type : 'UI.DataField',
                Label : 'finalLCAmount',
                Value : finalLCAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'advanceAdjustment',
                Value : advanceAdjustment,
            },
            {
                $Type : 'UI.DataField',
                Label : 'otherAdditions',
                Value : otherAdditions,
            },
            {
                $Type : 'UI.DataField',
                Label : 'otherDeductions',
                Value : otherDeductions,
            },
            {
                $Type : 'UI.DataField',
                Label : 'remarks',
                Value : remarks,
            },
            {
                $Type : 'UI.DataField',
                Label : 'bankLCNumber',
                Value : bankLCNumber,
            },
            {
                $Type : 'UI.DataField',
                Label : 'bankIssuedDate',
                Value : bankIssuedDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'bankExpiryDate',
                Value : bankExpiryDate,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'POAllocations',
            Label : 'Purchase Order Allocation',
            Target : 'poAllocations/@UI.LineItem',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ImportDocuments',
            Label : 'Foreign LC Documents',
            Target : 'importDocuments/@UI.LineItem',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'BillsOfExchange',
            Label : 'Bills of Exchange',
            Target : 'billOfExchange/@UI.LineItem',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'Closure',
            Label : 'Payment and Closure',
            Target : 'closure/@UI.FieldGroup#Closure',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ApprovalNote',
            Label : 'LC Approval Note',
            Target : 'approvalNote/@UI.FieldGroup#ForeignLC',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'BankComparisons',
            Label : 'Bank Charges and Comparison',
            Target : 'approvalNote/bankComparisons/@UI.LineItem',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'requestNo',
            Value : requestNo,
        },
        {
            $Type : 'UI.DataField',
            Label : 'lcType',
            Value : lcType,
        },
        {
            $Type : 'UI.DataField',
            Label : 'status',
            Value : status,
        },
        {
            $Type : 'UI.DataField',
            Label : 'requestDate',
            Value : requestDate,
        },
        {
            $Type : 'UI.DataField',
            Label : 'expiryDate',
            Value : expiryDate,
        },
    ],
);

annotate service.LCPOAllocations with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'PO Number', Value : poNumber },
    { $Type : 'UI.DataField', Label : 'PO Date', Value : poDate },
    { $Type : 'UI.DataField', Label : 'Vendor', Value : vendorCode },
    { $Type : 'UI.DataField', Label : 'PO Currency', Value : currency },
    { $Type : 'UI.DataField', Label : 'Available Balance', Value : availableBalance },
    { $Type : 'UI.DataField', Label : 'LC Allocation', Value : currentAllocation },
    { $Type : 'UI.DataField', Label : 'Reservation Status', Value : reservationStatus },
];

annotate service.LCRequests with @UI.Identification : [
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.submitLC', Label : 'Submit LC' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.approveLC', Label : 'Approve LC' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.rejectLC', Label : 'Reject LC' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.sendBackLC', Label : 'Send Back LC' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.selectBank', Label : 'Select Bank' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.reserveBankLimit', Label : 'Reserve Bank Limit' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.createApprovalNote', Label : 'Create Approval Note' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.approveApprovalNote', Label : 'Approve Approval Note' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.sendToBank', Label : 'Send to Bank' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.recordLCIssuance', Label : 'Record Bank Issuance' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.createBoE', Label : 'Create Bill of Exchange' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.recordForeignPayment', Label : 'Record FLC Payment' },
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.closeLC', Label : 'Close LC' },
];

annotate service.LCBillOfExchanges with @UI.Identification : [
    { $Type : 'UI.DataFieldForAction', Action : 'LCService.acceptBoE', Label : 'Finance Accept Bill of Exchange' },
];

annotate service.FLCImportDocuments with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Document Type', Value : documentType },
    { $Type : 'UI.DataField', Label : 'Document Number', Value : documentNumber },
    { $Type : 'UI.DataField', Label : 'Document Date', Value : documentDate },
    { $Type : 'UI.DataField', Label : 'File Name', Value : fileName },
    { $Type : 'UI.DataField', Label : 'Verified', Value : verified },
    { $Type : 'UI.DataField', Label : 'Verified By', Value : verifiedBy },
];

annotate service.LCBillOfExchanges with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'BOE Number', Value : boeNumber },
    { $Type : 'UI.DataField', Label : 'PO Number', Value : poNumber },
    { $Type : 'UI.DataField', Label : 'Foreign Amount', Value : amount },
    { $Type : 'UI.DataField', Label : 'Status', Value : status },
    { $Type : 'UI.DataField', Label : 'Shipment Occurred', Value : shipmentOccurred },
    { $Type : 'UI.DataField', Label : 'Bank Documents Received', Value : bankDocumentsReceived },
    { $Type : 'UI.DataField', Label : 'Goods at Port or in Control', Value : goodsAtPortOrInControl },
    { $Type : 'UI.DataField', Label : 'Documents Complete', Value : documentsComplete },
    { $Type : 'UI.DataField', Label : 'No Material Discrepancy', Value : noMaterialDiscrepancy },
    { $Type : 'UI.DataField', Label : 'Finance Remarks', Value : financeRemarks },
];

annotate service.LCBillOfExchanges with @UI.FieldGroup #Acceptance : {
    $Type : 'UI.FieldGroupType',
    Data : [
        { $Type : 'UI.DataField', Label : 'Shipment Occurred', Value : shipmentOccurred },
        { $Type : 'UI.DataField', Label : 'Shipment Date', Value : shipmentDate },
        { $Type : 'UI.DataField', Label : 'Bank Documents Received', Value : bankDocumentsReceived },
        { $Type : 'UI.DataField', Label : 'Documents Received Date', Value : documentReceivedDate },
        { $Type : 'UI.DataField', Label : 'Goods at Port or in Control', Value : goodsAtPortOrInControl },
        { $Type : 'UI.DataField', Label : 'Documents Complete', Value : documentsComplete },
        { $Type : 'UI.DataField', Label : 'No Material Discrepancy', Value : noMaterialDiscrepancy },
        { $Type : 'UI.DataField', Label : 'Finance Remarks', Value : financeRemarks },
    ],
};

annotate service.LCBillOfExchanges with @UI.Facets : [
    {
        $Type : 'UI.ReferenceFacet',
        ID : 'AcceptanceFacts',
        Label : 'Shipment and Finance Acceptance',
        Target : '@UI.FieldGroup#Acceptance',
    },
];

annotate service.LCClosures with @UI.FieldGroup #Closure : {
    $Type : 'UI.FieldGroupType',
    Data : [
        { $Type : 'UI.DataField', Label : 'Bank Closed', Value : bankClosed },
        { $Type : 'UI.DataField', Label : 'Accounting Closed', Value : accountingClosed },
        { $Type : 'UI.DataField', Label : 'Outstanding Amount', Value : outstandingAmount },
        { $Type : 'UI.DataField', Label : 'Payment Exchange Rate', Value : exchangeRateAtPayment },
        { $Type : 'UI.DataField', Label : 'Payment Rate Date', Value : exchangeRateAtPaymentDate },
        { $Type : 'UI.DataField', Label : 'Payment Rate Type', Value : exchangeRateAtPaymentType },
        { $Type : 'UI.DataField', Label : 'Payment Rate Source', Value : exchangeRateAtPaymentSource },
        { $Type : 'UI.DataField', Label : 'Payment INR Amount', Value : paymentINRAmount },
        { $Type : 'UI.DataField', Label : 'Opening INR Amount', Value : openingINRAmount },
        { $Type : 'UI.DataField', Label : 'Exchange Difference', Value : exchangeDifference },
        { $Type : 'UI.DataField', Label : 'Foreign Bank Charges', Value : foreignBankCharges },
        { $Type : 'UI.DataField', Label : 'Closure Remarks', Value : closureRemarks },
    ],
};

annotate service.ForeignLCMIS with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Request Number', Value : requestNo },
    { $Type : 'UI.DataField', Label : 'Status', Value : status },
    { $Type : 'UI.DataField', Label : 'Foreign Currency', Value : currency },
    { $Type : 'UI.DataField', Label : 'Foreign Amount', Value : foreignAmount },
    { $Type : 'UI.DataField', Label : 'Opening Rate', Value : openingExchangeRate },
    { $Type : 'UI.DataField', Label : 'Opening Rate Date', Value : openingExchangeRateDate },
    { $Type : 'UI.DataField', Label : 'Opening INR Amount', Value : openingINRAmount },
    { $Type : 'UI.DataField', Label : 'Payment Rate', Value : exchangeRateAtPayment },
    { $Type : 'UI.DataField', Label : 'Payment INR Amount', Value : paymentINRAmount },
    { $Type : 'UI.DataField', Label : 'Exchange Difference', Value : exchangeDifference },
    { $Type : 'UI.DataField', Label : 'Foreign Bank Charges', Value : foreignBankCharges },
];

annotate service.LCApprovalNoteBanks with @UI.LineItem : [
    { $Type : 'UI.DataField', Label : 'Bank', Value : bank_ID },
    { $Type : 'UI.DataField', Label : 'Available INR Limit', Value : availableLimit },
    { $Type : 'UI.DataField', Label : 'Opening Commission', Value : openingCommission },
    { $Type : 'UI.DataField', Label : 'Commitment Charge', Value : commitmentCharge },
    { $Type : 'UI.DataField', Label : 'Closing Charge', Value : closingCharge },
    { $Type : 'UI.DataField', Label : 'Acceptance Charge', Value : acceptanceCharge },
    { $Type : 'UI.DataField', Label : 'Other Charges', Value : additionalCharges },
    { $Type : 'UI.DataField', Label : 'Total Charges', Value : totalCharges },
    { $Type : 'UI.DataField', Label : 'Recommended', Value : recommended },
    { $Type : 'UI.DataField', Label : 'Quote Status', Value : chargeQuoteStatus },
];

annotate service.LCApprovalNotes with @UI.FieldGroup #ForeignLC : {
    $Type : 'UI.FieldGroupType',
    Data : [
        { $Type : 'UI.DataField', Label : 'Foreign Currency', Value : foreignCurrency },
        { $Type : 'UI.DataField', Label : 'Foreign Amount', Value : foreignAmount },
        { $Type : 'UI.DataField', Label : 'Opening Exchange Rate', Value : openingExchangeRate },
        { $Type : 'UI.DataField', Label : 'Rate Date', Value : openingExchangeRateDate },
        { $Type : 'UI.DataField', Label : 'Opening INR Amount', Value : openingINRAmount },
        { $Type : 'UI.DataField', Label : 'Selected Bank', Value : selectedBank_ID },
        { $Type : 'UI.DataField', Label : 'Reason', Value : remarks },
    ],
};

annotate service.LCRequests with {
    plant @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Plants',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : plant_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'code',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'address',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'active',
            },
        ],
    }
};

