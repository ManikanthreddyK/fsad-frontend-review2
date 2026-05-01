import axios from "axios";

const token = localStorage.getItem("token");

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

if (token) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export const setAuthToken = (newToken) => {
  if (newToken) {
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export default api;
