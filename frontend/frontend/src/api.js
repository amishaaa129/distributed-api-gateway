const BASE_URL = "http://localhost:8080";
async function refreshAccessToken() {
    const response = await fetch(`${BASE_URL}/auth/refresh-token`, {
        method: "POST",
        credentials: "include"
    });

    return response.ok;
}
export async function apiFetch(url, options = {}) {

    let response = await fetch(`${BASE_URL}${url}`, {
        credentials: "include",
        ...options
    });
    // Access token expired?
    if (response.status === 401) {
        let body = {};

        try {
            body = await response.clone().json();
        } catch {}
        if (body.message === "jwt expired") {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                response = await fetch(`${BASE_URL}${url}`, {
                    credentials: "include",
                    ...options
                });
            } else {
                alert("Session expired. Please login again.");
                window.location.href = "/login";
                return response;
            }
        }
    }
    return response;
}