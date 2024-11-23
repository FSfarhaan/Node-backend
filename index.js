require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Use bcryptjs instead of bcrypt for compatibility
const jwt = require('jsonwebtoken');
const MONGO_URI = "mongodb+srv://farhaan8d:m8fs2f7s6@cluster0.tl8lett.mongodb.net/AquaDB?retryWrites=true&w=majority&appName=Cluster0"

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to MongoDB
mongoose
    .connect(MONGO_URI)
    .then(() => console.log("Connected to MongoDB Successfully"))
    .catch((err) => console.error("Error: ", err));

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

const FishLogSchema = new mongoose.Schema({
    status: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    fishName: { type: String, required: true },
    fishWeight: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    image: { type: String, required: true }
});
  
const FishLog = mongoose.model("FishLog", FishLogSchema);

// Updated function signature for the signup route
app.post('/signup', async (req, res) => { // Fixed the order of parameters
    const { name, email, password } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email }); // Added await to findOne
        if (user) {
            return res.status(400).json({ msg: "User already exists" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10); // Added await here
        const hashedPassword = await bcrypt.hash(password, salt); // Added await here

        user = new User({ name, email, password: hashedPassword });
        await user.save();

        // Generate JWT
        const payload = { userId: user._id };
        const token = jwt.sign(payload, "farhaanshaikh");

        res.status(201).json({ token });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Generate JWT
        const payload = { userId: user._id };
        const token = jwt.sign(payload, "farhaanshaikh");

        res.status(200).json({ token });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post("/uploadToRemote", async (req, res) => {
    try {
      const { status, title, desc, fishName, fishWeight, date, location, latitude, longitude, image } = req.body;
  
      if (!status || !title || !desc || !fishName || !date || !location || !latitude || !longitude || !fishWeight || !image) {
        return res.status(400).send({ message: "Please provide necessary details" });
      }
  
      const imageBase64 = Buffer.from(image).toString('base64');
  
      const newFishLog = new FishLog({
        status,
        title,
        desc,
        fishName,
        fishWeight,
        date: new Date(date),
        location,
        latitude,
        longitude,
        image: imageBase64
      });
  
      await newFishLog.save();
  
      res.status(200).send({ message: "FishLog saved successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Internal server error hua hai kahi to" });
    }
});
  


// Auth Middleware to verify token
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, "farhaanshaikh");
        req.user = decoded.userId; // Fixed the decoded object
        next();
    } catch (error) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Example Protected Route
app.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user).select('-password'); // Exclude password from response
        res.json(user);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on Port ${PORT}`);
});
