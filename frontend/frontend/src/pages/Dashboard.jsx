import { useState } from "react";
import { apiFetch } from "../api.js";

const API_KEY = "abc123";

export default function Dashboard() {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const callOrders = async () => {
    setLoading(true);

    try {
      const res = await apiFetch("/api/orders", {
        headers:{
            "X-API-Key":API_KEY
        }
      });

      const data = await res.json();

      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(String(err));
    }

    setLoading(false);
  };

  const callUsers = async () => {
    setLoading(true);

    try {
      const res = await apiFetch("/api/users", {
        headers:{
            "X-API-Key":API_KEY
        }
      });

      const data = await res.json();

      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(String(err));
    }

    setLoading(false);
  };

  const spamRequests = async () => {
    setLoading(true);

    for (let i = 1; i <= 160; i++) {
      const res = await apiFetch("/api/orders", {
        headers:{
            "X-API-Key":API_KEY
        }
      });

      console.log(i, res.status);

      if (res.status === 429) {
        alert(`Rate limit hit at request ${i}`);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard</h1>

      <button onClick={callOrders}>
        Call Orders API
      </button>

      <button
        onClick={callUsers}
        style={{ marginLeft: 20 }}
      >
        Call Users API
      </button>

      <button
        onClick={spamRequests}
        style={{ marginLeft: 20 }}
      >
        Test Rate Limiter
      </button>

      {loading && <h3>Loading...</h3>}

      <pre>{response}</pre>
    </div>
  );
}