import metricsStore from "./metrics-store.ts";

interface AlertConfig {
    name: string;
    upstream: string;
    errorRateThreshold: number;
    webhookUrl: string;
}

interface AlertRecord {
    lastAlertAt: number;
}

const ALERT_EVALUATION_INTERVAL = 10_000;
const ALERT_DEBOUNCE_TIME = 5 * 60 * 1000;

class WebhookAlertManager {

    private configs: AlertConfig[] = [];

    private alertHistory = new Map<string, AlertRecord>();

    private interval: NodeJS.Timeout | null = null;


    addConfig(config: AlertConfig) {

        this.configs.push(config);

        console.log(
            `[ALERT] Configured ${config.name} ` +
            `threshold=${config.errorRateThreshold}`
        );
    }

    start() {

        if (this.interval) {
            console.log("[ALERT] Alert manager already running");
            return;
        }

        console.log("[ALERT] Webhook alert manager started");

        this.evaluate();

        this.interval = setInterval(
            () => {
                this.evaluate();
            },
            ALERT_EVALUATION_INTERVAL
        );
    }

    stop() {

        if (this.interval) {
            clearInterval(this.interval);

            this.interval = null;

            console.log("[ALERT] Alert manager stopped");
        }
    }

    private async evaluate() {

        try {
            const metrics = metricsStore.getMetrics();

            for (const config of this.configs) {
                await this.evaluateConfig(config,metrics);
            }

        } catch (error) {
            console.error("[ALERT] Evaluation error:",error);
        }
    }

    private async evaluateConfig(
        config: AlertConfig,
        metrics: Record<string, any>
    ) {

        const upstreamMetrics =
            metrics[config.upstream];

        if (!upstreamMetrics) {

            console.log(
                `[ALERT] No metrics found for ${config.name}`
            );

            return;
        }


        const errorRate =
            upstreamMetrics.errorRate;


        console.log(
            `[ALERT] ${config.name}: ` +
            `errorRate=${errorRate}, ` +
            `threshold=${config.errorRateThreshold}`
        );


        /*
        * No threshold breach.
        */
        if (
            errorRate <=
            config.errorRateThreshold
        ) {
            return;
        }


        console.log(
            `[ALERT] ${config.name} ` +
            `ERROR RATE THRESHOLD BREACHED`
        );


        /*
        * Prevent repeated alerts
        * within 5 minutes.
        */
        if (
            this.isDebounced(config.name)
        ) {

            console.log(
                `[ALERT] ${config.name} ` +
                `alert suppressed (debounced)`
            );

            return;
        }


        await this.sendWebhook(
            config,
            errorRate
        );
    }

    private isDebounced(
        upstream: string
    ): boolean {

        const record = this.alertHistory.get(upstream);

        if (!record) {
            return false;
        }


        const elapsed = Date.now() - record.lastAlertAt;

        return (elapsed < ALERT_DEBOUNCE_TIME);
    }

    private async sendWebhook(
        config: AlertConfig,
        errorRate: number
    ) {

        const now = Date.now();

        const payload = {

            content:
                `🚨 API Gateway Alert: ${config.name}`,

            embeds: [
                {
                    title: "High Error Rate",

                    description:
                        `${config.name} is experiencing ` +
                        `a high error rate.`,

                    fields: [

                        {
                            name: "Upstream",

                            value:
                                config.upstream,

                            inline: true
                        },

                        {
                            name: "Error Rate",

                            value:
                                `${errorRate.toFixed(2)}%`,

                            inline: true
                        },

                        {
                            name: "Threshold",

                            value:
                                `${config.errorRateThreshold.toFixed(2)}%`,

                            inline: true
                        }

                    ],

                    timestamp:
                        new Date(now).toISOString()
                }
            ]
        };


        try {

            console.log(
                `[ALERT] Sending webhook for ` +
                `${config.name}`
            );


            const response =
                await fetch(
                    config.webhookUrl,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(payload)
                    }
                );


            if (!response.ok) {

                const body =
                    await response.text();

                throw new Error(
                    `Webhook returned HTTP ` +
                    `${response.status}: ${body}`
                );
            }


            this.alertHistory.set(
                config.name,
                {
                    lastAlertAt: now
                }
            );


            console.log(
                `[ALERT] Webhook delivered successfully ` +
                `for ${config.name}`
            );


        } catch (error) {

            console.error(
                `[ALERT] Webhook failed for ` +
                `${config.name}:`,
                error
            );

        }
    }
}

export default new WebhookAlertManager();