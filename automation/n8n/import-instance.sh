#!/bin/sh
# Run on the already-authorized Coolify host. Only updates these three workflow IDs.
set -eu
revision="${1:?Supply the reviewed Git commit SHA}"
case "$revision" in *[!0-9a-f]*|'') echo 'Use a full Git SHA' >&2; exit 1;; esac
[ "${#revision}" = 40 ] || exit 1
container=n8n-dbrwgs1curmt5wrynuj94y6c
stage=$(mktemp -d /tmp/dj-n8n.XXXXXX)
selection="${2:-all}"
case "$selection" in all) names='discover worker operations';; worker) names='worker';; *) exit 1;; esac
for workflow in $names; do
  curl -fsSL --proto '=https' "https://raw.githubusercontent.com/CodersDen1/digital-Jagran/$revision/automation/n8n/$workflow.json" -o "$stage/$workflow.json"
  docker cp "$stage/$workflow.json" "$container:/tmp/dj-$workflow.json"
done
docker exec -u node "$container" node -e '
const fs=require("fs");
const expected={discover:"oQdEvEn7XnQmGhpF",worker:"0yYinmFmLJIN3rtj",operations:"ZWXH6bx5AzHQ0SEQ"};
const selected=process.argv[1];
const workflows=Object.entries(expected).filter(([name])=>selected==="all"||name===selected).map(([name,id])=>{
 const workflow=JSON.parse(fs.readFileSync("/tmp/dj-"+name+".json","utf8"));
 if(workflow.id!==id||!workflow.name.startsWith("Digital Jagran •"))throw Error("Unexpected workflow identity");
 workflow.active=false;return workflow;
});
fs.writeFileSync("/tmp/dj-newsroom-workflows.json",JSON.stringify(workflows));' "$selection"
docker exec -u node "$container" n8n import:workflow --input=/tmp/dj-newsroom-workflows.json --projectId=5W0Vq3CB3GgUsvz2
echo "Imported selection: $selection. Verify in n8n and publish its schedules through the editor."
# No credentials are exported, printed, decrypted or changed by this script.
