#!/usr/bin/env bash
#
# Apple Wallet signing, in two commands and no Keychain.
#
#   bash scripts/apple-wallet.sh csr              # 1. makes a key + a request file to upload to Apple
#   bash scripts/apple-wallet.sh finish pass.cer  # 2. turns Apple's certificate into the six settings
#   bash scripts/apple-wallet.sh vercel           # 3. (optional) sets the six in Vercel; never uploads this folder
#   bash scripts/apple-wallet.sh rotate           #    retires the key (kept in apple/old-*) and starts again
#
# Everything lands in ./apple/ which is gitignored. The private key never
# leaves this folder except as the value you paste into Vercel.
#
# DO BOTH HALVES IN ONE SITTING. The certificate Apple issues is bound to the
# key `csr` makes, and that key is gitignored — correctly, it is a credential —
# which means in a cloud session it lives only in that container and dies with
# it. Generate the key, upload the request, download the .cer and run `finish`
# without stopping. If the key is gone when the certificate arrives, the
# certificate is waste paper and the whole dance starts again.
#
# So do not run `csr` while the membership is still being approved. Approval
# takes a day or two; the container will not last that long. Wait for the
# "your membership is active" email, then do all of it at once.
#
# Better still, run it on the owner's own Mac, where ./apple/ survives: that is
# the Cowork job in docs/cowork-apple-wallet.md. It needs only curl and the
# openssl every Mac ships with.
#
# Why not Keychain Access: Apple's instructions assume a Mac and a trip through
# Certificate Assistant, which is where most first-timers get lost. openssl
# does the same job in two lines and works anywhere.
#
set -euo pipefail
cd "$(dirname "$0")/.."

DIR=apple
KEY=$DIR/pass.key
CSR=$DIR/pass.csr
PASS_ID="${PASS_TYPE_ID:-pass.com.getturnup.job}"
WWDR_URL=https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
# Where the settings go, named rather than guessed from whatever this folder is.
SCOPE="${VERCEL_SCOPE:-willgazes-projects}"
PROJECT="${VERCEL_PROJECT:-turnup}"
HOST="${TURNUP_HOST:-www.getturnup.com}"
ENV_URL="https://vercel.com/$SCOPE/$PROJECT/settings/environment-variables"

say() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
die() { printf '\n\033[1;31mStopped:\033[0m %s\n' "$1" >&2; exit 1; }
command -v openssl >/dev/null || die "openssl is not installed."

case "${1:-}" in
  csr|rotate)
    if [ "$1" = rotate ]; then
      if [ -f "$KEY" ]; then
        OLD="$DIR/old-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$OLD"
        for f in pass.key pass.csr pass.pem key.password turnup.env wwdr.cer wwdr.pem; do
          [ -f "$DIR/$f" ] && mv "$DIR/$f" "$OLD/"
        done
        chmod 700 "$OLD"
        say "The old key and everything made from it are now in $OLD (kept, never deleted)."
        ROTATED=1
      else
        say "No key to retire. Making the first one."
      fi
    elif [ -f "$KEY" ]; then
      die "There is already a key at $KEY. A new one would orphan the certificate Apple issued for it.
  If you only need the request file again, it is $CSR.
  If the key has been exposed and must be replaced:  bash scripts/apple-wallet.sh rotate"
    fi
    cat <<'WARN'

  ────────────────────────────────────────────────────────────
   Before you go further: can you finish in this same sitting?

   The certificate Apple gives you only works with the key this
   command is about to make, and that key is not saved to git —
   it is a credential. In a cloud session it dies with the
   container, usually within the hour.

   You need, right now:
     - a LIVE Apple Developer membership (the email has arrived)
     - ten minutes to upload the request and download the .cer
     - to run `finish` before you close this

   Still waiting on approval? Stop here and come back to it.
  ────────────────────────────────────────────────────────────

WARN
    mkdir -p "$DIR"
    [ -f "$KEY" ] && die "$KEY appeared while this ran. Stopping rather than overwrite it."
    {
      say "Making a private key (encrypted; the passphrase is saved in $DIR/key.password)"
      PW=$(openssl rand -hex 16)
      printf '%s' "$PW" > "$DIR/key.password"; chmod 600 "$DIR/key.password"
      # -traditional is OpenSSL 3 (an encrypted PKCS#1 "RSA PRIVATE KEY", which
      # is what the signing library reads). macOS ships LibreSSL, which has no
      # such flag and writes that format anyway, so fall back without it.
      openssl genrsa -aes256 -passout "pass:$PW" -traditional -out "$KEY" 2048 2>/dev/null \
        || openssl genrsa -aes256 -passout "pass:$PW" -out "$KEY" 2048 2>/dev/null \
        || die "openssl could not make a key."
      grep -q 'BEGIN RSA PRIVATE KEY' "$KEY" || die "The key is not in the PKCS#1 form the signer reads. Which openssl is this? (openssl version)"
      chmod 600 "$KEY"
    }
    PW=$(cat "$DIR/key.password")
    say "Making the certificate request for $PASS_ID"
    openssl req -new -key "$KEY" -passin "pass:$PW" -out "$CSR" \
      -subj "/CN=$PASS_ID/O=TurnUp/C=GB" 2>/dev/null
    cat <<MSG

