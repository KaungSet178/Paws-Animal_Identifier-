const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parse } = require('csv-parse/sync');

const root = path.resolve(__dirname, '..');
const traitsPath = path.join(root, 'data', 'mammal_traits.csv');
const questionSchemaPath = path.join(root, 'data', 'question_schema.json');
const prologSweepPath = path.join(root, 'prolog', 'regression_sweep.pl');
const safetyLimit = 12;
const uncertaintyValues = new Set(['unknown', 'not_clear', 'not_sure', 'tail_not_clear']);

function readCsv(filePath) {
  return parse(fs.readFileSync(filePath, 'utf8'), {
    columns: true,
    skip_empty_lines: true
  });
}

const traitRows = readCsv(traitsPath);
const questionSchema = JSON.parse(fs.readFileSync(questionSchemaPath, 'utf8'));
const questions = questionSchema.questions || {};
const questionIds = new Set(Object.keys(questions));

function questionOptions(questionId) {
  const question = questions[questionId] || {};
  return Object.keys(question.option_labels || {});
}

function realOptions(questionId) {
  return questionOptions(questionId).filter(value => !uncertaintyValues.has(value));
}

function traitValue(row, questionId) {
  const raw = row[questionId];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'unknown';
}

function uncertaintyFor(questionId) {
  const options = new Set(questionOptions(questionId));
  for (const value of ['not_clear', 'not_sure', 'tail_not_clear', 'unknown']) {
    if (options.has(value) || value === 'unknown') return value;
  }
  return 'unknown';
}

function wrongValueFor(row, questionId) {
  const correct = traitValue(row, questionId);
  if (uncertaintyValues.has(correct)) return null;
  return realOptions(questionId).find(value => value !== correct) || null;
}

function answerForScenario(row, questionId, trace, scenario) {
  if (scenario === 'one_uncertain' && !trace.some(step => step.injected === 'uncertainty')) {
    return { value: uncertaintyFor(questionId), source: 'uncertainty', injected: 'uncertainty' };
  }

  if (scenario === 'one_wrong_after_three' && trace.filter(step => step.source === 'known_trait').length >= 3) {
    if (!trace.some(step => step.injected === 'wrong')) {
      const wrong = wrongValueFor(row, questionId);
      if (wrong) return { value: wrong, source: 'wrong_trait', injected: 'wrong' };
    }
  }

  const value = traitValue(row, questionId);
  return {
    value,
    source: uncertaintyValues.has(value) ? 'unknown_trait' : 'known_trait',
    injected: null
  };
}

function topDetails(key, candidates) {
  const index = candidates.findIndex(candidate => candidate.key === key);
  const candidate = index >= 0 ? candidates[index] : null;
  return {
    targetReturnedRank: index >= 0 ? index + 1 : null,
    targetInTop3: index >= 0 && index < 3,
    targetIsTop1: index === 0,
    targetScore: candidate ? candidate.score : null,
    targetMatches: candidate ? candidate.matches : null,
    targetConflicts: candidate ? candidate.conflicts : null,
    top3: candidates.slice(0, 3).map(item => ({
      key: item.key,
      score: item.score,
      matches: item.matches,
      conflicts: item.conflicts,
      evidence: item.evidence
    }))
  };
}

function simulate(row, scenario) {
  const observations = [];
  const trace = [];
  let response = callReasoningApi(observations);
  let finalStatus = response.status;

  while (response.status === 'continue' && trace.length < safetyLimit) {
    const next = response.nextQuestion && response.nextQuestion.id;
    if (!next || !questionIds.has(next)) {
      finalStatus = 'missing_next_question';
      break;
    }

    if (scenario === 'partial_three_answers' && trace.length >= 3) break;

    const answer = answerForScenario(row, next, trace, scenario);
    observations.push({ attribute: next, value: answer.value });
    trace.push({
      question: trace.length + 1,
      id: next,
      answer: answer.value,
      source: answer.source,
      injected: answer.injected
    });
    response = callReasoningApi(observations);
    finalStatus = response.status;
  }

  if (response.status === 'continue' && trace.length >= safetyLimit) {
    finalStatus = 'safety_limit';
  }

  return {
    speciesKey: row.species_key,
    scientificName: row.scientific_name,
    scenario,
    finalStatus,
    questionsAsked: trace.length,
    nextQuestion: response.nextQuestion ? response.nextQuestion.id : null,
    observations,
    trace,
    ...topDetails(row.species_key, response.candidates || [])
  };
}

function summarizeScenario(results) {
  const statuses = {};
  const candidateListLengths = {};
  for (const result of results) {
    statuses[result.finalStatus] = (statuses[result.finalStatus] || 0) + 1;
    const length = Array.isArray(result.top3) ? result.top3.length : 0;
    candidateListLengths[length] = (candidateListLengths[length] || 0) + 1;
  }
  return {
    total: results.length,
    statuses,
    candidateListLengths,
    top1: results.filter(result => result.targetReturnedRank === 1).length,
    top3: results.filter(result => result.targetReturnedRank !== null && result.targetReturnedRank <= 3).length,
    missingTarget: results.filter(result => result.targetReturnedRank === null).length,
    averageQuestions: Number((
      results.reduce((total, result) => total + result.questionsAsked, 0) / Math.max(results.length, 1)
    ).toFixed(2)),
    maxQuestions: results.reduce((max, result) => Math.max(max, result.questionsAsked), 0)
  };
}

function compactFailure(result) {
  return {
    speciesKey: result.speciesKey,
    scientificName: result.scientificName,
    scenario: result.scenario,
    finalStatus: result.finalStatus,
    questionsAsked: result.questionsAsked,
    targetReturnedRank: result.targetReturnedRank,
    targetScore: result.targetScore,
    targetMatches: result.targetMatches,
    targetConflicts: result.targetConflicts,
    top3: result.top3,
    path: result.path
  };
}

function runCli() {
  const args = process.argv.slice(2);
  const scenarios = ['clean', 'one_wrong_after_three', 'one_uncertain', 'partial_three_answers'];
  const requestedScenario = args.find(arg => arg.startsWith('--scenario='));
  const selectedScenarios = requestedScenario
    ? requestedScenario.replace('--scenario=', '').split(',').filter(Boolean)
    : scenarios;
  const requestedKeys = args.filter(arg => !arg.startsWith('--'));
  const rows = requestedKeys.length
    ? traitRows.filter(row => requestedKeys.includes(row.species_key))
    : traitRows;

  const result = spawnSync('swipl', ['-q', '-s', prologSweepPath], {
    cwd: root,
    input: JSON.stringify({
      keys: rows.map(row => row.species_key),
      scenarios: selectedScenarios
    }),
    encoding: 'utf8',
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Prolog regression sweep failed');
  }
  if (result.stderr.trim()) {
    throw new Error(result.stderr.trim());
  }

  const results = JSON.parse(result.stdout).results;

  const byScenario = {};
  for (const scenario of selectedScenarios) {
    byScenario[scenario] = summarizeScenario(results.filter(result => result.scenario === scenario));
  }

  const failures = results
    .filter(result => {
      if (result.scenario === 'partial_three_answers') return false;
      if (result.targetReturnedRank === null) return true;
      return result.targetReturnedRank > 3;
    })
    .map(compactFailure);

  const output = {
    generatedAt: new Date().toISOString(),
    speciesCount: new Set(results.map(result => result.speciesKey)).size,
    scenarios: byScenario,
    failures,
    resultCount: results.length
  };

  if (args.includes('--all-results')) output.results = results;
  console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) {
  runCli();
}

module.exports = {
  summarizeScenario
};
