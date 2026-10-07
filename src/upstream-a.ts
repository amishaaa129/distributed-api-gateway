import express from "express";

const app = express();

const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get("/orders", (req, res) => {
    res.json({
        service: "orders",
        data: [
            { id: 1, item: "bag", price: 2000 },
            { id: 2, item: "watch", price: 1000 }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`upstream-a running on port ${PORT}`);
});