import { useEffect, useState } from "react";
import "./TrafficDashboard.css";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
} from "chart.js";

import {
    Line,
    Bar,
    Doughnut
} from "react-chartjs-2";


ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
);


const ERROR_THRESHOLD = 5;


export default function TrafficDashboard() {

    const [metrics, setMetrics] = useState({});
    const [connected, setConnected] = useState(false);
    const [history, setHistory] = useState([]);
    const [selectedUpstream, setSelectedUpstream] =
        useState("all");


    /*
     * ============================
     * WEBSOCKET
     * ============================
     */

    useEffect(() => {

        const ws =
            new WebSocket(
                "ws://localhost:8080/ws/metrics"
            );


        ws.onopen = () => {

            console.log("[WS] Connected");

            setConnected(true);

        };


        ws.onmessage = (event) => {

            try {

                const message =
                    JSON.parse(event.data);


                if (message.type !== "metrics") {
                    return;
                }


                setMetrics(message.data);


                /*
                 * Store total RPS history.
                 */
                const totalRps =
                    Object.values(message.data)
                        .reduce(
                            (sum, item) =>
                                sum + item.rps,
                            0
                        );


                setHistory(prev => [

                    ...prev,

                    {
                        time:
                            new Date(
                                message.timestamp
                            ).toLocaleTimeString(),

                        rps: totalRps

                    }

                ].slice(-60));


            } catch (error) {

                console.error(
                    "[WS] Invalid message:",
                    error
                );

            }

        };


        ws.onerror = (error) => {

            console.error(
                "[WS] Error:",
                error
            );

        };


        ws.onclose = () => {

            console.log(
                "[WS] Disconnected"
            );

            setConnected(false);

        };


        return () => {

            if (
                ws.readyState === WebSocket.OPEN ||
                ws.readyState === WebSocket.CONNECTING
            ) {
                ws.close();
            }

        };

    }, []);


    /*
     * ============================
     * UPSTREAM LIST
     * ============================
     */

    const upstreams =
        Object.keys(metrics);


    /*
     * ============================
     * SELECTED METRICS
     * ============================
     */

    const selectedMetrics =
        selectedUpstream === "all"
            ? Object.values(metrics)
            : metrics[selectedUpstream]
                ? [metrics[selectedUpstream]]
                : [];


    /*
     * ============================
     * TOTAL RPS
     * ============================
     */

    const totalRps =
        selectedMetrics.reduce(
            (sum, item) =>
                sum + item.rps,
            0
        );


    /*
     * ============================
     * ERROR RATE
     * ============================
     */

    const errorRate =
        selectedMetrics.length === 0
            ? 0
            : selectedMetrics.reduce(
                (sum, item) =>
                    sum + item.errorRate,
                0
            ) / selectedMetrics.length;


    const isError =
        errorRate > ERROR_THRESHOLD;


    /*
     * ============================
     * RPS CHART
     * ============================
     */

    const rpsData = {

        labels:
            history.map(
                item => item.time
            ),

        datasets: [
            {
                label: "Requests / sec",

                data:
                    history.map(
                        item => item.rps
                    ),

                borderColor: "#2563eb",

                backgroundColor:
                    "rgba(37, 99, 235, 0.10)",

                pointBackgroundColor:
                    "#2563eb",

                pointBorderColor:
                    "#ffffff",

                pointBorderWidth: 2,

                pointRadius: 3,

                borderWidth: 2,

                fill: true,

                tension: 0.3
            }
        ]

    };


    /*
     * ============================
     * LATENCY DATA
     * ============================
     */

    const latencyUpstreams =
        selectedUpstream === "all"
            ? upstreams
            : metrics[selectedUpstream]
                ? [selectedUpstream]
                : [];


    const latencyData = {

        labels:
            latencyUpstreams.map(
                upstream =>
                    upstream.replace(
                        "http://localhost:",
                        ":"
                    )
            ),

        datasets: [

            {
                label: "p50",

                data:
                    latencyUpstreams.map(
                        upstream =>
                            metrics[upstream].p50
                    ),

                backgroundColor:
                    "#60a5fa",

                borderColor:
                    "#3b82f6",

                borderWidth: 1,

                borderRadius: 6

            },


            {
                label: "p99",

                data:
                    latencyUpstreams.map(
                        upstream =>
                            metrics[upstream].p99
                    ),

                backgroundColor:
                    "#f97316",

                borderColor:
                    "#ea580c",

                borderWidth: 1,

                borderRadius: 6

            }

        ]

    };


    /*
     * ============================
     * RPS OPTIONS
     * ============================
     */

    const rpsOptions = {

        responsive: true,

        maintainAspectRatio: false,

        animation: false,

        plugins: {

            legend: {

                labels: {
                    color: "#334155"
                }

            },

            tooltip: {

                backgroundColor: "#ffffff",

                titleColor: "#0f172a",

                bodyColor: "#334155",

                borderColor: "#e2e8f0",

                borderWidth: 1

            }

        },

        scales: {

            x: {

                ticks: {
                    color: "#64748b",

                    maxTicksLimit: 10
                },

                grid: {
                    color: "#e2e8f0"
                }

            },

            y: {

                beginAtZero: true,

                ticks: {
                    color: "#64748b"
                },

                grid: {
                    color: "#e2e8f0"
                }

            }

        }

    };


    /*
     * ============================
     * LATENCY OPTIONS
     * ============================
     */

    const latencyOptions = {

        responsive: true,

        maintainAspectRatio: false,

        animation: false,

        plugins: {

            legend: {

                labels: {
                    color: "#334155"
                }

            }

        },

        scales: {

            x: {

                ticks: {
                    color: "#64748b"
                },

                grid: {
                    display: false
                }

            },

            y: {

                beginAtZero: true,

                title: {

                    display: true,

                    text: "Milliseconds",

                    color: "#475569"

                },

                ticks: {
                    color: "#64748b"
                },

                grid: {
                    color: "#e2e8f0"
                }

            }

        }

    };


    /*
     * ============================
     * ERROR GAUGE
     * ============================
     */

    const gaugeData = {

        labels: [
            "Errors",
            "Healthy"
        ],

        datasets: [
            {

                data: [
                    Math.min(errorRate, 100),

                    Math.max(
                        0,
                        100 - errorRate
                    )
                ],

                backgroundColor: [
                    "#ef4444",
                    "#22c55e"
                ],

                borderColor: [
                    "#ffffff",
                    "#ffffff"
                ],

                borderWidth: 3

            }
        ]

    };


    /*
     * ============================
     * RENDER
     * ============================
     */

    return (

        <div className="dashboard">


            {/* ================= HEADER ================= */}

            <header className="dashboard-header">

                <div>

                    <h1>
                        Traffic Intelligence
                    </h1>

                    <p>
                        Live API Gateway Metrics
                    </p>

                </div>


                <div
                    className={
                        connected
                            ? "status online"
                            : "status offline"
                    }
                >

                    <span />

                    {connected
                        ? "LIVE"
                        : "DISCONNECTED"}

                </div>

            </header>



            {/* ================= FILTER BAR ================= */}

            <div className="filter-bar">

                <div>

                    <label htmlFor="upstream-select">
                        Monitor upstream
                    </label>

                    <select
                        id="upstream-select"
                        value={selectedUpstream}
                        onChange={(e) =>
                            setSelectedUpstream(
                                e.target.value
                            )
                        }
                    >

                        <option value="all">
                            All Upstreams
                        </option>


                        {upstreams.map(upstream => (

                            <option
                                key={upstream}
                                value={upstream}
                            >
                                {upstream}
                            </option>

                        ))}

                    </select>

                </div>


                <div className="threshold-info">

                    <span className="threshold-dot" />

                    Error alert threshold:

                    <strong>
                        {ERROR_THRESHOLD}%
                    </strong>

                </div>

            </div>



            {/* ================= STATS ================= */}

            <div className="stats">


                <div className="stat-card">

                    <span>
                        Upstreams
                    </span>

                    <strong>
                        {selectedUpstream === "all"
                            ? upstreams.length
                            : 1}
                    </strong>

                </div>


                <div className="stat-card">

                    <span>
                        Request Rate
                    </span>

                    <strong>
                        {totalRps.toFixed(2)}
                    </strong>

                    <small>
                        requests / sec
                    </small>

                </div>


                <div
                    className={
                        `stat-card ${
                            isError
                                ? "danger-card"
                                : ""
                        }`
                    }
                >

                    <span>
                        Error Rate
                    </span>

                    <strong
                        className={
                            isError
                                ? "error-value"
                                : "healthy-value"
                        }
                    >
                        {errorRate.toFixed(2)}%
                    </strong>

                    <small>
                        {isError
                            ? "Above threshold"
                            : "Within threshold"}
                    </small>

                </div>

            </div>



            {/* ================= RPS ================= */}

            <section className="chart-card">

                <div className="section-heading">

                    <div>

                        <h2>
                            Live Request Rate
                        </h2>

                        <p>
                            Requests per second over the
                            last 60 measurements
                        </p>

                    </div>

                </div>


                <div className="chart-container">

                    <Line
                        data={rpsData}
                        options={rpsOptions}
                    />

                </div>

            </section>



            {/* ================= SECOND ROW ================= */}

            <div className="grid">


                {/* ERROR RATE */}

                <section className="chart-card">

                    <div className="section-heading">

                        <div>

                            <h2>
                                Error Rate
                            </h2>

                            <p>
                                {selectedUpstream === "all"
                                    ? "Average across upstreams"
                                    : selectedUpstream}
                            </p>

                        </div>

                    </div>


                    <div className="gauge">

                        <Doughnut
                            data={gaugeData}
                            options={{
                                responsive: true,

                                maintainAspectRatio: true,

                                cutout: "76%",

                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                }
                            }}
                        />


                        <div
                            className={
                                `gauge-value ${
                                    isError
                                        ? "gauge-danger"
                                        : "gauge-healthy"
                                }`
                            }
                        >
                            {errorRate.toFixed(1)}%
                        </div>

                    </div>


                    <div
                        className={
                            `alert-status ${
                                isError
                                    ? "alert-danger"
                                    : "alert-ok"
                            }`
                        }
                    >

                        <span />

                        {isError
                            ? "Error rate above 5%"
                            : "Error rate is healthy"}

                    </div>

                </section>



                {/* LATENCY */}

                <section className="chart-card">

                    <div className="section-heading">

                        <div>

                            <h2>
                                Latency by Upstream
                            </h2>

                            <p>
                                p50 vs p99 response time
                            </p>

                        </div>

                    </div>


                    <div className="chart-container latency-chart">

                        <Bar
                            data={latencyData}
                            options={latencyOptions}
                        />

                    </div>

                </section>

            </div>



            {/* ================= UPSTREAM SERVICES ================= */}

            <section className="upstreams">

                <div className="section-heading">

                    <div>

                        <h2>
                            Upstream Services
                        </h2>

                        <p>
                            Current health and performance
                        </p>

                    </div>

                </div>


                {upstreams.length === 0 && (

                    <div className="empty-state">

                        Waiting for upstream metrics...

                    </div>

                )}


                {upstreams.map(upstream => {

                    const item =
                        metrics[upstream];

                    const unhealthy =
                        item.errorRate >
                        ERROR_THRESHOLD;


                    return (

                        <div
                            className={
                                `upstream-card ${
                                    unhealthy
                                        ? "upstream-unhealthy"
                                        : ""
                                }`
                            }
                            key={upstream}
                        >


                            <div className="service-name">

                                <div className="service-indicator" />

                                <div>

                                    <strong>
                                        {upstream}
                                    </strong>

                                    <span
                                        className={
                                            unhealthy
                                                ? "unhealthy"
                                                : "healthy"
                                        }
                                    >
                                        {unhealthy
                                            ? "Unhealthy"
                                            : "Healthy"}
                                    </span>

                                </div>

                            </div>


                            <div className="metric">

                                <b>
                                    {item.rps.toFixed(2)}
                                </b>

                                <small>
                                    RPS
                                </small>

                            </div>


                            <div className="metric">

                                <b>
                                    {item.p50} ms
                                </b>

                                <small>
                                    p50
                                </small>

                            </div>


                            <div className="metric">

                                <b>
                                    {item.p99} ms
                                </b>

                                <small>
                                    p99
                                </small>

                            </div>


                            <div
                                className={
                                    `metric error-metric ${
                                        unhealthy
                                            ? "metric-danger"
                                            : "metric-healthy"
                                    }`
                                }
                            >

                                <b>
                                    {item.errorRate.toFixed(2)}%
                                </b>

                                <small>
                                    errors
                                </small>

                            </div>


                        </div>

                    );

                })}

            </section>


        </div>

    );

}