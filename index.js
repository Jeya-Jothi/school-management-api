const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_Host,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.get("/",(req,res)=>{
  res.send('School API is running');
});

app.post("/addSchool",async(req,res)=>{
  const { name, address, latitude, longitude } = req.body;

  // Validate input
  if(!name || !address || !latitude || !longitude){
    return res.status(400).json({message: 'All fields are required'});
  }
  try {
    const result = await pool.query(
      'INSERT INTO schools (name, address, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, address, latitude, longitude]
    );
    res.status(201).json({ message: 'School added successfully', school: result.rows[0] });
  } catch (error) {
    console.error('Error adding school:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });  }
});

app.get("/listSchools", async (req, res) => {
  const userLat = parseFloat(req.query.latitude);
  const userLon = parseFloat(req.query.longitude);

  if (!userLat || !userLon) {
    return res.status(400).json({ message: "Latitude and longitude are required." });
  }

  try {
    const result = await pool.query("SELECT * FROM schools");
    const schools = result.rows;
    //console.log(schools);


    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;  // Earth's radius in km
      const toRad = deg => deg * (Math.PI / 180);
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const sortedSchools = schools
      .map(school => ({
        ...school,
        distance: calculateDistance(userLat, userLon, school.latitude, school.longitude)
      }))
      .sort((a, b) => a.distance - b.distance);

    res.json({ schools: sortedSchools });
  } catch (error) {
    console.error("Error listing schools:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
  console.log(`Server is running on port ${PORT}`);
});