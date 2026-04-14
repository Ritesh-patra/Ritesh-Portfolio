import nodemailer from "nodemailer";

export const sendMail = async (req, res) => {
  try {
    console.log("sendMail called");
    console.log("Request body:", req.body);
    const { name, email, message } = req.body;

    // Allow skipping actual SMTP sending in dev/testing
    if (process.env.SKIP_SMTP === "true") {
      console.log("SKIP_SMTP=true, skipping sending emails (dev mode)");
      return res.status(200).json({ success: true, message: "Skipped sending (SKIP_SMTP=true)" });
    }

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        error: "All fields are required",
      });
    }

    // Configure transporter.
    // Priority: SENDGRID_API_KEY (SendGrid SMTP), then explicit SMTP_HOST/PORT, then legacy SMTP_USER+SMTP_PASS with Gmail service.
    let transporterConfig = null;

    if (process.env.SENDGRID_API_KEY) {
      console.log("Using SendGrid via SMTP (smtp.sendgrid.net)");
      transporterConfig = {
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        auth: {
          user: "apikey",
          pass: process.env.SENDGRID_API_KEY,
        },
      };
    } else if (process.env.SMTP_HOST && process.env.SMTP_PASS) {
      console.log("Using custom SMTP host", process.env.SMTP_HOST, "port", process.env.SMTP_PORT || "(default)");
      transporterConfig = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };
    } else {
      console.log("Falling back to Gmail service (legacy). Set SENDGRID_API_KEY or SMTP_HOST for production.");
      transporterConfig = {
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    // Verify transporter/auth early so we return clear errors
    try {
      await transporter.verify();
      console.log("SMTP transporter verified");
    } catch (verifyError) {
      console.error("SMTP transporter verification failed:", verifyError?.message || verifyError);
      return res.status(500).json({ success: false, message: "SMTP auth/connection failed", error: verifyError?.message || String(verifyError) });
    }

    // Admin mail
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.TO_EMAIL,
      subject: "New Contact Message",
      html: `
        <h2>New Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    // User confirmation mail
    const userMail = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Message Received",
      html: `
        <h3>Hello ${name},</h3>
        <p>Thank you for contacting us. We will get back to you soon.</p>
      `,
    };

    await transporter.sendMail(userMail);

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error?.message || "Error sending message",
    });
  }
};