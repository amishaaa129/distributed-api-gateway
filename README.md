# Custom API Gateway with Live Traffic Intelligence

A TypeScript/Node.js API gateway for microservice-style applications, providing routing, authentication, rate limiting, fault tolerance, logging, real-time monitoring, and alerting.

## Features

- **Dynamic routing** — hot-register upstream services at runtime
- **JWT + RBAC** — authentication with scope-based authorization
- **Redis rate limiting** — sliding-window limits using Redis Sorted Sets
- **Circuit breaker** — protects against repeated upstream failures
- **Observability** — PostgreSQL request logging and WebSocket live metrics
- **Webhook alerts** — configurable upstream error-rate alerts
- **Dockerized** — Docker Compose setup

## Architecture

```text
Client
  ↓
API Gateway :8080
  ├── Auth + RBAC
  ├── Rate Limiting
  ├── Circuit Breaker
  ├── Request Logging
  └── Live Metrics + Alerts
       ↓             ↓
 Orders :3001    Users :3002
       │             │
       └──────┬──────┘
              ↓
       Redis + PostgreSQL
```

## Tech Stack

**Node.js · TypeScript · Express · Redis · PostgreSQL · WebSockets · Docker · Artillery**

## Performance

5-minute Artillery load test:

- **15,000 requests**
- **50 requests/sec** (3,000 requests/min)
- **100% success rate**
- **p95: 15 ms**
- **p99: 37.7 ms**

## Run

```bash
npm install
npm run dev
```

Or with Docker:

```bash
docker compose up --build
```

> Configure secrets through `.env`; never commit credentials or tokens.
