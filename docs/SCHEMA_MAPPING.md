# Schema mapping – concept names ↔ App C names

Rule (concept section 8): existing names from the Central app (B) win; concept names are used for everything new. Column names stay English snake_case; German exists only in UI texts.
Status: Stage 0 proposal, 05.11.2026. Items marked **(Q…)** depend on an open question in `ANALYSE.md`.

Legend: **keep** = as in B · **change** = exists in B, altered · **new** = not in B · **drop** = in B, not in App C

## 1 Tables

| Concept (8.1) | App C | Action | Note |
| --- | --- | --- | --- |
| `organizations` | `organisations` | change | office fields of `found_offices` move in (1 office per organisation, concept has no separate office) |
| – | `found_offices` | drop | merged into `organisations` |
| `memberships` | `memberships` | change | + `role` |
| `items` | `found_items` | change | |
| (part of `items`) | `found_item_internal` | keep | concept puts internal fields on `items`; a separate table is safer (anon can never read it) and B's RLS is proven |
| `item_history` | `item_history` | new | |
| `loss_reports` | `loss_reports` | change | |
| `claims` | `return_requests` | change | |
| `finder_prereports` | – | not built | S5, only on request |
| `match_suggestions` | `match_suggestions` | new | used for `source = 'regel'` cache + badge counts; `'ki'` only with S2 |
| `color_relations` | `color_relations` | new | |
| `search_synonyms` | `search_synonyms` | new | |
| `query_expansions` | – | not built | S3 AI part, only on request |
| `ai_calls` | `ai_calls` | new | stage 8 |
| `rate_limits` | `rate_limits` | new | replaces B's `ai_requests`, also used by public insert RPCs |
| `simulated_emails` | `simulated_emails` | change | + `related_type`, `related_id` replaced by the existing two FKs (see 2.8) |
| – | `ai_requests` | drop | replaced by `rate_limits` |
| view `public_items` | view `public_items` | new | |

## 2 Columns

### 2.1 `organisations` (concept `organizations`)

| Concept | App C | Action |
| --- | --- | --- |
| `slug` | `slug` | keep |
| `name` | `name` | keep |
| `kuerzel` | `short_code` | keep |
| `adresse` | `address` | keep |
| `abgabeort` | `drop_off_location` | new (was `found_offices.location`) |
| `oeffnungszeiten` (jsonb per weekday) | `opening_hours` text | keep as text **(Q6)** |
| `abholregeln` | `pickup_rules` | new (was `found_offices.pickup_notes`) |
| `aufbewahrung_tage` (default 90) | `retention_days` int default 90 | new |
| – | `type` | keep (school, lost_property_office, company, other – shown on office page) |
| – | `contact_email`, `contact_phone` | keep (from `found_offices`) |
| – | `next_item_seq` | drop → counter table per organisation and year (`item_number_counters`) |

### 2.2 `memberships`

| Concept | App C | Action |
| --- | --- | --- |
| `user_id` | `user_id` | keep |
| `org_id` | `organisation_id` | keep |
| `role` (staff, admin) | `role` enum `member_role` default `staff` | new |
| – | `full_name` | keep |

### 2.3 `found_items` (concept `items`)

| Concept | App C | Action |
| --- | --- | --- |
| `fundnummer` | `item_number` | keep (`CODE-YYYY-NNNN`, counter restarts each year) |
| `title` | `title` | keep |
| `category` | `category` | keep, enum extended **(Q9)** |
| `colors` (text[]) | `colors item_color[]` not empty | change (was single `color`) **(Q10)** |
| `brand` | `brand` | keep |
| `public_description` | `public_description` | keep |
| `internal_feature` | `found_item_internal.identifying_feature` | keep (separate table) |
| `internal_note` | `found_item_internal.internal_note` | keep |
| `storage_location` (not null) | `found_item_internal.storage_location` not null, check non-empty | change |
| `found_at` (date) | `found_on` | keep |
| `found_place` | `found_location` | keep |
| `status` (available, reserved, returned, disposed) | `status` + value `disposed` | change |
| `is_public` | `is_public` | keep **(Q2)** |
| `photo_path` | `photo_path` | keep |
| `created_by` | `created_by` uuid → auth.users | new |
| `created_at`, `updated_at` | same | keep |

