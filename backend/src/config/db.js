//library imports//

//monogooes  is odm libreary to connect to mongo db and perform crud operations//
const mongoose = require("mongoose");


//Database se connect hona ek asynchronous process hota hai (yaani isme thoda waqt lagta hai). async ka use isliye kiya gaya hai taaki hum iske andar await ka istemal karke connection poora hone tak wait kar sakein.//
const connectDB = async () => {
  //Error handling ke liye try...catch block ka try section shuru kar raha hai.//
  try {
    //Terminal/Console me "connectDB() called" print kar raha hai.//
    console.log("connectDB() called");
//.env file se MONGO_URI ki value read karke mongoUri variable me store kar raha hai.//
    const mongoUri = process.env.MONGO_URI;
    //Ye confirm karne ke liye ki .env file se MONGO_URI sahi se load ho rahi hai ya undefined aa rahi hai.//
    console.log("URI =", mongoUri);
//mongoose.connect() function ka use karke MongoDB se connection bana raha hai. await yahan connection poora hone tak Execution ko rokta hai.//
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
//Successfully connect hone par database kis host par chal raha hai (jaise localhost ya MongoDB Atlas Cluster address) usko print kar raha hai.//
    console.log("MongoDB Connected:", conn.connection.host);
  } catch (err) { 
    //Error details ko clearly highlight karke terminal par print kar raha hai.//
    console.log("========== FULL ERROR ==========");
    console.error(err);
    console.log("================================");
    //Current Node.js process ko immediately stop (kill) kar deta hai with failure code 1, jo indicate karta hai ki process ek error ke karan terminate hua hai.//
    process.exit(1);
  }
};
//Is connectDB function ko export kar raha hai.//
module.exports = connectDB;