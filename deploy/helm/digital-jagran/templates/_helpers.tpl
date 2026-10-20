{{- define "dj.name" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- define "dj.selector" -}}
app.kubernetes.io/name: digital-jagran
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
{{- define "dj.labels" -}}
{{ include "dj.selector" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end -}}
{{- define "dj.webSelector" -}}
{{ include "dj.selector" . }}
app.kubernetes.io/component: publication
{{- end -}}
{{- define "dj.image" -}}
{{ required "image.repository must identify your release image" .Values.image.repository }}@{{ required "image.digest must pin an immutable sha256 release" .Values.image.digest }}
{{- end -}}
{{- define "dj.env" -}}
- name: NODE_ENV
  value: production
- name: HOST
  value: "0.0.0.0"
- name: PORT
  value: "5001"
- name: METRICS_PORT
  value: "9464"
- name: DATA_STORE
  value: mongo
- name: SEED_DEMO
  value: "false"
- name: PUBLIC_ORIGIN
  value: {{ required "publicOrigin is required" .Values.publicOrigin | quote }}
- name: TRUST_PROXY
  value: {{ required "trustProxy must restrict forwarded-header trust to your ingress CIDRs" .Values.trustProxy | quote }}
- name: MONGO_MAX_POOL_SIZE
  value: {{ .Values.mongo.maxPoolSize | quote }}
- name: MONGO_MIN_POOL_SIZE
  value: {{ .Values.mongo.minPoolSize | quote }}
- name: MONGO_WAIT_QUEUE_TIMEOUT_MS
  value: {{ .Values.mongo.waitQueueTimeoutMs | quote }}
- name: MONGO_OPERATION_TIMEOUT_MS
  value: {{ .Values.mongo.operationTimeoutMs | quote }}
- name: DRAIN_TIMEOUT_MS
  value: "30000"
- name: NODE_OPTIONS
  value: {{ .Values.nodeOptions | quote }}
{{- end -}}
