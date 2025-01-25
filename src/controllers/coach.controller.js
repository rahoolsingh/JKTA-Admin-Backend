import { ObjectId } from "mongodb";
import Coach from "../models/coach.model.js";
import mongoose from "mongoose";
import { deleteFiles, generateCard } from "../utils/idcard.js";
import CoachEnrollment from "../models/coachEnrollment.model.js";
import { sendWithAttachment } from "./mail.controller.js";
import { downloadImage } from "../utils/downloadImage.js";
import expiryDate from "../utils/expiryDate.js";

const listCoaches = async (req, res) => {
    try {
        const coaches = await Coach.find({
            payment: true,
        });

        // sort the coaches by status pending, approved, rejected
        coaches.sort((a, b) => {
            if (a.status === "pending" && b.status !== "pending") return -1;
            if (a.status !== "pending" && b.status === "pending") return 1;
            if (a.status === "approved" && b.status === "rejected") return -1;
            if (a.status === "rejected" && b.status === "approved") return 1;
            return 0;
        });

        res.json(coaches);
    } catch (error) {
        res.json({ message: error.message });
    }
};

const pendingCoaches = async (req, res) => {
    try {
        const coaches = await Coach.find({
            status: "pending",
            payment: true,
        });
        res.json(coaches);
    } catch (error) {
        res.json({ message: error.message });
    }
};

const pendingCoachesCount = async (req, res) => {
    try {
        const count = await Coach.countDocuments({
            status: "pending",
            payment: true,
        });
        res.json({ count });
    } catch (error) {
        res.json({ message: error.message });
    }
};

const allCoachesCount = async (req, res) => {
    try {
        const count = await Coach.countDocuments({
            payment: true,
        });
        res.json({ count });
    } catch (error) {
        res.json({ message: error.message });
    }
};

