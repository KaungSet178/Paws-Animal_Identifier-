const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(dataDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function readCsv(name) {
  return parse(fs.readFileSync(path.join(dataDir, name), 'utf8'), {
    columns: true,
    skip_empty_lines: true
  });
}

function writeCsv(name, rows, columns) {
  fs.writeFileSync(path.join(dataDir, name), stringify(rows, { header: true, columns }));
}

const traitSchema = readJson('trait_schema.json');
const questionSchema = readJson('question_schema.json');
const constraints = readJson('question_constraints.json');
const traits = readCsv('mammal_traits.csv');
const provenance = readCsv('trait_provenance.csv');

const newTraits = [
  {
    id: 'squirrel_ventral_or_side_pattern',
    group: 'rodentia',
    data_type: 'enum',
    questionable: true,
    applicability: 'squirrel_like_rodents',
    allowed_values: [
      'pale_or_grey_belly',
      'reddish_or_orange_belly',
      'bold_side_stripes',
      'variable_or_mixed_belly',
      'no_obvious_contrast'
    ],
    missing_value: 'blank',
    user_unknown_value: 'unknown',
    evidence_weight: 3,
    description: 'Broad belly or side markings on squirrel-like rodents, visible from an ordinary photo when the underside or flank is seen.'
  },
  {
    id: 'gliding_mammal_marking_pattern',
    group: 'rodentia',
    data_type: 'enum',
    questionable: true,
    applicability: 'gliding_mammals',
    allowed_values: [
      'spotted_or_mottled_body',
      'pale_face_dark_tail',
      'long_black_tail_tip',
      'pale_throat_or_belly',
      'plain_reddish_body',
      'grey_head_white_throat_eye_ring'
    ],
    missing_value: 'blank',
    user_unknown_value: 'unknown',
    evidence_weight: 3,
    description: 'Obvious coat, face, throat, or tail-color layout in gliding mammals; no measurements or skull characters.'
  },
  {
    id: 'ungulate_marking_layout',
    group: 'ungulate',
    data_type: 'enum',
    questionable: true,
    applicability: 'Artiodactyla_or_Perissodactyla_terrestrial',
    allowed_values: [
      'white_lower_legs',
      'pale_rump_patch',
      'white_throat_bib',
      'pale_moustache_or_throat',
      'plain_no_obvious_marking',
      'side_throat_stripes'
    ],
    missing_value: 'blank',
    user_unknown_value: 'unknown',
    evidence_weight: 3,
    description: 'Large visible marking layout on hoofed mammals, such as lower-leg stockings, throat bibs, flank stripes, or rump patches.'
  },
  {
    id: 'cetacean_head_or_body_marking',
    group: 'cetacea',
    data_type: 'enum',
    questionable: true,
    applicability: 'Cetacea',
    allowed_values: [
      'asymmetric_white_lower_jaw',
      'three_rostrum_ridges',
      'single_rostrum_ridge_plain_jaw',
      'white_flipper_band',
      'long_white_flippers_or_knobbly_head',
      'bulbous_head_no_beak',
      'long_thin_beak',
      'smooth_sloping_head_to_beak',
      'heavily_scarred_blunt_head',
      'sloping_head_indistinct_beak'
    ],
    missing_value: 'blank',
    user_unknown_value: 'unknown',
    evidence_weight: 3,
    description: 'Simple visible head, flipper, jaw, or scarring marks useful for whales and dolphins when seen clearly.'
  },
  {
    id: 'ungulate_horn_or_antler_layout',
    group: 'ungulate',
    data_type: 'enum',
    questionable: true,
    applicability: 'horned_ungulates',
    allowed_values: [
      'branched_antlers',
      'short_backward_curved_horns',
      'upright_inward_curved_horns',
      'massive_wide_sweeping_horns',
      'small_hidden_antlers',
      'no_horns_or_antlers_seen'
    ],
    missing_value: 'blank',
    user_unknown_value: 'unknown',
    evidence_weight: 3,
    description: 'Plain visual horn or antler layout for hoofed mammals, avoiding exact tine counts or measurements.'
  },
  {
    id: 'bat_face_or_shoulder_layout',
    group: 'chiroptera',
    data_type: 'enum',
    questionable: true,
    applicability: 'Chiroptera',
    allowed_values: [
      'roundleaf_four_side_leaflets',
      'white_or_pale_shoulder_patches',
      'joined_large_ears_broad_noseleaf',
      'lyre_shaped_noseleaf',
      'no_obvious_face_or_shoulder_mark'
    ],
    missing_value: 'blank',
    user_unknown_value: 'unknown',
    evidence_weight: 3,
    description: 'Close-photo bat face or shoulder pattern used only for bat-like candidates.'
  },
  {
    id: 'rodent_tail_relative_length',
    group: 'rodentia',
    data_type: 'enum',
    questionable: true,
    applicability: 'Rodentia_when_tail_visible',
    allowed_values: [
      'tail_longer_than_body',
      'tail_about_body_length',
      'tail_shorter_than_body',
      'tail_not_clear'
    ],
    missing_value: 'blank',
    user_unknown_value: 'unknown',
    evidence_weight: 2,
    description: 'Coarse visual comparison of tail length to body length in rodents; no exact measurement required.'
  }
];

const existingTraitIds = new Set(traitSchema.traits.map(t => t.id));
for (const trait of newTraits) {
  if (!existingTraitIds.has(trait.id)) traitSchema.traits.push(trait);
}
traitSchema.schema_version = '0.5.0';

questionSchema.version = '0.5.0';
questionSchema.specialized_pools.Rodentia = Array.from(new Set([
  ...questionSchema.specialized_pools.Rodentia,
  'squirrel_ventral_or_side_pattern',
  'gliding_mammal_marking_pattern',
  'rodent_tail_relative_length'
]));
questionSchema.specialized_pools.Dermoptera = Array.from(new Set([
  ...questionSchema.specialized_pools.Dermoptera,
  'gliding_mammal_marking_pattern'
]));
questionSchema.specialized_pools.Terrestrial_Artiodactyla_Perissodactyla = Array.from(new Set([
  ...questionSchema.specialized_pools.Terrestrial_Artiodactyla_Perissodactyla,
  'ungulate_marking_layout',
  'ungulate_horn_or_antler_layout'
]));
questionSchema.specialized_pools.Cetacea = Array.from(new Set([
  ...questionSchema.specialized_pools.Cetacea,
  'cetacean_head_or_body_marking'
]));
questionSchema.specialized_pools.Chiroptera = Array.from(new Set([
  ...questionSchema.specialized_pools.Chiroptera,
  'bat_face_or_shoulder_layout'
]));
Object.assign(questionSchema.questions, {
  squirrel_ventral_or_side_pattern: {
    prompt: 'What stood out on the belly or sides?',
    option_labels: {
      pale_or_grey_belly: 'Pale or grey belly',
      reddish_or_orange_belly: 'Reddish/orange belly',
      bold_side_stripes: 'Bold side stripes',
      variable_or_mixed_belly: 'Mixed or variable belly color',
      no_obvious_contrast: 'No obvious contrast'
    },
    always_offer_unknown: true
  },
  gliding_mammal_marking_pattern: {
    prompt: 'What markings stood out on the gliding animal?',
    option_labels: {
      spotted_or_mottled_body: 'Spotted or mottled body',
      pale_face_dark_tail: 'Pale face with dark tail',
      long_black_tail_tip: 'Long black tail tip',
      pale_throat_or_belly: 'Pale throat or belly',
      plain_reddish_body: 'Mostly plain reddish body',
      grey_head_white_throat_eye_ring: 'Grey head with pale throat/eye ring'
    },
    always_offer_unknown: true
  },
  ungulate_marking_layout: {
    prompt: 'What large marking was easiest to see?',
    option_labels: {
      white_lower_legs: 'White or pale lower legs',
      pale_rump_patch: 'Pale rump patch',
      white_throat_bib: 'White throat bib',
      pale_moustache_or_throat: 'Pale moustache or throat',
      plain_no_obvious_marking: 'No obvious marking',
      side_throat_stripes: 'Side or throat stripes'
    },
    always_offer_unknown: true
  },
  cetacean_head_or_body_marking: {
    prompt: 'Which head, flipper, or body mark was visible?',
    option_labels: {
      asymmetric_white_lower_jaw: 'White lower jaw on one side',
      three_rostrum_ridges: 'Three ridges on top of the head',
      single_rostrum_ridge_plain_jaw: 'One head ridge, plain jaw',
      white_flipper_band: 'White band on the flipper',
      long_white_flippers_or_knobbly_head: 'Long white flippers or bumpy head',
      bulbous_head_no_beak: 'Rounded head with no beak',
      long_thin_beak: 'Long thin beak',
      smooth_sloping_head_to_beak: 'Smooth slope from head to beak',
      heavily_scarred_blunt_head: 'Blunt head with heavy scarring',
      sloping_head_indistinct_beak: 'Sloping head with indistinct beak'
    },
    always_offer_unknown: true
  },
  ungulate_horn_or_antler_layout: {
    prompt: 'What did the horns or antlers look like?',
    option_labels: {
      branched_antlers: 'Branched antlers',
      short_backward_curved_horns: 'Short backward-curved horns',
      upright_inward_curved_horns: 'Upright horns curving inward',
      massive_wide_sweeping_horns: 'Massive horns sweeping sideways',
      small_hidden_antlers: 'Small antlers partly hidden by hair',
      no_horns_or_antlers_seen: 'No horns or antlers seen'
    },
    always_offer_unknown: true
  },
  bat_face_or_shoulder_layout: {
    prompt: 'If the bat was seen close up, what stood out?',
    option_labels: {
      roundleaf_four_side_leaflets: 'Round noseleaf with side leaflets',
      white_or_pale_shoulder_patches: 'Pale shoulder patches',
      joined_large_ears_broad_noseleaf: 'Joined large ears and broad noseleaf',
      lyre_shaped_noseleaf: 'Tall lyre-shaped noseleaf',
      no_obvious_face_or_shoulder_mark: 'No obvious mark'
    },
    always_offer_unknown: true
  },
  rodent_tail_relative_length: {
    prompt: 'Compared with the body, how long did the tail look?',
    option_labels: {
      tail_longer_than_body: 'Longer than the body',
      tail_about_body_length: 'About body length',
      tail_shorter_than_body: 'Shorter than the body',
      tail_not_clear: 'Not clear'
    },
    always_offer_unknown: true
  }
});

constraints.version = '0.2.0';
constraints.domain_gates.rodent.traits = Array.from(new Set([
  ...constraints.domain_gates.rodent.traits,
  'squirrel_ventral_or_side_pattern',
  'gliding_mammal_marking_pattern',
  'rodent_tail_relative_length'
]));
constraints.domain_gates.cetacean.traits = Array.from(new Set([
  ...constraints.domain_gates.cetacean.traits,
  'cetacean_head_or_body_marking'
]));
constraints.domain_gates.bat.traits = Array.from(new Set([
  ...constraints.domain_gates.bat.traits,
  'bat_face_or_shoulder_layout'
]));
constraints.domain_gates.ungulate = {
  orders: ['Artiodactyla', 'Perissodactyla'],
  body_form_values: ['hoofed_like', 'rhino_like', 'tapir_like'],
  traits: ['horns_or_antlers', 'horn_shape_simple', 'ungulate_marking_layout', 'ungulate_horn_or_antler_layout']
};
constraints.domain_gates.gliding_mammal = {
  orders: ['Dermoptera', 'Rodentia'],
  body_form_values: ['gliding_mammal_like'],
  traits: ['gliding_mammal_marking_pattern']
};
constraints.prerequisites.gliding_mammal_marking_pattern = {
  boosted_by: [
    {
      attribute: 'body_form',
      values: ['gliding_mammal_like'],
      bonus: 35,
      reason: 'Gliding-mammal markings are useful after the animal has a gliding-mammal silhouette.'
    },
    {
      attribute: 'gliding_membrane_visible',
      values: ['yes'],
      bonus: 35,
      reason: 'A visible gliding membrane makes gliding-mammal markings relevant.'
    }
  ]
};
constraints.prerequisites.ungulate_horn_or_antler_layout = {
  blocked_by: [
    {
      attribute: 'horns_or_antlers',
      values: ['none_visible'],
      reason: 'Horn or antler layout is irrelevant when none are visible.'
    }
  ],
  boosted_by: [
    {
      attribute: 'horns_or_antlers',
      values: ['horns', 'branched_antlers', 'single_horn'],
      bonus: 40,
      reason: 'Horn or antler layout is a natural follow-up after visible horns or antlers.'
    }
  ]
};

const factUpdates = {
  callosciurus_erythraeus: {
    squirrel_ventral_or_side_pattern: ['reddish_or_orange_belly', 'web_reference', 'Mammal Species of the World / Francis field-guide summary', 'https://en.wikipedia.org/wiki/Callosciurus', 'Pallas squirrel may show a bright reddish belly; color variation kept low-to-medium confidence.', 'medium']
  },
  callosciurus_caniceps: {
    squirrel_ventral_or_side_pattern: ['pale_or_grey_belly', 'web_reference', 'Thai National Parks species account', 'https://www.thainationalparks.com/species/callosciurus-caniceps', 'Grey-bellied squirrel account describes a usually grey belly, sometimes reddish on the sides.', 'medium']
  },
  callosciurus_pygerythrus: {
    squirrel_ventral_or_side_pattern: ['pale_or_grey_belly', 'web_reference', 'Squirrels of India', 'https://squirrelsofindia.in/', 'Hoary-bellied squirrel account describes grey, cream, or cinnamon ventral coloration.', 'medium']
  },
  tamiops_swinhoei: {
    squirrel_ventral_or_side_pattern: ['bold_side_stripes', 'web_reference', 'Animal Diversity Web', 'https://www.animaldiversity.org/accounts/Tamiops_swinhoei/', 'Swinhoe striped squirrel has light stripes along the sides of the body.', 'high']
  },
  callosciurus_quinquestriatus: {
    body_size_impression: ['rabbit_or_cat_sized', 'web_reference', 'Squirrels of the World / Sciurids treatment excerpt', 'https://www.academia.edu/10660434/Sciurids', 'Anderson squirrel is a full tree-squirrel-sized Callosciurus, larger than Tamiops striped squirrels.', 'medium'],
    squirrel_ventral_or_side_pattern: ['bold_side_stripes', 'web_reference', 'Squirrels of the World / Sciurids treatment excerpt', 'https://www.academia.edu/10660434/Sciurids', 'Anderson squirrel is described with black-and-white ventral and side striping.', 'medium']
  },
  dremomys_lokriah: {
    squirrel_ventral_or_side_pattern: ['reddish_or_orange_belly', 'web_reference', 'Mammals of Jigme Khesar Strict Nature Reserve', 'https://www.researchgate.net/figure/Orange-Bellied-Himalayan-Squirrel-Photo-Phuntsho-Common-Name-Orange-Bellied-Himalayan_fig37_343536965', 'Orange-bellied Himalayan squirrel has bright orange throat, chest, and belly.', 'medium']
  },
  dremomys_pernyi: {
    squirrel_ventral_or_side_pattern: ['pale_or_grey_belly', 'web_reference', 'Squirrels of India', 'https://squirrelsofindia.in/species/dremomys-pernyi', 'Perny long-nosed squirrel has a grey belly and pale cream throat/chest.', 'medium']
  },
  menetes_berdmorei: {
    squirrel_ventral_or_side_pattern: ['bold_side_stripes', 'web_reference', 'Ecology Asia', 'https://www.ecologyasia.com/verts/mammals/indochinese-ground-squirrel.htm', 'Berdmore ground squirrel has pale flank stripes with a dark stripe between.', 'high']
  },
  tupaia_belangeri: {
    squirrel_ventral_or_side_pattern: ['no_obvious_contrast', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Tupaia_belangeri/', 'Northern tree shrew is not a true squirrel and lacks the squirrel flank/belly pattern used here.', 'medium']
  },
  petaurista_elegans: {
    gliding_mammal_marking_pattern: ['spotted_or_mottled_body', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Petaurista_elegans/', 'Spotted giant flying squirrel has dark upperparts and pale underparts; spotted/mottled name used as broad visible layout.', 'medium']
  },
  petaurista_philippensis: {
    gliding_mammal_marking_pattern: ['pale_face_dark_tail', 'web_reference', 'Ecology Asia', 'https://www.ecologyasia.com/verts/mammals/indian-giant-flying-squirrel.htm', 'Indian giant flying squirrel account describes rufous upperparts, pale face, and dark tail.', 'high']
  },
  eupetaurus_nivamons: {
    gliding_mammal_marking_pattern: ['long_black_tail_tip', 'journal_article', 'Zoological Journal of the Linnean Society', 'https://academic.oup.com/zoolinnean/article/194/2/502/6287636', 'Eupetaurus nivamons is diagnosed externally by a long black tail tip.', 'high']
  },
  hylopetes_phayrei: {
    gliding_mammal_marking_pattern: ['pale_throat_or_belly', 'web_reference', 'Animal Diversity Web', 'https://www.animaldiversity.org/accounts/Hylopetes_phayrei/', 'Indochinese flying squirrel has a white stomach and throat.', 'high']
  },
  petaurista_petaurista: {
    gliding_mammal_marking_pattern: ['plain_reddish_body', 'web_reference', 'Plazi/HMW treatment', 'https://tb.plazi.org/GgServer/html/064D0660FFF0ED0EFAF6F7B6FBFFFA9B', 'Red giant flying squirrel treatment describes reddish or orange tail/body with darker tip.', 'medium']
  },
  petaurista_magnificus: {
    gliding_mammal_marking_pattern: ['spotted_or_mottled_body', 'web_reference', 'Squirrels of India', 'https://squirrelsofindia.in/species/petaurista-magnificus', 'Hodgson giant flying squirrel has maroon/chestnut upperparts grizzled with white and a black chin spot.', 'medium']
  },
  petaurista_caniceps: {
    gliding_mammal_marking_pattern: ['grey_head_white_throat_eye_ring', 'web_reference', 'Thai National Parks species account', 'https://www.thainationalparks.com/species/petaurista-marica', 'Grey-headed flying squirrel account notes grey head, white throat, orange-brown eye ring, and black tail tip.', 'medium']
  },
  galeopterus_variegatus: {
    gliding_mammal_marking_pattern: ['spotted_or_mottled_body', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Galeopterus_variegates/', 'Sunda colugo has mottled/patchy pelage over the gliding membrane and body.', 'high']
  },
  bos_gaurus: {
    ungulate_marking_layout: ['white_lower_legs', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Bos_frontalis/', 'Gaur account supports conspicuous pale lower legs / stocking-like markings.', 'high'],
    ungulate_horn_or_antler_layout: ['upright_inward_curved_horns', 'web_reference', 'Plazi/HMW treatment', 'https://treatment.plazi.org/id/03F507139949FFF2037DFDC2F79AF289', 'Gaur horns arise beside a pale crown hump and curve outward/upward then inward.', 'medium']
  },
  bubalus_arnee: {
    ungulate_marking_layout: ['white_lower_legs', 'web_reference', 'Plazi/HMW treatment', 'https://publication.plazi.org/GgServer/html/03F507139947FFFD0341FE2DFB41FEDF/5', 'Wild water buffalo legs below the knee may be whitish or yellowish grey.', 'medium'],
    ungulate_horn_or_antler_layout: ['massive_wide_sweeping_horns', 'web_reference', 'Thai National Parks species account', 'https://www.thainationalparks.com/species/wild-water-buffalo', 'Wild water buffalo horns are heavy-based and widely spreading.', 'high']
  },
  muntiacus_gongshanensis: {
    body_size_impression: ['dog_sized', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Muntiacus_gongshanensis/', 'Gongshan muntjac is a small deer around dog-sized in coarse visual scale.', 'medium'],
    ungulate_marking_layout: ['pale_rump_patch', 'journal_article', 'Peer-reviewed camera-trap morphology study / PMC', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12209592/', 'Gongshan muntjac shows contrasting white around the tail and inner hindquarters.', 'high'],
    ungulate_horn_or_antler_layout: ['small_hidden_antlers', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Muntiacus_gongshanensis/', 'Gongshan muntjac has small dagger-like antlers hidden in a reddish hair tuft.', 'medium']
  },
  capricornis_milneedwardsi: {
    body_size_impression: ['deer_sized', 'web_reference', 'WildDocu Chinese Serow account', 'https://www.wilddocu.de/chinese-serow-capricornis-milneedwardsii/', 'Chinese/mainland serow is a goat-antelope, coarse-sized closer to deer than small deer.', 'medium'],
    ungulate_marking_layout: ['pale_moustache_or_throat', 'web_reference', 'WildDocu Chinese Serow account', 'https://www.wilddocu.de/chinese-serow-capricornis-milneedwardsii/', 'Chinese/mainland serow account notes a white moustache mark and throat patch.', 'medium'],
    ungulate_horn_or_antler_layout: ['short_backward_curved_horns', 'web_reference', 'WildDocu Chinese Serow account', 'https://www.wilddocu.de/chinese-serow-capricornis-milneedwardsii/', 'Chinese/mainland serow has short backward-curving horns.', 'medium']
  },
  capricornis_rubidus: {
    ungulate_marking_layout: ['white_throat_bib', 'web_reference', 'Ultimate Ungulate', 'https://www.ultimateungulate.com/Artiodactyla/Capricornis_rubidus.html', 'Red serow account describes a white patch beneath the jaw extending to a throat bib.', 'medium'],
    ungulate_horn_or_antler_layout: ['short_backward_curved_horns', 'web_reference', 'WildDocu Burmese Red Serow account', 'https://www.wilddocu.de/burmese-red-serow-capricornis-rubidus/', 'Burmese red serow has short curved horns.', 'medium']
  },
  naemorhedus_cranbrooki: {
    ungulate_marking_layout: ['plain_no_obvious_marking', 'web_reference', 'WildDocu red goral account', 'https://www.wilddocu.de/red-goral-nemorhaedus-baileyi/', 'Red goral complex notes cranbrooki lacks a clear white throat patch on the type specimen.', 'medium'],
    ungulate_horn_or_antler_layout: ['short_backward_curved_horns', 'web_reference', 'WildDocu red goral account', 'https://www.wilddocu.de/red-goral-nemorhaedus-baileyi/', 'Red goral has short arcing horns in both sexes.', 'medium']
  },
  axis_porcinus: {
    ungulate_marking_layout: ['plain_no_obvious_marking', 'web_reference', 'Ultimate Ungulate', 'https://www.ultimateungulate.com/Artiodactyla/Axis_porcinus.html', 'Adult hog deer is broadly plain brown outside seasonal spotting; no strong throat marking.', 'medium'],
    ungulate_horn_or_antler_layout: ['branched_antlers', 'web_reference', 'Ultimate Ungulate', 'https://www.ultimateungulate.com/Artiodactyla/Axis_porcinus.html', 'Male hog deer have three-pronged branched antlers; females may require unknown.', 'medium']
  },
  rusa_unicolor: {
    ungulate_horn_or_antler_layout: ['branched_antlers', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Rusa_unicolor/', 'Male sambar have branched antlers; females may require unknown.', 'medium']
  },
  tragulus_kanchil: {
    ungulate_marking_layout: ['plain_no_obvious_marking', 'web_reference', 'NParks Flora & Fauna Web', 'https://www.nparks.gov.sg/florafaunaweb/fauna/2/1/21', 'Lesser mouse-deer account describes plain reddish-brown upperparts; no strong side stripe encoded.', 'medium']
  },
  tragulus_napu: {
    ungulate_marking_layout: ['side_throat_stripes', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Tragulus_napu/', 'Greater mouse-deer account supports distinct throat/side marking layout.', 'medium']
  },
  balaenoptera_physalus: {
    cetacean_head_or_body_marking: ['asymmetric_white_lower_jaw', 'government_reference', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/fin-whale', 'Fin whale head coloring is asymmetrical, with white on the right lower jaw.', 'high'],
    cetacean_beak: ['no_distinct_beak', 'government_reference', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/fin-whale', 'Fin whale has a V-shaped rorqual head, not a dolphin-like beak.', 'high']
  },
  balaenoptera_edeni: {
    cetacean_head_or_body_marking: ['three_rostrum_ridges', 'government_reference', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/brydes-whale', 'Bryde whale has three prominent rostrum ridges in front of the blowhole.', 'high'],
    cetacean_beak: ['no_distinct_beak', 'government_reference', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/brydes-whale', 'Bryde whale has a rorqual rostrum rather than a dolphin-like beak.', 'high']
  },
  balaenoptera_borealis: {
    cetacean_head_or_body_marking: ['single_rostrum_ridge_plain_jaw', 'web_reference', 'Sea Watch Foundation', 'https://www.seawatchfoundation.org.uk/wp-content/uploads/2025/10/Sei-Whale.pdf', 'Sei whale has a single ridge on the head and lacks the fin whale asymmetric jaw.', 'medium'],
    cetacean_beak: ['no_distinct_beak', 'web_reference', 'OBIS-SEAMAP', 'https://seamap.env.duke.edu/species/180526', 'Sei whale has a rorqual rostrum, not an obvious dolphin-like beak.', 'medium']
  },
  balaenoptera_acutorostrata: {
    cetacean_head_or_body_marking: ['white_flipper_band', 'web_reference', 'OBIS-SEAMAP / Duke University', 'https://seamap.env.duke.edu/species/180524/html', 'Common minke whale has a distinctive white band across each flipper.', 'high'],
    cetacean_beak: ['no_distinct_beak', 'web_reference', 'OBIS-SEAMAP / Duke University', 'https://seamap.env.duke.edu/species/180524/html', 'Common minke whale has a pointed rorqual head, not a dolphin-like beak.', 'high']
  },
  megaptera_novaeangliae: {
    cetacean_head_or_body_marking: ['long_white_flippers_or_knobbly_head', 'government_reference', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/humpback-whale', 'Humpback whale is recognizable by long pectoral flippers and head tubercles.', 'high']
  },
  peponocephala_electra: {
    cetacean_head_or_body_marking: ['bulbous_head_no_beak', 'web_reference', 'OBIS-SEAMAP / Duke University', 'https://seamap.env.duke.edu/species/180489', 'Melon-headed whale has a rounded melon/head and no distinct beak.', 'medium']
  },
  stenella_longirostris: {
    cetacean_head_or_body_marking: ['long_thin_beak', 'government_reference', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/spinner-dolphin', 'Spinner dolphin has a long, slender beak/rostrum.', 'high'],
    cetacean_dorsal_fin: ['tall', 'government_reference', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/spinner-dolphin', 'Spinner dolphin has a prominent triangular dorsal fin.', 'medium']
  },
  steno_bredanensis: {
    cetacean_head_or_body_marking: ['smooth_sloping_head_to_beak', 'government_reference', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/rough-toothed-dolphin', 'Rough-toothed dolphin has a smooth slope from forehead to long rostrum.', 'high']
  },
  grampus_griseus: {
    cetacean_head_or_body_marking: ['heavily_scarred_blunt_head', 'government_reference', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/rissos-dolphin', 'Risso dolphin adults are heavily scarred and lack a distinct beak.', 'high']
  },
  ziphius_cavirostris: {
    cetacean_head_or_body_marking: ['sloping_head_indistinct_beak', 'government_reference', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/cuviers-beaked-whale', 'Cuvier beaked whale has a sloping head and indistinct beak.', 'high']
  },
  tursiops_truncatus: {
    cetacean_head_or_body_marking: ['bulbous_head_no_beak', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Tursiops_truncatus/', 'Bottlenose dolphin has a robust dolphin profile with a short beak and rounded melon.', 'medium']
  },
  hipposideros_armiger: {
    body_pattern: ['plain', 'web_reference', 'Ecology Asia', 'https://www.ecologyasia.com/verts/bats/great-roundleaf_bat.htm', 'Great roundleaf bat fur varies brown to reddish brown, with no shoulder patch emphasized.', 'medium'],
    bat_face_or_shoulder_layout: ['roundleaf_four_side_leaflets', 'web_reference', 'Ecology Asia', 'https://www.ecologyasia.com/verts/bats/great-roundleaf_bat.htm', 'Great roundleaf bat noseleaf has four lateral accessory leaflets on each side.', 'medium'],
    bat_tail_visibility: ['tail_tip_beyond_membrane', 'web_reference', 'Plazi/HMW treatment', 'https://treatment.plazi.org/id/03BD87A2C67CA20FF899F1F9FC2A4A21', 'Great roundleaf bat tail is long with the tip free from the interfemoral membrane.', 'medium']
  },
  hipposideros_diadema: {
    bat_face_or_shoulder_layout: ['white_or_pale_shoulder_patches', 'web_reference', 'Ecology Asia', 'https://www.ecologyasia.com/verts/bats/diadem-roundleaf_bat.htm', 'Diadem roundleaf bat has well-defined pale patches on shoulders and body sides.', 'high']
  },
  megaderma_spasma: {
    bat_face_or_shoulder_layout: ['joined_large_ears_broad_noseleaf', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Megaderma_spasma/', 'Lesser false vampire bat has joined large ears and a broad noseleaf.', 'medium']
  },
  lyroderma_lyra: {
    body_pattern: ['plain', 'web_reference', 'Thai National Parks species account', 'https://www.thainationalparks.com/species/lyroderma-lyra', 'Greater false vampire bat has blue-gray to brownish-gray fur without bold body patches.', 'medium'],
    bat_face_or_shoulder_layout: ['lyre_shaped_noseleaf', 'web_reference', 'Plazi/HMW treatment', 'https://tb.plazi.org/GgServer/html/C13F1641FF89FFE6FA66FD04F5C96781', 'Greater false vampire bat has a posterior noseleaf shaped like a lyre.', 'medium']
  },
  trachypithecus_shortridgei: {
    primate_face_marking: ['dark_face', 'web_reference', 'Chinese biodiversity encyclopedia summary', 'https://zh.wikipedia.org/wiki/%E8%82%96%E6%B0%8F%E4%B9%8C%E5%8F%B6%E7%8C%B4', 'Shortridge langur adult has bright black facial skin and silver-grey body.', 'medium']
  },
  chiropodomys_gliroides: {
    primary_color: ['grey', 'web_reference', 'Ecology Asia', 'https://www.ecologyasia.com/verts/mammals/pencil-tailed-tree-mouse.htm', 'Pencil-tailed tree mouse upperparts vary pale fawn to pale grey with white underparts.', 'medium'],
    body_pattern: ['patched', 'web_reference', 'Ecology Asia', 'https://www.ecologyasia.com/verts/mammals/pencil-tailed-tree-mouse.htm', 'Pencil-tailed tree mouse is visibly bicolored with pale upperparts and white underparts.', 'medium'],
    ear_size_impression: ['large', 'web_reference', 'Ecology Asia', 'https://www.ecologyasia.com/verts/mammals/pencil-tailed-tree-mouse.htm', 'Pencil-tailed tree mouse has relatively large eyes and rounded ears.', 'medium'],
    ear_shape_simple: ['rounded', 'web_reference', 'Ecology Asia', 'https://www.ecologyasia.com/verts/mammals/pencil-tailed-tree-mouse.htm', 'Pencil-tailed tree mouse has rounded ears.', 'medium']
  },
  rattus_andamanensis: {
    rodent_tail_relative_length: ['tail_longer_than_body', 'web_reference', 'Plazi/HMW treatment', 'https://tb.plazi.org/GgServer/html/1E30E27534C3FF72E1852F14752D885B', 'Indochinese forest rat account lists tail length longer than head-body length.', 'high']
  },
  rattus_norvegicus: {
    rodent_tail_relative_length: ['tail_shorter_than_body', 'web_reference', 'Animal Diversity Web', 'https://animaldiversity.org/accounts/Rattus_norvegicus/', 'Brown rat account describes the tail as shorter than body length.', 'high']
  }
};

const traitIds = traitSchema.traits.map(t => t.id);
for (const row of traits) {
  for (const id of traitIds) {
    if (!(id in row)) row[id] = '';
  }
  const updates = factUpdates[row.species_key] || {};
  for (const [traitId, [value]] of Object.entries(updates)) {
    row[traitId] = value;
  }
}

const provenanceKey = row => `${row.species_key}::${row.trait_id}::${row.trait_value}`;
const provenanceByKey = new Map(provenance.map(row => [provenanceKey(row), row]));
for (const [speciesKey, updates] of Object.entries(factUpdates)) {
  for (const [traitId, [value, sourceType, sourceName, sourceUrl, citation, confidence]] of Object.entries(updates)) {
    const entry = {
      species_key: speciesKey,
      trait_id: traitId,
      trait_value: value,
      source_type: sourceType,
      source_name: sourceName,
      source_url: sourceUrl,
      citation,
      access_date: '2026-09-07',
      confidence,
      method: 'phase_readiness_trait_batch',
      notes: 'Externally visible discriminator; measurements, skull, dental, genetic, and echolocation traits excluded.'
    };
    provenanceByKey.set(provenanceKey(entry), entry);
  }
}

writeJson('trait_schema.json', traitSchema);
writeJson('question_schema.json', questionSchema);
writeJson('question_constraints.json', constraints);
writeCsv('mammal_traits.csv', traits, ['species_key', 'scientific_name', ...traitIds]);
writeCsv('trait_provenance.csv', Array.from(provenanceByKey.values()), [
  'species_key',
  'trait_id',
  'trait_value',
  'source_type',
  'source_name',
  'source_url',
  'citation',
  'access_date',
  'confidence',
  'method',
  'notes'
]);

console.log(`Applied ${newTraits.length} trait definitions and ${Object.values(factUpdates).reduce((sum, updates) => sum + Object.keys(updates).length, 0)} trait facts.`);
