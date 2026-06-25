import * as authService from "./auth.service.js"; // Import all auth service functions
import ApiResponce from "../../common/utils/api-responce.js"; // Import custom API response helper

// Controller for user registration
const register = async (req, res) => {
  // Send request body data to register service
  const user = await authService.register(req.body);

  // Send success response to client
  ApiResponce.created(res, "Registration success", user);
};

// Controller for user login
const login = async (req, res) => {
  // Send email/password to login service and receive user + tokens
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  // Store refresh token in cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // Frontend JavaScript cannot access this cookie
    maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie valid for 7 days
    secure: true, // Cookie sent only over HTTPS
  });

  // Send user data and access token to frontend
  ApiResponce.ok(res, "login successful", {
    user,
    accessToken,
  });
};

// Controller for logout
const logout = async (req, res) => {
  // Remove refresh token from database
  await authService.logout(req.user.id);

  // Clear refresh token cookie from browser
  res.clearCookie("refreshToken");

  // Send logout success response
  ApiResponce.ok(res, "logout success");
};

// Controller for getting current logged-in user profile
const getMe = async (req, res) => {
  // Get user from database using logged-in user's id
  const user = await authService.getMe(req.user.id);

  // Send user profile response
  ApiResponce.ok(res, "user profile", user);
};

// Export controllers so routes can use them
export { register, login, logout, getMe };