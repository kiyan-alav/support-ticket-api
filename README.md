# Support Ticket API

## Prerequisites

Node.js 24.22.0 (version used for development).

## Installation

```sh
npm install
```

## Development

Run the TypeScript source with automatic restarts when files change:

```sh
npm run dev
```

## Build and run

Compile the project, then run the generated JavaScript:

```sh
npm run build
npm start
```

Stop the development server before starting the compiled server so port 5000 is available.

## Health check

Send a `GET` request to `http://localhost:5000/health`.

Expected status: `200 OK`.

Expected JSON response:

```json
{ "status": "ok" }
```
