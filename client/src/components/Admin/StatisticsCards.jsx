import React from "react";
import { Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Text, Badge, Spinner, Center, Button, useToast } from "@chakra-ui/react";

function getBlockRate(blockedToday, totalToday) {
  if (!totalToday || totalToday === 0) return 0;
  return ((blockedToday / totalToday) * 100).toFixed(1);
}

function StatisticsCards({ stats, loading, onRefresh, lastUpdated }) {
  const mostCommon = stats?.mostCommonCategories?.[0]?.category || "N/A";

  if (loading) {
    return (
      <Box p={6} borderWidth={1} borderRadius="lg">
        <Center py={10}>
          <Spinner />
        </Center>
      </Box>
    );
  }

  const cards = [
    { label: "Blocked (Today)", value: stats?.blockedToday ?? 0, helpText: "Messages blocked today" },
    { label: "Checked (Today)", value: stats?.checkedToday ?? 0, helpText: "Messages checked today" },
    { label: "Block Rate", value: `${getBlockRate(stats?.blockedToday, stats?.checkedToday)}%`, helpText: "Percentage blocked" },
    { label: "Top Category", value: mostCommon, helpText: "Most common toxicity category" },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="sm">Statistics</Heading>
        <Box>
          <Button size="sm" onClick={onRefresh} mr={2}>
            Refresh
          </Button>
          {lastUpdated && (
            <Text fontSize="xs" color="gray.500" display="inline">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </Box>
      </Box>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        {cards.map((card, idx) => (
          <Box key={idx} p={4} borderWidth={1} borderRadius="lg">
            <Stat>
              <StatLabel>{card.label}</StatLabel>
              <StatNumber>{card.value}</StatNumber>
              <StatHelpText>{card.helpText}</StatHelpText>
            </Stat>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

export default StatisticsCards;
