# Business plan reviews

The live plan is `/plan` on the dashboard; its words live in `src/lib/plan.js`.
This folder holds the reviews of that plan against the app as it stood on a
given night: what the plan says, what the code and the live site say, and the
exact words to change. Nothing here is the plan. It is the reading that keeps
the plan honest (Standing Rule 24).

One file per review, dated. Each has three parts:

1. **Checked**: every claim about what has changed, against the code and the live site.
2. **Decided, not reopened**: the owner's decisions, with any hard evidence against them, sourced.
3. **The patch**: the lines in `src/lib/plan.js` to change, old and new, for whichever session applies it.

A review never edits `src/` itself when other sessions are building the same
night. It writes the patch down and the next build applies it.

| Date | File | Read against |
|---|---|---|
| 19 Oct 2026 | [2026-10-19-review.md](./2026-10-19-review.md) | v1.65.3 on main, the live site, DNS |