### 2.4 `item_history` (new)

| Concept | App C |
| --- | --- |
| `item_id` | `item_id` |
| `changed_by` | `changed_by` |
| `changed_at` | `changed_at` |
| `field` | `field` |
| `old_value`, `new_value` | `old_value`, `new_value` (text) |

Filled by a trigger on `found_items` and `found_item_internal` (one row per changed field, incl. status).

### 2.5 `loss_reports`

| Concept | App C | Action |
| --- | --- | --- |
| `org_id` (null = «Weiss nicht») | `organisation_id` | keep |
| `title` | `title` | keep |
| `category` | `category` | keep |
| `colors` | `colors item_color[]` (may be empty) | change (was `color`, required) |
| `brand` | `brand` | keep |
| `description` | `description` | keep |
| `private_feature` | `private_feature` | new (only staff, never public, never AI) |
| `place` | `lost_location` | keep |
| `date_from`, `date_to` | `lost_from`, `lost_to` | change (was `lost_on`) |
| `date_uncertain` | `lost_date_uncertain` bool | new |
| `email` (required) | `reporter_email` | change (was `reporter_contact`, email or phone) |
| `name` (optional) | `reporter_name` nullable | change |
| `notify` | `notify` default true | new **(Q8)** |
| `token_hash` | `token_hash` bytea unique | change (was plain `access_token`) |
| `status` (open, closed) | `status` | keep |
| `created_at` | `created_at` | keep |
| – | `closed_at` | new |

### 2.6 `return_requests` (concept `claims`)

| Concept | App C | Action |
| --- | --- | --- |
| `item_id` | `item_id` | keep |
| – | `organisation_id` | keep (needed for RLS) |
| `recognition_text` | `recognition_text` | change (was `proof_description`; UI «Woran erkennst du deinen Gegenstand?») |
| `email` (required) | `claimant_email` | change (was `claimant_contact`) |
| `name` (required) | `claimant_name` | keep |
| `phone` | `claimant_phone` | new |
| `message` | `message` | keep |
| `pickup_by_other` | `pickup_by_other` bool + `pickup_person_name` | new |
| `token_hash` | `token_hash` | change (was plain `access_token`) |
| `status` | `status` (open, confirmed, rejected, completed) | keep |
| timestamps per status | `created_at`, `confirmed_at`, `rejected_at`, `completed_at` | change (was `decided_at`) |
| – | `pickup_instructions`, `decision_note` | keep |

### 2.7 `match_suggestions` (new)

`loss_report_id`, `item_id`, `source` (`regel`, `ki`), `score`, `reasons` jsonb, `notified_at`, `created_at`, unique (`loss_report_id`, `item_id`, `source`). Concept uses `loss_id`.

### 2.8 `simulated_emails`

Keep B's columns (`organisation_id`, `return_request_id`, `loss_report_id`, `recipient`, `subject`, `body`, `link_path`, delivery columns). The concept's `related_type`/`related_id` express the same as the two existing foreign keys, which also give cascade deletes → no new columns. Outbox shows the reference from these FKs.

### 2.9 Small new tables

| Table | Columns |
| --- | --- |
| `color_relations` | `color`, `related` (both `item_color`), PK (color, related); symmetric rows from concept 6.3 |
| `search_synonyms` | `group_id`, `term` (normalised: lower case, ä→ae …), PK (group_id, term) |
| `rate_limits` | `key_hash`, `bucket` (e.g. `loss_report`, `claim`, `ai`), `count`, `window_start`, PK (key_hash, bucket, window_start) |
| `ai_calls` | `action`, `duration_ms`, `ok`, `tokens_in`, `tokens_out`, `organisation_id`, `created_at` |
| `item_number_counters` | `organisation_id`, `year`, `next_seq`, PK (organisation_id, year) |

## 3 Enums

