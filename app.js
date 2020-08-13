const httpProxy = require('http-proxy');
const http = require('http');
const proxy = httpProxy.createProxyServer({});
const { verbose, info, error } = require('nielog').Log;
const fs = require('fs');
const path = require('path');
const routes = require('./routes.json');
const dynamicProxy = require('dynamic-reverse-proxy')();

let currentRoutes = [];

const server = http.createServer((req, res) => {
    let url = req.url;
    verbose(`${req.method}: ${url}`);

    if (url.match(/^\/register/i)) {
        verbose('Registering a new route');

        let body = ''
        req.on('data', chunk => body += chunk.toString())
        req.on('end', () => {
            try {
                registerRoute(JSON.parse(body));
                dynamicProxy.registerRouteRequest(req, res);
                res.end('ok');
            } catch (err) {
                res.end('500');
            }
        })
    } else {
        if (isRoute(req.url)) {
            dynamicProxy.proxyRequest(req, res);
        } else {
            error404(res);
        }
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

function isRoute(url) {
    let foundRoute = undefined;
    let re = new RegExp('^' + url, 'ig');

    currentRoutes.some(route => {
        if (route.match(re)) {
            foundRoute = route;
            return true;
        };
    })
    verbose('Found ' + foundRoute);
    return foundRoute;
}

function registerRoutes() {
    routes.forEach(route => registerRouteSplit(route))
}

function registerRouteSplit(route) {
    currentRoutes.push(route.url);
    dynamicProxy.registerRoute({
        host: 'localhost',
        prefix: route.url,
        port: route.route.split('http://localhost:')[1].split('/')[0]
    })
}

function registerRoute(route) {
    currentRoutes.push(route.prefix)
    dynamicProxy.registerRoute({
        host: 'localhost',
        prefix: route.prefix,
        port: route.port
    });
    verbose(currentRoutes);
}

function getQuery(req) {
    let params = req.url.split('?')[1].split('&');
    let port = undefined;
    let prefix = undefined;
    params.forEach(param => {
        if (param.match('prefix')) {
            prefix = param.split('=')[1];
        } else {
            port = param.split('=')[1];
        }
    })
    return {
        prefix: prefix,
        port: port
    }
}

server.listen(8001, () => {
    registerRoutes();
    console.log('Listening on http://localhost:8001')
});