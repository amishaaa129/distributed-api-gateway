import express from "express";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyJWT, authoriseRoles } from "./middleware/auth.middleware.js";
import { registry } from "./config/registry.js";
import userRouter from "./routes/user.routes.js";
import rateLimiter from "./middleware/rate-limiter.middleware.js";
import cors from "cors";
import circuitBreaker from "./middleware/circuit-breaker.js";
import { logRequest } from "./services/request-logger.js";
import logRouter from "./routes/log.routes.js";
import MetricsStore from "./services/metrics-store.js"
import http from "http";
import { setupMetricsWebSocket } from "./services/metrics-ws.js";
import WebhookAlertManager from "./services/webhook-alert-manager.js"
import { alertConfigs } from "./config/alerts.js"

const app = express();
const proxy = express();

proxy.use(cors({
        origin: "http://localhost:5173",
        credentials: true
    }));

app.use(cors());
app.use(express.json());
proxy.use(express.json());
proxy.use(cookieParser());

const server = http.createServer(proxy);
setupMetricsWebSocket(server);

app.get("/", (req, res) => {

    res.send(`
        <button onclick="loadOrders()">
            Load Orders
        </button>

        <button onclick="loadUsers()">
            Load Users
        </button>

        <script>

        // Replace this with your actual JWT or retrieve it after login
        const accessToken = localStorage.getItem("accessToken");
        // const accessToken = "PASTE_YOUR_ACCESS_TOKEN_HERE";

        async function loadOrders(){

            const response = await fetch("http://localhost:8080/api/orders", {
                credentials: "include",
                headers: {
                    "X-API-Key": "abc123"
                }
            });

            const data = await response.json();

            console.log(data);

            alert(JSON.stringify(data));
        }

        async function loadUsers(){

            const response = await fetch("http://localhost:8080/api/users", {
                credentials: "include",
                headers: {
                    "X-API-Key": "abc123"
                }
            });

            const data = await response.json();

            console.log(data);

            alert(JSON.stringify(data));
        }

        </script>
    `);
});

proxy.use("/auth", userRouter);
proxy.use("/admin", logRouter);

proxy.post("/admin/register-route", (req, res) => {
    const { path, upstream, scope } = req.body;
    registry.push({
        path,
        upstream,
        scope
    });
    return res.status(201).json({
        message: "Route registered",
        registry
    });
});

proxy.use("/api",verifyJWT);
proxy.use("/api",authoriseRoles);
proxy.use("/api", rateLimiter);

proxy.use("/api", async (req, res) => {

    const start = Date.now();

    const route = registry.find(
        r => req.originalUrl.startsWith(r.path)
    );


    if (!route) {
        return res.status(404).json({
            message: "Route not registered"
        });
    }


    try {

        console.log(
            "Forwarding:",
            req.originalUrl,
            "→",
            route.upstream
        );


        const response = await circuitBreaker.fire(
            route.upstream,

            async () => {

                const url =
                    route.upstream +
                    req.originalUrl.replace(
                        "/api",
                        ""
                    );


                console.log(
                    "Calling upstream:",
                    url
                );


                const fetchOptions: RequestInit = {
                    method: req.method,

                    headers: {
                        "Content-Type": "application/json"
                    }
                };


                if (req.method !== "GET") {

                    fetchOptions.body =
                        JSON.stringify(req.body);

                }


                const upstreamResponse =
                    await fetch(
                        url,
                        fetchOptions
                    );


                if (
                    upstreamResponse.status >= 500
                ) {

                    throw new Error(
                        `Upstream failure: ${upstreamResponse.status}`
                    );

                }


                return upstreamResponse;

            }
        );


        const latency =
            Date.now() - start;


        MetricsStore.record(
            latency,
            response.status,
            route.upstream
        );


        const data =
            await response.json();



        const logData = {

            method: req.method,

            path: req.originalUrl,

            upstream: route.upstream,

            statusCode: response.status,

            latency,

            reqSize:
                JSON.stringify(
                    req.body || {}
                ).length,

            resSize:
                JSON.stringify(data).length

        };


        logRequest(logData)
            .catch((error) => {

                console.error(
                    "[LOG] Failed to save request log:",
                    error
                );

            });


        return res
            .status(response.status)
            .json(data);



    } catch (error: any) {


        const latency =
            Date.now() - start;


        console.log(
            "Circuit Breaker Error:",
            error.message
        );


        MetricsStore.record(
            latency,
            503,
            route.upstream
        );


        const logData = {

            method: req.method,

            path: req.originalUrl,

            upstream: route.upstream,

            statusCode: 503,

            latency,

            reqSize:
                JSON.stringify(
                    req.body || {}
                ).length,

            resSize: 0

        };


        logRequest(logData)
            .catch((logError) => {

                console.error(
                    "[LOG] Failed to save request log:",
                    logError
                );

            });


        return res
            .status(503)
            .json({

                message:
                    "Service unavailable",

                error:
                    error.message

            });

    }

});

for (const config of alertConfigs) {

    WebhookAlertManager.addConfig(
        config
    );
}

WebhookAlertManager.start();

app.listen(3000, () => {
    console.log('client port 3000 is running');
});

server.listen(8080, () => {
    console.log('proxy port 8080 is running');
});