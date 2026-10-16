import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name] ?? (name === "@/components/ui/button" ? { Button: "button" } : {}), Date });
  return exports;
}
const helpers = load('../lib/review-timeline.ts');
const { buildReviewTimeline, reviewElapsed } = helpers;
const base = { _id: 'run', contractId: 'contract', status: 'running', stages: { segmentation: 'pending', summary: 'pending', riskDetection: 'pending' } };
const step = (model, key) => model.steps.find((item) => item.key === key).state;

test('Idle, uploading and queued never imply extraction has completed', () => {
  for (const input of [{}, { uploading: true }, { review: { ...base, status: 'queued' }, reviewing: true }]) {
    const model = buildReviewTimeline(input);
    assert.ok(model.steps.every((item) => item.state === 'pending'));
  }
});

test('Quota rejection marks review as not started with no running or failed AI stages', () => {
  const model = buildReviewTimeline({ blocked: 'quota', error: 'Quota exhausted' });
  assert.match(model.message, /Chưa bắt đầu/);
  assert.ok(!model.message.includes('Yêu cầu rà soát vẫn được lưu'));
  assert.ok(model.steps.every((item) => item.state === 'pending'));
});

test('Reading remains running while backend is waiting for extraction', () => {
  const model = buildReviewTimeline({ review: { ...base, currentStage: 'waiting_for_extraction' }, reviewing: true });
  assert.equal(step(model, 'reading'), 'running');
  assert.equal(step(model, 'segmentation'), 'pending');
});

test('Page progress comes from backend detail, not an invented percentage', () => {
  const model = buildReviewTimeline({ review: { ...base, currentStage: 'waiting_for_extraction', stageDetail: '2/7 pages' }, reviewing: true });
  assert.equal(model.steps[0].description, 'Đã đọc 2/7 trang');
});

test('Backend automatic retries remain distinct from a finished failed job', () => {
  const model = buildReviewTimeline({ review: { ...base, stageDetail: 'retrying after an error', stages: { ...base.stages, segmentation: 'failed' } }, reviewing: true });
  assert.equal(model.retrying, true);
  assert.match(model.message, /đang thử lại/);
  assert.equal(step(model, 'finished'), 'pending');
});

test('Segmentation begins only after extraction; analysis remains pending', () => {
  const model = buildReviewTimeline({ review: { ...base, currentStage: 'segmentation', stages: { ...base.stages, segmentation: 'running' } }, reviewing: true });
  assert.equal(step(model, 'reading'), 'completed');
  assert.equal(step(model, 'segmentation'), 'running');
  assert.equal(step(model, 'analysis'), 'pending');
});

test('Parallel summary and risk detection retain two running states', () => {
  const model = buildReviewTimeline({ review: { ...base, stages: { segmentation: 'completed', summary: 'running', riskDetection: 'running' } }, reviewing: true });
  assert.equal(step(model, 'analysis'), 'running');
  assert.ok(model.tasks.every((task) => task.state === 'running'));
  assert.match(model.message, /song song/);
});

test('Completing summary does not complete risk analysis or the entire pipeline', () => {
  const model = buildReviewTimeline({ review: { ...base, stages: { segmentation: 'completed', summary: 'completed', riskDetection: 'running' } }, reviewing: true });
  assert.equal(model.tasks[0].state, 'completed');
  assert.equal(model.tasks[1].state, 'running');
  assert.equal(step(model, 'analysis'), 'running');
  assert.equal(step(model, 'finished'), 'pending');
});

test('Backend failure keeps completed tasks and does not mark the result ready', () => {
  const model = buildReviewTimeline({ review: { ...base, status: 'failed', stages: { segmentation: 'completed', summary: 'completed', riskDetection: 'failed' } }, error: 'AI failed', failureKind: 'run' });
  assert.equal(step(model, 'analysis'), 'failed');
  assert.equal(model.tasks[0].state, 'completed');
  assert.equal(step(model, 'finished'), 'pending');
  assert.equal(model.interrupted, true);
});

