const httpProxy = require('http-proxy');
const http = require('http');
const proxy = httpProxy.createProxyServer({});
const { verbose, info, error } = require('nielog').Log;
const fs = require('fs');
const path = require('path');

http.createServer((req, res) => {


    switch (req.url) {
        case '/':
            res.writeHead(200);
            return res.end('oof');
        case '/proxy':
            return proxy.web(req, res, {
                target: 'http://localhost:8079/',
                ws: true
            });
        default:
            var filePath = path.join(__dirname, 'static/404.html');
            var stat = fs.statSync(filePath);
        
            res.writeHead(404, {
                'Content-Type': 'text/html',
                'Content-Length': stat.size
            })
        
            var readStream = fs.createReadStream(filePath);
            readStream.pipe(res);

    }
}).listen(8001, () => console.log('Listening on http://localhost:8001'));

proxy.on('error', (err, req, res) => {
    var filePath = path.join(__dirname, 'static/500.html');
    var stat = fs.statSync(filePath);

    res.writeHead(500, {
        'Content-Type': 'text/html',
        'Content-Length': stat.size
    })

    var readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
});