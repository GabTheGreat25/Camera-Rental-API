const allowedOrigins = require("./allowedOrigins");
const { STATUSCODE } = require("../constants/index");

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== STATUSCODE.NEGATIVE_ONE || !origin) {
      callback(null, true);
    } else callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

module.exports = corsOptions;
