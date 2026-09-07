const OPTION_IMAGE_FILES = {
  body_covering: {
    fur_or_hair: 'body_covering_fur_or_hair.jpg',
    mostly_smooth_skin: 'body_covering_mostly_smooth_skin.jpg',
    scales: 'body_covering_scales.jpg',
    spines_or_quills: 'body_covering_spines_or_quills.jpg',
  },
  body_form: {
    bat_like: 'body_form_bat_like.jpg',
    bear_like: 'body_form_bear_like.jpg',
    cat_like: 'body_form_cat_like.jpg',
    deer_like: 'body_form_deer_like.jpg',
    dog_like: 'body_form_dog_like.jpg',
    dugong_like: 'body_form_dugong_like.jpg',
    elephant_like: 'body_form_elephant_like.jpg',
    gliding_mammal_like: 'body_form_gliding_mammal_like.jpg',
    long_body_short_legs: 'body_form_long_body_short_legs.jpg',
    pangolin_like: 'body_form_pangolin_like.jpg',
    pig_like: 'body_form_pig_like.jpg',
    primate_like: 'body_form_primate_like.jpg',
    rabbit_hare_like: 'body_form_rabbit_hare_like.jpg',
    rhino_like: 'body_form_rhino_like.jpg',
    rodent_like: 'body_form_rodent_like.jpg',
    shrew_mole_like: 'body_form_shrew_mole_like.jpg',
    porcupine_like: 'body_form_porcupine_like.jpg',
    tapir_like: 'body_form_tapir_like.jpg',
    whale_dolphin_like: 'body_form_whale_dolphin_like.jpg',
  },
  body_pattern: {
    banded: 'body_pattern_banded.jpg',
    dorsal_stripe: 'body_pattern_dorsal_stripe.jpg',
    mixed: 'body_pattern_mixed.jpg',
    masked: 'body_pattern_masked.jpg',
    patched: 'body_pattern_patched.jpg',
    plain: 'body_pattern_plain.jpg',
    ringed: 'body_pattern_ringed.jpg',
    spotted: 'body_pattern_spotted.jpg',
    striped: 'body_pattern_striped.jpg',
  },
  carnivore_face_marking: {
    cheek_stripes: 'carnivore_face_marking_cheek_stripes.jpg',
    eye_stripes: 'carnivore_face_marking_eye_stripes.jpg',
    mixed: 'carnivore_face_marking_mixed.jpg',
    pale_mask: 'carnivore_face_marking_pale_mask.jpg',
  },
  carnivore_tail_marking: {
    dark_tip: 'carnivore_tail_marking_dark_tip.jpg',
    plain: 'carnivore_tail_marking_plain.jpg',
    rings: 'carnivore_tail_marking_rings.jpg',
    tufted_tip: 'carnivore_tail_marking_tufted_tip.jpg',
    white_tip: 'carnivore_tail_marking_white_tip.jpg',
  },
  ear_shape_simple: {
    funnel_like: 'ear_shape_simple_funnel_like.jpg',
    pointed: 'ear_shape_simple_pointed.jpg',
    rounded: 'ear_shape_simple_rounded.jpg',
  },
  ear_size_impression: {
    large: 'ear_size_impression_large.jpg',
    medium: 'ear_size_impression_medium.jpg',
    not_obvious: 'ear_size_impression_not_obvious.jpg',
    small: 'ear_size_impression_small.jpg',
  },
  gliding_membrane_visible: {
    no: 'gliding_membrane_visible_no.jpg',
    yes: 'gliding_membrane_visible_yes.jpg',
  },
  horn_shape_simple: {
    branched: 'horn_shape_simple_branched.jpg',
    curved: 'horn_shape_simple_curved.jpg',
    long_straight: 'horn_shape_simple_long_straight.jpg',
    spiral: 'horn_shape_simple_spiral.jpg',
  },
  horns_or_antlers: {
    branched_antlers: 'horns_or_antlers_branched_antlers.jpg',
    horns: 'horns_or_antlers_horns.jpg',
    none_visible: 'horns_or_antlers_none_visible.jpg',
  },
  leg_foot_appearance: {
    broad_digging_feet: 'leg_foot_appearance_broad_digging_feet.jpg',
    grasping_hands_or_feet: 'leg_foot_appearance_grasping_hands_or_feet.jpg',
    hooves: 'leg_foot_appearance_hooves.jpg',
    small_rodent_like_feet: 'leg_foot_appearance_small_rodent_like_feet.jpg',
    webbed_feet: 'leg_foot_appearance_webbed_feet.jpg',
  },
  primate_brow_pattern: {
    connected_or_nearly_connected: 'primate_brow_pattern_connected_or_nearly_connected.jpg',
    thin_separate_wide_gap: 'primate_brow_pattern_thin_separate_wide_gap.jpg',
    two_separate_brows: 'primate_brow_pattern_two_separate_brows.webp',
  },
  primate_face_marking: {
    beard_or_moustache: 'primate_face_marking_beard_or_moustache.jpg',
    cheek_whiskers: 'primate_face_marking_cheek_whiskers.jpg',
    crest_or_crown: 'primate_face_marking_crest_or_crown.jpg',
    eye_rings: 'primate_face_marking_eye_rings.jpg',
    mixed: 'primate_face_marking_mixed.jpg',
    reddish_face: 'primate_face_marking_reddish_face.jpg',
    white_face_ring: 'primate_face_marking_white_face_ring.jpg',
  },
  quills_or_spines_visible: {
    no: 'quills_or_spines_visible_no.jpg',
    yes: 'quills_or_spines_visible_yes.jpg',
  },
  tail_impression: {
    bushy: 'tail_impression_bushy.jpg',
    long: 'tail_impression_long.jpg',
    not_obvious: 'tail_impression_not_obvious.jpg',
    short: 'tail_impression_short.jpg',
    thin: 'tail_impression_thin.jpg',
    very_long: 'tail_impression_very_long.jpg',
    very_short: 'tail_impression_very_short.jpg',
  },
  tail_shape: {
    bushy: 'tail_shape_bushy.jpg',
    flattened: 'tail_shape_flattened.jpg',
    fluked: 'tail_shape_fluked.jpg',
    thin: 'tail_shape_thin.jpg',
    tufted_tip: 'tail_shape_tufted_tip.jpg',
  },
}

const OPTION_IMAGE_OVERRIDES = {
  body_form: {
    hoofed_like: 'deer_like',
    mouse_rat_like: 'rodent_like',
    squirrel_like: 'rodent_like',
    monkey_like: 'primate_like',
  },
}

const IMAGE_SUPPORTED_TRAITS = new Set(Object.keys(OPTION_IMAGE_FILES))

function imageUrl(traitId, fileName) {
  return `/images/question-options/${traitId}/${fileName}`
}

export function getQuestionOptionImage(traitId, optionValue) {
  if (optionValue === 'unknown') return null

  const traitFiles = OPTION_IMAGE_FILES[traitId]
  if (!traitFiles) return null

  const exactFile = traitFiles[optionValue]
  if (exactFile) return imageUrl(traitId, exactFile)

  const overrideValue = OPTION_IMAGE_OVERRIDES[traitId]?.[optionValue]
  const overrideFile = overrideValue ? traitFiles[overrideValue] : null
  return overrideFile ? imageUrl(traitId, overrideFile) : null
}

export const imageSupportedQuestionTraits = [...IMAGE_SUPPORTED_TRAITS]
export const questionOptionImageFiles = OPTION_IMAGE_FILES
export const questionOptionImageOverrides = OPTION_IMAGE_OVERRIDES