test('A failed parallel task does not stop the analysis indicator while another task is still running', () => {
  const review = { ...base, stages: { segmentation: 'completed', summary: 'failed', riskDetection: 'running' } };
  const model = buildReviewTimeline({ review, reviewing: true });
  assert.equal(step(model, 'analysis'), 'running');
  assert.equal(model.tasks[0].state, 'failed');
  assert.equal(model.tasks[1].state, 'running');
  assert.equal(step(model, 'finished'), 'pending');
  assert.equal(step(buildReviewTimeline({ review: { ...review, status: 'failed' } }), 'analysis'), 'failed');
});

test('Completed AI is distinct from loading or failing to download its result', () => {
  const review = { ...base, status: 'completed' };
  const downloading = buildReviewTimeline({ review, reviewing: true });
  assert.equal(step(downloading, 'analysis'), 'completed');
  assert.equal(step(downloading, 'download'), 'running');
  assert.equal(step(downloading, 'finished'), 'pending');
  const failed = buildReviewTimeline({ review, error: 'Network failed', failureKind: 'load' });
  assert.equal(step(failed, 'analysis'), 'completed');
  assert.equal(step(failed, 'download'), 'failed');
});

test('Network outage preserves the last backend stages without inventing completion', () => {
  const model = buildReviewTimeline({ review: { ...base, currentStage: 'segmentation', stages: { ...base.stages, segmentation: 'running' } }, reviewing: true, reconnecting: true });
  assert.equal(model.interrupted, true);
  assert.equal(step(model, 'segmentation'), 'running');
  assert.equal(step(model, 'download'), 'pending');
});

test('Loading a saved result does not claim that all AI stages have succeeded', () => {
  const loading = buildReviewTimeline({ loadingResult: true });
  assert.equal(step(loading, 'reading'), 'pending');
  assert.equal(step(loading, 'download'), 'running');
  assert.ok(!loading.message.includes('AI đã xử lý xong'));
  const result = { contract: { currentVersion: { extractionStatus: 'completed', segmentationStatus: 'completed', summaryStatus: 'completed', riskDetectionStatus: 'failed' } } };
  const loaded = buildReviewTimeline({ result });
  assert.equal(step(loaded, 'analysis'), 'failed');
  assert.equal(step(loaded, 'download'), 'completed');
  assert.equal(step(loaded, 'finished'), 'pending');
  assert.match(loaded.message, /Phân tích chưa hoàn tất/);
});

test('Elapsed time is restored from BE dates and stops at finishedAt', () => {
  const startedAt = '2026-10-13T00:00:00Z';
  assert.equal(reviewElapsed({ ...base, startedAt }, Date.parse('2026-10-13T00:01:05Z')), '01:05');
  assert.equal(reviewElapsed({ ...base, startedAt, finishedAt: '2026-10-13T00:00:42Z' }, Date.parse('2026-10-13T00:10:00Z')), '00:42');
  assert.equal(reviewElapsed(base, Date.now()), null);
  assert.equal(reviewElapsed({ ...base, startedAt: 'invalid' }, Date.now()), null);
});

const { ReviewTimeline } = load('../components/contract/review-timeline.tsx', {
  'react': React, 'react/jsx-runtime': jsx,
  '@/lib/review-timeline': helpers,
  '@/components/ui/icon': { Icon: () => null },
  '@/styles/review/review-timeline.module.css': { default: {} },
});

test('Timeline uses five steps, separate permissions and a result-only retry action', () => {
  const html = renderToStaticMarkup(jsx.jsx(ReviewTimeline, {
    review: { ...base, status: 'completed' }, failureKind: 'load', error: 'Download failed',
    roleLabel: 'User', access: { upload: true, review: true, administer: false }, onRetry: () => {},
  }));
  assert.match(html, /Tải lại kết quả/);
  assert.match(html, /không tạo lượt AI mới/);
  assert.match(html, /aria-label="Quyền hiện tại"/);
  assert.ok(!html.includes('1–3 phút'));
  assert.ok(!html.includes('%'));
  assert.equal((html.match(/data-review-step="true"/g) ?? []).length, 5);
});


