const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);

        const pathParts = url.pathname.split('/').filter(p => p.length > 0);

        let targetDomain;
        let targetPath;

        // check if first part looks like a domain (contains a dot)
        if (pathParts.length > 0 && pathParts[0].includes('.')) {
            targetDomain = pathParts[0];
            targetPath = '/' + pathParts.slice(1).join('/');
        } else {
            // try to recover domain from referer
            const referer = req.headers.referer || req.headers.referrer;
            if (referer) {
                try {
                    const refererUrl = new URL(referer);
                    const refererParts = refererUrl.pathname.split('/').filter(p => p.length > 0);
                    if (refererParts.length > 0 && refererParts[0].includes('.')) {
                        targetDomain = refererParts[0];
                        targetPath = url.pathname;
                        console.log(`[referer-recovery] ${referer} → ${targetDomain}`);
                    }
                } catch (e) {
                    // referer parsing failed
                }
            }

            if (!targetDomain) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('invalid format. expected: /{domain}/{path}');
                return;
            }
        }
        const targetUrl = `https://${targetDomain}${targetPath}${url.search}`;

        let targetUrlObj;
        try {
            targetUrlObj = new URL(targetUrl);
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('invalid target url: ' + targetUrl);
            return;
        }

        console.log(`[proxy] ${url.pathname} → ${targetUrl}`);

        const headersObject = {};
        Object.keys(req.headers).forEach(key => {
            const keyLower = key.toLowerCase();
            if (keyLower !== 'x-forwarded-for' &&
                keyLower !== 'x-forwarded-by' &&
                keyLower !== 'x-hostname' &&
                keyLower !== 'host') {
                headersObject[key] = req.headers[key];
            }
        });

        headersObject['host'] = targetUrlObj.hostname;

        if (!headersObject['origin']) {
            headersObject['origin'] = targetUrlObj.origin;
        }

        const options = {
            method: req.method,
            headers: headersObject,
        };

        const protocol = targetUrlObj.protocol === 'https:' ? https : http;

        const proxyReq = protocol.request(targetUrl, options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, {
                ...proxyRes.headers,
                'access-control-allow-origin': '*',
                'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'access-control-allow-headers': 'Content-Type',
            });

            proxyRes.pipe(res);
        });

        proxyReq.on('error', (error) => {
            console.error('[error]', error.message);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('proxy request failed: ' + error.message);
        });

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            req.pipe(proxyReq);
        } else {
            proxyReq.end();
        }

    } catch (error) {
        console.error('[error]', error.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('proxy request failed: ' + error.message);
    }
});

server.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`);
});
