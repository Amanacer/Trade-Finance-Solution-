
import cds from '@sap/cds';
import * as mockS4 from './mock-s4-service.js';

const { SELECT, UPDATE, INSERT } = cds.ql;

const { IntegrationMessages, SAPObjectReferences, BankLimits, LCAccountingReferences } = cds.entities('com.sms.tradefinance');

async function processMessage(message) {
    const { ID, messageType, businessObjectId, payload } = message;

    try {
        await UPDATE(IntegrationMessages)
            .set({ status: 'PROCESSING', errorMessage: null })
            .where({ ID });

        let result;
        let sapObjectType;

        switch (messageType) {
            case 'PO_SYNC':
                result = await mockS4.getPurchaseOrder(businessObjectId);
                sapObjectType = 'PURCHASE_ORDER';
                break;

            case 'VENDOR_SYNC':
                result = await mockS4.getVendor(businessObjectId);
                sapObjectType = 'VENDOR';
                break;

            case 'INVOICE_SYNC':
                result = await mockS4.getInvoice(businessObjectId);
                sapObjectType = 'SUPPLIER_INVOICE';
                break;

            case 'LC_AMENDMENT':
                result = await mockS4.postLCAmendment(businessObjectId, payload);
                sapObjectType = 'LETTER_OF_CREDIT_AMENDMENT';
                break;

            case 'FLC_ACCEPTANCE_POSTING': {
                const posting = JSON.parse(payload || '{}');
                result = await mockS4.postFLCAcceptance(posting);
                sapObjectType = 'MOCK_FI_DOCUMENT';
                await UPDATE(LCAccountingReferences)
                    .set({
                        accountingDocNo: result.AccountingDocument,
                        documentType: 'MOCK_FI',
                        postingDate: new Date().toISOString().slice(0, 10),
                        status: 'MOCK_POSTED',
                        externalReference: result.AccountingDocument,
                        remarks: 'Mock-only posting result; no SAP FI document was created'
                    })
                    .where({ boe_ID: posting.boeId, accountingStage: 'FLC_ACCEPTANCE' });
                break;
            }

            case 'BANK_LIMIT_SYNC': {
                const limits = await mockS4.getBankLimits(businessObjectId);

                // Mock mode only. Do not overwrite live limit data
                // when this adapter is replaced with real SAP.
                for (const limit of limits) {
                    const existing = await SELECT.one
                        .from(BankLimits)
                        .where({
                            companyCode_code: limit.companyCode,
                            limitType: limit.limitType,
                            currency: limit.currency
                        });

                    // The companyCode association/key and bank
                    // association must match your actual schema.
                    // Avoid automatic writes until matching is verified.
                }

                result = { companyCode: businessObjectId, limits };
                sapObjectType = 'BANK_LIMIT_SNAPSHOT';
                break;
            }

            default:
                throw new Error(
                    `Unsupported mock message type: ${messageType}`
                );
        }

        const externalId =
            result.PurchaseOrder ||
            result.Supplier ||
            result.Amendment ||
            result.AccountingDocument ||
            result.companyCode;

        const existingRef = await SELECT.one
            .from(SAPObjectReferences)
            .where({
                businessObjectType: message.businessObjectType,
                businessObjectId,
                sapObjectType
            });

        if (existingRef) {
            await UPDATE(SAPObjectReferences)
                .set({
                    externalId: String(externalId),
                    externalNumber: String(externalId),
                    status: 'SYNCED',
                    lastSyncedAt: new Date().toISOString()
                })
                .where({ ID: existingRef.ID });
        } else {
            await INSERT.into(SAPObjectReferences).entries({
                ID: cds.utils.uuid(),
                businessObjectType: message.businessObjectType,
                businessObjectId,
                sapObjectType,
                externalId: String(externalId),
                externalNumber: String(externalId),
                status: 'SYNCED',
                lastSyncedAt: new Date().toISOString()
            });
        }

        await UPDATE(IntegrationMessages)
            .set({
                status: 'SUCCESS',
                processedAt: new Date().toISOString(),
                errorMessage: null
            })
            .where({ ID });

        return { messageId: ID, status: 'SUCCESS', result };

    } catch (error) {
        await UPDATE(IntegrationMessages)
            .set({
                status: 'FAILED',
                processedAt: new Date().toISOString(),
                errorMessage: String(error.message).slice(0, 4000)
            })
            .where({ ID });

        return {
            messageId: ID,
            status: 'FAILED',
            error: error.message
        };
    }
}

async function processPendingMessages(limit = 20) {
    const messages = await SELECT.from(IntegrationMessages)
        .where({ status: { in: ['PENDING', 'RETRY'] } })
        .orderBy('createdAt asc')
        .limit(limit);

    const results = [];

    for (const message of messages) {
        results.push(await processMessage(message));
    }

    return results;
}

export { processMessage, processPendingMessages };
