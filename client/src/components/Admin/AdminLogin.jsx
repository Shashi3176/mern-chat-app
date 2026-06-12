import React from "react";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";

function AdminLogin() {
  const [adminKey, setAdminKey] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const toast = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      toast({ title: "Admin key is required", status: "error" });
      return;
    }
    setLoading(true);
    localStorage.setItem("adminKey", adminKey.trim());
    toast({ title: "Logged in successfully", status: "success" });
    setTimeout(() => {
      window.location.href = "/admin/moderation";
    }, 500);
  };

  return (
    <Container maxW="sm" mt={20}>
      <Box p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
        <Heading size="md" mb={4} textAlign="center">
          Admin Login
        </Heading>
        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Admin Key</FormLabel>
              <Input
                type="password"
                placeholder="Enter admin key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
              />
            </FormControl>
            <Button type="submit" colorScheme="red" isLoading={loading}>
              Login
            </Button>
          </Stack>
        </form>
      </Box>
    </Container>
  );
}

export default AdminLogin;
