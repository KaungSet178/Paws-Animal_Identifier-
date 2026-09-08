const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const imageRoot = path.join(root, 'frontend', 'public', 'images', 'question-options');
const questionSchemaPath = path.join(root, 'data', 'question_schema.json');
const imageMappingPath = path.join(root, 'frontend', 'src', 'questionOptionImages.js');
const uncertaintyValues = new Set(['unknown', 'not_clear', 'not_sure', 'tail_not_clear']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseConstObject(source, constName) {
  const declaration = `const ${constName} =`;
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error(`Could not find ${constName}`);

  const objectStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = objectStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) {
      const objectSource = source.slice(objectStart, i + 1);
      return Function(`return (${objectSource})`)();
    }
  }
  throw new Error(`Could not parse ${constName}`);
}

function listImageFiles() {
  const folders = fs.existsSync(imageRoot)
    ? fs.readdirSync(imageRoot, { withFileTypes: true }).filter(entry => entry.isDirectory())
    : [];
  const byFolder = new Map();
  for (const folder of folders) {
    byFolder.set(folder.name, fs.readdirSync(path.join(imageRoot, folder.name)).sort());
  }
  return byFolder;
}

function canonicalName(fileName) {
  return fileName.replace(/\.jpg\.jpg$/i, '.jpg').toLowerCase();
}

function validate() {
  const schema = readJson(questionSchemaPath);
  const mappingSource = fs.readFileSync(imageMappingPath, 'utf8');
  const imageFiles = parseConstObject(mappingSource, 'OPTION_IMAGE_FILES');
  const imageOverrides = parseConstObject(mappingSource, 'OPTION_IMAGE_OVERRIDES');
  const filesByFolder = listImageFiles();
  const mappedFiles = new Map();
  const reports = [];
  const errors = [];
  const intentionallyTextOnly = [];

  for (const [trait, choices] of Object.entries(imageFiles)) {
    const question = schema.questions?.[trait];
    const schemaOptions = question?.option_labels || {};
    const overrideTargets = new Set(Object.values(imageOverrides[trait] || {}));
    const folderFiles = filesByFolder.get(trait) || [];
    const lowerToActual = new Map(folderFiles.map(file => [file.toLowerCase(), file]));

    for (const [choice, fileName] of Object.entries(choices)) {
      const choiceExists = Object.prototype.hasOwnProperty.call(schemaOptions, choice);
      const allowedOverrideAsset = overrideTargets.has(choice);
      const expectedRelativePath = `${trait}/${fileName}`;
      const exactExists = folderFiles.includes(fileName);
      const lowerMatch = lowerToActual.get(fileName.toLowerCase());
      const duplicateExtensionMatch = folderFiles.find(file => canonicalName(file) === canonicalName(fileName));
      const report = {
        trait,
        choice,
        expected: expectedRelativePath,
        actual: exactExists ? expectedRelativePath : '',
        status: 'OK'
      };

      if (!choiceExists && !allowedOverrideAsset) {
        report.status = 'stale frontend reference';
      } else if (/\.jpg\.jpg$/i.test(fileName)) {
        report.status = 'duplicate extension';
      } else if (!exactExists && lowerMatch) {
        report.actual = `${trait}/${lowerMatch}`;
        report.status = 'wrong case';
      } else if (!exactExists && duplicateExtensionMatch) {
        report.actual = `${trait}/${duplicateExtensionMatch}`;
        report.status = 'duplicate extension';
      } else if (!exactExists) {
        report.status = 'missing';
      }

      reports.push(report);
      if (report.status !== 'OK') errors.push(report);
      if (exactExists) mappedFiles.set(`${trait}/${fileName}`, true);
    }
  }

  for (const [trait, question] of Object.entries(schema.questions || {})) {
    if (question.always_offer_unknown) intentionallyTextOnly.push({ trait, choice: 'unknown' });
    for (const choice of Object.keys(question.option_labels || {})) {
      if (uncertaintyValues.has(choice)) intentionallyTextOnly.push({ trait, choice });
    }
  }

  for (const [trait, files] of filesByFolder.entries()) {
    for (const file of files) {
      const relative = `${trait}/${file}`;
      if (/\.jpg\.jpg$/i.test(file)) {
        errors.push({ trait, choice: null, expected: relative, actual: relative, status: 'duplicate extension file' });
      } else if (!mappedFiles.has(relative)) {
        errors.push({ trait, choice: null, expected: relative, actual: relative, status: 'unmapped asset' });
      }
    }
  }

  const summary = {
    imageBearingChoicesChecked: reports.length,
    missing: errors.filter(error => error.status === 'missing').length,
    duplicateExtensions: errors.filter(error => error.status.includes('duplicate extension')).length,
    wrongCase: errors.filter(error => error.status === 'wrong case').length,
    staleFrontendReferences: errors.filter(error => error.status === 'stale frontend reference').length,
    unmappedAssets: errors.filter(error => error.status === 'unmapped asset').length,
    intentionallyTextOnlyChoices: intentionallyTextOnly.length
  };

  return { summary, errors, intentionallyTextOnly };
}

if (require.main === module) {
  const result = validate();
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length > 0) process.exit(1);
}

module.exports = { validate };
