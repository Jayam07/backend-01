import crypto from "crypto"; // Used to hash tokens using SHA-256
import { verificationEmail } from "../../common/config/email.js"; // Function used to send verification email
import APIError from "../../common/utils/api-error.js"; // Custom error class for throwing API errors
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js"; // JWT utility functions

import User from "./auth.model.js"; // User model to interact with MongoDB

// This function hashes a token before storing/comparing it in DB
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Register function is used when a new user signs up
const register = async ({ name, email, password, role }) => {
  // Check if user with same email already exists
  const existing = await User.findOne({ email });

  // If user exists, throw conflict error
  if (existing) throw new APIError.conflict("email already exists");

  // Generate raw token and hashed token for email verification
  const { rawToken, hashedToken } = generateResetToken();

  // Create new user in database
  const user = await User.create({
    name, // Store user's name
    email, // Store user's email
    password, // Store password, model will hash it before saving
    role, // Store user's role
    verificationToken: hashedToken, // Store hashed verification token in DB
  });

  try {
    // Send verification email with raw token
    await verificationEmail(email, rawToken);
  } catch (error) {
    // If email sending fails, print error in console
    console.log(error);
  }

  // Convert mongoose document into normal JavaScript object
  const userObj = user.toObject();

  // Remove password before returning response
  delete userObj.password;

  // Remove verification token before returning response
  delete userObj.verificationToken;

  // Return safe user data
  return userObj;
};

// Login function is used when user signs in
const login = async ({ email, password }) => {
  // Find user by email and include password because password has select:false
  const user = await User.findOne({ email }).select("+password");

  // If user does not exist, throw error
  if (!user) throw new APIError.unAuthorised("email or password is invalid");

  // Compare entered password with hashed password from DB
  const isMatch = await user.comparePasswords(password);

  // If password does not match, throw error
  if (!isMatch) throw new APIError.unAuthorised("email or password is incorrect");

  // Check if user has verified their email
  if (!user.isVerified) {
    // If not verified, throw forbidden error
    throw new APIError.forbidden("please verify before logging in");
  }

  // Generate access token using user id and role
  const accessToken = generateAccessToken({
    id: user._id,
    role: user.role,
  });

  // Generate refresh token using user id
  const refreshToken = generateRefreshToken({
    id: user._id,
  });

  // Hash refresh token before storing in DB
  user.refreshtoken = hashToken(refreshToken);

  // Save updated user without running all validations again
  await user.save({ validateBeforeSave: false });

  // Convert mongoose document into normal JavaScript object
  const userObj = user.toObject();

  // Remove password before returning response
  delete userObj.password;

  // Remove refresh token before returning response
  delete userObj.refreshtoken;

  // Return user data and tokens
  return {
    user: userObj,
    refreshToken,
    accessToken,
  };
};

// Refresh function is used to generate new access token using refresh token
const refresh = async (token) => {
  // If refresh token is missing, throw error
  if (!token) {
    throw new APIError.unAuthorised("refresh token missing");
  }

  // Verify refresh token and decode user id from it
  const decoded = verifyRefreshToken(token);

  // Find user by decoded id and include refreshtoken field
  const user = await User.findById(decoded.id).select("+refreshtoken");

  // If user not found, throw error
  if (!user) throw new APIError.unAuthorised("user not found");

  // Compare stored hashed refresh token with current hashed token
  if (user.refreshtoken !== hashToken(token)) {
    throw new APIError.unAuthorised("Invalid refresh token");
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    id: user._id,
    role: user.role,
  });

  // Return new access token
  return { accessToken };
};

// Logout function removes refresh token from database
const logout = async (userId) => {
  // Find user by id and set refreshtoken to null
  await User.findByIdAndUpdate(userId, {
    refreshtoken: null,
  });
};

// Forgot password function starts password reset process
const forgotPassword = async (email) => {
  // Find user by email
  const user = await User.findOne({ email });

  // If user does not exist, throw error
  if (!user) throw new APIError.notfound("no account with this email exists");

  // Generate raw reset token and hashed reset token
  const { rawToken, hashedToken } = generateResetToken();

  // Store hashed reset token in DB
  user.resetPasswordToken = hashedToken;

  // Set reset token expiry time to 15 minutes from now
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

  // Save updated user
  await user.save({ validateBeforeSave: false });

  // Return raw token so it can be sent by email
  return rawToken;
};

// GetMe function returns currently logged-in user
const getMe = async (userId) => {
  // Find user by id
  const user = await User.findById(userId);

  // If user does not exist, throw error
  if (!user) throw new APIError.notfound("user not found");

  // Return user data
  return user;
};

// Verify email function verifies user account using token
const verifyEmail = async (token) => {
  // Hash token received from email link
  const hashedToken = hashToken(token);

  // Find user whose verification token matches hashed token
  const user = await User.findOne({
    verificationToken: hashedToken,
  }).select("+verificationToken");

  // If user not found, token is invalid
  if (!user) {
    throw new APIError.unAuthorised("Invalid verification token");
  }

  // Mark user as verified
  user.isVerified = true;

  // Remove verification token because it is no longer needed
  user.verificationToken = undefined;

  // Save updated user
  await user.save({ validateBeforeSave: false });

  // Return verified user
  return user;
};

// Export all service functions so controller can use them
export {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  verifyEmail,
  getMe,
};