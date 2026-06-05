const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  
  const response = {
    message: err.message,
    success: false,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
    response.path = req.path;
    response.method = req.method;
  }

  res.json(response);
};

const asyncHandler = require("express-async-handler");

const requireAuth = asyncHandler(async (req, res, next) => {
  const jwt = require("jsonwebtoken");
  const User = require("../models/userModel.js");

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        res.status(401);
        throw new Error("User account no longer exists");
      }

      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        res.status(401);
        throw new Error("Invalid authentication token");
      } else if (error.name === "TokenExpiredError") {
        res.status(401);
        throw new Error("Authentication token has expired");
      }
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Authentication token is required");
  }
});

module.exports = {
  notFound,
  errorHandler,
  requireAuth,
};