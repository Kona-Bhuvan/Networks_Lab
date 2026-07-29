# Stage 16: Directory Browsing

## Overview
This stage implements a directory browser, similar to the one provided by *apache* or *nginx* or *python server*. The following xps config file has been used for testing in this stage
```json
{
	"server_name": "eXpServer",
	"workers": 4,
	"servers": [
		{
			"listeners": [
				{
					"host": "0.0.0.0",
					"port": 8001
				}
			],
			"routes": [
				{
					"req_path": "/",
					"type": "file_serve",
					"dir_path": "../public",
					"index": [
						"index.html"
					],
					"gzip_enable": true,
					"gzip_level": 8
				},
				{
					"req_path": "/redirect",
					"type": "redirect",
					"http_status_code": 302,
					"redirect_url": "http://localhost:8002/"
				}
			]
		},
		{
			"listeners": [
				{
					"host": "0.0.0.0",
					"port": 8002
				}
			],
			"routes": [
				{
					"req_path": "/",
					"type": "reverse_proxy",
					"upstreams": [
						"localhost:3000"
					]
				}
			]
		},
		{
			"listeners": [
				{
					"host": "0.0.0.0",
					"port": 8003
				}
			],
			"routes": [
				{
					"req_path": "/",
					"type": "redirect",
					"http_status_code": 302,
					"redirect_url": "https://expserver.github.io"
				}
			]
		},
		{
			"listeners": [
				{
					"host": "0.0.0.0",
					"port": 8004
				}
			]
		}
	]
}
```

## Constraints to be followed
- All ports `8001`, `8002`, `8003`, `8004` listen to http requests
- The server should expect the all files to be shared from the `public/` directory
- The `public/` directory should be expected to be present within the same relative path to the executable as given within the documentation
- Adhere to the `xps_config.json` where applicable

## Tests
### Test 1: Verify Headers
The server should provide valid headers and status response for the request, which is verified in this test

```js
testInput: "The client sends a GET request on path '/' to the server"
expectedBehavior: "Client sends an html page containing links to all the directories contained within the page"
```

### Test 2: Verify population of content on directories
This test ensures that the HTML file served consists of all the directories and files present in the actual directory

```js
testInput: "The client sends a GET request on path '/'"
expectedBehavior: "Client expects links to the files and directories present in that directory (note: client already knows contents of the direcotry)"
```

### Test 3: Verify file serving
This test ensures that the server is able to serve files properly, as done in previous

```js
testInput: "Client sends a GET request on a file"
expectedBehavior: "Server should send the file with appropriate mime-type and other relevant headers"
```

### Test 4: Full Directory walk
This test runs a deep pass through each file and directory starting at the root, and ensures all files and directories give output as expected

```js
testInput: "sends an initial GET request to path '/', and also to each file within each route"
expectedBehavior: "all of the directories should serve html files, containing all the expected links. And all the files should be served properly as done in previous stages"
```

