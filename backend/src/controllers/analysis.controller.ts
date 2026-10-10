import { asyncHandler } from '../utils/asyncHandler';
import { getOrganizationUser } from '../middlewares/auth.middleware';
import { analyzeContract } from '../services/analysis.service';
import { getIdempotencyKey } from '../validations/subscription.validation';
import { ok } from '../utils/ApiResponse';
import { openSseStream } from '../utils/sse';
import { RequestHandler } from 'express';

export const retiredAnalysisStageHandler: RequestHandler = (_req, res) => {
  res
    .status(410)
    .json({
      success: false,
      error: {
        message:
          'Use POST /api/v1/contracts/:id/analysis or /analysis/stream with Idempotency-Key. One complete analysis consumes one credit.',
      },
    });
};

export const analyzeContractHandler = asyncHandler(async (req, res) => {
  const user = getOrganizationUser(req);
  const idempotencyKey = getIdempotencyKey(req);
  const controller = new AbortController();
  const onClose = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.on('close', onClose);
  try {
    ok(
      res,
      await analyzeContract(
        {
          orgId: user.orgId,
          userId: user.sub,
          contractId: req.params.id,
          idempotencyKey,
          analysisFocus: req.body.analysisFocus,
        },
        undefined,
        controller.signal,
      ),
    );
  } finally {
    res.off('close', onClose);
  }
});

export const analyzeContractStreamHandler = asyncHandler(async (req, res) => {
  const user = getOrganizationUser(req);
  const idempotencyKey = getIdempotencyKey(req);
  const stream = openSseStream(res);
  try {
    const result = await analyzeContract(
      {
        orgId: user.orgId,
        userId: user.sub,
        contractId: req.params.id,
        idempotencyKey,
        analysisFocus: req.body.analysisFocus,
      },
      (stage) => stream.send('progress', { stage }),
      stream.signal,
    );
    stream.send('done', result);
  } catch (err) {
    stream.fail(err);
  } finally {
    stream.end();
  }
});
