// Spacing rules between chat items (in px)
// Key format: "prevType→nextType"
// Use "*" as wildcard for any type

const rules = {
  'person→person': 48,
  'person→transcript': 48,
  'person→data': 48,
  'person→image': 48,
  'person→calllog': 48,
  'transcript→person': 48,
  'transcript→transcript': 24,
  'transcript→data': 24,
  'transcript→image': 32,
  'transcript→calllog': 24,
  'data→person': 48,
  'data→transcript': 24,
  'data→data': 24,
  'data→image': 32,
  'data→calllog': 24,
  'image→person': 48,
  'image→transcript': 24,
  'image→data': 24,
  'image→image': 24,
  'image→calllog': 24,
  'calllog→person': 48,
  'calllog→transcript': 24,
  'calllog→calllog': 24,
  'calllog→data': 24,
  'calllog→image': 32,
  'gallery→person': 48,
  'gallery→transcript': 24,
  'gallery→data': 24,
  'gallery→image': 24,
  'gallery→calllog': 24,
  'gallery→gallery': 24,
  'person→gallery': 48,
  'transcript→gallery': 32,
  'data→gallery': 32,
  'image→gallery': 24,
  'calllog→gallery': 32,
}

const DEFAULT = 32

// Fixed spacing (px) between dialogue section and quote cards
export const SECTION_BOTTOM_SPACING = 150
export const SECTION_TOP_SPACING = 80

export function getSpacing(prevType, nextType) {
  return rules[`${prevType}→${nextType}`]
    ?? rules[`*→${nextType}`]
    ?? rules[`${prevType}→*`]
    ?? DEFAULT
}
