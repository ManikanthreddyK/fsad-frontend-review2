import axios from "axios";

const token = localStorage.getItem("token");

const api = axios.create({
  baseURL: "http://localhost:8080/api"
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