const markStatusApproved = async (req, res) => {
    try {
        const regNo = req.params.regNo;

        console.log("RegNo:", regNo);

        // find id from regNo
        const coachData = await Coach.findOne({ regNo });

        if (!coachData.photo) {
            return res.status(404).json({
                message:
                    "Photo not found, Without photo, profile can't be approved",
            });
        }

        // check if id is available in CoachEnrollment (regNo field)
        const isEnrolled = await CoachEnrollment.findOne({
            regNo: coachData._id,
        });

        // generate enrollment number
        let CoachEnrollmentDetails;
        if (isEnrolled) {
            CoachEnrollmentDetails = isEnrolled;
        } else {
            const CoachEnrollmentCount = await CoachEnrollment.countDocuments(); // as it returns a promise
            CoachEnrollmentDetails = await CoachEnrollment.create({
                enrollmentNumber: `JKTA${10000 + CoachEnrollmentCount + 1}`,
                regNo: coachData._id,
            });
        }

        console.log(CoachEnrollmentDetails);

        const coach = await Coach.findOneAndUpdate(
            { regNo },
            { $set: { status: "approved" } },
            { new: true }
        );

        await downloadImage(coachData.photo, `${coachData.regNo}-download.png`);

        await generateCard({
            id: coachData.regNo,
            enrollmentNo: CoachEnrollmentDetails.enrollmentNumber,
            type: "C",
            name: coachData.playerName,
            parentage: coachData.fatherName,
            gender: coachData.gender,
            valid: expiryDate(coachData.createdAt),
            district: coachData.district,
            dob: `${coachData.dob}`,
        });

        await sendWithAttachment(
            coachData.email,
            `${CoachEnrollmentDetails.enrollmentNumber} - Congratulations, your profile has been approved`,
            `Dear ${coachData.playerName},

            Congratulations! Your profile has been approved by JKTC. Below are your enrollment details:

            Tracking Number: ${coachData.regNo}
            Enrollment Number/Roll Number: ${CoachEnrollmentDetails.enrollmentNumber}
            Date of Expiry: 2022-12-31
            Name: ${coachData.playerName}

            Please find your Coach License attached below.

            For any future correspondence, please use this email and the mobile number provided during registration.

            Email: ${process.env.ADMIN_EMAIL}
            Mobile: ${process.env.ADMIN_MOBILE}

            Thank you for registering with JKTC.

            Best regards,
            JKTC Team`,
            `<p>Dear ${coachData.playerName},</p>
            <p>Congratulations! Your profile has been approved by JKTC. Below are your enrollment details:</p>
            <table>
            <tr>
                <td><strong>Tracking Number:</strong></td>
                <td>${coachData.regNo}</td>
            </tr>
            <tr>
                <td><strong>Enrollment Number/Roll Number:</strong></td>
                <td>${CoachEnrollmentDetails.enrollmentNumber}</td>
            </tr>
            <tr>
                <td><strong>Date of Expiry:</strong></td>
                <td>2022-12-31</td>
            </tr>
            <tr>
                <td><strong>Name:</strong></td>
                <td>${coachData.playerName}</td>
            </tr>
            </table>
            <p>Please find your Coach License attached below.</p>
            <p>For any future correspondence, please use this email and the mobile number provided during registration.</p>
            <p><strong>Email:</strong> ${coachData.email}</p>
            <p><strong>Mobile:</strong> ${coachData.mobile}</p>
            <p>Thank you for registering with JKTC.</p>
            <p>Best regards,<br>JKTC Team</p>`,
            `${coachData.regNo}-identity-card.pdf`,
            `./${coachData.regNo}-identity-card.pdf`
        );

        await deleteFiles(coachData.regNo);

        if (!coach) {
            return res.status(404).json({ message: "Coach not found" });
        }

        res.status(200).json({
            message: "Coach approved successfully.",
            coach,
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

const markStatusRejected = async (req, res) => {
    const regNo = req.params.regNo;

    console.log("RegNo:", regNo);

    const coachData = await Coach.findOne({ regNo });

    if (!coachData) {
        return res.status(404).json({ message: "Coach not found" });
    }

    await sendWithAttachment(
        coachData.email,
        `${coachData.regNo} - Your profile has been rejected`,
        `Dear ${coachData.playerName},

        We regret to inform you that your profile has been rejected by JKTC. Below are the details:

        Tracking Number: ${coachData.regNo}
        Name: ${coachData.playerName}
        Reason: Rejected by the admin, please contact the admin for more details.

        For any queries, please contact us at

        Email: ${process.env.ADMIN_EMAIL}
        Mobile: ${process.env.ADMIN_MOBILE}

        Thank you for registering with JKTC.
        `
    );

    const coach = await Coach.findOneAndUpdate(
        { regNo },
        { $set: { status: "rejected" } },
        { new: true }
    );

    if (!coach) {
        return res.status(404).json({ message: "Coach not found" });
    }

    res.status(200).json({
        message: "Coach rejected successfully.",
        coach,
    });
};

const getCoachDetails = async (req, res) => {
    try {
        const regNo = req.params.regNo;

        const coach = await Coach.findOne({ regNo });

        if (!coach) {
            return res.status(404).json({ message: "Coach not found" });
        }

        res.json(coach);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

const updateCoach = async (req, res) => {
    try {
        const regNo = req.params.regNo;

        const updateFields = {
            playerName: req.body.playerName,
            fatherName: req.body.fatherName,
            motherName: req.body.motherName,
            dob: req.body.dob,
            gender: req.body.gender,
            district: req.body.district,
            mob: req.body.mob,
            email: req.body.email,
            adharNumber: req.body.adharNumber,
            address: req.body.address,
            pin: req.body.pin,
            panNumber: req.body.panNumber,
            status: req.body.status,
        };

        const coach = await Coach.findOneAndUpdate(
            { regNo },
            { $set: updateFields },
            { new: true }
        );

        if (!coach) {
            return res.status(404).json({ message: "Coach not found" });
        }

        res.json({
            message: "Coach updated successfully.",
            coach,
            status: 200,
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

export {
    listCoaches,
    pendingCoaches,
    pendingCoachesCount,
    allCoachesCount,
    markStatusApproved,
    markStatusRejected,
    getCoachDetails,
    updateCoach,
};
