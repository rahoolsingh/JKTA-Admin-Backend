import { Router } from "express";
import dotenv from "dotenv";
import { maskMailArray } from "../utils/maskMail.js";
import {
    addAuthUser,
    resendOtp,
    sendOtp,
    verifyOtp,
    getUser,
    continueSession,
    logout,
} from "../controllers/auth.controller.js";
import checkAuthentication from "../middlewares/checkAuthentication.js";

const router = Router();

dotenv.config();

// temp route to add user to db
// router.get("/add-user/:email", addAuthUser);

router.post("/send-otp", sendOtp);

router.post("/verify-otp", verifyOtp);

router.post("/resend-otp", resendOtp);

router.get("/showall", checkAuthentication, getUser);

router.post("/continue-session", checkAuthentication, continueSession);

router.post("/logout", logout);

export default router;
