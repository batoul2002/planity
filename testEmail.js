require('dotenv').config();
const nodemailer = require('nodemailer');

async function test() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // send to yourself for test
      subject: 'SMTP test',
      text: 'If you got this, SMTP with app password works!'
    });
    console.log('Test email sent successfully');
  } catch (err) {
    console.error('Test email failed:', err);
  }
}

test();