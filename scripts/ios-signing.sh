#!/usr/bin/env bash
#
# The lock-screen app's signing, in two commands and no Xcode: the same shape
# as apple-wallet.sh, run on the owner's Mac as the Cowork job in
# docs/cowork-testflight.md.
#
#   bash scripts/ios-signing.sh csr
#       makes apple/ios/dist.key (private) and apple/ios/dist.csr, the file to
#       upload at developer.apple.com for an "Apple Distribution" certificate.
#
#   bash scripts/ios-signing.sh finish ~/Downloads/distribution.cer ~/Downloads/AuthKey_ABC123DEFG.p8 ABC123DEFG <issuer id> <team id>
#       turns the certificate into a .p12 the GitHub runner can import, and
#       writes apple/ios/github.env: the six GitHub secrets, one per line.
#
# Everything lands in ./apple/ios/, which is gitignored (apple/ is). The
# private key never leaves that folder except inside the .p12 you paste into
# GitHub as a secret, where it is sealed.
#
# DO BOTH HALVES IN ONE SITTING, on a machine that keeps its files. The
# certificate Apple issues only works with the key `csr` makes.
#
set -euo pipefail
cd "$(dirname "$0")/.."

DIR=apple/ios
KEY=$DIR/dist.key
CSR=$DIR/dist.csr
# Apple's own openssl (LibreSSL) writes a .p12 the macOS keychain can read.
# Homebrew's OpenSSL 3 writes a newer form that `security import` rejects, so
# prefer /usr/bin/openssl where it exists, and ask OpenSSL 3 for -legacy.
OPENSSL=/usr/bin/openssl; command -v "$OPENSSL" >/dev/null || OPENSSL=openssl
command -v "$OPENSSL" >/dev/null || { echo "openssl is not installed." >&2; exit 1; }

say() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
die() { printf '\n\033[1;31mStopped:\033[0m %s\n' "$1" >&2; exit 1; }

case "${1:-}" in
  csr)
    mkdir -p "$DIR"
    if [ -f "$KEY" ]; then
      say "Key already exists at $KEY, keeping it. Delete it first if you really want a new one."
    else
      say "Making the private key for the distribution certificate"
      "$OPENSSL" genrsa -out "$KEY" 2048 2>/dev/null
      chmod 600 "$KEY"
    fi
    say "Making the certificate request"
    "$OPENSSL" req -new -key "$KEY" -out "$CSR" -subj "/CN=TurnUp iOS distribution/O=TurnUp/C=GB" 2>/dev/null
    cat <<MSG

Done. Upload this file to Apple:  $(pwd)/$CSR

  https://developer.apple.com/account/resources/certificates/add
  Under Software choose "Apple Distribution", Continue.
  Choose File -> the .csr above. Continue. Download. You get distribution.cer.

Then, with the App Store Connect key (.p8), its Key ID, the Issuer ID and your Team ID:

  bash scripts/ios-signing.sh finish ~/Downloads/distribution.cer ~/Downloads/AuthKey_XXXXXXXXXX.p8 XXXXXXXXXX <issuer id> <team id>

MSG
    ;;

  finish)
    CER="${2:-}"; P8="${3:-}"; KEYID="${4:-}"; ISSUER="${5:-}"; TEAM="${6:-}"
    [ -n "$CER" ] && [ -f "$CER" ] || die "Give me the distribution.cer Apple gave you (first argument)."
    [ -n "$P8" ] && [ -f "$P8" ] || die "Give me the AuthKey_XXXXXXXXXX.p8 from App Store Connect (second argument)."
    [[ "$KEYID" =~ ^[A-Z0-9]{10}$ ]] || die "The Key ID is 10 capitals and digits, shown beside the key in App Store Connect (third argument)."
    [[ "$ISSUER" =~ ^[0-9a-f-]{36}$ ]] || die "The Issuer ID is a long id with dashes, shown at the top of the Keys page (fourth argument)."
    [[ "$TEAM" =~ ^[A-Z0-9]{10}$ ]] || die "The Team ID is 10 capitals and digits, under Membership details (fifth argument)."
    [ -f "$KEY" ] || die "No $KEY. Run 'bash scripts/ios-signing.sh csr' first; the certificate only works with the key that requested it."

    say "Reading Apple's certificate"
    if ! "$OPENSSL" x509 -inform DER -in "$CER" -out "$DIR/dist.pem" 2>/dev/null; then
      "$OPENSSL" x509 -in "$CER" -out "$DIR/dist.pem" 2>/dev/null || die "That file is not a certificate."
    fi
    SUBJ=$("$OPENSSL" x509 -in "$DIR/dist.pem" -noout -subject)
    case "$SUBJ" in *"Apple Distribution"*) ;; *) die "That certificate is not an Apple Distribution one. Subject: $SUBJ";; esac
    say "Checking the certificate matches the key"
    CM=$("$OPENSSL" x509 -in "$DIR/dist.pem" -noout -modulus | "$OPENSSL" md5)
    KM=$("$OPENSSL" rsa -in "$KEY" -noout -modulus 2>/dev/null | "$OPENSSL" md5)
    [ "$CM" = "$KM" ] || die "This certificate was not made from $KEY. Make a fresh request with 'csr' and download a new certificate for it."

    say "Packing certificate and key into a .p12 for the GitHub runner"
    P12PW=$("$OPENSSL" rand -hex 12)
    LEGACY=""; "$OPENSSL" version | grep -q '^OpenSSL 3' && LEGACY="-legacy"
    "$OPENSSL" pkcs12 -export $LEGACY -inkey "$KEY" -in "$DIR/dist.pem" -name "Apple Distribution" -out "$DIR/dist.p12" -passout "pass:$P12PW" 2>/dev/null \
      || die "Could not write the .p12."
    chmod 600 "$DIR/dist.p12"

    ENV=$DIR/github.env
    b64() { base64 < "$1" | tr -d '\n'; }
    {
      echo "IOS_CERT_P12=$(b64 "$DIR/dist.p12")"
      echo "IOS_CERT_PASSWORD=$P12PW"
      echo "ASC_KEY_ID=$KEYID"
      echo "ASC_ISSUER_ID=$ISSUER"
      echo "ASC_KEY_P8=$(b64 "$P8")"
      echo "APPLE_TEAM_ID=$TEAM"
    } > "$ENV"
    chmod 600 "$ENV"
    EXP=$("$OPENSSL" x509 -in "$DIR/dist.pem" -noout -enddate | cut -d= -f2)
    cat <<MSG

Done. Team $TEAM, certificate good until $EXP.

The six GitHub secrets are in:  $(pwd)/$ENV   (one per line, KEY=value; two are long single lines)

  https://github.com/willgaze/turnup/settings/secrets/actions  ->  New repository secret, six times.
  Then https://github.com/willgaze/turnup/settings/variables/actions  ->  New repository variable
    IOS_SIGNING_READY = true
  Then https://github.com/willgaze/turnup/actions/workflows/ios.yml  ->  Run workflow.

MSG
    ;;

  *)
    sed -n 2,20p "$0"; exit 1 ;;
esac
