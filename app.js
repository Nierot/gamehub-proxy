const httpProxy = require('http-proxy');
const http = require('http');
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
                error500(res);
            }
        })
    } else {
        if (isRoute(req.url) !== undefined) {
            dynamicProxy.proxyRequest(req, res);
        } else {
            error404(res);
        }
    }
})

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
        info(route);
        if (url.startsWith(route)) {
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

dynamicProxy.on('registerError', (err, req, res) => {
    res.end(err);
    error(err)
    //error500(res);
});

dynamicProxy.on('proxyError', (err, host, req, res) => {
    // I don't like this module
    res.end(` 
    <!DOCTYPE html>
    <html>
        <head>
            <title>500</title>
            <meta charset="UTF-8">
            <meta name="author" content="Nierot">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://cdn.nierot.com/-/sakura-dark.css">
        </head>
        <body>
            <h1><center>500</center></h1>
            <h3>
                The server you are trying to connect to is offline. Please try again later.
            </h1>
        </body>
    </html>
    `)
    error(err);
})

server.listen(8001, () => {
    registerRoutes();
    info('Current routes: ', currentRoutes);
    console.log('Listening on http://localhost:8001')
});