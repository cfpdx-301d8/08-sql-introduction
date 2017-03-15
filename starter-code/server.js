'use strict';

// TODO: Install and require the node postgres package into your server.js, and ensure that it's now a new dependency in your package.json
const pg = require('pg');
const fs = require('fs');
const express = require('express');

// REVIEW: Require in body-parser for post requests in our server
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;
const app = express();

// TODO: Complete the connection string for the url that will connect to your local postgres database
// Windows and Linux users; You should have retained the user/pw from the pre-work for this course.
// Your url may require that it's composed of additional information including user and password
// const conString = 'postgres://USER:PASSWORD@HOST:PORT/DBNAME';
const conString = 'postgres://localhost:5432';

// REVIEW: Pass the conString to pg, which creates a new client object
const client = new pg.Client(conString);

// REVIEW: Use the client object to connect to our DB.
client.connect();


// REVIEW: Install the middleware plugins so that our app is aware and can use the body-parser module
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('./public'));


// REVIEW: Routes for requesting HTML resources
app.get('/', function(request, response) {
  // NOTE: Sending back the file index.html as a response to any GET requests when no path is specified in the request.
  response.sendFile('index.html', {root: '.'});
});

app.get('/new', function(request, response) {
  // NOTE: Sending back the file new.html when the request to the server has the path /new.
  response.sendFile('new.html', {root: '.'});
});


// REVIEW: Routes for making API calls to use CRUD Operations on our database
app.get('/articles', function(request, response) {
  // NOTE: app.get is listening for a post request at /articles which is configured in the prototype method/function starting on line 35 of article.js. This queries the Postgres database using the built in .query method which takes SQL syntax as a string. We are selecting all fields and records from the table named "article". We are then declaring a success callback function (.then) that is a primary method on promises that sends the result of our database query as a response. If there is an error, then we enter the .catch function/method on promises that consoles (err).
  client.query('SELECT * FROM articles')
  .then(function(result) {
    response.send(result.rows);
  })
  .catch(function(err) {
    console.error(err)
  })
});

app.post('/articles', function(request, response) {
  // NOTE: app.post is listening for a post request at /articles which is configured in the prototype method/function starting on line 58 of article.js. It is then using the .query method on the client to insert a series of new fields and connected records using SQL as a string. The values passed in are connected to an array which is the second argument of the query function that populates the records with the data (title, author, ect) that were entered into the corresponding form inputs that a user used on the web app to create a new article. Finally, there is a .then method/function that is sending back a response containing a string that will run when the post request is successful, or the .catch function will run if there was an error.
  client.query(
    `INSERT INTO
    articles(title, author, "authorUrl", category, "publishedOn", body)
    VALUES ($1, $2, $3, $4, $5, $6);
    `,
    [
      request.body.title,
      request.body.author,
      request.body.authorUrl,
      request.body.category,
      request.body.publishedOn,
      request.body.body
    ]
  )
  .then(function() {
    response.send('insert complete')
  })
  .catch(function(err) {
    console.error(err);
  });
});

app.put('/articles/:id', function(request, response) {
  // NOTE: This is listening for the put request that is configured in the function that starts on line 78 of article.js. When the request comes in, the SQL string that is the first argument of the .query function/method targets the fields and corresponding records in the table in the database and updates them with the body content (entered by the user on the corresponding webapp form inputs) for the field with the correct ID. This essentially replaces the pre-existing content in those fields/records with the new body content that was put in by the user. On success, the .then function runs sending by the string 'update complete', otherwise the .catch function runs.
  client.query(
    `UPDATE articles
    SET
      title=$1, author=$2, "authorUrl"=$3, category=$4, "publishedOn"=$5, body=$6
    WHERE article_id=$7;
    `,
    [
      request.body.title,
      request.body.author,
      request.body.authorUrl,
      request.body.category,
      request.body.publishedOn,
      request.body.body,
      request.params.id
    ]
  )
  .then(function() {
    response.send('update complete')
  })
  .catch(function(err) {
    console.error(err);
  });
});

app.delete('/articles/:id', function(request, response) {
  // NOTE: This is listening for a delete request that is configured in the function that starts on line 67 of article.js. When the request comes in, the SQL string that is the first argument of the .query function/method targets the field with the corresponding ID (based on what was entered in the form input) in the table within the database and deletes it. On success, the string 'delete complete' is sent as a response (the body of the response?), otherwise the .catch runs. 
  client.query(
    `DELETE FROM articles WHERE article_id=$1;`,
    [request.params.id]
  )
  .then(function() {
    response.send('Delete complete')
  })
  .catch(function(err) {
    console.error(err);
  });
});

app.delete('/articles', function(request, response) {
  // NOTE: This is listening for a delete request that is configured in the function that starts on line 48 of article.js. When the request comes in, the SQL string that is the first argument of the .query function/method targets the entire articles table and deletes it. Upon success, the .then function runs and sends back a response with the string 'delete complete', otherwise the .catch function runs.
  client.query(
    'DELETE FROM articles;'
  )
  .then(function() {
    response.send('Delete complete')
  })
  .catch(function(err) {
    console.error(err);
  });
});

// NOTE: This calls the loadDB function that is configured below starting on line 163. This creates the database/table and loads the articles and their data into it before the server is starten with app.listen below.
loadDB();

app.listen(PORT, function() {
  console.log(`Server started on port ${PORT}!`);
});


//////// ** DATABASE LOADER ** ////////
////////////////////////////////////////
function loadArticles() {
  // NOTE:
  client.query('SELECT COUNT(*) FROM articles')
  .then(result => {
    if(!parseInt(result.rows[0].count)) {
      fs.readFile('./public/data/hackerIpsum.json', (err, fd) => {
        JSON.parse(fd.toString()).forEach(ele => {
          client.query(`
            INSERT INTO
            articles(title, author, "authorUrl", category, "publishedOn", body)
            VALUES ($1, $2, $3, $4, $5, $6);
          `,
            [ele.title, ele.author, ele.authorUrl, ele.category, ele.publishedOn, ele.body]
          )
        })
      })
    }
  })
}

function loadDB() {
  // NOTE:
  client.query(`
    CREATE TABLE IF NOT EXISTS articles (
      article_id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      "authorUrl" VARCHAR (255),
      category VARCHAR(20),
      "publishedOn" DATE,
      body TEXT NOT NULL);`
    )
    .then(function() {
      loadArticles();
    })
    .catch(function(err) {
      console.error(err);
    }
  );
}
