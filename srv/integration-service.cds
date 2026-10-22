
using { com.sms.tradefinance as db } from '../db/schema';

@path: '/integration'
service IntegrationService {

    entity IntegrationMessages as projection
        on db.IntegrationMessages;

    entity SAPObjectReferences as projection
        on db.SAPObjectReferences;

    entity BankLimitTransactions as projection
        on db.BankLimitTransactions;

    entity AuditLogs as projection
        on db.AuditLogs;

    entity ReportRuns as projection
        on db.ReportRuns;

    action syncPurchaseOrder(
        poNumber : String
    ) returns String;

    action syncVendor(
        vendorCode : String
    ) returns String;

    action syncBankLimits(
        companyCode : String
    ) returns String;

    action postLCAccounting(
        lcId : UUID
    ) returns String;

    action postBoEAccounting(
        boeId : UUID
    ) returns String;

    action syncInvoice(
        accountingDocument : String
    ) returns String;

    @requires: 'IntegrationOperator'
    action processPendingMessages()
        returns LargeString;

    @requires: 'IntegrationOperator'
    action retryMessage(
        messageId : UUID
    ) returns String;
}
