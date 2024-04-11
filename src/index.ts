import express from 'express';
import cors from 'cors';
import RedisServer from 'redis-server';
import { createClient } from 'redis';

const app = express();
const port = 5001;

const REDIS_PORT = 6378;

// Create and start Redis server
const server = new RedisServer(REDIS_PORT);
server.open(async (err) => {
  if (err) {
    console.error('Failed to start local Redis server:', err);
    return;
  }

  console.log('Local Redis server started for development on port', REDIS_PORT);

  // Create Redis client
  const client = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();
  console.log('Connected to Redis server');

  // Configure Express server
  app.use(cors());

  app.get('/favicon.ico', (req, res) => {
    res.status(204);
  })

  app.get('/robots.txt', (req, res) => {
    res.send('User-agent: *\nDisallow: /');
  }
  );

  app.get('/requests', async (req, res) => {
    try {

      // Get last 10 requests from Redis
      const requests = await client.lRange('requests', -10, -1);

      res.json(requests.reverse());
    } catch (error) {
      console.error('Error getting requests from Redis:', error);
    }
  });

  app.get('/ping', (req, res) => {
    res.send('Pong');
  });

  // wildcard route 
  app.get('*', async (req, res) => {
    // Save incoming request uri and timestamp to Redis

    try {


      const uri = req.url;
      const body = req.body;

      const timestamp = new Date()
        // GMT +8 timezone
        .toLocaleString('en-US', { timeZone: 'Asia/Singapore' })

      const result = await client.rPush('requests', `${timestamp} - ${req.method} - ${uri} - ${JSON.stringify(body)}`);

      res.send(`Saved request to: ${result} at ${timestamp}`);
    } catch (error) {
      console.error('Error saving request to Redis:', error);
      return res.status(500).send('Internal Server Error');
    }

  });


  // Start Express server
  app.listen(port, () => {
    console.log(`Express server is running on port ${port}`);
  });
});