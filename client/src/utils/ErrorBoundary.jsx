import { Component } from "react";
import { Box, Button, Text } from "@chakra-ui/react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const retryCount = this.state.retryCount;
      const subtitle = error?.message || "An unexpected error occurred while rendering this page.";

      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minH="100vh"
          gap={4}
          p={6}
          textAlign="center"
          bg="gray.50"
        >
          <Text fontSize="6xl" role="img" aria-label="Error">
            ⚠️
          </Text>
          <Text fontSize="xl" fontWeight="bold" color="red.500">
            Something went wrong
          </Text>
          <Text fontSize="sm" color="gray.600" maxW="md">
            {subtitle}
          </Text>
          {retryCount < 3 ? (
            <Button colorScheme="blue" onClick={this.handleRetry} mt={3}>
              Try Again
            </Button>
          ) : (
            <Button
              mt={3}
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {}
                window.location.href = "/";
              }}
            >
              Reset App
            </Button>
          )}
          <Button
            variant="link"
            size="sm"
            mt={2}
            onClick={() => {
              window.location.href = "/chats";
            }}
          >
            Go to Chats
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
