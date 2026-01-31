const session = require("express-session");
const { SESSION_SECRET } = require("../config/env");

module.exports = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
});
