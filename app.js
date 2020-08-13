const httpProxy = require('http-proxy');
const http = require('http');
const proxy = httpProxy.createProxyServer({});
const { verbose, info, error } = require('nielog').Log;
const fs = require('fs');
const path = require('path');
const routes = require('./routes.json');
const dynamicProxy = require('dynamic-reverse-proxy')();
const dynRoutes = require('./dynamicRoutes.json');

const server = http.createServer((req, res) => {
    let url = req.url;
    let resolved = false;
    verbose(`${req.method}: ${url}`);

    registerRoutes();

    if (url.match(/^\/register/i)) {
        verbose('Registering a new route');
        let query = getQuery(req);

        if (!query.prefix || !query.port) {
            return error400(res);
        }

        dynamicProxy.registerRoute({
            host: 'localhost',
            prefix: query.prefix,
            port: query.port
        })
        res.end();
    } else {
        let proxyObj = dynamicProxy.proxyRequest(req, res);
    }
})

proxy.on('error', (err, req, res) => {
    error(err);
    error500(res);
    res.end();
});

function sendFile(path, status, res) {
    var stat = fs.statSync(path);
    res.writeHead(status, {
        'Content-Type': 'text/html',
        'Content-Length': stat.size
    })

    var readStream = fs.createReadStream(path);
    readStream.pipe(res);
}

function error500(res) {
    sendFile(path.join(__dirname, 'static/500.html'), 500, res);
}

function error404(res) {
    sendFile(path.join(__dirname, 'static/404.html'), 404, res);
}

function error400(res) {
    sendFile(path.join(__dirname, 'static/400.html'), 400, res);
}

function registerRoutes() {
    routes.forEach(route => {
        dynamicProxy.registerRoute({
            host: 'localhost',
            prefix: route.url,
            port: route.route.split('http://localhost:')[1].split('/')[0]
        })
    })
}

function getQuery(req) {
    let params = req.url.split('?')[1].split('&');
    let port = undefined;
    let prefix = undefined;
    params.forEach(param => {
        if (param.match('prefix')) {
            prefix = param.split('=')[1];
        } else {
            param.split('=')[1];
        }
    })
    verbose(params);
    return {
        prefix: prefix,
        port: port
    }
}

server.listen(8001, () => console.log('Listening on http://localhost:8001'));