import cds from '@sap/cds';

cds.on('bootstrap', (app) => {
    const auth = cds.env.requires.auth;
    const demoPassword = auth?.kind === 'mocked' ? auth.users?.flcdeveloper?.password : undefined;
    if (!demoPassword) return;

    app.use((req, _res, next) => {
        const isLocalLCPreview = req.path.startsWith('/odata/v4/lc/');
        const isLocalBGPreview = req.path.startsWith('/bg/');
        if ((isLocalLCPreview || isLocalBGPreview) && !req.headers.authorization) {
            req.headers.authorization = `Basic ${Buffer.from(`flcdeveloper:${demoPassword}`).toString('base64')}`;
        }
        next();
    });
});

export default cds.server;