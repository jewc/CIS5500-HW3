const { Pool, types } = require('pg');
const config = require('./config.json')

// Override the default parsing for BIGINT (PostgreSQL type ID 20)
types.setTypeParser(20, val => parseInt(val, 10)); //DO NOT DELETE THIS

// Create PostgreSQL connection using database credentials provided in config.json
// Do not edit. If the connection fails, make sure to check that config.json is filled out correctly
const connection = new Pool({
  host: config.rds_host,
  user: config.rds_user,
  password: config.rds_password,
  port: config.rds_port,
  database: config.rds_db,
  ssl: {
    rejectUnauthorized: false,
  },
});
connection.connect((err) => err && console.log(err));

/******************
 * WARM UP ROUTES *
 ******************/

// Route 1: GET /author/:type
const author = async function (req, res) {
  // TODO (TASK 1): replace the values of name and pennkey with your own
  const name = 'James Chin';
  const pennkey = 'jamesewc';

  // checks the value of type in the request parameters
  // note that parameters are required and are specified in server.js in the endpoint by a colon (e.g. /author/:type)
  if (req.params.type === 'name') {
    // res.json returns data back to the requester via an HTTP response
    res.json({ data: name });
  } else if (req.params.type === 'pennkey') {
    // TODO (TASK 2): edit the else if condition to check if the request parameter is 'pennkey' and if so, send back a JSON response with the pennkey
    res.json({ data: pennkey });
  } else {
    res.status(400).json({});
  }
}

// Route 2: GET /random
const random = async function (req, res) {
  // you can use a ternary operator to check the value of request query values
  // which can be particularly useful for setting the default value of queries
  // note if users do not provide a value for the query it will be undefined, which is falsey
  const explicit = req.query.explicit === 'true' ? 1 : 0;

  // Here is a complete example of how to query the database in JavaScript.
  // Only a small change (unrelated to querying) is required for TASK 3 in this route.
  connection.query(`
    SELECT *
    FROM Songs
    WHERE explicit <= ${explicit}
    ORDER BY RANDOM()
    LIMIT 1
  `, (err, data) => {
    if (err) {
      // If there is an error for some reason, print the error message and
      // return an empty object instead
      console.log(err);
      // Be cognizant of the fact we return an empty object {}. For future routes, depending on the
      // return type you may need to return an empty array [] instead.
      res.json({});
    } else {
      // Here, we return results of the query as an object, keeping only relevant data
      // being song_id and title which you will add. In this case, there is only one song
      // so we just directly access the first element of the query results array (data.rows[0])
      // TODO (TASK 3): also return the song title in the response
      res.json({
        song_id: data.rows[0].song_id,
        title: data.rows[0].title,
      });
    }
  });
}

/********************************
 * BASIC SONG/ALBUM INFO ROUTES *
 ********************************/

// Route 3: GET /song/:song_id
const song = async function (req, res) {
  // TODO (TASK 4): implement a route that given a song_id, returns all information about the song
  // Hint: unlike route 2, you can directly SELECT * and just return data.rows[0]
  // Most of the code is already written for you, you just need to fill in the query
  const songId = req.params.song_id;

  // WHERE song_id = $1 is a parameterized query, 
  // which is a best practice to prevent SQL injection
  // [songId] array contains values that will replace $1 in the query
  connection.query(`
    SELECT *
    FROM Songs
    WHERE song_id = $1
    `, [songId], (err, data) => {
    if (err) {
      console.log(err);
      res.json({});
    } else {
      res.json(data.rows[0]);
    }
  });
}

