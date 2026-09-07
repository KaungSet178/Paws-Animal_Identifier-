const IMAGE_SUPPORTED_TRAITS = new Set(['body_form', 'body_covering', 'body_pattern'])

const OPTION_IMAGE_OVERRIDES = {
  body_form: {
    hoofed_like: 'deer_like',
    mouse_rat_like: 'rodent_like',
    squirrel_like: 'rodent_like',
    monkey_like: 'primate_like',
  },
  body_covering: {
    fur_or_hair: 'fur',
  },
  body_pattern: {
    masked: 'facial_marking',
  },
}

export function getQuestionOptionImage(traitId, optionValue) {
  if (!IMAGE_SUPPORTED_TRAITS.has(traitId) || optionValue === 'unknown') return null

  const imageValue = OPTION_IMAGE_OVERRIDES[traitId]?.[optionValue] || optionValue
  return `/images/question-options/${traitId}/${traitId}_${imageValue}.jpg`
}

export const imageSupportedQuestionTraits = [...IMAGE_SUPPORTED_TRAITS]
