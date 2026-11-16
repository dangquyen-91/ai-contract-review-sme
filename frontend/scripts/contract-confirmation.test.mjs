import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function load(file, deps = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: name => {
      if (!(name in deps)) throw new Error(`Missing module ${name}`);
      return deps[name];
    },
  });
  return exports;
}

const classification = load('../lib/contracts/contract-classification.ts');
const text = node => Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : node ?? '';

function find(node) {
  if (Array.isArray(node)) return node.flatMap(find);
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return find(node.type(node.props));
  return [node, ...find(node.props?.children)];
}

function harness({ contract = {}, role = 'owner', profilesReady = true } = {}) {
  let cursor = 0;
  const slots = [], confirmations = [], reviews = [];
  const data = {
    _id: 'contract-1', title: 'hop-dong-mua-ban-hang-hoa', status: 'uploaded',
    currentVersion: { extractionStatus: 'completed' },
    classification: {
      status: 'completed', outcome: 'supported', source: 'ai', type: 'sale', confidence: 0.95,
      parties: [{ partyCode: 'seller', name: 'Bên bán' }, { partyCode: 'buyer', name: 'Bên mua' }],
    },
    reviewBilling: { ready: true, pageCount: 3, units: 1, versionId: 'version-1', purchaseStatus: null },
    ...contract,
  };
  const profiles = [
    { code: 'sale', name: 'Hợp đồng mua bán hàng hóa', parties: [{ code: 'seller', name: 'Bên bán' }, { code: 'buyer', name: 'Bên mua' }] },
    { code: 'labor', name: 'Hợp đồng lao động', parties: [{ code: 'employee', name: 'Người lao động' }, { code: 'employer', name: 'Người sử dụng lao động' }] },
  ];
  const passthrough = props => jsx.jsx('div', props);
  const mutation = { isPending: false, mutateAsync: async () => {} };
  const deps = {
    react: {
      useId: () => 'focus',
      useState: initial => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], value => { slots[index] = value; }];
      },
    },
    'react/jsx-runtime': jsx,
    'lucide-react': { CircleAlert: () => null, LoaderCircle: () => null },
    sonner: { toast: { error: () => {}, success: () => {} } },
    '@/components/ui/button': { Button: props => jsx.jsx('button', props) },
    '@/components/ui/icon': { Icon: () => null },
    '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription'].map(name => [name, passthrough])),
    '@/hooks/review/use-review-allowance': { useReviewAllowance: () => ({ data: { status: 'active', analysis: { available: 200 } } }) },
    './review-cost-line': { ReviewCostLine: () => null },
    './review-focus-fields': { ReviewFocusFields: () => null },
    '@/config/contract-display': { reviewableTypeLabels: () => Object.fromEntries(profiles.map(profile => [profile.code, profile.name])) },
    '@/hooks/contracts/use-contracts': {
      useContractClassification: () => ({ data }),
      useContractProfiles: () => ({ data: profilesReady ? profiles : undefined }),
      useConfirmProfileMutation: () => ({ ...mutation, mutateAsync: async input => { confirmations.push(input); } }),
      useRetryClassificationMutation: () => mutation,
      useDeleteContract: () => mutation,
      useAttachVersionMutation: () => mutation,
      useVersionMatch: () => ({ data: { ready: true, eligible: false } }),
    },
    '@/lib/contracts/contract-classification': classification,
    '@/lib/review/review-error-codes': { classificationOutcomeCopy: {}, serverCodeMessage: () => undefined },
    '@/lib/api/client': { isApiClientError: () => false },
    './contract-review-payment': { ContractReviewPayment: () => null },
    './upload-identity-choice': { defaultIdentity: () => ({ mode: 'new' }), UploadIdentityChoice: () => null },
  };
  deps['@/components/review/upload/analysis-focus-dialog'] = load('../components/review/upload/analysis-focus-dialog.tsx', deps);
  const { ContractConfirmationDialog } = load('../components/review/upload/contract-confirmation-dialog.tsx', deps);
  return {
    confirmations, reviews,
    setProfilesReady: () => { profilesReady = true; },
    render: () => {
      cursor = 0;
      const dialog = ContractConfirmationDialog({
        contractId: data._id, contractTitle: data.title, role, isReviewing: false,
        onDismiss: () => {}, onDeleted: () => {}, onReview: (...args) => reviews.push(args),
      });
      const nodes = find(dialog);
      return {
        dialog, nodes,
        submit: nodes.find(node => node.type === 'button' && node.props.type === 'submit'),
        party: label => nodes.find(node => node.type === 'button' && text(node) === `${label} — ${label}`),
      };
    },
  };
}

test('missing AI role displays the choice immediately and enables review after selection', async () => {
  const ctx = harness();
  const initial = ctx.render();
  assert.equal(initial.submit.props.disabled, true);
  assert.ok(initial.nodes.some(node => text(node) === 'Chọn vai trò của bạn trong hợp đồng để bắt đầu rà soát.'));
  assert.ok(initial.party('Bên mua'));
  assert.ok(initial.party('Bên bán'));
  initial.nodes.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(ctx.reviews.length, 0);

  initial.party('Bên mua').props.onClick();
  const selected = ctx.render();
  assert.equal(selected.submit.props.disabled, false);
  await selected.dialog.props.onReview('Thanh toán');
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.confirmations)), [{ contractId: 'contract-1', type: 'sale', ourParty: 'buyer' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.reviews)), [['Thanh toán', { versionId: 'version-1', units: 1 }]]);
});

test('confirmed type with a missing role also displays role choices', () => {
  const ctx = harness({ contract: { type: 'sale' } });
  const initial = ctx.render();
  assert.ok(initial.party('Bên bán'));
  initial.party('Bên bán').props.onClick();
  assert.equal(ctx.render().submit.props.disabled, false);
});

test('role choices appear when profiles finish loading', () => {
  const ctx = harness({ profilesReady: false });
  ctx.render();
  ctx.setProfilesReady();
  const loaded = ctx.render();
  assert.equal(loaded.submit.props.disabled, true);
  assert.ok(loaded.party('Bên mua'));
});

test('a complete confirmed profile retains the summary and does not require reselection', async () => {
  const ctx = harness({ contract: { type: 'sale', ourParty: 'buyer' } });
  const complete = ctx.render();
  assert.equal(complete.submit.props.disabled, false);
  assert.equal(complete.party('Bên mua'), undefined);
  assert.ok(complete.nodes.some(node => node.type === 'dt' && text(node) === 'Bạn là'));
  await complete.dialog.props.onReview('');
  assert.equal(ctx.confirmations.length, 0);
  assert.equal(ctx.reviews.length, 1);
});

test('personal labor contracts keep their automatic employee role', async () => {
  const ctx = harness({ role: 'user', contract: { type: 'labor' } });
  const personal = ctx.render();
  assert.equal(personal.submit.props.disabled, false);
  await personal.dialog.props.onReview('');
  assert.equal(ctx.confirmations[0].ourParty, 'employee');
});
