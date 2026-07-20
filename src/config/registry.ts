export const registry = [
    {
        path: "/api/orders",
        upstream: "http://localhost:3001",
        scope: "orders:read"
    },
    {
        path: "/api/orders/create",
        upstream: "http://localhost:3001",
        scope: "orders:write"
    },
    {
        path: "/api/users",
        upstream: "http://localhost:3002",
        scope: "users:read"
    },
    {
        path: "/api/users/create",
        upstream: "http://localhost:3002",
        scope: "users:write"
    },
];