test('Completed results retain all five visible steps without a process popup', () => {
  const html = renderToStaticMarkup(jsx.jsx(ReviewTimeline, {
    result: { contract: { currentVersion: { extractionStatus: 'completed', segmentationStatus: 'completed', summaryStatus: 'completed', riskDetectionStatus: 'completed' } } },
    roleLabel: 'User', access: { upload: true, review: true, administer: false }, onRetry: () => {},
  }));
  assert.equal((html.match(/data-review-step="true"/g) ?? []).length, 5);
  assert.match(html, /aria-label="Quyền hiện tại"/);
  assert.ok(!html.includes('<dialog'));
  assert.ok(!html.includes('Xem chi tiết quy trình'));
});

test('Only a live backend step is active; disconnected or stopped polling keeps its last state', () => {
  const props = {
    review: { ...base, currentStage: 'segmentation', stages: { ...base.stages, segmentation: 'running' } },
    reviewing: true, roleLabel: 'User', access: { upload: true, review: true, administer: false }, onRetry: () => {},
  };
  const live = renderToStaticMarkup(jsx.jsx(ReviewTimeline, props));
  assert.match(live, /data-ai-motion="running"/);
  assert.equal((live.match(/data-connector-flow="true"/g) ?? []).length, 1);
  assert.equal((live.match(/data-active="true"/g) ?? []).length, 1);
  assert.match(live, /data-state="running" data-active="true" aria-current="step"/);
  for (const change of [{ reconnecting: true }, { reviewing: false }, { blocked: 'quota' }]) {
    const paused = renderToStaticMarkup(jsx.jsx(ReviewTimeline, { ...props, ...change }));
    assert.ok(!paused.includes('data-active="true"'));
    assert.match(paused, /data-ai-motion="idle"/);
    assert.ok(!paused.includes('data-connector-flow="true"'));
    assert.ok(!paused.includes('aria-current="step"'));
    assert.match(paused, /data-state="running"/);
    assert.equal((paused.match(/data-review-step="true"/g) ?? []).length, 5);
  }
});

test('Downloading saved results highlights the download step without claiming AI is running', () => {
  const html = renderToStaticMarkup(jsx.jsx(ReviewTimeline, {
    loadingResult: true, roleLabel: 'User', access: { upload: true, review: true, administer: false }, onRetry: () => {},
  }));
  assert.equal((html.match(/data-active="true"/g) ?? []).length, 1);
  assert.match(html, /data-state="pending"/);
  assert.ok(!html.includes('AI đã xử lý xong'));
  assert.match(html, /data-ai-motion="idle"/);
});

test('Automatic retry highlights the failed stage separately without claiming active analysis or a completed connector', () => {
  const props = {
    review: { ...base, stageDetail: 'retrying after an error', stages: { ...base.stages, segmentation: 'failed' } },
    reviewing: true, roleLabel: 'User', access: { upload: true, review: true, administer: false }, onRetry() {},
  };
  const html = renderToStaticMarkup(jsx.jsx(ReviewTimeline, props));
  assert.match(html, /data-ai-motion="retrying"/);
  assert.match(html, /data-state="failed" aria-current="step" data-retrying="true"/);
  assert.match(html, /Chờ thử lại/);
  assert.ok(!html.includes('data-active="true"'));
  assert.ok(!html.includes('data-connector-flow="true"'));
  for (const change of [{ reconnecting: true }, { reviewing: false }, { review: { ...props.review, status: 'failed' } }]) {
    const paused = renderToStaticMarkup(jsx.jsx(ReviewTimeline, { ...props, ...change }));
    assert.match(paused, /data-ai-motion="idle"/);
    assert.ok(!paused.includes('data-retrying="true"'));
  }
});

test('Queued review and completed results keep the AI icon still', () => {
  for (const input of [{ review: { ...base, status: 'queued' }, reviewing: true }, { review: { ...base, status: 'completed' }, loadingResult: true }]) {
    const html = renderToStaticMarkup(jsx.jsx(ReviewTimeline, {
      ...input, roleLabel: 'User', access: { upload: true, review: true, administer: false }, onRetry() {},
    }));
    assert.match(html, /data-ai-motion="idle"/);
  }
});
