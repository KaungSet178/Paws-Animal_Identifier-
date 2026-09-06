// Explore groups mammals by a friendly grouping of taxonomic order.
// `key` values match the `group` field produced by scripts/generate-species-data.mjs.
export const GROUP_META = {
  bats: { name: 'Bats', orders: ['Chiroptera'] },
  rodents: { name: 'Rodents', orders: ['Rodentia'] },
  hoofed: { name: 'Hoofed Mammals', orders: ['Artiodactyla', 'Perissodactyla'] },
  carnivores: { name: 'Carnivores', orders: ['Carnivora'] },
  shrews: { name: 'Shrews & Moles', orders: ['Eulipotyphla'] },
  primates: { name: 'Primates', orders: ['Primates'] },
  other: {
    name: 'Other',
    orders: ['Pholidota', 'Lagomorpha', 'Sirenia', 'Scandentia', 'Proboscidea', 'Dermoptera'],
  },
}

export const GROUP_ORDER = ['bats', 'rodents', 'hoofed', 'carnivores', 'shrews', 'primates', 'other']

export function getGroupMeta(key) {
  return GROUP_META[key] || null
}

export function groupName(key) {
  return GROUP_META[key]?.name || 'Mammals'
}
