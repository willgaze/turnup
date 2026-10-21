#!/usr/bin/env bash
#
# Apple Wallet signing, in two commands and no Keychain.
#
#   bash scripts/apple-wallet.sh csr            # 1. makes a key + a request file to upload to Apple
#   bash scripts/apple-wallet.sh finish pass.cer  # 2. turns Apple's certificate into the six settings
#
#   bash scripts/apple-wallet.sh vercel          # 3. (optional) puts the six into Vercel and redeploys; never uploads this folder
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
# Where the settings go. Named here so the vercel step can never fall back to
# "whatever project this folder is", which is how a key folder gets deployed.
SCOPE="${VERCEL_SCOPE:-willgazes-projects}"
PROJECT="${VERCEL_PROJECT:-turnup}"
HOST="${TURNUP_HOST:-www.getturnup.com}"
ENV_URL="https://vercel.com/$SCOPE/$PROJECT/settings/environment-variables"

say() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
die() { printf '\n\033[1;31mStopped:\033[0m %s\n' "$1" >&2; exit 1; }
command -v openssl >/dev/null || die "openssl is not installed."

case "${1:-}" in
  csr)
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
    if [ -f "$KEY" ]; then
      say "Key already exists at $KEY — keeping it. Delete it first if you really want a new one."
    else
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
    fi
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

Or let the Vercel CLI do all six and the redeploy (it never uploads this folder):
  bash scripts/apple-wallet.sh vercel

MSG
    ;;

  vercel)
    # Writes the six settings to the TurnUp project and redeploys what is already
    # live. It NEVER runs `vercel deploy` or `vercel --prod` from here: this
    # folder holds the private key, its passphrase and turnup.env, and a deploy
    # from inside it uploads the folder as a site (in an unlinked folder, into a
    # brand-new project named after it). That is the private key on a public
    # URL. So the project is named, not guessed from the folder, every upload
    # from here is switched off with .vercelignore, and the redeploy re-runs the
    # production deployment Git already made, exactly as the dashboard's
    # Redeploy button does.
    ENV=$DIR/turnup.env
    [ -f "$ENV" ] || die "No $ENV yet. Run 'finish' first."
    command -v vercel >/dev/null || die "Vercel CLI not installed. In Terminal:  npm i -g vercel && vercel login   then run this again. Or paste the six lines by hand at $ENV_URL"
    vercel whoami --scope "$SCOPE" >/dev/null 2>&1 || die "Vercel CLI is not signed in. In Terminal:  vercel login   then run this again."
    printf '*\n' > .vercelignore
    say "Pointing this folder at the $PROJECT project (nothing in it is ever uploaded)"
    vercel link --yes --scope "$SCOPE" --project "$PROJECT" >/dev/null 2>&1 \
      || die "Could not link to the $PROJECT project. Paste the six lines by hand at $ENV_URL"
    while IFS='=' read -r k v; do
      [ -n "$k" ] || continue
      say "Setting $k"
      vercel env rm "$k" production --yes --scope "$SCOPE" >/dev/null 2>&1 || true
      printf '%s' "$v" | vercel env add "$k" production --sensitive --scope "$SCOPE" >/dev/null \
        || die "Vercel refused $k. Paste it by hand at $ENV_URL"
    done < "$ENV"
    say "All six set. Redeploying the live production build so it reads them."
    vercel redeploy "$HOST" --scope "$SCOPE" >/dev/null \
      || die "Could not redeploy from here. Open https://vercel.com/$SCOPE/$PROJECT/deployments, press the three dots on the top Production deployment, Redeploy, Redeploy."
    cat <<MSG

Deployed. Prove it: with a live job code in place of CODE,

  curl -s -o /dev/null -w '%{http_code}\n' https://$HOST/api/passes/CODE

200 is a signed pass. 503 means a setting is missing: check all six at $ENV_URL

MSG
    ;;

  *)
    sed -n 2,13p "$0"; exit 1 ;;
esac
