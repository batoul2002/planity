const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or another email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Planity" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};

module.exports = sendEmail;