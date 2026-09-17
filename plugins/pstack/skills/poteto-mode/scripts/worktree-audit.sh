#!/usr/bin/env bash
# Read-only worktree prune audit. Classifies every git worktree by size, merge
# state, uncommitted work, remote/PR state, and the most recent chat that
# operated in it. Emits a table sorted by size with a suggested bucket. Never
# deletes anything; deletion stays a human-gated step in the playbook.
#
# Usage: worktree-audit.sh [repo-path]   (defaults to the current repo)
set -u

repo="${1:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -z "$repo" ] && { echo "not in a git repo; pass a repo path" >&2; exit 1; }
cd "$repo" || exit 1

# Main worktree is the first entry; everything else is a candidate.
main_wt=$(git worktree list --porcelain | sed -n 's/^worktree //p' | head -1)

# Cached refs only: an audit must not fetch or change repository state.
# Staleness makes the audit conservative. Revalidate before deletion.
git rev-parse --verify origin/main >/dev/null 2>&1 || echo "warn: origin/main unavailable; merge state is unknown" >&2

# PR state by branch, fetched once. Empty if gh is unavailable.
prs=$(mktemp)
trap 'rm -f "$prs"' EXIT
gh pr list --author "@me" --state all --limit 1000 \
	--json number,state,headRefName 2>/dev/null > "$prs" || echo "[]" > "$prs"

# Codex session records. The path match below narrows hits to sessions that
# actually operated in this worktree.
transcripts="$HOME/.codex/sessions"
now=$(date +%s)

printf "SIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE\n"

git worktree list --porcelain -z | while IFS= read -r -d '' record; do
	case "$record" in 'worktree '*) wt=${record#worktree } ;; *) continue ;; esac
	[ "$wt" = "$main_wt" ] && continue

	size=$(du -sh "$wt" 2>/dev/null | awk '{print $1}')
	head=$(git -C "$wt" rev-parse HEAD 2>/dev/null)
	head_ts=$(git -C "$wt" log -1 --format='%ct' HEAD 2>/dev/null || echo 0)
	age=$([ "$head_ts" -gt 0 ] 2>/dev/null && echo "$(( (now - head_ts) / 86400 ))d" || echo "?")

	# A merged PR alone does not prove the current head is preserved: commits
	# may have been added after its merge. Only ancestry gets the safe bucket.
	git merge-base --is-ancestor "$head" origin/main 2>/dev/null && merged=YES || merged=no

	# Untracked files are user data too, never disposable by inference.
	if ! porcelain=$(git -C "$wt" status --porcelain 2>/dev/null); then dirty=unknown
	elif [ -z "$porcelain" ]; then dirty=clean
	elif printf '%s\n' "$porcelain" | grep -qv '^??'; then
		dirty="wip:$(printf '%s\n' "$porcelain" | grep -cv '^??')"
	else dirty="scratch:$(printf '%s\n' "$porcelain" | grep -c '^??')"; fi

	branch=$(git -C "$wt" symbolic-ref --quiet --short HEAD 2>/dev/null || echo "")
	if [ -z "$branch" ]; then remote=detached
	elif git -C "$wt" show-ref --verify --quiet "refs/remotes/origin/$branch"; then
		[ "$(git -C "$wt" rev-parse "origin/$branch" 2>/dev/null)" = "$head" ] \
			&& remote=pushed \
			|| remote="ahead$(git -C "$wt" rev-list --count "origin/$branch..HEAD" 2>/dev/null)"
	else remote=no-remote; fi

	pr=$([ -n "$branch" ] && jq -r --arg b "$branch" \
		'.[] | select(.headRefName==$b) | "#\(.number)/\(.state)"' "$prs" 2>/dev/null | head -1)
	[ -z "$pr" ] && pr="-"

	# Only session metadata establishes ownership. Quoted paths in arbitrary
	# conversation text can reference unrelated worktrees. Preserve spaces.
	last="-"; last_ts=0
	if [ -d "$transcripts" ]; then
		while IFS= read -r -d '' transcript; do
			if head -n 1 "$transcript" | jq -e --arg wt "$wt" '.type == "session_meta" and .payload.cwd == $wt' >/dev/null 2>&1; then
				stamp=$(stat -f '%m' "$transcript" 2>/dev/null || stat -c '%Y' "$transcript" 2>/dev/null)
				if [ "$stamp" -gt "$last_ts" ] 2>/dev/null; then last_ts=$stamp; fi
			fi
		done < <(rg --files --hidden -0 -g '*.jsonl' "$transcripts" 2>/dev/null)
		if [ "$last_ts" -gt 0 ]; then last=$(date -r "$last_ts" '+%Y-%m-%d' 2>/dev/null || date -d "@$last_ts" '+%Y-%m-%d' 2>/dev/null); fi
	fi
	recent=$([ "$last_ts" -gt 0 ] 2>/dev/null && [ $(( (now - last_ts) / 86400 )) -le 4 ] && echo yes || echo no)

	case "$dirty" in wip:*|scratch:*|unknown) bucket=hold-wip ;; *)
		case "$pr" in *OPEN*) bucket=hold-open-pr ;; *)
			if [ "$recent" = yes ]; then bucket=verify-recent-chat
			elif [ "$merged" = YES ]; then bucket=safe
			else bucket=review; fi ;;
		esac ;;
	esac

	printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
		"$size" "$age" "$merged" "$dirty" "$remote" "$pr" "$last" "$bucket" "$wt"
done | sort -t$'\t' -k1,1 -rh

rm -f "$prs"
