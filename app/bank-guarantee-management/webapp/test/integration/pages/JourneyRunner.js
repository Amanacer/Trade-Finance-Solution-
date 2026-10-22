sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/sms/tradefinance/bg/bankguaranteemanagement/test/integration/pages/BGRequestsList.gen",
	"com/sms/tradefinance/bg/bankguaranteemanagement/test/integration/pages/BGRequestsObjectPage.gen",
	"com/sms/tradefinance/bg/bankguaranteemanagement/test/integration/pages/BGApprovalsObjectPage.gen"
], function (JourneyRunner, BGRequestsListGenerated, BGRequestsObjectPageGenerated, BGApprovalsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/sms/tradefinance/bg/bankguaranteemanagement') + '/test/flp.html#app-preview',
        pages: {
			onTheBGRequestsListGenerated: BGRequestsListGenerated,
			onTheBGRequestsObjectPageGenerated: BGRequestsObjectPageGenerated,
			onTheBGApprovalsObjectPageGenerated: BGApprovalsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

