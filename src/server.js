const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const PORT = process.env.PORT || 8000;
const { loadPlanetsData } = require('./models/planets.model');
const { loadLaunchesData } = require('./models/launches.model');
const { mongoConnect } = require('./services/mongo');

const server = http.createServer(app);

mongoose.connection.once('open', () => {
  // eslint-disable-next-line no-console
  console.log('MongoDB connection ready!');
});

mongoose.connection.once('error', (err) => {
  console.error(err);
});

const startServer = async () => {
  await mongoConnect();
  await loadPlanetsData();
  await loadLaunchesData();

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Listening on port ${PORT}...`);
  });
};

startServer();
