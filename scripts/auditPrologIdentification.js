const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const root = path.resolve(__dirname, '..');
const traitsPath = path.join(root, 'data', 'mammal_traits.csv');
const readinessPath = path.join(root, 'analysis', 'species_readiness.csv');
const auditPath = path.join(root, 'analysis', 'runtime_identification_audit.csv');
const prologApiPath = path.join(root, 'prolog', 'backend_api.pl');
const safetyLimit = 25;

const targetSpecies = [
  'panthera_tigris',
  'elephas_maximus',
  'manis_javanica',
  'orcaella_brevirostris',
  'ursus_thibetanus'
];

function readCsv(filePath) {
  return parse(fs.readFileSync(filePath, 'utf8'), {
    columns: true,
    skip_empty_lines: true
  });
}

const traitRows = readCsv(traitsPath);
const readinessRows = fs.existsSync(readinessPath) ? readCsv(readinessPath) : [];
const traitsByKey = new Map(traitRows.map(row => [row.species_key, row]));
const readinessByKey = new Map(readinessRows.map(row => [row.species_key, row]));

function prologAtom(value) {
  if (!/^[a-z][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Value cannot be represented as a simple Prolog atom: ${value}`);
  }
  return value;
}

function callReasoningApi(observations) {
  const payload = JSON.stringify({ observations });
  const result = spawnSync('swipl', ['-q', '-s', prologApiPath], {
    cwd: root,
    input: payload,
    encoding: 'utf8',
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Prolog reasoning API failed');
  }
  if (result.stderr.trim()) {
    throw new Error(result.stderr.trim());
  }
  return JSON.parse(result.stdout);
}

function fullRanking(observations) {
  const prologObservations = `[${observations
    .map(observation => `${prologAtom(observation.attribute)}-${prologAtom(observation.value)}`)
    .join(',')}]`;
  const goal = [
    'use_module(library(http/json))',
    'use_module(prolog/rules/candidate_ranking)',
    `ranked_candidates(${prologObservations}, Ranked)`,
    'findall(_{key:KeyText,score:Score,matches:Matches,conflicts:Conflicts,knownEvidenceCount:Known,evidence:LabelText}, (member(row(Key,Score,Matches,Conflicts,Known,Label), Ranked), atom_string(Key,KeyText), atom_string(Label,LabelText)), Dicts)',
    'json_write_dict(current_output, _{candidates:Dicts}, [null(\'null\')])',
    'nl',
    'halt'
  ].join(', ');
  const result = spawnSync('swipl', ['-q', '-g', goal], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Prolog ranking query failed');
  }
  if (result.stderr.trim()) {
    throw new Error(result.stderr.trim());
  }
  return JSON.parse(result.stdout).candidates;
}

function questionScoreDetails(observations, trait) {
  const prologObservations = `[${observations
    .map(observation => `${prologAtom(observation.attribute)}-${prologAtom(observation.value)}`)
    .join(',')}]`;
  const goal = [
    'use_module(library(http/json))',
    'use_module(prolog/rules/question_selection)',
    `question_selection:candidate_focus(${prologObservations}, Candidates)`,
    `question_score_components(${prologObservations}, Candidates, ${prologAtom(trait)}, Score, Base, Known, Distinct, Penalty, Bonus, Relevance)`,
    'json_write_dict(current_output, _{score:Score,discriminationScore:Base,candidateCoverage:Known,distinctValues:Distinct,redundancyPenalty:Penalty,poolBonus:Bonus,semanticRelevance:Relevance}, [null(\'null\')])',
    'nl',
    'halt'
  ].join(', ');
  const result = spawnSync('swipl', ['-q', '-g', goal], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true
  });

  if (result.status !== 0 || result.stderr.trim()) {
    return null;
  }
  return JSON.parse(result.stdout);
}

function questionValueFor(row, questionId) {
  const raw = row[questionId];
  const value = typeof raw === 'string' ? raw.trim() : '';
  return {
    value: value || 'unknown',
    source: value ? 'known_trait' : 'unknown'
  };
}

function targetRankingDetails(key, ranking) {
  const index = ranking.findIndex(candidate => candidate.key === key);
  if (index === -1) {
    return {
      rank: '',
      score: '',
      matches: '',
      conflicts: ''
    };
  }
  const candidate = ranking[index];
  return {
    rank: index + 1,
    score: candidate.score,
    matches: candidate.matches,
    conflicts: candidate.conflicts
  };
}

function failureReason(status, targetDetails, trace) {
  if (status === 'max_question_limit') return 'hit safety question limit';
  if (status === 'insufficient_evidence') {
    if (targetDetails.rank === 1 && Number(targetDetails.conflicts) === 0) {
      return 'top target lacked enough stopping evidence or separable gap';
    }
    if (trace.some(step => step.source === 'unknown')) {
      return 'question path included unknown target traits';
    }
    return 'target was not sufficiently supported by answered traits';
  }
  if (status === 'ambiguous') return 'remaining candidates were not separable by available questions';
  return '';
}

function auditSpecies(key, options = {}) {
  const row = traitsByKey.get(key);
  if (!row) throw new Error(`Species not found in mammal_traits.csv: ${key}`);

  const observations = [];
  const trace = [];
  let response = callReasoningApi(observations);
  let finalStatus = response.status;

  while (response.status === 'continue') {
    if (!response.nextQuestion || !response.nextQuestion.id) {
      finalStatus = 'missing_next_question';
      break;
    }
    if (trace.length >= (options.safetyLimit || safetyLimit)) {
      finalStatus = 'max_question_limit';
      break;
    }

    const questionId = response.nextQuestion.id;
    const answer = questionValueFor(row, questionId);
    const details = questionScoreDetails(observations, questionId);
    const observation = {
      attribute: questionId,
      value: answer.value
    };
    observations.push(observation);
    trace.push({
      question: trace.length + 1,
      id: questionId,
      answer: answer.value,
      source: answer.source,
      details
    });
    response = callReasoningApi(observations);
    finalStatus = response.status;
  }

  const ranking = fullRanking(observations);
  const targetDetails = targetRankingDetails(key, ranking);
  const readiness = readinessByKey.get(key);
  const result = {
    species_key: key,
    scientific_name: row.scientific_name,
    analysis_readiness: readiness ? readiness.readiness : '',
    analyzer_questions: readiness ? readiness.simulated_questions_used : '',
    final_status: finalStatus,
    questions_asked: trace.length,
    target_rank: targetDetails.rank,
    target_score: targetDetails.score,
    matches: targetDetails.matches,
    conflicts: targetDetails.conflicts,
    known_answers: trace.filter(step => step.source === 'known_trait').length,
    unknown_answers: trace.filter(step => step.source === 'unknown').length,
    failure_reason: failureReason(finalStatus, targetDetails, trace),
    question_path: trace.map(step => `${step.id}=${step.answer}(${step.source})`).join('|'),
    trace,
    finalRanking: ranking
  };
  return result;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function summarize(results) {
  const counts = new Map();
  for (const result of results) {
    counts.set(result.final_status, (counts.get(result.final_status) || 0) + 1);
  }
  const questionCounts = results.map(result => result.questions_asked);
  return {
    total: results.length,
    complete: counts.get('complete') || 0,
    ambiguous: counts.get('ambiguous') || 0,
    insufficient_evidence: counts.get('insufficient_evidence') || 0,
    max_question_limit: counts.get('max_question_limit') || 0,
    median_questions: median(questionCounts),
    min_questions: questionCounts.length ? Math.min(...questionCounts) : 0,
    max_questions: questionCounts.length ? Math.max(...questionCounts) : 0
  };
}

function csvRows(results) {
  return results.map(result => ({
    species_key: result.species_key,
    scientific_name: result.scientific_name,
    analysis_readiness: result.analysis_readiness,
    final_status: result.final_status,
    questions_asked: result.questions_asked,
    target_rank: result.target_rank,
    target_score: result.target_score,
    matches: result.matches,
    conflicts: result.conflicts,
    known_answers: result.known_answers,
    unknown_answers: result.unknown_answers,
    analyzer_questions: result.analyzer_questions,
    failure_reason: result.failure_reason,
    question_path: result.question_path
  }));
}

function printDetailedResult(result) {
  console.log(`\n${result.scientific_name} (${result.species_key})`);
  console.log(`readiness: ${result.analysis_readiness || 'unknown'}`);
  if (result.trace.length) {
    for (const step of result.trace) {
      const details = step.details
        ? ` score=${step.details.score} discrimination=${Number(step.details.discriminationScore).toFixed(2)} coverage=${step.details.candidateCoverage} relevance=${step.details.semanticRelevance} penalty=${step.details.redundancyPenalty}`
        : '';
      console.log(`${step.question}. ${step.id} -> ${step.answer} [${step.source}]${details}`);
    }
  } else {
    console.log('(no questions asked)');
  }
  console.log('Final:');
  console.log(`status: ${result.final_status}`);
  console.log(`target rank: ${result.target_rank}`);
  console.log(`score: ${result.target_score}`);
  console.log(`matches: ${result.matches}`);
  console.log(`conflicts: ${result.conflicts}`);
  console.log('top ranking:');
  for (const [index, candidate] of result.finalRanking.slice(0, 10).entries()) {
    console.log(
      `${index + 1}. ${candidate.key} score=${candidate.score} matches=${candidate.matches} conflicts=${candidate.conflicts}`
    );
  }
}

function runCli() {
  const args = process.argv.slice(2);
  const fiveOnly = args.includes('--five');
  const allReady = args.includes('--all-ready') || !fiveOnly;
  const requestedKeys = args.filter(arg => !arg.startsWith('--'));
  const keys = requestedKeys.length
    ? requestedKeys
    : fiveOnly
      ? targetSpecies
      : allReady
        ? readinessRows.filter(row => row.readiness === 'species_ready').map(row => row.species_key)
        : targetSpecies;

  const results = keys.map(key => auditSpecies(key));
  const summary = summarize(results);

  for (const result of results.filter(result => targetSpecies.includes(result.species_key) || requestedKeys.length)) {
    printDetailedResult(result);
  }

  fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  fs.writeFileSync(auditPath, stringify(csvRows(results), { header: true }));

  console.log('\nRuntime identification audit summary');
  console.log(`Total species_ready audited: ${summary.total}`);
  console.log(`complete: ${summary.complete}`);
  console.log(`ambiguous: ${summary.ambiguous}`);
  console.log(`insufficient_evidence: ${summary.insufficient_evidence}`);
  console.log(`max_question_limit: ${summary.max_question_limit}`);
  console.log(`Question counts: median ${summary.median_questions}, min ${summary.min_questions}, max ${summary.max_questions}`);
  console.log(`Wrote ${path.relative(root, auditPath)}`);
}

if (require.main === module) {
  runCli();
}

module.exports = {
  auditSpecies,
  callReasoningApi,
  fullRanking,
  summarize,
  targetSpecies
};
