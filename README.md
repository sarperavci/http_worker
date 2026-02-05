# http_worker

path-preserving proxy server

## usage

```bash
docker compose up
```

server runs on port 3000

## example

```
http://localhost:3000/example.com/path/file.css
```

proxies to:

```
https://example.com/path/file.css
```

## format

```
/{domain}/{path}
```

## build

```bash
docker compose build
```

## run

```bash
docker compose up -d
```

## run from public repo

```bash
docker run -d -p 8888:3000 ghcr.io/sarperavci/http_worker:latest
```
