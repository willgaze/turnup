#!/usr/bin/env bash
#
# The one thing scripts/apple-wallet.sh must never do: upload the folder that
# holds the private key.
#
#   bash scripts/check-wallet-script.sh
#
# On 21 Oct 2026 the script's last step was `vercel --prod --yes`, run inside
# ~/TurnUp-Apple, and it put pass.key on a production deployment. The fix is
# vc(): an allowlist of commands that upload nothing, run only from an empty
# temporary folder. This check proves that, rather than trusting a comment.
#
# It LIFTS vc() out of the real script at runtime rather than keeping a copy,
# so the check cannot drift away from the thing it is checking. If the shape
# of that function changes, this stops finding it and fails loudly instead of
# quietly testing nothing.
set -u

HERE=$(cd "$(dirname "$0")" && pwd)
SCRIPT="$HERE/apple-wallet.sh"
[ -f "$SCRIPT" ] || { echo "No $SCRIPT"; exit 1; }

fail=0

# No raw deploy may survive anywhere it could actually run. Comments and
# quoted strings are stripped first: line 208 is a WARNING that contains the
# words "vercel --prod", and a check that cannot tell a warning from a command
# cries wolf until somebody stops reading it.
RAW=$(sed -e 's/#.*$//' -e 's/"[^"]*"//g' -e "s/'[^']*'//g" "$SCRIPT" \
  | grep -nE '\bvercel +(--prod|deploy|build|dev|\.)' || true)
if [ -n "$RAW" ]; then
  echo "  FAIL  a vercel deploy is still reachable:"; echo "$RAW" | sed 's/^/        /'; fail=1
else
  echo "  ok    no vercel deploy anywhere in the script"
fi

# Every real call goes through vc().
BARE=$(sed -e 's/#.*$//' -e 's/"[^"]*"//g' -e "s/'[^']*'//g" "$SCRIPT" \
  | grep -nE '^\s*command +vercel|^\s*vercel +' | grep -v 'command vercel' || true)
if [ -n "$BARE" ]; then
  echo "  FAIL  a vercel call bypasses vc():"; echo "$BARE" | sed 's/^/        /'; fail=1
else
  echo "  ok    every vercel call goes through vc()"
fi

# Lift vc() verbatim and run it against a stub vercel that shouts if reached.
BODY=$(awk '/^    vc\(\) \{/,/^    \}/' "$SCRIPT")
if ! echo "$BODY" | grep -q 'command vercel'; then
  echo "  FAIL  could not find vc() in $SCRIPT - this check is no longer testing anything"
  exit 1
fi

WORK=$(mktemp -d); STUB=$(mktemp -d)
printf '#!/bin/sh\necho "REACHED VERCEL: $*"\n' > "$STUB/vercel"; chmod +x "$STUB/vercel"
trap 'rm -rf "$WORK" "$STUB"' EXIT

run() {  # run one vc call in its own shell, from $2, and say whether vercel was reached
  local from=$1; shift
  (
    PATH="$STUB:$PATH"
    die() { printf 'Stopped: %s\n' "$1" >&2; exit 1; }
    say() { :; }
    KEY=apple/pass.key; SCOPE=test-scope; WORK="$WORK"
    eval "$BODY"
    cd "$from" || exit 1
    vc "$@"
  ) 2>&1
}

no() { # must never reach the CLI
  if run "$WORK" "$@" | grep -q 'REACHED VERCEL'; then
    echo "  FAIL  'vercel $*' reached the CLI"; fail=1
  else echo "  ok    'vercel $*' refused"; fi
}
allow() { # must reach the CLI
  if run "$WORK" "$@" | grep -q 'REACHED VERCEL'; then echo "  ok    'vercel $*' allowed"
  else echo "  FAIL  'vercel $*' was refused but uploads nothing"; fail=1; fi
}

echo
echo "  Anything that could upload the key folder:"
for c in "--prod --yes" "deploy" "." "--prod" "build" "dev" "pull"; do no $c; done

echo
echo "  Anything that uploads nothing:"
allow whoami
allow env ls
allow redeploy www.getturnup.com
allow promote some-deployment-url

echo
echo "  The folder it runs from:"
if run /tmp whoami | grep -q 'REACHED VERCEL'; then
  echo "  FAIL  ran vercel outside the empty folder"; fail=1
else echo "  ok    refused outside the empty temporary folder"; fi

touch "$WORK/pass.key"
if run "$WORK" whoami | grep -q 'REACHED VERCEL'; then
  echo "  FAIL  ran vercel with a key sitting in the folder"; fail=1
else echo "  ok    refused once a key is in the folder"; fi
rm -f "$WORK/pass.key"

echo
[ $fail -eq 0 ] && echo "The key cannot be uploaded by this script." || echo "FAILED"
exit $fail
