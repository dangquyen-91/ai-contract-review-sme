// Shared setup for the subscription test cases (SUB-01 to SUB-14).
// Require this file first: it sets the environment before the app is loaded.
process.env.PERSONAL_REVIEW_PRICE_PER_UNIT = '10000';
process.env.PERSONAL_REVIEW_CHAT_ALLOWANCE = '20';
const members = require('./invitations');
const mongoose = require('mongoose');
const {
  PlanModel, SubscriptionModel, SubscriptionPeriodModel, UsageRunModel, UsageTopUpModel,
} = require('../../dist/models/subscription.model');
const { ContractReviewPurchaseModel } = require('../../dist/models/contractReviewPurchase.model');
const { PaymentModel } = require('../../dist/models/payment.model');
const { ContractModel } = require('../../dist/models/contract.model');
const { ContractVersionModel } = require('../../dist/models/contractVersion.model');
const { BUSINESS_TRIAL_PLAN } = require('../../dist/services/billing/subscription.service');
const { seedTopUpPacks } = require('../../dist/services/billing/topUp.service');

const { DAY } = members;
let sequence = 0;
const nextNumber = () => 900000 + ++sequence;

async function start() {
  await members.start();
  await seedTopUpPacks();
  await Promise.all([ContractReviewPurchaseModel.init(), PaymentModel.init()]);
}

/** A billing scope: `id` is the organization ID, or the user ID of a personal account. */
async function business(name) {
  const { company, owner } = await members.ownerWithCompany(name);
  return { id: company.id, owner, company };
}
async function personal() {
  const owner = await members.account();
  return { id: owner.id, owner };
}
const addStaff = async (space, count) => {
  for (let i = 0; i < count; i++) await members.account('staff', space.company._id);
};

/** Stores a billing period directly, from `from` to `to` (days relative to `now`). */
async function addPeriod(space, planCode, { from = -10, to = 20, now = new Date(), ...fields } = {}) {
  const plan = planCode === 'business_trial' ? BUSINESS_TRIAL_PLAN : await PlanModel.findOne({ code: planCode }).lean();
  return SubscriptionPeriodModel.create({
    orgId: space.id,
    key: `case:${nextNumber()}`,
    plan,
    startsAt: new Date(now.getTime() + from * DAY),
    endsAt: new Date(now.getTime() + to * DAY),
    ...fields,
  });
}
const periodById = (period) => SubscriptionPeriodModel.findById(period._id ?? period).lean();

const schedule = (space, planCode, effectiveAt) =>
  SubscriptionModel.updateOne(
    { orgId: space.id },
    { $set: { accountType: space.company ? 'organization' : 'personal', scheduledDowngrade: { planCode, effectiveAt } } },
    { upsert: true },
  );
const scheduledOf = async (space) => (await SubscriptionModel.findOne({ orgId: space.id }).lean())?.scheduledDowngrade;

/** Stores an unpaid order that is still open. */
const openOrder = (space, fields = {}) =>
  PaymentModel.create({
    orderCode: nextNumber(),
    orgId: space.id,
    createdBy: space.owner._id,
    idempotencyKey: `order-${nextNumber()}`,
    planCode: 'business_pro',
    action: 'renew',
    amount: 999000,
    status: 'pending',
    expiresAt: new Date(Date.now() + DAY),
    ...fields,
  });

async function addContract(space, fields = {}) {
  return ContractModel.create({
    ownerType: space.company ? 'organization' : 'personal',
    orgId: space.id,
    uploadedBy: space.owner._id,
    title: 'Hợp đồng lao động',
    type: 'labor',
    ourParty: 'employee',
    ...fields,
  });
}
const addVersion = (contract, pages, versionNumber = 1, fields = {}) =>
  ContractVersionModel.create({
    contractId: contract._id,
    versionNumber,
    createdBy: contract.uploadedBy,
    extractionStatus: 'completed',
    extractionQuality: { method: 'text_layer', pageCount: pages, ocrPageCount: 0, lowConfidence: false },
    ...fields,
  });

/** A contract with one version of `pages` pages. */
async function contractOf(space, pages = 8) {
  const contract = await addContract(space);
  return { contract, version: await addVersion(contract, pages) };
}

const addPurchase = (space, contract, versionId, fields = {}) =>
  ContractReviewPurchaseModel.create({
    orgId: space.id,
    userId: space.owner._id,
    contractId: contract._id,
    versionId,
    orderCode: nextNumber(),
    pageCount: 8,
    units: 2,
    amount: 20000,
    chatAllowance: 20,
    ...fields,
  });
const purchaseById = (purchase) => ContractReviewPurchaseModel.findById(purchase._id).lean();

const usage = (space, kind, contract, fields = {}) => ({
  orgId: space.id,
  userId: space.owner.id,
  contractId: contract?.id,
  kind,
  idempotencyKey: `usage-${nextNumber()}`,
  payload: { question: 'Câu hỏi' },
  ...fields,
});

/** Expects an AppError with this message and, when given, status and code. */
const expectError = (promise, message, statusCode, code) =>
  expect(promise).rejects.toMatchObject({ message, ...(statusCode ? { statusCode } : {}), ...(code ? { code } : {}) });

module.exports = {
  ...members, start, mongoose, nextNumber, business, personal, addStaff, addPeriod, periodById, schedule, scheduledOf,
  openOrder, addContract, addVersion, contractOf, addPurchase, purchaseById, usage, expectError,
  PlanModel, SubscriptionModel, SubscriptionPeriodModel, UsageRunModel, UsageTopUpModel,
  ContractReviewPurchaseModel, PaymentModel, ContractModel, ContractVersionModel,
};
