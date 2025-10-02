import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const FROM = process.env.SMTP_EMAIL_FROM;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    // secure: true, // Use true for SSL
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});

const sendMail = (to, subject, text, html, attachments, from = FROM) => {
    const mailOptions = {
        from,
        to,
        subject,
        text,
        html,
        attachments, // Add attachments here
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                reject(error);
            } else {
                console.log("Message sent:", info.messageId);
                resolve(info);
            }
        });
    });
};

const sendWithAttachment = async (to, subject, text, html, filename, path) => {
    try {
        const attachment = [
            {
                filename: filename,
                path: path,
            },
        ];

        await sendMail(to, subject, text, html, attachment);
        console.log("Email sent successfully with attachment!");
    } catch (error) {
        console.error("Failed to send email with attachment:", error);
    }
};

export { sendMail, sendWithAttachment };
