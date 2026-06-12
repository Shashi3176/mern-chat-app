import axios from "axios";

const API_BASE = "/api/admin";

const getAdminHeaders = () => {
  const adminKey = localStorage.getItem("adminKey");
  return {
    "X-Admin-Key": adminKey || "",
    "Content-Type": "application/json",
  };
};

export const adminApi = {
  getStats: async () => {
    const response = await axios.get(`${API_BASE}/toxicity-stats`, {
      headers: getAdminHeaders(),
    });
    return response.data;
  },

  getLogs: async ({ page = 1, limit = 20, startDate, endDate, userId, category }) => {
    const params = { page, limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (userId) params.userId = userId;
    if (category) params.category = category;

    const response = await axios.get(`${API_BASE}/toxicity-logs`, {
      headers: getAdminHeaders(),
      params,
    });
    return response.data;
  },

  testToxicity: async (message) => {
    const response = await axios.post(
      `${API_BASE}/test-toxicity`,
      { message },
      { headers: getAdminHeaders() }
    );
    return response.data;
  },

  getCharts: async () => {
    const response = await axios.get(`${API_BASE}/toxicity-charts`, {
      headers: getAdminHeaders(),
    });
    return response.data;
  },
};
