// VITE_API_URL is injected at build time by Vite from .env or Render environment variables.
// For local dev, set VITE_API_URL=http://localhost:5000/api in client/.env
// For Render production, set VITE_API_URL=https://mokhata-api.onrender.com/api as a Static Site env var.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const config: RequestInit = {
    ...options,
    credentials: 'include', // Crucial for sending express-session cookies
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'An error occurred';
    const errorObj: any = new Error(errorMsg);
    errorObj.status = response.status;
    errorObj.data = data;
    throw errorObj;
  }

  return data;
}
