const scopeMap: Record<string, string[]> = {
    "admin": [
        "orders:read",
        "orders:write",
        "users:read",
        "users:write"
    ],

    "viewer": [
        "orders:read",
        "users:read"
    ],

    "orders-service": [
        "orders:read",
        "orders:write"
    ]
};

const routeConfig = {
    "/api/orders": {
        scope: "orders:read"
    },

    "/api/orders/create": {
        scope: "orders:write"
    },

    "/api/users": {
        scope: "users:read"
    },

    "/api/users/create": {
        scope: "users:write"
    }
};

export { scopeMap, routeConfig };