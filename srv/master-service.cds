
using { com.sms.tradefinance as db } from '../db/schema';

@path: '/master'
service MasterService {

    entity CompanyCodes as projection on db.CompanyCodes;
    entity Plants as projection on db.Plants;

    entity Vendors as projection on db.Vendors;
    entity VendorBanks as projection on db.VendorBanks;

    entity Banks as projection on db.Banks;
    entity BankBranches as projection on db.BankBranches;
    entity HouseBanks as projection on db.HouseBanks;
    entity BankAccounts as projection on db.BankAccounts;

    entity BankLimits as projection on db.BankLimits;
    entity BankLimitTransactions as projection on db.BankLimitTransactions;
    entity BankLimitReservations as projection on db.BankLimitReservations;

    entity BankChargeRates as projection on db.BankChargeRates;

    entity Currencies as projection on db.Currencies;
    entity ExchangeRates as projection on db.ExchangeRates;

    entity Verticals as projection on db.Verticals;
    entity BGTypes as projection on db.BGTypes;
    entity ApprovalMatrices as projection on db.ApprovalMatrices;

    entity SAPObjectReferences as projection on db.SAPObjectReferences;
    entity POReservations as projection on db.POReservations;
}
