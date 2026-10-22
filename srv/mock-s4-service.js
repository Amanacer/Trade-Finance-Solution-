
const purchaseOrders = {
    '4500001001': {
        PurchaseOrder: '4500001001',
        CompanyCode: '1000',
        Supplier: 'V10001',
        Plant: 'PLANT1100',
        DocumentCurrency: 'USD',
        PurchaseOrderDate: '2026-09-15',
        NetAmount: 5000000,
        AlreadyCovered: 1500000,
        Status: 'OPEN'
    }
};

const vendors = {
    V10001: {
        Supplier: 'V10001',
        SupplierName: 'Mock Industrial Supplies Ltd',
        Country: 'IN',
        Currency: 'USD'
    }
};

const invoices = {
    '1900000123': {
        AccountingDocument: '1900000123',
        CompanyCode: '1000',
        FiscalYear: '2026',
        Supplier: 'V10001',
        InvoiceAmount: 125000,
        Currency: 'INR',
        PaymentStatus: 'OPEN'
    }
};

export async function getPurchaseOrder(poNumber) {
    const po = purchaseOrders[poNumber];

    if (!po) {
        const error = new Error(`Mock PO ${poNumber} not found`);
        error.statusCode = 404;
        throw error;
    }

    return structuredClone(po);
}

export async function getVendor(vendorCode) {
    const vendor = vendors[vendorCode];

    if (!vendor) {
        const error = new Error(`Mock vendor ${vendorCode} not found`);
        error.statusCode = 404;
        throw error;
    }

    return structuredClone(vendor);
}

export async function getInvoice(accountingDocument) {
    const invoice = invoices[accountingDocument];

    if (!invoice) {
        const error = new Error(
            `Mock invoice ${accountingDocument} not found`
        );
        error.statusCode = 404;
        throw error;
    }

    return structuredClone(invoice);
}

export async function postLCAmendment(lcId, payload) {
    const amendment = JSON.parse(payload || '{}');

    if (!amendment.requestNo) {
        throw new Error(`LC amendment payload is missing requestNo for ${lcId}`);
    }

    return {
        Amendment: `AM-${amendment.requestNo}`,
        LetterOfCredit: lcId,
        Status: 'ACCEPTED'
    };
}

export async function postFLCAcceptance(posting) {
    if (!posting.boeId || !posting.poNumber || !posting.currency || !posting.inrEquivalent) {
        throw new Error('FLC acceptance posting is missing required PO or amount details');
    }

    return {
        AccountingDocument: `MOCK-FI-${posting.boeId}`,
        PostingStatus: 'MOCK_POSTED',
        DocumentCurrency: posting.currency,
        ForeignAmount: posting.foreignAmount,
        INRAmount: posting.inrEquivalent,
        PostingProfile: posting.postingProfile
    };
}

export async function getBankLimits(companyCode) {
    if (companyCode !== '1000') {
        const error = new Error(
            `No mock bank limits for company code ${companyCode}`
        );
        error.statusCode = 404;
        throw error;
    }

    return [
        {
            bankCode: 'MOCKBANK01',
            companyCode: '1000',
            limitType: 'LC',
            currency: 'INR',
            sanctionedAmount: 10000000,
            utilisedAmount: 2500000,
            reservedAmount: 500000,
            availableAmount: 7000000
        },
        {
            bankCode: 'MOCKBANK01',
            companyCode: '1000',
            limitType: 'BG',
            currency: 'INR',
            sanctionedAmount: 5000000,
            utilisedAmount: 1000000,
            reservedAmount: 250000,
            availableAmount: 3750000
        }
    ];
}