Done. Upload this file to Apple:  $(pwd)/$CSR

  1. https://developer.apple.com/account/resources/identifiers/list/passTypeId
     Press +, choose Pass Type IDs, Continue.
     Description: TurnUp job card    Identifier: $PASS_ID
     Continue, Register.
  2. https://developer.apple.com/account/resources/certificates/add
     Under Services choose "Pass Type ID Certificate", Continue.
     Pick $PASS_ID, Continue. Choose File -> the .csr above. Continue.
  3. Press Download. You get pass.cer. Then run:

       bash scripts/apple-wallet.sh finish ~/Downloads/pass.cer

MSG
    if [ "${ROTATED:-}" = 1 ]; then
      cat <<MSG
This was a rotation. Once 'finish' and the six settings are done and a job's
pass link answers 200, revoke the OLD certificate (and only the old one):

  https://developer.apple.com/account/resources/identifiers/list/passTypeId
  Open $PASS_ID. Its certificates are listed on that page (Revoke is
  there, not on the Certificates list). Revoke the one with the EARLIER
  expiry date; the new one has the later date. If Revoke is greyed out,
  ask Apple Developer Support: https://developer.apple.com/contact/

MSG
    fi
    ;;

  finish)
    CER="${2:-}"
    [ -n "$CER" ] && [ -f "$CER" ] || die "Give me the .cer Apple gave you:  bash scripts/apple-wallet.sh finish ~/Downloads/pass.cer"
    [ -f "$KEY" ] || die "No $KEY. Run 'bash scripts/apple-wallet.sh csr' first — the certificate only works with the key that requested it."
    PW=$(cat "$DIR/key.password")

    say "Reading Apple's certificate"
    if ! openssl x509 -inform DER -in "$CER" -out "$DIR/pass.pem" 2>/dev/null; then
      openssl x509 -in "$CER" -out "$DIR/pass.pem" 2>/dev/null || die "That file is not a certificate."
    fi
    SUBJECT=$(openssl x509 -in "$DIR/pass.pem" -noout -subject -nameopt RFC2253)
    TEAM=$(printf '%s' "$SUBJECT" | sed -n 's/.*OU=\([A-Z0-9]\{10\}\).*/\1/p')
    TYPE=$(printf '%s' "$SUBJECT" | sed -n 's/.*UID=\(pass\.[^,]*\).*/\1/p')
    [ -n "$TYPE" ] || TYPE="$PASS_ID"
    [ -n "$TEAM" ] || die "Could not read the Team ID from the certificate. Subject was: $SUBJECT"

    say "Checking the certificate matches the key"
    CM=$(openssl x509 -in "$DIR/pass.pem" -noout -modulus | openssl md5)
    KM=$(openssl rsa -in "$KEY" -passin "pass:$PW" -noout -modulus 2>/dev/null | openssl md5)
    [ "$CM" = "$KM" ] || die "This certificate was not made from $KEY. Make a fresh request with 'csr' and download a new certificate for it."

    say "Fetching Apple's WWDR G4 intermediate certificate"
    curl -fsSL "$WWDR_URL" -o "$DIR/wwdr.cer" || die "Could not download $WWDR_URL"
    openssl x509 -inform DER -in "$DIR/wwdr.cer" -out "$DIR/wwdr.pem"

    say "Checking Apple signed it"
    openssl verify -partial_chain -CAfile "$DIR/wwdr.pem" "$DIR/pass.pem" >/dev/null 2>&1 \
      || echo "   (could not verify the chain locally — fine if openssl lacks -partial_chain; Wallet will be the judge)"

    ENV=$DIR/turnup.env
    b64() { base64 < "$1" | tr -d '\n'; }
    {
      echo "PASSKIT_CERT_PEM=$(b64 "$DIR/pass.pem")"
      echo "PASSKIT_KEY_PEM=$(b64 "$KEY")"
      echo "PASSKIT_KEY_PASSWORD=$PW"
      echo "PASSKIT_WWDR_PEM=$(b64 "$DIR/wwdr.pem")"
      echo "PASSKIT_PASS_TYPE_ID=$TYPE"
      echo "PASSKIT_TEAM_ID=$TEAM"
    } > "$ENV"
    chmod 600 "$ENV"

    EXP=$(openssl x509 -in "$DIR/pass.pem" -noout -enddate | cut -d= -f2)
    cat <<MSG

