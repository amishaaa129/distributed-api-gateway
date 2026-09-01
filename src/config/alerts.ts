export const alertConfigs = [
    {
        name: "orders",
        upstream: "http://localhost:3001",
        errorRateThreshold: 5,
        webhookUrl: process.env.ORDERS_ALERT_WEBHOOK_URL!
    }
];