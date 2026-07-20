import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyJWT, authoriseRoles } from "./middleware/auth.middleware.js";
import { registry } from "./config/registry.js";
import rateLimiter from "./middleware/rate-limiter.middleware.js";
import cors from "cors";

const app = express();
const app1 = express();
const app2 = express();
const proxy = express();

proxy.use(cors());

app.use(cors());
app.use(express.json());
proxy.use(express.json());

const accessToken = localStorage.getItem("accessToken");

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
                headers: {
                    Authorization: \`Bearer \${accessToken}\`,
                    "X-API-Key": "abc123"
                }
            });

            const data = await response.json();

            console.log(data);

            alert(JSON.stringify(data));
        }

        async function loadUsers(){

            const response = await fetch("http://localhost:8080/api/users", {
                headers: {
                    Authorization: \`Bearer \${accessToken}\`,
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

proxy.post("/register", (req, res) => {
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

app1.get('/orders', (req,res) => {
    res.json({
        service: "orders",
        data: [
            { id: 1, item: "bag", price: 2000 },
            { id: 2, item: "watch", price: 1000 }
        ]
    });
});

app2.get('/users', (req,res) => {
    res.json({
        service: "users",
        data: [
            {'id':1, 'name': 'John', 'contact': 123},
            {'id':2, 'name': 'Amy', 'contact': 456}
        ]
    });
});

proxy.use("/api",verifyJWT);
proxy.use("/api",authoriseRoles);
proxy.use("/api", rateLimiter);

proxy.use( "/api",createProxyMiddleware({
    changeOrigin: true,

    router: (req) => {
      const route=registry.find((r) => req.originalUrl.startsWith(r.path));
      if (!route) {
        throw new Error("No route registered");
      }

      return route?.upstream;
    },

    pathRewrite: {
      "^/api": "",
    },

    on: {
      proxyReq: (proxyReq, req) => {
        console.log("Forwarding:", req.originalUrl);
      },

      proxyRes: (proxyRes) => {
        console.log("Status:", proxyRes.statusCode);
      },

      error: (err) => {
        console.log("Proxy Error:", err);
      },
    },
  })
);

app.listen(3000, () => {
    console.log('client port 3000 is running');
});

app1.listen(3001, () => {
    console.log('server1 port 3001 is running');
});

app2.listen(3002, () => {
    console.log('server2 port 3002 is running');
});

proxy.listen(8080, () => {
    console.log('proxy port 8080 is running');
});