| Enum | App C values | Change vs. B |
| --- | --- | --- |
| `item_category` | electronics, clothing, keys, bags, wallets, jewellery, sports, other (+ `id_cards` **Q9**) | maybe + `id_cards` |
| `item_color` | black, grey, white, beige, brown, red, pink, orange, yellow, green, turquoise, blue, violet, silver, gold, multicolor | + beige, orange, turquoise, violet; − `other` **(Q10)** |
| `item_status` | available, reserved, returned, disposed | + disposed |
| `request_status` | open, confirmed, rejected, completed | same |
| `loss_report_status` | open, closed | same |
| `member_role` | staff, admin | new |
| `organisation_type` | school, lost_property_office, company, other | same |
| `email_delivery_status` | pending, sent, failed, skipped | same |

## 4 RPCs

| Concept | App C | Who | Action |
| --- | --- | --- | --- |
| `create_loss_report` | `create_loss_report` | anon | change (was `submit_loss_report`): new fields, returns raw token once, stores hash, rate limit 10/h, confirmation mail |
| `get_my_loss(token)` | `get_my_loss` | anon | change (was `get_loss_report`) + matches |
| `close_my_loss(token)` | `close_my_loss` | anon | new |
| `set_loss_notify(token, bool)` | `set_loss_notify` | anon | new (only if Q8 = show) |
| `create_claim` | `create_claim` | anon | change (was `submit_return_request`) |
| `get_my_claim(token)` | `get_my_claim` | anon | change (was `get_return_request_status`) |
| `match_for_loss(loss_id)` | `match_for_loss` | staff; anon only via `get_my_loss` | new (replaces client-side `findMatches`) |
| `match_for_item(item_id)` | `match_for_item` | staff | new |
| – | `match_for_draft(...)` | anon | new: live matches while filling in the form (step 2), same logic, public fields only |
| – | `save_item(item, internal)` | staff | new: item + internal + history in one transaction (replaces two client writes) |
| – | `set_item_status` | staff | change (was `change_item_status`) + `disposed`, history |
| – | `decide_return_request`, `complete_return` | staff | keep / split «Übergabe abschliessen» |
| – | `close_loss_report`, `notify_loss_report_match` | staff | keep (wording of mail per 9.3) |
| `purge_old_contacts()` | `purge_old_contacts` | service role | new (stage 9) |
| – | `register_organisation` | – | drop (Won't) |
| – | `current_organisation_id`, `require_organisation`, `queue_email`, `slugify` | internal | keep (+ `current_role()`) |
| `reset_demo()` | `reset_demo` | admin only **(Q3)** | change |

## 5 Routes (old B → App C)

| B | App C |
| --- | --- |
| `/` | `/` |
| `/suche` | `/suche` (params `q`, `kat`, `farbe`, `von`, `bis`, `stelle`) |
| `/fund/:id` (uuid) | `/fund/:fundnummer` **(Q11)** |
| `/o/:slug` | `/o/:slug` |
| – | `/fundstellen` |
| `/verlust-melden` | `/verlust-melden` (`?stelle=:slug`) |
| `/status/meldung/:token` | `/verlust/:token` |
| `/status/anfrage/:token` | `/anfrage/:token` |
| – | `/gefunden` |
| – | `/hilfe` |
| `/meine-anfragen` | kept as small extra («Meine Meldungen», browser storage) – concept 5.8 |
| `/anmelden` | `/verwaltung/login` |
| `/registrieren` | dropped |
| `/verwaltung` (item list) | `/verwaltung` (overview) + `/verwaltung/funde` |
| `/verwaltung/neu` | `/verwaltung/funde/neu` |
| `/verwaltung/gegenstand/:id` (+ `/bearbeiten`) | `/verwaltung/funde/:id` (edit on the same page) |
| `/verwaltung/anfragen`, `/anfragen/:id` | same |
| `/verwaltung/meldungen` | `/verwaltung/meldungen` + `/verwaltung/meldungen/:id` |
| `/verwaltung/postausgang` | same |
| `/verwaltung/fundstelle` | same (admin only) |

No redirects needed: B is deleted and its data wiped.
