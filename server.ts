import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false };
const sslSetting = process.env.LOCAL
  ? { rejectUnauthorized: false }
  : herokuSSLSetting;
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

app.get("/events", async (req, res) => {
  try {
    const dbres = await client.query("select * from events");
    res.json(dbres.rows);
  } catch (err) {
    console.log(err.message);
  }
});

app.get("/event-info/:event_id", async (req, res) => {
  try {
    const { event_id } = req.params;
    const dbres = await client.query(
      "select attendee_name from event_info WHERE event_id = $1",
      [event_id]
    );
    res.json(dbres.rows);
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/event-info/:event_id", async (req, res) => {
  try {
    const { event_id } = req.params;
    const attendee_name = req.body.attendee_name;
    const paid = req.body.paid
    
    const dbpost = await client.query(
      "insert into event_info (attendee_name, paid, event_id) values($1, $2,$3)",
      [attendee_name,paid,event_id]
    );

    const dbres = await client.query(
      "select attendee_name from event_info WHERE event_id = $1",
      [event_id]
    );
    res.json(dbres.rows);
    
  } catch (err) {
    console.log(err.message);
  }
});

// app.get("/event test", async(req,res) => {
//   const dbres = await client.query('select * from event_info');
//   res.json(dbres.rows);
// })

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw "Missing PORT environment variable.  Set it in .env file.";
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
