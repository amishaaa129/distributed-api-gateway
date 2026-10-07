import express from "express";

const app = express();

const PORT = Number(process.env.PORT) || 3002;

app.use(express.json());

app.get("/users", (req, res) => {
    res.json({
        service: "users",
        data: [
            { id: 1, name: "John", contact: 123 },
            { id: 2, name: "Amy", contact: 456 }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`upstream-b running on port ${PORT}`);
});