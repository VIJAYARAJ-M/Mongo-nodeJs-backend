const express = require('express')
const PDFParser = require('pdf-parse');
const request = require('request');
const app = express();
const bodyParser = require('body-parser');
const client = require("./Database.js")

const cors = require('cors');
const crypto = require('crypto');
const multer = require('multer');
const upload = multer();

const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');


const port = 4000;

//app.use(bodyParser.json({limit: '50mb'}));
//app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


app.use(express.json());
app.use(cors());
//app.use(bodyParser.json());


const allowedOrigins = ['http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not ' + 'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "vijayarajm.2016@gmail.com",
    pass: "jacsi123",
  },
});

app.get('/report', (req, res) => {
  const url = 'http://localhost:8080/pentaho/api/repos/%3Apublic%3AMango%3AActivity%20Codes_demo.prpt/report';
  const params = {
    "CompanyID": "1"
  };

  request.get({
    url: url,
    qs: params,
    encoding: null,
    headers: {
      'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64'),
      'Content-Type': 'application/pdf'
    },
  }, (error, response, body) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error getting report');
    } else {
      res.set('Content-Type', 'application/pdf');
      res.send(body);
      console.log("d", body
      );
    }
  });
});

app.post('/reports', (req, res) => {
  
  const date1 = new Date(req.body.fromDate);
  const date2 = new Date(req.body.toDate);
  
  console.log('Date 1:', date1);
  console.log('Date 2:', date2);

  const url = 'http://localhost:8080/pentaho/api/repos/%3Apublic%3AMango%3ABillingWorksheet4.prpt/report';

  

  const params = {
    "CompanyID": "1",
    "FromDate": date1,
    "ToDate": date2,

  };

  request.get({
    url: url,
    qs: params,
    encoding: null,
    headers: {
      'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64'),
      'Content-Type': 'application/pdf'
    },
  }, (error, response, body) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error getting report');
    }
    else {



      //const rows = JSON.parse(response.headers['x-pentaho-numberofrows']);

      console.log("Data", response.headers);
      console.log("Body", body);



      const pageCount = body.toString().match(/\/Count\s+(\d+)/)[1];
      console.log(`Report contains ${pageCount} rows.`);


      // const rowCountHeader = response.headers['content-type'];
      // const rowCount = rowCountHeader ? rowCountHeader.split('/')[1] : 'unknown';
      // console.log(`Row count: ${rowCount}`);


      // const rowsHeader = response.headers['x-pentaho-numberofrows'];
      // const rows = rowsHeader ? JSON.parse(rowsHeader) : null;
      // console.log("Row", rows);
      console.log("TOF", pageCount <= 1, pageCount);

      if (pageCount <= 1) {
        console.log("If is running");
        res.set('Content-Type', 'application/pdf');
        res.send(body);
        console.log("body");

      } else {
        console.log("else is running");
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com', // replace with SMTP server hostname
          port: 587, // replace with SMTP server port
          secure: false, // true for 465, false for other ports
          auth: {
            user: 'vijayarajm.2016@gmail.com', // replace with your email
            pass: 'cffdkousqyzdadkl' // replace with your password
          }
        });

        const mailOptions = {
          from: 'vijayarajm.2016@gmail.com',
          to: '7401546493@gmail.com',
          subject: 'Pentaho Report PDF',
          attachments: [
            {
              filename: 'report.pdf',
              content: body,
              contentType: 'application/pdf'
            }
          ]
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
            //res.status(400).send({ error: 'Email send error'});
          } else {
            console.log('Email sent: ' + info.response);
            console.log("Email send successfully");
            // res.send({ message: 'Email send successfully' });

            res.status(200).json({ message: 'Email send successfully' });
          }
        });

      }

    }


  });
});




app.get('/users', (req, res) => {
  client.query(`Select * from user_details`, (err, result) => {
    if (!err) {
      res.send(result.rows);
    } else {
      console.log(err.message);
    }

  });
  client.end;
})




app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const data = await client.query(`SELECT * FROM user_details WHERE email= $1;`, [email]); //Checking if user already exists
    const arr = data.rows;

    if (arr.length != 0) {
      return res.status(400).json({
        error: "Email already there, No need to register again.",
      });
    }
    else {
      bcrypt.hash(password, 10, (err, hash) => {
        if (err)
          res.status(err).json({
            error: "Server error",
          });

        const user = {
          username,
          email,
          password: hash,
        };
        var flag = 1; //Declaring a flag

        //Inserting data into the database

        client
          .query(`INSERT INTO user_details (username, email, password) VALUES ($1,$2,$3);`, [user.username, user.email, user.password], (err) => {

            if (err) {
              flag = 0; //If user is not inserted is not inserted to database assigning flag as 0/false.
              console.error(err);
              return res.status(500).json({
                error: "Database error"
              })
            }
            else {
              flag = 1;
              res.status(200).send({ message: 'User added to database, not verified' });
            }
          })
        // if (flag) {
        //   const token = jwt.sign( //Signing a jwt token
        //     {
        //       email: user.email
        //     },
        //     process.env.SECRET_KEY
        //   );
        // };
      });
    }
  }
  catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Database error while registring user!", //Database connection error
    });
  };
})



// app.post('/send-email', async (req, res) => {

//   const { to, subject, text} = req.body;

//   console.log("object",req.body);

//   let transporter = nodemailer.createTransport({
//     host: 'smtp.gmail.com',
//     port: 465,
//     secure: true,
//     auth: {
//       user: 'vijayarajm.2016@gmail.com',
//       pass: 'jacsi123'
//     }
//   });

//   let info = await transporter.sendMail({
//     from: 'vijayarajm.2016@gmail.com',
//     to: to,
//     subject: subject,
//     text: text,
//     attachments: [
//       {
//         filename: 'Vijayaraj.pdf',
//         path: '/path/to/Vijayaraj.pdf'
//       }
//     ]
//   });
//   console.log(`Message sent: ${info.messageId}`);
//   res.send('Email sent successfully!');
// });





app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

client.connect();