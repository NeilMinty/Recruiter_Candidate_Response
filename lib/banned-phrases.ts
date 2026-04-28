/**
 * Phrases banned from agent-generated rejection emails.
 * Add to this list as new template language is identified in generated output.
 */
export const BANNED_PHRASES: string[] = [
  "we've decided not to progress your application",
  "we're moving forward with other candidates",
  "we've decided to move forward with other candidates",
  "we will keep your CV on file",
  "we wish you all the best in your search",
  "we wish you all the best in your future endeavours",
  "thank you for your interest in this opportunity",
  "after careful consideration",
  "we had many strong candidates",
  "this was a difficult decision",
  "you were not successful on this occasion",
  "we will be in touch if a suitable role arises",
]

/**
 * Structural constructions banned from agent-generated rejection emails.
 * These are pattern-level rules, not exact phrase matches.
 */
export const BANNED_CONSTRUCTIONS: string[] = [
  'Any sentence that begins with "Unfortunately"',
  'Any sentence that begins with "Regrettably"',
  '"fit" used as a noun (e.g. "not the right fit", "culture fit", "good fit")',
  '"at this time" used as a qualifier',
  'Passive voice for the rejection decision itself — state the decision directly and own it (e.g. "we have decided" not "it has been decided" or "a decision has been made")',
]
