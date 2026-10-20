import { provenanceDate, safeReferenceUrl } from './provenanceUtils';

function ReferenceLink({ url, children }) {
  const href = safeReferenceUrl(url);
  return href ? <a href={href} target="_blank" rel="noreferrer">{children || url}</a>
    : <span>{children || url || 'Not recorded'}</span>;
}

function RecordedDate({ value }) {
  const label = provenanceDate(value);
  return value && Number.isFinite(new Date(value).getTime())
    ? <time dateTime={new Date(value).toISOString()}>{label}</time> : <span>{label}</span>;
}

function PhotoRights({ rights }) {
  return <dl className="provenance-facts">
    <div><dt>License</dt><dd>{rights?.license || 'No reuse license recorded'}</dd></div>
    <div><dt>License terms</dt><dd><ReferenceLink url={rights?.licenseUrl} /></dd></div>
    <div><dt>Creator</dt><dd>{rights?.creator || 'Not recorded'}</dd></div>
    <div><dt>Credit</dt><dd>{rights?.credit || 'Not recorded'}</dd></div>
    <div><dt>Original image source</dt><dd><ReferenceLink url={rights?.sourceUrl} /></dd></div>
  </dl>;
}

export function AutomationBadge({ provenance }) {
  return provenance?.origin ? <span className="automation-badge">Automation submission</span> : null;
}

export function ProvenancePanel({ provenance }) {
  if (!provenance?.origin) return null;
  return <section className="panel provenance-panel" aria-label="Automation provenance">
    <div className="panel-heading">
      <div>
        <h2>Automation provenance</h2>
        <p>Submitted for human review. These records describe the inputs; they do not verify the reporting.</p>
      </div>
      <AutomationBadge provenance={provenance} />
    </div>
    <div className="provenance-content">
      <dl className="provenance-facts">
        <div><dt>Submitted through</dt><dd>{provenance.origin}</dd></div>
        <div><dt>Received (IST)</dt><dd><RecordedDate value={provenance.receivedAt} /></dd></div>
        <div><dt>Generated (IST)</dt><dd><RecordedDate value={provenance.generatedAt} /></dd></div>
        <div><dt>Text model</dt><dd>{provenance.textModel || 'Not recorded'}</dd></div>
        {provenance.imageModel && <div><dt>Recorded image model</dt><dd>{provenance.imageModel}</dd></div>}
      </dl>
      <p className="provenance-review-note">Before publishing, verify factual claims against the source material, check each translation and confirm photo reuse rights and credit. Publication still requires an editor.</p>
      {provenance.warnings?.length > 0 && <div className="provenance-warnings">
        <h3>Submitted quality warnings</h3>
        <ul>{provenance.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
      </div>}
      <div className="provenance-image-rights">
        <h3>Photo references &amp; reuse rights</h3>
        <p className="rights-unverified">Rights not independently verified</p>
        <p>{provenance.imageGenerated === true
          ? 'This record identifies the lead image as AI-generated.'
          : provenance.imageGenerated === false
            ? 'Image marked as not AI-generated. Verify its source and reuse permission.'
            : 'Image origin not recorded.'}</p>
        {provenance.imageGenerated === true && provenance.imageDisclosure && <p>{provenance.imageDisclosure}</p>}
        <PhotoRights rights={provenance.imageRights} />
        <details>
          <summary>Reference images ({provenance.referenceImages?.length || 0})</summary>
          <p>A web reference is not proof of permission to reuse an image. Compare the selected image with its original source and license terms.</p>
          {provenance.referenceImages?.length ? <ol className="provenance-source-list">
            {provenance.referenceImages.map((image, index) => <li key={index}>
              <ReferenceLink url={image.url}>{image.title || `Reference image ${index + 1}`}</ReferenceLink>
              <PhotoRights rights={image} />
            </li>)}
          </ol> : <p>No reference images recorded.</p>}
        </details>
      </div>
      <details>
        <summary>Source snapshots ({provenance.sources?.length || 0})</summary>
        <p>Dates below belong to the source material and its retrieval, not this article’s publication time. Open the original source to verify context and freshness.</p>
        {provenance.sources?.length ? <ol className="provenance-source-list">
          {provenance.sources.map((source, index) => <li key={index}>
            <ReferenceLink url={source.url}>{source.title || source.url}</ReferenceLink>
            {source.title && <p className="reference-url">{source.url}</p>}
            <dl className="provenance-facts">
              <div><dt>Source published (IST)</dt><dd><RecordedDate value={source.publishedAt} /></dd></div>
              <div><dt>Retrieved (IST)</dt><dd><RecordedDate value={source.retrievedAt} /></dd></div>
            </dl>
          </li>)}
        </ol> : <p>No source snapshots recorded. Review the story’s source references before publication.</p>}
      </details>
      <details>
        <summary>Workflow and submission references</summary>
        <dl className="provenance-facts">
          <div><dt>Workflow</dt><dd>{provenance.workflowId || 'Not recorded'}</dd></div>
          <div><dt>Run</dt><dd>{provenance.runId || 'Not recorded'}</dd></div>
          <div><dt>Source record</dt><dd>{provenance.sourceId || 'Not recorded'}</dd></div>
          <div><dt>Ingest event</dt><dd>{provenance.eventId || 'Not recorded'}</dd></div>
          <div><dt>Content fingerprint</dt><dd>{provenance.contentFingerprint || 'Not recorded'}</dd></div>
        </dl>
      </details>
    </div>
  </section>;
}
