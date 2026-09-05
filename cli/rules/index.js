import { rule as frontmatterRequired } from './frontmatter-required.js';
import { rule as frontmatterFields } from './frontmatter-fields.js';
import { rule as placeholderPresent } from './placeholder-present.js';
import { rule as linkBroken } from './link-broken.js';
import { rule as indexMissing } from './link-index-missing.js';
import { rule as typeMismatch } from './link-type-mismatch.js';
import { rule as pageOrphan } from './page-orphan.js';
import { rule as citationMalformed } from './citation-malformed.js';
import { rule as citationTarget } from './citation-target-missing.js';
import { rule as excessInferred } from './provenance-excess-inferred.js';
import { rule as lowConfidence } from './provenance-low-confidence.js';
import { rule as contradicted } from './provenance-contradicted.js';
import { rule as staleClaim } from './provenance-stale-claim.js';

export const RULES = [
  frontmatterRequired, frontmatterFields, placeholderPresent,
  linkBroken, indexMissing, typeMismatch, pageOrphan,
  citationMalformed, citationTarget,
  excessInferred, lowConfidence, contradicted, staleClaim,
];
