---
name: automate-team
description: "Create or update a team mode by discovering a GitHub repository's active core contributors and mining their code, commits, PRs, reviews, issues, and discussions. Use for automate team, capture this repo's maintainers' engineering conventions, or build a mode from the core contributors' work."
---

Before following this workflow, read [the Codex runtime contract](../../CODEX.md). It defines plugin paths, model configuration, delegation, and persistence.

# Automate team

Discover the core contributors of a repository and build a mode from their observed engineering conventions. Use [automate-maintainer](../automate-maintainer/SKILL.md) for evidence collection, individual attribution, group synthesis, authoring, and evaluation. Read that workflow before mining. This skill supplies its roster and repository scope; do not duplicate the mining process.

## Establish the repository

Accept a repository URL or `owner/repo`. Otherwise resolve the current checkout's Git remote. If several remotes identify different projects and the intended one is unclear, ask which repository to study. Default to the last 12 months. A request for several repositories needs separate ownership and visibility records for each.

Use an authenticated GitHub connector or `gh`. Verify the repository, its visibility, and its default branch. Record the repository and window before following links. Referenced external projects supply context, not permission to expand the crawl.

## Discover the core roster

Read current `CODEOWNERS`, maintainer lists, governance, and contributing documents where available. Compare that declared ownership with substantive activity in the window:

- Authored and merged PRs, with changes and actual authorship checked.
- Reviews and inline discussions across other authors' PRs.
- Design discussions, issue triage, release decisions, and maintained subsystems.
- Contributor and commit summaries as candidate discovery, with bots excluded.

Paginate relevant endpoints and query busy periods separately when search caps apply. Record the searched range and omissions. A lifetime contributor ranking can miss newer reviewers and overstate inactive authors. Stars, followers, organization membership, commit totals, and appearances in `CODEOWNERS` alone do not establish an active core role.

Build a roster showing each login, declared role when present, active ownership areas, evidence URLs, and the reason for inclusion. Prefer declared maintainers with current activity and people whose repeated authorship, review, or triage shows sustained responsibility. Include maintainers of specialized areas even when their activity is lower than the busiest accounts. List inactive declared maintainers and uncertain candidates separately.

Report the inferred roster and proceed with well-supported accounts. Ask only when identity, scope, an uncertain inclusion, or the size of the crawl materially changes the work. Honor a supplied inclusion or exclusion list. Do not silently limit "all core contributors" to the top few accounts. For a large roster, process it in batches and preserve a record of every included person. If quotas or unavailable sources prevent completion, save progress and identify exactly which accounts remain.

## Mine and draft

Pass the roster, repository, window, ownership evidence, output destination, and known omissions to automate-maintainer. Default to one `<repo>-team-mode` with individual evidence in references. Produce separately invocable individual modes too when requested. Preserve an existing team mode's name, category, and invocation policy.

Collect each person's record separately. Crawl relevant authored changes, reviews, replies, issues, and discussions in scope. Follow linked rationale when useful, while preserving access and visibility boundaries. Reserve evaluation cases before reading their conversations. Use collaboration tools for independent mining only when allowed; otherwise process the roster sequentially.

The team mode should state shared conventions, evidence-supported ownership, and disagreements. Attribute specialized rules to the people and areas that support them. A repository requirement can apply across the project without proving every contributor's personal preference. Do not claim unanimity when some members lack evidence, and do not resolve differences by raw activity counts.

Validate through skill-creator and the evaluation procedure in automate-maintainer. Report roster coverage, source coverage, unsupported areas, and validation limits. Land changes only within the user's existing authorization. Creating a mode does not start an autonomous team, authorize communication as its members, or schedule recurring crawling.

## Refresh

For an update, compare the current roster and ownership with the previous evidence cutoff. Reassess departed or inactive contributors, newly active owners, changed rules, and counterexamples. Preserve still-supported conventions and remove claims contradicted by recent evidence. Record membership changes and the new cutoff so a future refresh can continue without repeating the whole crawl.

Use automate-maintainer directly for a supplied person or group. Use automate-me for conventions mined from the user's own conversations.
