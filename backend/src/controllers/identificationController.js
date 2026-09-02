const { validateIdentifyRequest } = require('../validators/observationValidator');

async function identify(req, res, next) {
  try {
    const observations = validateIdentifyRequest(req.body);
    const result = await req.app.locals.identificationService.reason(observations);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

function health(_req, res) {
  res.json({
    status: 'ok',
    service: 'myanmar-mammal-expert-system'
  });
}

async function species(req, res, next) {
  try {
    const result = await req.app.locals.speciesEnrichmentService.getSpecies(req.params.key);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  identify,
  health,
  species
};