Done. Team $TEAM, pass type $TYPE, certificate good until $EXP.

The six settings are in:  $(pwd)/$ENV

Put them in Vercel (each line is Key=Value; the long ones are one line on purpose):
  https://vercel.com/willgazes-projects/turnup/settings/environment-variables
  Add each, Production, Save. Six times. Then
  https://vercel.com/willgazes-projects/turnup/deployments  ->  ... -> Redeploy.

Or, if the Vercel CLI is logged in here, let it do all six:
  bash scripts/apple-wallet.sh vercel

MSG
    ;;

  vercel)
    # Puts the six settings into the TurnUp project and redeploys what Git
    # already built. It NEVER deploys from here. This folder holds the private
    # key, its passphrase and turnup.env; on 21 Oct 2026 the old last line,
    # `vercel --prod --yes` run in this folder, uploaded it to production.
    # So: every vercel command goes through vc(), which only allows commands
    # that upload nothing, and they run from an empty temporary folder linked
    # to turnup by name, so this folder is never linked to anything either.
    ENV=$DIR/turnup.env
    [ -f "$ENV" ] || die "No $ENV yet. Run 'finish' first."
    command -v vercel >/dev/null || die "Vercel CLI not installed. Paste the six lines by hand at $ENV_URL"
    ENV_ABS="$(cd "$(dirname "$ENV")" && pwd)/$(basename "$ENV")"
    [ -d .vercel ] && say "Warning: $(pwd) is linked to a Vercel project (.vercel/). Never run 'vercel' or 'vercel --prod' in it: that uploads the key. Delete the .vercel folder here when you can."
    WORK=$(mktemp -d)
    trap 'rm -rf "$WORK"' EXIT
    vc() {
      case "${1:-}" in
        whoami|link|env|redeploy|promote|inspect) ;;
        *) die "Refusing 'vercel ${1:-}': it could upload a folder, and $KEY must never be uploaded." ;;
      esac
      [ "$(pwd)" = "$WORK" ] || die "Refusing to run vercel outside the empty folder $WORK ($KEY must never be uploaded)."
      [ -z "$(ls -A "$WORK" | grep -v '^\.vercel$')" ] || die "The temporary folder is not empty. Stopping."
      command vercel "$@" --scope "$SCOPE"
    }
    cd "$WORK"
    vc whoami >/dev/null 2>&1 || die "Vercel CLI is not signed in. In Terminal:  vercel login   then run this again."
    say "Linking an empty temporary folder to the $PROJECT project (this folder stays unlinked)"
    vc link --yes --project "$PROJECT" >/dev/null 2>&1 \
      || die "Could not link to the $PROJECT project. Paste the six lines by hand at $ENV_URL"
    while IFS='=' read -r k v; do
      [ -n "$k" ] || continue
      say "Setting $k (removing the old one first)"
      vc env rm "$k" production --yes >/dev/null 2>&1 || true
      printf '%s' "$v" | vc env add "$k" production --sensitive >/dev/null \
        || die "Vercel refused $k. Paste it by hand at $ENV_URL"
    done < "$ENV_ABS"
    MANUAL="Open https://vercel.com/$SCOPE/$PROJECT/deployments, find the newest Production deployment that shows a Git commit (main), press its three dots, Redeploy, Redeploy. When it says Ready, its three dots again, Promote to Production if it is not already Current."
    say "All six set. Redeploying the build that is live on $HOST (the one Git made from main), then promoting it."
    NEW=$(vc redeploy "$HOST" 2>/dev/null | grep -Eo 'https://[A-Za-z0-9.-]+\.vercel\.app' | tail -1) || true
    if [ -z "$NEW" ]; then
      die "Could not redeploy from here. Do it by hand: $MANUAL"
    fi
    vc promote "$NEW" --yes >/dev/null 2>&1 \
      || say "Redeployed as $NEW but could not promote it from here. $MANUAL"
    cd - >/dev/null
    cat <<MSG

Done. Prove it: with a live job code in place of CODE,

  curl -s -o /dev/null -w '%{http_code}\n' https://$HOST/api/passes/CODE

200 is a signed pass. 503 means a setting is missing: check all six at $ENV_URL

MSG
    ;;

  *)
    sed -n 3,8p "$0"; exit 1 ;;
esac
