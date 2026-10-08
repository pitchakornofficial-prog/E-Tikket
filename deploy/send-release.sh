#!/usr/bin/env bash
set -euo pipefail
: "${AWS_REGION:?}" "${EC2_INSTANCE_ID:?}" "${EC2_SSH_HOST_KEY:?}"
revision=${1:?Git commit SHA required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
work=$(mktemp -d)
cleanup() {
  if [[ -n "${ip:-}" ]]; then ssh -o ControlPath="$work/control" -O exit "ubuntu@$ip" >/dev/null 2>&1 || true; fi
  rm -rf "$work"
}
trap cleanup EXIT
read -r ip az < <(aws ec2 describe-instances --region "$AWS_REGION" --instance-ids "$EC2_INSTANCE_ID" --query 'Reservations[0].Instances[0].[PublicIpAddress,Placement.AvailabilityZone]' --output text)
[[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]
[[ "$EC2_SSH_HOST_KEY" == ssh-ed25519\ * ]]
printf '%s %s\n' "$ip" "$EC2_SSH_HOST_KEY" > "$work/known_hosts"
ssh-keygen -q -t ed25519 -N '' -f "$work/key" -C github-e-tikket-deploy
aws ec2-instance-connect send-ssh-public-key --region "$AWS_REGION" --instance-id "$EC2_INSTANCE_ID" --availability-zone "$az" --instance-os-user ubuntu --ssh-public-key "file://$work/key.pub" >/dev/null
ssh_options=(-i "$work/key" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$work/known_hosts" -o ConnectTimeout=20 -o ControlPath="$work/control")
ssh "${ssh_options[@]}" -o ControlMaster=auto -o ControlPersist=600 -fN "ubuntu@$ip"
remote="/tmp/e-tikket-$revision.tar.gz"
scp "${ssh_options[@]}" .deploy/release.tar.gz "ubuntu@$ip:$remote"
digest=$(sha256sum .deploy/release.tar.gz | cut -d ' ' -f 1)
# SHA/path contain only validated hex, never user-supplied shell syntax.
ssh "${ssh_options[@]}" "ubuntu@$ip" "bash -se -- '$remote' '$revision' '$digest'" <<'REMOTE'
archive=$1
revision=$2
digest=$3
printf '%s  %s\n' "$digest" "$archive" | sha256sum -c -
mkdir -p "/tmp/e-tikket-$revision"
tar -xzf "$archive" -C "/tmp/e-tikket-$revision" ./deploy/ec2-release.sh
sudo bash "/tmp/e-tikket-$revision/deploy/ec2-release.sh" "$archive" "$revision"
REMOTE