// Route 4: GET /album/:album_id
const album = async function (req, res) {
  // TODO (TASK 5): implement a route that given a album_id, returns all information about the album
  const albumId = req.params.album_id;
  connection.query(`
    SELECT *
    FROM Albums 
    WHERE album_id = $1
    `, [albumId], (err, data) => {
    if (err) {
      console.log('Error fetching the album!', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      // If album exists, return the alboum 
      // res.json(data.rows[0] || {});
      res.json(data.rows.length > 0 ? data.rows[0] : {});
    }
    // res.json({}); // replace this with your implementation
  });
}

// Route 5: GET /albums
const albums = async function (req, res) {
  // TODO (TASK 6): implement a route that returns all albums 
  // ordered by release date (descending)
  // Note that in this case you will need to return 
  // multiple albums, so you will need to return an array of objects
  connection.query(`
    SELECT album_id, title, release_date, thumbnail_url
    FROM Albums
    ORDER BY release_date DESC`, (err, data) => {
    if (err) {
      console.log('Error fetching the album!', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(data.rows); // ensure return an array of objects, instead of single object
    }
  }
  );
}

// Route 6: GET /album_songs/:album_id
const album_songs = async function (req, res) {
  const albumId = req.params.album_id;
  // TODO (TASK 7): implement a route that given an album_id, returns all songs on that album ordered by track number (ascending)
  //res.json([]); // replace this with your implementation
  // ? Is this the correct schema?
  connection.query(`
    SELECT song_id, title, number, duration, plays
    FROM Songs 
    WHERE album_id = $1
    ORDER BY number ASC
    `, [albumId], (err, data) => {
    if (err) {
      console.log('Error fetching the album!', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(data.rows); // ensure return an array of objects, instead of single object
    }
  });
}

/************************
 * ADVANCED INFO ROUTES *
 ************************/
// Route 7: GET /top_songs
const top_songs = async function (req, res) {
  const page = req.query.page ? parseInt(req.query.page) : null;
  // TODO (TASK 8): use the ternary (or nullish) operator 
  // to set the pageSize based on the query or default to 10
  //const pageSize = undefined;
  const pageSize = req.query.page_size ? parseInt(req.query.page_size) : 10;
  // The parseInt() function parses a string argument and returns an integer of the specified radix (the base in mathematical numeral systems).

  if (!page) {
    // TODO (TASK 9)): query the database and return all songs ordered by number of plays (descending)
    // Hint: you will need to use a JOIN to get the album title as well
    // Hint: you will need to use LIMIT to get the first pageSize songs
    connection.query(`
      SELECT s.song_id, s.title AS title, s.album_id, a.title AS album, s.plays
      FROM Songs s
      JOIN Albums a ON s.album_id = a.album_id
      ORDER BY s.plays DESC
      `, (err, data) => {
      if (err) {
        console.log('Error fetching the album!', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(data.rows); // ensure return an array of objects
      }
    });
  } else {
    // TODO (TASK 10): reimplement TASK 9 with pagination
    // Hint: use LIMIT and OFFSET (see https://www.w3schools.com/php/php_mysql_select_limit.asp)
    const offset = (page - 1) * pageSize;

    connection.query(`
      SELECT s.song_id, s.title AS title, s.album_id, a.title AS album, s.plays
      FROM Songs s
      JOIN Albums a ON s.album_id = a.album_id
      ORDER BY s.plays DESC
      LIMIT $1 OFFSET $2
      `, [pageSize, offset], (err, data) => {    // offset calculation
      if (err) {
        console.log('Error fetching the album!', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(data.rows); 
      }
    });
  }
}

// Route 8: GET /top_albums
const top_albums = async function (req, res) {
  // TODO (TASK 11): return the top albums ordered by aggregate number of plays of all songs on the album (descending), with optional pagination (as in route 7)
  // Hint: you will need to use a JOIN and aggregation to get the total plays of songs in an album
  const page = req.query.page ? parseInt(req.query.page) : null;
  const pageSize = req.query.page_size ? parseInt(req.query.page_size) : 10;

  if (!page) {
    connection.query(`
      SELECT a.album_id, a.title, SUM(s.plays) AS plays
      FROM Albums a
      JOIN Songs s ON a.album_id = s.album_id
      GROUP BY a.album_id, a. title
      ORDER BY plays DESC
      `, (err, data) => {
      if (err) {
        console.log('Error fetching the album!', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(data.rows);
      }
    });
  }
  else {
    const offset = (page - 1) * pageSize;
    connection.query(`
        SELECT a.album_id, a.title, SUM(s.plays) AS plays
        FROM Albums a
        JOIN Songs s ON a.album_id = s.album_id
        GROUP BY a.album_id, a. title
        ORDER BY plays DESC
        LIMIT $1 OFFSET $2
        `, [pageSize, offset], (err, data) => {    // offset calculation
      if (err) {
        console.log('Error fetching the album!', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(data.rows); // return empty array if no data
      }
    }
    );
  }
}

// Route 9: GET /search_songs
const search_songs = async function (req, res) {
  // TODO (TASK 12): return all songs that match the given 
  // search query with parameters defaulted to those specified 
  // in API spec ordered by title (ascending)
  // Some default parameters have been provided for you, 
  // but you will need to fill in the rest
  const title = req.query.title ? `%${req.query.title}%` : '%';
  const durationLow = req.query.duration_low ?? 60;
  const durationHigh = req.query.duration_high ?? 660;
  const playsLow = req.query.plays_low ? parseInt(req.query.plays_low) : 0;
  const playsHigh = req.query.plays_high ? parseInt(req.query.plays_high) : 1100000000;
  const danceabilityLow = req.query.danceability_low ? parseFloat(req.query.danceability_low) : 0;
  const danceabilityHigh = req.query.danceability_high ? parseFloat(req.query.danceability_high) : 1;
  const energyLow = req.query.energy_low ? parseFloat(req.query.energy_low) : 0;
  const energyHigh = req.query.energy_high ? parseFloat(req.query.energy_high) : 1;
  const valenceLow = req.query.valence_low ? parseFloat(req.query.valence_low) : 0;
  const valenceHigh = req.query.valence_high ? parseFloat(req.query.valence_high) : 1;
  const explicit = req.query.explicit === 'true' ? 'true' : 'false'; // convert to string for SQL query

  connection.query(`
    SELECT song_id, album_id, title, number, duration, plays, 
       danceability, energy, valence, tempo, key_mode, explicit
    FROM Songs
    WHERE title LIKE $1
      AND duration BETWEEN $2 AND $3
      AND plays BETWEEN $4 AND $5
      AND danceability BETWEEN $6 AND $7
      AND energy BETWEEN $8 AND $9
      AND valence BETWEEN $10 AND $11
      AND ($12 = 'true' OR explicit = 0) -- Include all songs if explicit=true, otherwise exclude explicit songs
    ORDER BY title ASC;
    `, [title, durationLow, durationHigh, playsLow, playsHigh, danceabilityLow, danceabilityHigh, energyLow, energyHigh, valenceLow, valenceHigh, explicit],
    (err, data) => {
      if (err) {
        console.log('Error fetching the album!', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(data.rows);
      }
    }
  );
}

module.exports = {
  author,
  random,
  song,
  album,
  albums,
  album_songs,
  top_songs,
  top_albums,
  search_songs,
}
