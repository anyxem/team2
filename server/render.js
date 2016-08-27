var path = require('path'),
    config = require('./config'),
    bundleName = 'index',
    pathToBundle = path.resolve('desktop.bundles', bundleName),
    BEMTREE = require(path.join(pathToBundle, bundleName + '.bemtree.js')).BEMTREE,
    BEMHTML = require(path.join(pathToBundle, bundleName + '.bemhtml.js')).BEMHTML,

    isDev = process.env.NODE_ENV === 'development',
    useCache = !isDev,
    cacheTTL = config.cacheTTL,
    cache = {};

function render(req, res, data, context) {
    useCache = false;
    if(data.profileSettings){
        dropCache();
    }

    var query = req.query,
        user = req.user,
        cacheKey = req.url + (context ? JSON.stringify(context) : '') + (user ? JSON.stringify(user) : ''),
        cached = cache[cacheKey];

    if (useCache && cached && (new Date() - cached.timestamp < cacheTTL)) {
        return res.send(cached.html);
    }

    if (isDev && query.json) return res.send('<pre>' + JSON.stringify(data, null, 4) + '</pre>');

    var bemtreeCtx = {
        block: 'root',
        context: context,
        // extend with data needed for all routes
        data: Object.assign({}, {
            url: req._parsedUrl
        }, data)
    };

    try {
        var bemjson = BEMTREE.apply(bemtreeCtx);
    } catch(err) {
        console.error('BEMTREE error', err.stack);
        console.trace('server stack');
        return res.sendStatus(500);
    }

    if (isDev && query.bemjson) return res.send('<pre>' + JSON.stringify(bemjson, null, 4) + '</pre>');

    try {
        var html = BEMHTML.apply(bemjson);
    } catch(err) {
        console.error('BEMHTML error', err.stack);
        return res.sendStatus(500);
    }

    useCache && (cache[cacheKey] = {
        timestamp: new Date(),
        html: html
    });

    res.send(html);
}

function dropCache() {
    cache = {};
}

module.exports = {
    render: render,
    dropCache: dropCache
};
