const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.DATABASE_URI);
  } catch (err) {
    const mongoExit = 1;
    process.exit(mongoExit);
  }
};

module.exports = connectDB;
