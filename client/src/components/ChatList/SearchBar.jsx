import { Box, Input, InputGroup, InputRightElement, Text, useColorModeValue } from "@chakra-ui/react";
import { useState, useMemo, useCallback } from "react";
import { CloseIcon, SearchIcon } from "@chakra-ui/icons";

const SearchBar = ({ placeholder = "Search chats...", onSearch, debounceMs = 200 }) => {
  const [query, setQuery] = useState("");
  const [internalValue, setInternalValue] = useState("");
  const debounceTimer = useMemo(() => null, []);
  const bgColor = useColorModeValue("gray.50", "gray.700");

  const handleChange = useCallback(
    (e) => {
      const val = e.target.value;
      setInternalValue(val);
      if (debounceMs > 0) {
        if (debounceTimer) clearTimeout(debounceTimer);
        setTimeout(() => {
          setQuery(val);
          onSearch?.(val);
        }, debounceMs);
      } else {
        setQuery(val);
        onSearch?.(val);
      }
    },
    [onSearch, debounceMs, debounceTimer]
  );

  const handleClear = useCallback(() => {
    setInternalValue("");
    setQuery("");
    onSearch?.("");
  }, [onSearch]);

  const hasValue = internalValue.length > 0;

  return (
    <Box className="search-bar-container" px={3} py={2}>
      <InputGroup size="sm" className="search-input-group">
        <SearchIcon color="gray.400" className="search-icon" />
        <Input
          placeholder={placeholder}
          value={internalValue}
          onChange={handleChange}
          bg={bgColor}
          borderRadius="full"
          pl={8}
          pr={hasValue ? 8 : 4}
          py={2}
          fontSize="sm"
          className="search-input"
          autoComplete="off"
        />
        {hasValue && (
          <InputRightElement h="full" pr={2}>
            <Box
              as="button"
              onClick={handleClear}
              className="search-clear-btn"
              aria-label="Clear search"
              type="button"
              display="flex"
              alignItems="center"
              justifyContent="center"
              w={6}
              h={6}
              borderRadius="full"
              bg="gray.200"
              _hover={{ bg: "gray.300" }}
            >
              <CloseIcon w={3} h={3} color="gray.500" />
            </Box>
          </InputRightElement>
        )}
      </InputGroup>
    </Box>
  );
};

export const NoResults = ({ message = "No results found", subtext = "Try adjusting your search" }) => (
  <Box textAlign="center" py={8} px={4}>
    <Box
      w={14}
      h={14}
      borderRadius="full"
      bg="gray.100"
      display="flex"
      alignItems="center"
      justifyContent="center"
      mx="auto"
      mb={3}
      className="no-results-icon"
    >
      <SearchIcon color="gray.400" fontSize="xl" />
    </Box>
    <Text fontSize="sm" fontWeight="600" color="gray.600" className="no-results-title">
      {message}
    </Text>
    <Text fontSize="xs" color="gray.400" mt={1} className="no-results-subtitle">
      {subtext}
    </Text>
  </Box>
);

export default SearchBar;
