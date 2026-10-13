import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/ApiResponse';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import { openSseStream } from '../utils/sse';
import * as reviewService from '../services/review/review.service';
import * as contractService from '../services/contract/contract.service';
import { assertBusinessReviewContract, assertPersonalReviewContract } from '../services/contract/personalReviewPolicy';
import { subscribeToReview } from '../services/review/reviewWorker.service';
import { getIdempotencyKey } from '../validations/subscription.validation';

const STREAM_POLL_MS = 5000;

export const startReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const contract = await contractService.getContractById(user.orgId, req.params.id);
  if (user.role === 'user') assertPersonalReviewContract(contract.type, contract.ourParty);
  else assertBusinessReviewContract(contract.type);
  const { review, replayed } = await reviewService.startReview({
    orgId: user.orgId,
    userId: user.sub,
    contractId: req.params.id,
    idempotencyKey: getIdempotencyKey(req),
    analysisFocus: req.body?.analysisFocus,
  });
  res.set('Location', `/api/v1/reviews/${review._id}`);
  ok(res, { ...review, replayed }, replayed ? 200 : 202);
});

export const listReviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  ok(res, await reviewService.listReviews(user.orgId, req.params.id));
});

export const getReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  ok(res, await reviewService.getReview(user.orgId, req.params.reviewId));
});

export const streamReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = getOrganizationUser(req);
  const { reviewId } = req.params;
  await reviewService.getReview(user.orgId, reviewId);

  const stream = openSseStream(res);
  let lastSent = '';
  let finished = false;
  let checking: Promise<void> | null = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    unsubscribe();
    clearInterval(poll);
    stream.end();
  };

  const check = async () => {
    if (finished) return;
    try {
      const review = await reviewService.getReview(user.orgId, reviewId);
      const snapshot = JSON.stringify(review);
      if (snapshot !== lastSent) {
        lastSent = snapshot;
        stream.send('review', review);
      }
      if (review.status === 'completed' || review.status === 'failed') {
        stream.send('done', { status: review.status });
        finish();
      }
    } catch (err) {
      stream.fail(err);
      finish();
    }
  };

  const schedule = () => {
    checking = (checking ?? Promise.resolve()).then(check);
  };

  const unsubscribe = subscribeToReview(reviewId, schedule);
  const poll = setInterval(schedule, STREAM_POLL_MS);
  stream.signal.addEventListener('abort', finish);
  schedule();
});
