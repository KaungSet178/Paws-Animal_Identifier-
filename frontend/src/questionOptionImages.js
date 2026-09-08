const OPTION_IMAGE_FILES = {
  bat_nose_shape: {
    horseshoe_like: 'bat_nose_shape_horseshoe_like.jpg',
    leaf_like: 'bat_nose_shape_leaf_like.jpg',
    other: 'bat_nose_shape_other.jpg',
    plain: 'bat_nose_shape_plain.jpg',
    tube_like: 'bat_nose_shape_tube_like.jpg',
  },
  bat_tail_visibility: {
    no_tail_visible: 'bat_tail_visibility_no_tail_visible.jpg',
    tail_tip_beyond_membrane: 'bat_tail_visibility_tail_tip_beyond_membrane.jpg',
    tail_visible: 'bat_tail_visibility_tail_visible.jpg',
    tail_within_membrane: 'bat_tail_visibility_tail_within_membrane.jpg',
  },
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
    squirrel_like: 'body_form_squirrel_like.jpg',
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
  body_size_impression: {
    cow_or_larger: 'body_size_impression_cow_or_larger.jpg',
    deer_sized: 'body_size_impression_deer_sized.jpg',
    dog_sized: 'body_size_impression_dog_sized.jpg',
    mouse_or_smaller: 'body_size_impression_mouse_or_smaller.jpg',
    rabbit_or_cat_sized: 'body_size_impression_rabbit_or_cat_sized.jpg',
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
    broad: 'ear_shape_simple_broad.jpg',
    funnel_like: 'ear_shape_simple_funnel_like.jpg',
    long_upright: 'ear_shape_simple_long_upright.jpg',
    pointed: 'ear_shape_simple_pointed.jpg',
    rounded: 'ear_shape_simple_rounded.jpg',
  },
  ear_size_impression: {
    large: 'ear_size_impression_large.jpg',
    medium: 'ear_size_impression_medium.jpg',
    not_obvious: 'ear_size_impression_not_obvious.jpg',
    small: 'ear_size_impression_small.jpg',
    very_large: 'ear_size_impression_very_large.jpg',
  },
  gliding_membrane_visible: {
    no: 'gliding_membrane_visible_no.jpg',
    yes: 'gliding_membrane_visible_yes.jpg',
  },
  horn_shape_simple: {
    curved: 'horn_shape_simple_curved.jpg',
    long_straight: 'horn_shape_simple_long_straight.jpg',
    spiral: 'horn_shape_simple_spiral.jpg',
  },
  horns_or_antlers: {
    branched_antlers: 'horns_or_antlers_branched_antlers.jpg',
    horns: 'horns_or_antlers_horns.jpg',
    none_visible: 'horns_or_antlers_none_visible.jpg',
    single_horn: 'horns_or_antlers_single_horn.jpg',
  },
  ungulate_horn_or_antler_layout: {
    branched_antlers: 'ungulate_horn_or_antler_layout_branched_antlers.jpg',
    short_backward_curved_horns: 'ungulate_horn_or_antler_layout_short_backward_curved_horns.jpg',
    upright_inward_curved_horns: 'ungulate_horn_or_antler_layout_upright_inward_curved_horns.jpg',
    massive_wide_sweeping_horns: 'ungulate_horn_or_antler_layout_massive_wide_sweeping_horns.jpg',
    small_hidden_antlers: 'ungulate_horn_or_antler_layout_small_hidden_antlers.jpg',
    no_horns_or_antlers_seen: 'ungulate_horn_or_antler_layout_no_horns_or_antlers_seen.jpg',
  },
  leg_foot_appearance: {
    broad_digging_feet: 'leg_foot_appearance_broad_digging_feet.jpg',
    grasping_hands_or_feet: 'leg_foot_appearance_grasping_hands_or_feet.jpg',
    hooves: 'leg_foot_appearance_hooves.jpg',
    paws: 'leg_foot_appearance_paws.jpg',
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
    long: 'tail_impression_long.jpg',
    medium: 'tail_impression_medium.jpg',
    short: 'tail_impression_short.jpg',
    very_long: 'tail_impression_very_long.jpg',
  },
  tail_shape: {
    bushy: 'tail_shape_bushy.jpg',
    flattened: 'tail_shape_flattened.jpg',
    fluked: 'tail_shape_fluked.jpg',
    ringed: 'tail_shape_ringed.jpg',
    thick: 'tail_shape_thick.jpg',
    thin: 'tail_shape_thin.jpg',
    tufted_tip: 'tail_shape_tufted_tip.jpg',
  },
  snout_shape_simple: {
    long_narrow: 'snout_shape_simple_long_narrow.jpg',
    long_pointed: 'snout_shape_simple_long_pointed.jpg',
    pig_like: 'snout_shape_simple_pig_like.jpg',
    short_blunt: 'snout_shape_simple_short_blunt.jpg',
    trunk_like: 'snout_shape_simple_trunk_like.jpg',
  },
  ungulate_marking_layout: {
    white_lower_legs: 'ungulate_marking_layout_white_lower_legs.jpg',
    pale_rump_patch: 'ungulate_marking_layout_pale_rump_patch.jpg',
    white_throat_bib: 'ungulate_marking_layout_white_throat_bib.jpg',
    pale_moustache_or_throat: 'ungulate_marking_layout_pale_moustache_or_throat.jpg',
    plain_no_obvious_marking: 'ungulate_marking_layout_plain_no_obvious_marking.jpg',
    side_throat_stripes: 'ungulate_marking_layout_side_throat_stripes.jpg',
  },
}

const OPTION_IMAGE_OVERRIDES = {
  body_form: {
    hoofed_like: 'deer_like',
    mouse_rat_like: 'rodent_like',
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
