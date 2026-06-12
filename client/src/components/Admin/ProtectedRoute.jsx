import React from "react";
import { Redirect } from "react-router-dom";

function ProtectedRoute({ children }) {
  const adminKey = localStorage.getItem("adminKey");
  if (!adminKey) {
    return <Redirect to="/admin/login" />;
  }
  return children;
}

export default ProtectedRoute;
