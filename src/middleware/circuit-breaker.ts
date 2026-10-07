import CircuitBreaker from "opossum";

const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW = 30_000;
const RESET_TIMEOUT = 10_000;

interface BreakerEntry {
    breaker: CircuitBreaker;
    failures: number[];
}

class UpstreamCircuitBreaker {

    private breakers = new Map<string, BreakerEntry>();

    private createBreaker(
        upstream: string
    ): BreakerEntry {

        const entry: BreakerEntry = {
            failures: [],

            breaker: new CircuitBreaker(
                async (
                    request: () => Promise<Response>
                ): Promise<Response> => {
                    return await request();
                },

                {
                    timeout: 5000,

                    // Opossum's automatic
                    // OPEN → HALF-OPEN timer.
                    resetTimeout: RESET_TIMEOUT,

                    // We manually decide when
                    // the circuit should open.
                    errorThresholdPercentage: 100,

                    // Don't automatically open
                    // based on a small sample.
                    volumeThreshold: 1000
                }
            )
        };

        entry.breaker.on("open", () => {
            console.log(
                `[CIRCUIT] ${upstream} → OPEN`
            );
        });

        entry.breaker.on("halfOpen", () => {
            console.log(
                `[CIRCUIT] ${upstream} → HALF-OPEN`
            );
        });

        entry.breaker.on("close", () => {
            console.log(
                `[CIRCUIT] ${upstream} → CLOSED`
            );

            entry.failures = [];
        });

        entry.breaker.on("success", () => {
            console.log(
                `[CIRCUIT] ${upstream} → SUCCESS`
            );
        });

        this.breakers.set(upstream, entry);

        return entry;
    }

    private getBreaker(
        upstream: string
    ): BreakerEntry {

        let entry = this.breakers.get(upstream);

        if (!entry) {
            entry = this.createBreaker(upstream);
        }

        return entry;
    }

    private cleanOldFailures(
        entry: BreakerEntry
    ): void {

        const now = Date.now();

        entry.failures = entry.failures.filter(
            timestamp =>
                now - timestamp <= FAILURE_WINDOW
        );
    }

    private recordFailure(
        upstream: string,
        entry: BreakerEntry
    ): void {

        const now = Date.now();

        this.cleanOldFailures(entry);

        entry.failures.push(now);

        console.log(
            `[CIRCUIT] ${upstream}: ` +
            `${entry.failures.length}/${FAILURE_THRESHOLD} failures`
        );
    }

    async fire(
        upstream: string,
        request: () => Promise<Response>
    ): Promise<Response> {

        const entry = this.getBreaker(upstream);

        this.cleanOldFailures(entry);

        /*
         * We have reached the failure threshold.
         *
         * Tell Opossum to open the circuit.
         */
        if (
            entry.failures.length >= FAILURE_THRESHOLD &&
            !entry.breaker.opened
        ) {
            entry.breaker.open();
        }

        try {

            /*
             * Opossum controls:
             *
             * CLOSED → request allowed
             * OPEN → request rejected
             * HALF-OPEN → one test request
             */
            const response: Response =
                await entry.breaker.fire(request) as Response;

            /*
             * Successful request.
             *
             * If this was the HALF-OPEN test request,
             * Opossum will close the circuit.
             */
            if (response.ok) {
                entry.failures = [];
            }

            return response;

        } catch (error) {

            this.recordFailure(
                upstream,
                entry
            );

            /*
             * Re-open if we reached five failures
             * within the 30-second window.
             */
            this.cleanOldFailures(entry);

            if (
                entry.failures.length >= FAILURE_THRESHOLD
            ) {
                entry.breaker.open();
            }

            throw error;
        }
    }
}

export default new UpstreamCircuitBreaker();