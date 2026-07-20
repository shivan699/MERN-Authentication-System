const nodemailer = require("nodemailer");
const dns = require("dns");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,

  dnsLookup(hostname, options, callback) {
    return dns.lookup(hostname, { family: 4 }, callback);
  },
});