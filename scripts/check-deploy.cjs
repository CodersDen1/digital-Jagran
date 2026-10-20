const { spawnSync } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parseAllDocuments } = require('yaml');
const root = path.resolve(__dirname, '..');
const chart = path.join(root, 'deploy/helm/digital-jagran');
const values = path.join(chart, 'ci-values.yaml');
const helm = process.env.HELM_BIN || 'helm';
function run(args, succeeds = true) {
  const result = spawnSync(helm, args, { cwd:root, encoding:'utf8', timeout:30000 });
  if (result.error) throw result.error;
  if (succeeds && result.status !== 0) throw new Error(result.stderr || result.stdout);
  if (!succeeds) assert.notEqual(result.status,0, `Unsafe chart settings unexpectedly accepted: ${args.join(' ')}`);
  return result.stdout;
}
run(['lint',chart,'--strict','-f',values]);
function render(extra = []) {
  return parseAllDocuments(run(['template','verification',chart,'-f',values,...extra])).map(doc => {
    assert.equal(doc.errors.length,0,doc.errors.map(e=>e.message).join('\n'));return doc.toJSON();
  }).filter(Boolean);
}
const objects = render();
const byKind = kind => objects.filter(x => x.kind === kind);
const deployment = byKind('Deployment')[0];
assert.equal(deployment.spec.replicas,2);
assert.equal(deployment.spec.strategy.rollingUpdate.maxUnavailable,0);
assert.equal(deployment.spec.strategy.rollingUpdate.maxSurge,1);
assert.equal(deployment.spec.template.spec.automountServiceAccountToken,false);
assert.equal(deployment.spec.template.spec.securityContext.runAsNonRoot,true);
const container = deployment.spec.template.spec.containers[0];
assert.match(container.image,/@sha256:[0-9a-f]{64}$/);
assert.equal(container.securityContext.readOnlyRootFilesystem,true);
assert.equal(container.securityContext.allowPrivilegeEscalation,false);
assert.equal(container.readinessProbe.httpGet.path,'/health/ready');
assert.equal(container.livenessProbe.httpGet.path,'/health/live');
assert(container.resources.requests.cpu && container.resources.limits.memory);
assert.equal(container.env.find(e=>e.name==='DATA_STORE').value,'mongo');
assert.equal(container.envFrom[0].secretRef.name,'digital-jagran-runtime-test');
assert.equal(byKind('Secret').length,0,'Do not render credentials into the Helm release.');
for (const service of byKind('Service')) {
  assert.equal(service.spec.type,'ClusterIP');
  assert.equal(service.spec.selector['app.kubernetes.io/component'],'publication');
}
assert.equal(deployment.spec.selector.matchLabels['app.kubernetes.io/component'],'publication');
assert.equal(byKind('PodDisruptionBudget')[0].spec.selector.matchLabels['app.kubernetes.io/component'],'publication');
const ingress = byKind('Ingress')[0];
assert.equal(ingress.spec.tls[0].hosts[0],'news.example.com');
assert.equal(ingress.spec.rules[0].http.paths[0].backend.service.port.name,'http');
const policy=byKind('NetworkPolicy')[0];
assert.deepEqual(policy.spec.policyTypes,['Ingress','Egress']);
assert(!JSON.stringify(policy).includes('0.0.0.0/0'),'No permissive default Mongo egress.');
assert(byKind('PodDisruptionBudget').length===1);
const expanded = render(['--set','autoscaling.enabled=true','--set','monitoring.serviceMonitor.enabled=true','--set','monitoring.prometheusRule.enabled=true','--set','migration.enabled=true']);
assert(expanded.some(x=>x.kind==='HorizontalPodAutoscaler'));
assert(expanded.some(x=>x.kind==='ServiceMonitor'));
assert(expanded.some(x=>x.kind==='Job'));
assert.equal(expanded.find(x=>x.kind==='Job').spec.template.metadata.labels['app.kubernetes.io/component'],'migration');
const rules = expanded.find(x=>x.kind==='PrometheusRule').spec.groups.flatMap(group=>group.rules);
for (const rule of rules.filter(rule=>rule.expr.includes('dj_http_'))) {
  const selectors = rule.expr.match(/dj_http_[a-z_]+\{[^}]+\}/g);
  assert(selectors?.length);
  for (const selector of selectors) {
    assert(selector.includes('namespace="default"'));
    assert(selector.includes('service="verification-digital-jagran-metrics"'));
  }
}
for(const unsafe of [['replicaCount=1'],['trustProxy=true'],['publicOrigin=http://news.example.com'],['image.digest=latest'],['terminationGracePeriodSeconds=5']]) run(['template','negative',chart,'-f',values,'--set',unsafe[0]],false);
run(['template','negative',chart,'-f',values,'--set-json','networkPolicy.mongoCidrs=[]'],false);
run(['template','negative',chart,'-f',values,'--set','ingress.className='],false);
run(['template','negative',chart,'-f',values,'--set-json','networkPolicy.ingressPodSelector={}'],false);
console.log(`Deployment validation passed: ${objects.length} baseline resources, ${expanded.length} expanded resources, 8 rejected unsafe configurations.`);
