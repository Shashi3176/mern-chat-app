import React, { useState } from "react";
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Input,
  HStack,
  Select,
  useToast,
  Spinner,
  Center,
  Badge,
} from "@chakra-ui/react";

function truncate(str, len = 50) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "..." : str;
}

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function BlockedMessagesTable({ logs, total, page, totalPages, loading, onPageChange, onFiltersChange, filters }) {
  const [selectedLog, setSelectedLog] = useState(null);

  const openLog = (log) => setSelectedLog(log);
  const closeLog = () => setSelectedLog(null);

  if (loading) {
    return (
      <Box p={6} borderWidth={1} borderRadius="lg">
        <Center py={10}>
          <Spinner />
        </Center>
      </Box>
    );
  }

  const categoryBadges = (cats) => {
    if (!cats || cats.length === 0) return <Text fontSize="sm">—</Text>;
    return (
      <HStack spacing={1} wrap="wrap">
        {cats.map((c, i) => (
          <Badge key={i} colorScheme="red" fontSize="xs">
            {c}
          </Badge>
        ))}
      </HStack>
    );
  };

  return (
    <Box borderWidth={1} borderRadius="lg" overflow="hidden">
      {/* Filters */}
      <Box p={4} borderBottomWidth={1}>
        <HStack spacing={3}>
          <Input
            placeholder="User ID or anonymous name"
            size="sm"
            w="200px"
            value={filters.userId || ""}
            onChange={(e) => onFiltersChange({ ...filters, userId: e.target.value })}
          />
          <Select
            placeholder="All categories"
            size="sm"
            w="180px"
            value={filters.category || ""}
            onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
          >
            <option value="toxic">toxic</option>
            <option value="severe_toxic">severe_toxic</option>
            <option value="obscene">obscene</option>
            <option value="threat">threat</option>
            <option value="insult">insult</option>
            <option value="identity_hate">identity_hate</option>
          </Select>
          <Input
            type="date"
            size="sm"
            value={filters.startDate || ""}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
          />
          <Input
            type="date"
            size="sm"
            value={filters.endDate || ""}
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
          />
        </HStack>
      </Box>

      {/* Table */}
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Time</Th>
              <Th>User</Th>
              <Th>Room</Th>
              <Th>Message</Th>
              <Th>Categories</Th>
            </Tr>
          </Thead>
          <Tbody>
            {logs.length === 0 ? (
              <Tr>
                <Td colSpan={5} textAlign="center" py={6}>
                  No blocked messages found
                </Td>
              </Tr>
            ) : (
              logs.map((log, idx) => (
                <Tr key={idx} _hover={{ bg: "gray.50", cursor: "pointer" }} onClick={() => openLog(log)}>
                  <Td fontSize="xs">{formatTime(log.createdAt)}</Td>
                  <Td fontSize="xs">{log.userAnonymousName || log.userId || "—"}</Td>
                  <Td fontSize="xs">{log.roomId || "—"}</Td>
                  <Td fontSize="xs" maxW="300px" isTruncated>
                    {truncate(log.messageContent, 60)}
                  </Td>
                  <Td>{categoryBadges(log.detectedCategories)}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Pagination */}
      <Box p={3} display="flex" justifyContent="space-between" alignItems="center" borderTopWidth={1}>
        <Text fontSize="sm">
          Page {page} of {totalPages} ({total} total)
        </Text>
        <HStack>
          <Button size="sm" isDisabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <Button size="sm" isDisabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </HStack>
      </Box>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedLog} onClose={closeLog} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Blocked Message Detail</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedLog && (
              <Box>
                <Text fontWeight="bold" mb={2}>Message:</Text>
                <Text mb={4} p={3} bg="gray.50" borderRadius="md">
                  {selectedLog.messageContent}
                </Text>
                <Text fontWeight="bold" mb={2}>Categories:</Text>
                {categoryBadges(selectedLog.detectedCategories)}
                <Text mt={3} fontSize="sm">
                  <strong>User:</strong> {selectedLog.userAnonymousName || selectedLog.userId || "—"}
                </Text>
                <Text fontSize="sm">
                  <strong>Room:</strong> {selectedLog.roomId || "—"}
                </Text>
                <Text fontSize="sm">
                  <strong>Time:</strong> {formatTime(selectedLog.createdAt)}
                </Text>
                {selectedLog.confidenceScores && (
                  <>
                    <Text mt={3} fontSize="sm" fontWeight="bold">Confidence Scores:</Text>
                    <Box p={3} bg="gray.50" borderRadius="md" fontSize="xs" whiteSpace="pre-wrap">
                      {JSON.stringify(selectedLog.confidenceScores, null, 2)}
                    </Box>
                  </>
                )}
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default BlockedMessagesTable;
