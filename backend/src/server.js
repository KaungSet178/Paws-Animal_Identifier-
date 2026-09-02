const env = require('./config/env');
const { createApp } = require('./app');

const app = createApp();

app.listen(env.port, () => {
  console.log(`Myanmar Mammal Expert System backend listening on port ${env.port}`);
});
