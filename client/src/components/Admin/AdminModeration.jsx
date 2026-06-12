import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Text,
  VStack,
  useToast,
  Spinner,
  Center,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Input,
  Select,
  useColorModeValue,
} from "@chakra-ui/react";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import ProtectedRoute from "./ProtectedRoute";
import StatisticsCards from "./StatisticsCards";
import BlockedMessagesTable from "./BlockedMessagesTable";
import TestToxicityInput from "./TestToxicityInput";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

import { adminApi } from "../../utils/adminApi";

const CHART_COLORS = [
  "#E53E3E", "#DD6B20", "#D69E2E", "#38A169", "#3182CE",
  "#805AD5", "#D53F8C", "#319795", "#718096", "#A0AEC0",
];

function SimpleLineChart({ data }) {
  if (!data || data.length === 0) return <Text fontSize="sm" color="gray.500">No data for last 7 days</Text>;
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: "Blocked Messages",
        data: data.map((d) => d.count),
        borderColor: "#E53E3E",
        backgroundColor: "rgba(229, 62, 62, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };
  return <Line data={chartData} options={options} />;
}

function DistributionBarChart({ data }) {
  if (!data || data.length === 0) return <Text fontSize="sm" color="gray.500">No category data</Text>;
  const chartData = {
    labels: data.map((d) => d.category),
    datasets: [
      {
        label: "Blocks",
        data: data.map((d) => d.count),
        backgroundColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };
  return <Bar data={chartData} options={options} />;
}

function TopUsersPieChart({ data }) {
  if (!data || data.length === 0) return <Text fontSize="sm" color="gray.500">No user data</Text>;
  const labels = data.map((u) => u.name || u.userId || "Unknown");
  const counts = data.map((u) => u.count);
  const colors = data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  const chartData = {
    labels,
    datasets: [
      {
        data: counts,
        backgroundColor: colors,
      },
    ],
  };
  const options = { responsive: true, plugins: { legend: { display: false } } };
  return <Pie data={chartData} options={options} />;
}

function AdminModeration() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [logs, setLogs] = useState({ logs: [], total: 0, page: 1, totalPages: 0 });
  const [filters, setFilters] = useState({ userId: "", category: "", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const toast = useToast();
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const fetchStatsAndCharts = useCallback(async () => {
    try {
      const [statsData, chartsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getCharts(),
      ]);
      setStats(statsData);
      setCharts(chartsData);
      setLastUpdated(new Date());
    } catch (error) {
      toast({ title: "Failed to load statistics", status: "error", duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await adminApi.getLogs({
        page: logs.page,
        limit: 20,
        ...filters,
      });
      setLogs(data);
    } catch (error) {
      toast({ title: "Failed to load logs", status: "error", duration: 3000 });
    } finally {
      setLoadingLogs(false);
    }
  }, [logs.page, filters, toast]);

  useEffect(() => {
    fetchStatsAndCharts();
  }, [fetchStatsAndCharts]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = async () => {
    await fetchStatsAndCharts();
    await fetchLogs();
    toast({ title: "Refreshed", status: "success", duration: 2000 });
  };

  const handlePageChange = (newPage) => {
    setLogs((prev) => ({ ...prev, page: newPage }));
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setLogs((prev) => ({ ...prev, page: 1 }));
  };

  const handleLogout = () => {
    localStorage.removeItem("adminKey");
    window.location.href = "/admin/login";
  };

  return (
    <Container maxW="container.xl" py={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Admin Moderation Dashboard</Heading>
        <HStack>
          <Button size="sm" onClick={handleRefresh}>
            Refresh
          </Button>
          <Button size="sm" colorScheme="red" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </HStack>
      </HStack>

      <VStack spacing={6} align="stretch">
        {/* Statistics Cards */}
        <Box bg={cardBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={5}>
          <StatisticsCards stats={stats} loading={loading} onRefresh={handleRefresh} lastUpdated={lastUpdated} />
        </Box>

        {/* Charts Section */}
        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
          <Box bg={cardBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={5}>
            <Heading size="xs" mb={3}>Blocked (Last 7 Days)</Heading>
            {loading ? <Center py={6}><Spinner /></Center> : <SimpleLineChart data={charts?.blockedOverTime} />}
          </Box>
          <Box bg={cardBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={5}>
            <Heading size="xs" mb={3}>Category Distribution</Heading>
            {loading ? <Center py={6}><Spinner /></Center> : <DistributionBarChart data={charts?.categoryDistribution} />}
          </Box>
          <Box bg={cardBg} borderWidth={1} borderColor={borderColor} borderRadius="lg" p={5}>
            <Heading size="xs" mb={3}>Top Users by Blocks</Heading>
            {loading ? <Center py={6}><Spinner /></Center> : <TopUsersPieChart data={charts?.topUsersByBlocks} />}
          </Box>
        </SimpleGrid>

        {/* Blocked Messages Table */}
        <Box bg={cardBg} borderWidth={1} borderColor={borderColor} borderRadius="lg">
          <BlockedMessagesTable
            logs={logs.logs}
            total={logs.total}
            page={logs.page}
            totalPages={logs.totalPages}
            loading={loadingLogs}
            onPageChange={handlePageChange}
            onFiltersChange={handleFiltersChange}
            filters={filters}
          />
        </Box>

        {/* Test Toxicity */}
        <TestToxicityInput />
      </VStack>
    </Container>
  );
}

function AdminModerationPage() {
  return (
    <ProtectedRoute>
      <AdminModeration />
    </ProtectedRoute>
  );
}

export default AdminModerationPage;
