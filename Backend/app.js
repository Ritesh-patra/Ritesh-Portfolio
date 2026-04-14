import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mailRouter from "./routes/mail.router.js";

dotenv.config();

const app = express();
// Enable CORS and JSON body parsing before mounting routes
app.use(cors());
app.use(express.json());

app.use("/api", mailRouter);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});



const PORT = process.env.PORT || 5000;  
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});