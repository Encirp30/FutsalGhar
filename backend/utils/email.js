const nodemailer = require('nodemailer');

// Create transporter - use EITHER service OR host/port, not both
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // e.g., 'gmail' - remove this if using custom host
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Alternative: Use host/port (uncomment if not using service)
// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: process.env.EMAIL_PORT,
//   secure: false, // true for 465, false for other ports
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD
//   }
// });

const sendEmail = async (email, subject, html) => {
  try {
    const mailOptions = {
      from: `"FutsalGhar" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

module.exports = { sendEmail };