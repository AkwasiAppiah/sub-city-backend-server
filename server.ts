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

const stripe = require('stripe')('sk_test_t6wigvrtkDil4Yn4ru6PSLA700xV7JkjvX')

//Event 


// Return a list of all events from events table in database
app.get("/events", async (req, res) => {
  try {
    const dbres = await client.query("select * from events");
    res.json(dbres.rows);
  } catch (err) {
    console.log(err.message);
  }
});


// Allow frontend to add and insert data into table. 
app.post("/events", async (req, res) => {
  try {
    const organiserName = req.body.organiserName;
    const date_of_event = req.body.eventDate;
    const description = req.body.description;
    const total_cost = req.body.totalCost;
    const num_of_attendees = req.body.attendees

    
    const dbpost = await client.query(
      "insert into events (organiser_name, date_of_event, description, total_cost, num_of_attendees) values($1, $2,$3, $4, $5)",
      [organiserName, date_of_event, description, total_cost, num_of_attendees ]
    );

    // const dbres = await client.query(
    //   "select * from events",
    // );

    const uniqueEventId = await client.query(
      "select * from events WHERE organiser_name = $1 AND date_of_event = $2 AND description = $3 AND total_cost = $4 AND num_of_attendees = $5", 
      [organiserName, date_of_event, description, total_cost, num_of_attendees ]);

    const IdNumber = uniqueEventId.rows[0].event_id

    res.status(200).send(`${IdNumber.toString()}`)
    
  } catch (err) {
    console.log(err.message);
  }
});

//Event Info



// Allow frontend to fetch data about specific event
app.get("/event-info/:event_id", async (req, res) => {
  try {
    const { event_id } = req.params;
    const dbres = await client.query(
      "select * from events WHERE event_id = $1",
      [event_id]
    );
    if(dbres.rows.length === 1){
    res.json(dbres.rows);}
    else{
      res.status(404).send("failed")
    }
  } catch (err) {
    console.log(err.message);
  }
});

// // Allow front event 
// app.post("/event-info/:event_id", async (req, res) => {
//   try {
//     const { event_id } = req.params;
//     const attendee_name = req.body.attendee_name;
//     const paid = req.body.paid
    
//     const dbpost = await client.query(
//       "insert into event_info (attendee_name, paid, event_id) values($1, $2,$3)",
//       [attendee_name,paid,event_id]
//     );

//     const dbres = await client.query(
//       "select attendee_name from event_info WHERE event_id = $1",
//       [event_id]
//     );
//     res.json(dbres.rows);

//   } catch (err) {
//     console.log(err.message);
//   }
// });

// Allow front end to allow attendee to accept assignment and pay.
app.post("/attendee/buy/:event_id", async (req,res) => {

  try{  

    //get event Id from params
    const {event_id} = req.params;

    // get attendee name from params
    const attendee_name = req.body.attendee_name;

    // get cost from
    const cost = req.body.cost
    
    // make payment to stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'BasketQuantity',
            },
            unit_amount: cost,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://buyplayersdirect.netlify.app',
      cancel_url: 'https://en.wikipedia.org/wiki/HTTP_404',
    });
  



  }catch(err){
    console.log(err.message)
  }

})

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw "Missing PORT environment variable.  Set it in .env file.";
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
