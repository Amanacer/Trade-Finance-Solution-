import cds from '@sap/cds';

const { SELECT } = cds.ql;

const {
    CompanyCodes,
    Plants,
    Vendors,
    Banks,
    BankLimits,
    BankChargeRates,
    Currencies,
    Verticals,
    BGTypes
} = cds.entities('com.sms.tradefinance');

export default cds.service.impl(function () {
  this.before('CREATE', 'CompanyCodes', async (req) => {
    if(!req.data.code)
      req.error(400, 'Company Code is mandatory');

      if(!req.data.name)
        req.error(400, 'Company Code name is mandatory');
  })

  //PLANT
  this.before('CREATE', 'Plants', async (req) => {
    if(!req.data.code)
      req.error(400, 'Plant code is mandatory');

    if(!req.data.companyCode_ID)
      req.error(400, 'Company code is mandatory');
  });

  //vendor
  this.before('CREATE', 'Vendors', async (req) => {
    if(!req.data.vendorCode)
      req.error(400, 'Vendor code is mandatory');

    if(!req.data.name)
      req.error(400, 'Vendor name is mandatory');
  });

  //BANK
  this.before('CREATE', 'Banks', async (req) => {
    if(!req.data.bankCode)
      req.error(400, 'Bank code is mandatory');

    if(!req.data.bankName)
      req.error(400, 'Bank name is mandatory');
  });

  //BANK LIMIT
   this.before('CREATE', 'BankLimits', async (req) => {

        if (!req.data.bank_ID)
            req.error(400, 'Bank is mandatory');

        if (!req.data.companyCode_ID)
            req.error(400, 'Company Code is mandatory');

        if (!req.data.limitType)
            req.error(400, 'Limit type is mandatory');

        if (Number(req.data.sanctionedAmount || 0) < 0)
            req.error(400, 'Sanctioned amount cannot be negative');

        req.data.utilisedAmount ??= 0;
        req.data.reservedAmount ??= 0;

        req.data.availableAmount = Number(req.data.sanctionedAmount || 0) - Number(req.data.utilisedAmount || 0) - Number(req.data.reservedAmount || 0);

  })

  //BANK LIMIT UPDATE
  this.before('UPDATE', 'BankLimits', async (req) => {
    const bankLimitId = req.params?.[0]?.ID ?? req.data.ID;
    if (!bankLimitId) return;

    const existing = await cds.run(SELECT.one.from(BankLimits).where({ ID: bankLimitId }));
    if(!existing) return;

    const sanctioned = req.data.sanctionedAmount ?? existing.sanctionedAmount;
    const utilised = req.data.utilisedAmount ?? existing.utilisedAmount;
    const reserved = req.data.reservedAmount ?? existing.reservedAmount;

    if(Number(utilised) < 0 || Number(reserved) < 0){
      req.error(400, 'Utilised/Reserved amount cannot be negative');
    }
    req.data.availableAmount = Number(sanctioned) - Number(utilised) - Number(reserved);
  });

  //currency
  this.before('CREATE', 'Currencies', async(req) => {
    if(!req.data.code)
      req.error(400, 'Currency code is mandatory');

    if(req.data.code.length !== 3)
      req.error(400, 'Currency code must contain 3 characters');
  });

  //COMMON ACTIVE CHECK
  this.before( ['UPDATE'], [ 'CompanyCodes', 'Plants', 'Vendors', 'Banks', 'Currencies', 'Verticals', 'BGTypes' ], async (req) => {
    if(req.data.active === false){
      req.info('Master data has been deactived');
    }
  });
});