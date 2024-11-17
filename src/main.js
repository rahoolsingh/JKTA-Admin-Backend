import app from "./app.js";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const PORT = process.env.PORT || 5000;

mongoose
    .connect(`${process.env.MONGO_URI}/${process.env.DB_NAME}`)
    .then(() => {
        console.log("Connected to MongoDB");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error(`Error connecting to MongoDB: ${err}`);
    });
