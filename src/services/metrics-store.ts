interface MetricEntry {
    timestamp: number;
    latency: number;
    status: number;
    upstream: string;
}
interface UpstreamMetrics {
    rps: number;
    errorRate: number;
    p50: number;
    p99: number;
}

class MetricsStore {
    private requests: MetricEntry[] = [];
    private readonly WINDOW = 60_000;

    constructor() {
        // Run aggregation every second
        setInterval(() => {
            this.computeMetrics();
        }, 1000);
    }

    record(
        latency: number,
        status: number,
        upstream: string
    ) {

        this.requests.push({
            timestamp: Date.now(),
            latency,
            status,
            upstream
        });

        this.removeExpired();
    }

    private removeExpired() {

        const cutoff = Date.now() - this.WINDOW;

        this.requests = this.requests.filter(request =>
            request.timestamp >= cutoff
        );
    }

    private percentile(
        values: number[],
        percentile: number
    ): number {
        if (values.length === 0) {
            return 0;
        }

        const sorted = [...values].sort(
            (a, b) => a - b
        );

        const index = Math.ceil((percentile / 100) * sorted.length) - 1;

        return sorted[Math.max(0, index)]!;
    }

    private computeMetrics() {

        this.removeExpired();

        const grouped =
            new Map<string, MetricEntry[]>();

        for (const request of this.requests) {

            if (!grouped.has(request.upstream)) { 
                grouped.set(request.upstream,[]);
            }

            grouped.get(request.upstream)!.push(request);
        }

        for (
            const [upstream, requests]
            of grouped
        ) {

            const totalRequests = requests.length;

            const errors = requests.filter( request => request.status >= 500 ).length;

            const latencies = requests.map( request => request.latency );

            const rps = totalRequests / 60;

            const errorRate = totalRequests === 0 ? 0 : (errors / totalRequests) * 100;

            const p50 = this.percentile(latencies,50);

            const p99 = this.percentile(latencies,99);

            const metrics: UpstreamMetrics = {
                rps,
                errorRate,
                p50,
                p99
            };

            console.log(`[METRICS] ${upstream}`,metrics );
        }
    }

    getMetrics(): Record<string, UpstreamMetrics> {

        this.removeExpired();

        const grouped = new Map<string, MetricEntry[]>();

        for (const request of this.requests) {
            if (!grouped.has(request.upstream)) {
                grouped.set(
                    request.upstream,
                    []
                );
            }

            grouped.get(request.upstream)!.push(request);
        }

        const result: Record<string, UpstreamMetrics> = {};

        for (const [upstream, requests] of grouped) {

            const total = requests.length;

            const errors = requests.filter( r => r.status >= 500 ).length;

            const latencies = requests.map(r => r.latency);

            result[upstream] = {
                rps: total / 60,

                errorRate: total === 0 ? 0 : (errors / total) * 100,

                p50: this.percentile(latencies,50),

                p99: this.percentile(latencies,99)
            };
        }

        return result;
    }
}

export default new MetricsStore();