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
  // DONE NOTE: We're getting our index.html file, and sending the file back to the client, as our root file (/). This is something happening within node, not SQL or postgres.
  response.sendFile('index.html', {root: '.'});
});

app.get('/new', function(request, response) {
  // DONE NOTE: We're getting our new.html file, and sending the file back to the client with the address '/new'. This is something happening within node, not SQL or postgres.
  response.sendFile('new.html', {root: '.'});
});


// REVIEW: Routes for making API calls to use CRUD Operations on our database
app.get('/articles', function(request, response) {
  // DONE NOTE: We're taking a call from .fetchAll() (article.js, line 35). In the query, we're selecting everything in the table articles. We're then sending all of the table information back to .fetchAll, where we will populate our 'articles' element.
  //We have a promise here, with a .catch() for a possible error.
  client.query('SELECT * FROM articles')
  .then(function(result) {
    response.send(result.rows);
  })
  .catch(function(err) {
    console.error(err)
  })
});

app.post('/articles', function(request, response) {
  // DONE NOTE: Taking a call from .insertRecord (article.js, line 60). We are using SQL to insert into our table (articles) the records with values for fields title, author, authorURL, category, publishedOn and body, and finding the values in the specific records for those fields.
  //It looks like this is specifically to CREATE/insert a new record.
  //Why is this function on the prototype,and other functions such as fetchAll() or truncateTable() are not?
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
  // DONE NOTE: This call is coming from .updateRecord() (article.js, line 78). We are making an UPDATE query to let me database know to update the table and add additional records and records values.
  //Is this updating the database or our client-side table? It's updating our database, because the .updateRecord function is using a 'PUT' method, and UPDATE is a function to update the database, not the client-side item reading and pulling from it.
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
  // DONE NOTE: This call is coming from .deleteRecord() (article.js, line 67). We're finding an article by Id, and deleting it if it matches that Id. If the deletion is successful, we return a response to the console or terminal, "Delete complete". If it is a failure, we'll throw an error with our .catch() function.
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
  // DONE NOTE: This is related to .truncateTable() (article.js, line 48). Different from .deleteRecord() and our above .delete request, this will actually delete our database table 'articles'. Like before, if the deletion is successful, we return a response to the console or terminal, "Delete complete". If it is a failure, we'll throw an error with our .catch() function.
  // Is this deleting the entire table, or just the records and values within the table? It is deletign the values within the table; it says DELETE FROM rather than simply DELETE.
  //This will delete everything; we'll usually use a WHERE to be more specific about what's being deleted.
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

// DONE NOTE: We're calling our function below (line 170)to create our database and populate it with the values from 'hackerIpsum.json' (which we do by calling the function loadArticles() within loadDB().)
loadDB();

app.listen(PORT, function() {
  console.log(`Server started on port ${PORT}!`);
});


//////// ** DATABASE LOADER ** ////////
////////////////////////////////////////
function loadArticles() {
  // DONE NOTE: We're selecting everything from the table and returning the number of records within the table to the client. 
  // If there is nothing in the table, we're reading the file 'hackerIpsum.js', parsing the JSON information to a string and populating the table with into new fields and records, with values going into each record. We're then sending those back to our client to be displayed on screen.
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
  // DONE NOTE: If a table doesn't exist, we are creating an entirely new table and setting the types for each field. We're then running the loadArticles() function (above) to populate the records and values for our newly created table. We have a .catch() function to throw an error, should something not go right.
  // We're using a template string for our client query.
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
