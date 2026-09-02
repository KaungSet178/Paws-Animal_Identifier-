const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const identificationRoutes = require('./routes/identificationRoutes');
const prologService = require('./services/prologService');
const { createSpeciesEnrichmentService } = require('./services/speciesEnrichmentService');
const { ApiError } = require('./utils/errors');

function createApp(options = {}) {
  const app = express();
  app.locals.identificationService = options.identificationService || prologService;
  app.locals.speciesEnrichmentService = options.speciesEnrichmentService || createSpeciesEnrichmentService();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '64kb' }));

  app.use('/api', identificationRoutes);

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && error.type === 'entity.parse.failed') {
      res.status(400).json({
        error: 'INVALID_JSON',
        message: 'Request body must be valid JSON.'
      });
      return;
    }

    const apiError = error instanceof ApiError
      ? error
      : new ApiError('INTERNAL_ERROR', 'An internal server error occurred.', 500);

    res.status(apiError.status).json({
      error: apiError.code,
      message: apiError.message
    });
  });

  return app;
}

module.exports = {
  createApp
};
