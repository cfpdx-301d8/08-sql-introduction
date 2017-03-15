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
  // DONE NOTE: When server.js is run, it calls this method. This route intercepts HTTP requests to the top level domain ('/') and then invokes an anonymous callback function which takes two arguments: the request (the HTTP request) and the response. We make use of the response argument by using the .sendFile method which transfers the file at path: index.html. Because the first argument is a relative path, the second argument specifies the root directory. Once index.html is served up, the code is evaluated and the script at the bottom runs. Article.fetchAll is called with the argument articleView.initIndexPage. Article.fetchAll calls the GET route to /articles which then retrieves the SQL data (articles) from the database. That data is then passed in as an argument to articleView.initIndexPage, which inserts each templated article into the index page's HTML and runs the initializing methods like the filters, click handler, etc.
  response.sendFile('index.html', {root: '.'});
});

app.get('/new', function(request, response) {
  // DONE NOTE: This is intercepting HTTP requests to /new and invokes an anonymous function which returns new.html similar to how index.html was served up above.
  response.sendFile('new.html', {root: '.'});
});


// REVIEW: Routes for making API calls to use CRUD Operations on our database
app.get('/articles', function(request, response) {
  // DONE NOTE: This queries the articles table and has it return everything. If successful, it calls an anonymous function which takes the returned data as an argument. It then sends back just the relevant rows of the table (not the column header). If there is an error and the promise is broken/data isn't returned, it logs the error object (err)
  client.query('SELECT * FROM articles')
  .then(function(result) {
    response.send(result.rows);
  })
  .catch(function(err) {
    console.error(err)
  })
});

app.post('/articles', function(request, response) {
  // DONE NOTE: This POST route is called by Article.insertRecord() (presumably upon submission of the form on new.html). It takes the body of the request and uses it to populate a new entry in the database using SQL. The reason the values aren't passed directly into the VALUES list is to prevent SQL injection. This way, they map to the array that is the second argument of client.query. If that operation is successful, it will return the response 'insert complete'.
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
  // DONE NOTE: This route is called by Article.prototype.updateRecord, which updates the specified row in the articles table using protection against SQL injection as before. If successful, it returns the message 'update complete'. Otherwise, it logs the error object to the console.
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
  // DONE NOTE: This route is called by Article.prototype.deleteRecord. It passes an ID referencing the specific article to be deleted (request.params.id). Again, protection against SQL injection is used. If successful, it returns 'Delete complete'. Otherwise, it logs the error object.
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
  // NOTE: This route is called by Article.truncateTable. It deletes the entire articles table, and if successful, returns the response 'Delete complete'.
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

// NOTE: This calls the loadDB function, defined on line 163 below. 
loadDB();

app.listen(PORT, function() {
  console.log(`Server started on port ${PORT}!`);
});


//////// ** DATABASE LOADER ** ////////
////////////////////////////////////////
function loadArticles() {
  // NOTE: This function begins by querying the articles table and having it return its number of rows. If there are rows, nothing happens. If there are no rows, it goes into the filesystem using the FS module (that was required at the top of this file) and writes each article into the articles table. 
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
  // NOTE: This creates the SQL table if one does not already exist. It specifies the column headers (table schema) and constraints for each column header's type and length. If the table is successfully created, it will then run loadArticles() to populate the table.
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
