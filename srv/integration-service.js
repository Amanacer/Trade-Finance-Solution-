
import cds from '@sap/cds';
import { processPendingMessages } from './integration-worker.js';


const { SELECT, INSERT, UPDATE } = cds.ql;

const {
    IntegrationMessages,
    SAPObjectReferences
} = cds.entities('com.sms.tradefinance');

async function enqueueIntegration({
    messageType,
    businessObjectType,
    businessObjectId,
    idempotencyKey
}) {
    const existing = await SELECT.one
        .from(IntegrationMessages)
        .where({ idempotencyKey });

    if (existing) {
        return {
            messageId: existing.ID,
            status: existing.status,
            duplicate: true
        };
    }

    const messageId = cds.utils.uuid();

    await INSERT.into(IntegrationMessages).entries({
        ID: messageId,
        messageType,
        businessObjectType,
        businessObjectId,
        direction: 'OUTBOUND',
        idempotencyKey,
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date().toISOString()
    });

    return {
        messageId,
        status: 'PENDING',
        duplicate: false
    };
}

export default cds.service.impl(function () {

    this.on('syncPurchaseOrder', async req => {
        const { poNumber } = req.data;

        if (!poNumber?.trim()) {
            return req.error(400, 'PO number is mandatory');
        }

        const result = await enqueueIntegration({
            messageType: 'PO_SYNC',
            businessObjectType: 'PURCHASE_ORDER',
            businessObjectId: poNumber,
            idempotencyKey: `PO_SYNC_${poNumber}`
        });

        return JSON.stringify(result);
    });

    this.on('syncVendor', async req => {
        const { vendorCode } = req.data;

        if (!vendorCode?.trim()) {
            return req.error(400, 'Vendor code is mandatory');
        }

        const result = await enqueueIntegration({
            messageType: 'VENDOR_SYNC',
            businessObjectType: 'VENDOR',
            businessObjectId: vendorCode,
            idempotencyKey: `VENDOR_SYNC_${vendorCode}`
        });

        return JSON.stringify(result);
    });

    this.on('syncBankLimits', async req => {
        const { companyCode } = req.data;

        if (!companyCode?.trim()) {
            return req.error(400, 'Company code is mandatory');
        }

        const result = await enqueueIntegration({
            messageType: 'BANK_LIMIT_SYNC',
            businessObjectType: 'BANK_LIMIT',
            businessObjectId: companyCode,
            idempotencyKey: `BANK_LIMIT_SYNC_${companyCode}`
        });

        return JSON.stringify(result);
    });

    this.on('postLCAccounting', async req => {
        const { lcId } = req.data;

        if (!lcId) {
            return req.error(400, 'LC ID is mandatory');
        }

        return req.error(
            501,
            'SAP accounting posting is not configured yet'
        );
    });

    this.on('postBoEAccounting', async req => {
        const { boeId } = req.data;

        if (!boeId) {
            return req.error(400, 'BoE ID is mandatory');
        }

        return req.error(
            501,
            'SAP BoE accounting posting is not configured yet'
        );
    });

    this.on('syncInvoice', async req => {
        const { accountingDocument } = req.data;

        if (!accountingDocument?.trim()) {
            return req.error(
                400,
                'Accounting document is mandatory'
            );
        }

        const result = await enqueueIntegration({
            messageType: 'INVOICE_SYNC',
            businessObjectType: 'SAP_INVOICE',
            businessObjectId: accountingDocument,
            idempotencyKey:
                `INVOICE_SYNC_${accountingDocument}`
        });

        return JSON.stringify(result);
    });

    this.on('processPendingMessages', async () => {
        const results = await processPendingMessages();
        return JSON.stringify(results);
    });

    this.on('retryMessage', async req => {
        const { messageId } = req.data;

        if (!messageId) {
            return req.error(400, 'Message ID is mandatory');
        }

        const message = await SELECT.one
            .from(IntegrationMessages)
            .where({ ID: messageId });

        if (!message) {
            return req.error(404, 'Integration message not found');
        }

        if (!['FAILED', 'RETRY'].includes(message.status)) {
            return req.error(
                400,
                'Only FAILED or RETRY messages can be retried'
            );
        }

        await UPDATE(IntegrationMessages)
            .set({
                status: 'RETRY',
                retryCount: Number(message.retryCount || 0) + 1,
                errorMessage: null
            })
            .where({ ID: messageId });

        return 'Message marked for retry; a worker must process it';
    });
});
