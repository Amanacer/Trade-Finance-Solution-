sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/carvsol/tradefinance/lc/lc1/test/integration/pages/LCRequestsList.gen",
	"com/carvsol/tradefinance/lc/lc1/test/integration/pages/LCRequestsObjectPage.gen"
], function (JourneyRunner, LCRequestsListGenerated, LCRequestsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/carvsol/tradefinance/lc/lc1') + '/test/flp.html#app-preview',
        pages: {
			onTheLCRequestsListGenerated: LCRequestsListGenerated,
			onTheLCRequestsObjectPageGenerated: LCRequestsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

