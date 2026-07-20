const express = require("express");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();

const PORT = 3000;

app.use(morgan("dev"));

// Proxy all requests beginning with /weather
app.use(
  "/weather",
  createProxyMiddleware({
    target: "https://api.openweathermap.org",
    changeOrigin: true,

    pathRewrite: (path, req) => {
      return `/data/2.5/weather?q=${req.query.q}&appid=${process.env.API_KEY}`;
    },
  })
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});