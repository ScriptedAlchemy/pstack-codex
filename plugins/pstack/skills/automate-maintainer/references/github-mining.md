# GitHub mining

Use the available GitHub connector or authenticated `gh`. Check `gh auth status` without printing credentials. Connector schemas and CLI help define supported arguments. Never put a token in commands or an evidence file.

## Discovery queries

The following are query shapes. Substitute the verified login, repository, and cutoff, shell-quote every argument, and consult the installed CLI help before using flags.

```sh
gh api 'users/LOGIN'
gh repo view OWNER/REPO --json nameWithOwner,visibility,defaultBranchRef
gh search prs --repo OWNER/REPO --author LOGIN --updated '>=YYYY-MM-DD' --limit 100
gh search prs --repo OWNER/REPO --reviewed-by LOGIN --updated '>=YYYY-MM-DD' --limit 100
gh search issues --repo OWNER/REPO --involves LOGIN --updated '>=YYYY-MM-DD' --limit 100
gh pr view NUMBER --repo OWNER/REPO --json author,body,commits,files,reviews,url
gh pr diff NUMBER --repo OWNER/REPO
gh api --paginate 'repos/OWNER/REPO/pulls/NUMBER/reviews'
gh api --paginate 'repos/OWNER/REPO/pulls/NUMBER/comments'
gh api --paginate 'repos/OWNER/REPO/issues/NUMBER/comments'
gh api --paginate 'repos/OWNER/REPO/issues/NUMBER/events'
```

For organization scope, enumerate accessible repositories and record which ones were searched. For global scope, record the repositories returned and any search limit. Query discussions through supported GraphQL or connector operations when available; report their omission otherwise. GitHub activity feeds have limited retention and cannot substitute for a year of PR and review history.

Search results are candidates. `updated` applies to the PR or issue, not the subject's contribution. Filter review, comment, and commit timestamps against the evidence window and authors against the exact verified login. `involves` can match a mention or assignment; it does not prove the person wrote anything. Deduplicate by stable source URL or ID.

Paginate detail endpoints. Search caps can still truncate results; split busy queries into date windows and report remaining limits. Keep counts and omissions per source. Do not claim an exhaustive crawl when queries were capped or access failed.

## Code and review context

Inspect authored patches and file context. PR authorship does not attribute every commit or line to that person. Check commit authors and collaborators; Git author strings alone do not establish a GitHub identity. Use linked accounts where available, and leave uncertain authorship unresolved.

Review records include the reviewed `commit_id`. Inline comments can include `original_commit_id`, paths, line positions, and diff hunks. Fetch that version when interpreting a request or building a held-out case. Current `gh pr diff` may already include fixes made after the review. If the historical diff cannot be reconstructed, exclude the case from verdict comparison and report why.

Read thread replies and their resolution before labeling an ask mandatory. Preserve the subject's reasoning and counterexamples. A merged PR alone does not prove the subject approved it.

## Ledger

Store account, repository, visibility, source URL or ID, source date, reviewed commit when relevant, source kind, observation, candidate rule, and counterexamples. Mark reserved PR IDs before collecting training material, and exclude their entire conversations from mining workers. Keep evaluation material separate.

Record the collection date, actual evidence cutoff, source coverage, and any inaccessible repositories. Check the visibility of both evidence repositories and the output destination before copying links or quotations. Resolve existing output skills and callers before migrating a legacy name.
