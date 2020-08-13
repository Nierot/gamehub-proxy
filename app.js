const httpProxy = require('http-proxy');
const http = require('http');
const proxy = httpProxy.createProxyServer({});
const { verbose, info, error } = require('nielog').Log;
const fs = require('fs');
const path = require('path');
const routes = require('./routes.json');

http.createServer((req, res) => {
    let url = req.url;
    let resolved = false;
    verbose(`${req.method}: ${url}`);
    if (url === '/') {
        res.writeHead(200);
        res.end('oof');
    } else {
        routes.forEach(route => {
            if (url.startsWith(route.url)) {
                let uri = req.url.replace(route.url, '')
                verbose('Serving ' + route.route + uri)
                if (!resolved) proxy.web(req, res, { target: route.route + uri });
                resolved = true;
            } 
        })
        if (!resolved) sendFile(path.join(__dirname, 'static/404.html'), 404, res);
    } 
}).listen(8001, () => console.log('Listening on http://localhost:8001'));

proxy.on('error', (err, req, res) => sendFile(path.join(__dirname, 'static/500.html'), 500, res));

function sendFile(path, status, res) {
    var stat = fs.statSync(path);
    res.writeHead(status, {
        'Content-Type': 'text/html',
        'Content-Length': stat.size
    })

    var readStream = fs.createReadStream(path);
    readStream.pipe(res);
}