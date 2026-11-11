# Stage 19: Gzip Compression

## Overview
This stage validates gzip behavior using the shared `common/` public folder and `sample.txt`.

## Constraints to be followed
- The server should serve files from the shared `common/` public subtree for this stage
- Gzip compression should be enabled through the existing config

## Tests
### Test 1: Sample file without Accept-Encoding
This test ensures the server serves the shared sample file normally when no compression is requested

```js
testInput: "Sends a request to the server requesting for sample.txt without Accept-Encoding"
expectedBehavior: "HTTP/1.1 200} OK
Content-Type: text/plain
Server: eXpServer

"
```

### Test 2: Sample file gzip
This test ensures the server serves the shared sample file with GZIP when the client requests compression

```js
testInput: "Sends a request to the server requesting for sample.txt with Accept-Encoding: gzip"
expectedBehavior: "HTTP/1.1 200} OK
Content-Type: text/plain
Content-Encoding: gzip
Server: eXpServer

"
```

