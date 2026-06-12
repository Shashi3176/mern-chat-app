import React, { useState } from "react";
import {
  Box,
  Button,
  Heading,
  Input,
  Stack,
  Text,
  Badge,
  Spinner,
  Center,
  Alert,
} from "@chakra-ui/react";
import { adminApi } from "../../utils/adminApi";

function TestToxicityInput() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTest = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await adminApi.testToxicity(message);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to test toxicity");
    } finally {
      setLoading(false);
    }
  };

  const wouldBeBlocked = (r) => {
    if (!r || !r.categories) return false;
    return Object.entries(r.categories).some(([label, score]) => score >= (r.threshold || 0.5));
  };

  return (
    <Box p={4} borderWidth={1} borderRadius="lg">
      <Heading size="sm" mb={3}>
        Test Toxicity
      </Heading>
      <Stack spacing={3}>
        <Input
          placeholder="Type a message to test..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTest()}
        />
        <Button size="sm" colorScheme="blue" onClick={handleTest} isLoading={loading}>
          Test Message
        </Button>
      </Stack>

      {error && (
        <Alert status="error" mt={3} fontSize="sm">
          {error}
        </Alert>
      )}

      {loading && (
        <Center py={4}>
          <Spinner />
        </Center>
      )}

      {result && (
        <Box mt={4} p={3} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold" mb={2}>
            Analysis Result:
          </Text>
          <Text fontSize="sm" mb={2}>
            <strong>Threshold:</strong> {result.threshold ?? 0.5}
          </Text>
          <Text fontSize="sm" mb={2}>
            <strong>Would be blocked:</strong>{" "}
            <Badge colorScheme={wouldBeBlocked(result) ? "red" : "green"}>
              {wouldBeBlocked(result) ? "Yes" : "No"}
            </Badge>
          </Text>
          <Text fontWeight="bold" mt={2} mb={1}>
            Category Scores:
          </Text>
          <Box fontSize="xs">
            {result.categories && Object.entries(result.categories).map(([label, score]) => (
              <Box key={label} display="flex" justifyContent="space-between" py={1} borderBottomWidth={1}>
                <Text>{label}</Text>
                <Badge colorScheme={score >= (result.threshold || 0.5) ? "red" : "gray"}>
                  {typeof score === "number" ? score.toFixed(4) : score}
                </Badge>
              </Box>
            ))}
            {(!result.categories || Object.keys(result.categories).length === 0) && (
              <Text>No category data available</Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default TestToxicityInput;
