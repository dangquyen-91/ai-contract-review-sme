---
type: srs-flows
feature: subscription
updated: 2026-10-19
---

# Subscription — Flows

## Flow: Tạo đơn mua gói
**Trigger**: Chủ tổ chức chọn một gói trả phí và bấm xác nhận mua
**Related UC**: TBD
**Related FR**: TBD
**Related E**: TBD

```mermaid
sequenceDiagram
    actor User as Owner
    participant Web as Web (/goi-dich-vu/xac-nhan)
    participant PC as payment.controller
    participant PS as payment.service
    participant SS as subscription.service
    participant DB as MongoDB
    participant PayOS as payos.service (payOS)

    User->>Web: Confirm a paid plan (planCode)
    Web->>PC: POST /api/v1/organizations/:id/payments {planCode, action: purchase} with Idempotency-Key
    Note over Web,PC: Frontend proxy for /payments is not implemented yet
    PC->>PS: createPayment(userId, orgId, {planCode, action}, idempotencyKey)
    PS->>SS: requireSubscriptionAccess(userId, orgId, ownerOnly true)
    PS->>DB: PaymentModel.findOne({orgId, idempotencyKey})
    PS->>DB: PlanModel.findOne({code: planCode})
    DB-->>PS: plan {name, price}
    PS->>SS: validatePaidSubscriptionPurchase({orgId, planCode, action, amount: plan.price, paymentReference: payos:orderCode})
    PS->>DB: transaction - lockSubscriptionOrganization(orgId), PaymentModel.exists({orgId, isOpen: true})
    Note over PS,DB: Stops at the first matching condition, in the order of the branches below

    alt A1 - requireSubscriptionAccess, user is not the owner
        SS-->>PS: AppError.forbidden
        PC-->>Web: 403 Only the owner can manage the subscription
        Web-->>User: Show no permission to buy a plan
    else Duplicate - same idempotencyKey and same planCode, action
        PS->>PS: repeat(previous, input) then view(order)
        PC-->>Web: 201 existing order {orderCode, checkoutUrl}
        Web-->>User: Continue with the existing order
    else A6 - same idempotencyKey, different planCode or action
        PC-->>Web: 409 Idempotency-Key was already used for another purchase
        Web-->>User: Ask to start the purchase again
    else A2 - plan not found or plan.price is 0
        PC-->>Web: 400 Choose a paid plan
        Web-->>User: Ask to choose a paid plan
    else A3 - validatePaidSubscriptionPurchase finds an active or prepaid period
        SS-->>PS: AppError.conflict
        PC-->>Web: 409 An active or prepaid subscription already exists
        Web-->>User: Suggest renew or upgrade instead
    else A4 - member count exceeds plan member limit
        SS-->>PS: AppError.conflict
        PC-->>Web: 409 Organization exceeds the target member limit
        Web-->>User: Ask to remove members or choose a larger plan
    else A5 - an order with isOpen true exists
        PC-->>Web: 409 An unfinished payment exists, synchronize or cancel it first
        Web-->>User: Show the unfinished order to resolve
    else Valid
        PS->>DB: PaymentModel.create({orgId, createdBy, idempotencyKey, orderCode, planCode, action, amount: plan.price, expiresAt: now + 15 min})
        PS->>PayOS: createPaymentLink({orderCode, amount, description, items, returnUrl, cancelUrl, expiredAt})
        PayOS-->>PS: {orderCode, amount, currency VND, paymentLinkId, checkoutUrl, qrCode}
        PS->>DB: PaymentModel.updateOne(set paymentLinkId, checkoutUrl, qrCode, status pending)
        PS-->>PC: view(order)
        PC-->>Web: 201 {orderCode, status: pending, checkoutUrl, qrCode, expiresAt}
        Web-->>User: Redirect to checkoutUrl
    end
```

## Flow: Webhook xác nhận thanh toán và kích hoạt gói
**Trigger**: payOS gửi webhook về `/api/v1/payments/payos/webhook` sau khi có giao dịch
**Related UC**: TBD
**Related FR**: TBD
**Related E**: TBD

```mermaid
sequenceDiagram
    actor User as Owner
    participant PayOS as payos.service (payOS)
    participant PC as payment.controller
    participant PS as payment.service
    participant SS as subscription.service
    participant DB as MongoDB

    User->>PayOS: Pay at checkoutUrl
    PayOS->>PC: POST /api/v1/payments/payos/webhook (signed body)
    Note over PayOS,PC: Mounted before rate limiter and JWT auth, authenticated by signature
    PC->>PS: receivePaymentWebhook(body)
    PS->>PayOS: verifyPaymentWebhook(body)
    PayOS-->>PS: data {orderCode, code, amount, currency, paymentLinkId}
    PS->>DB: PaymentModel.findOne({orderCode})
    DB-->>PS: order {amount, paymentLinkId, fulfilledAt}
    PS->>PayOS: getPaymentLink(orderCode)

    alt Paid in full - status PAID, amountPaid equals amount, amountRemaining 0
        PayOS-->>PS: {status: PAID, amountPaid, amountRemaining: 0}
        PS->>PS: reconcile(order, remote)
        PS->>DB: PaymentModel.updateOne({paidAt: null}, set status paid, paidAt)
        PS->>PS: fulfill(order)
        PS->>SS: activatePaidSubscription({orgId, planCode, action, amount, paymentReference: payos:orderCode}, paidAt)
        SS->>DB: create SubscriptionPeriod for a new monthly cycle
        SS-->>PS: period {_id}
        PS->>DB: PaymentModel.updateOne({fulfilledAt: null}, set fulfilledAt, subscriptionPeriodId, isOpen false)
        PC-->>PayOS: 200 {success: true}
        Note over PS,SS: Stable paymentReference makes repeated webhooks idempotent, no second period
    else A3 - Underpaid - status PENDING, amountRemaining above 0
        PayOS-->>PS: {status: PENDING, amountPaid, amountRemaining}
        PS->>PS: reconcile(order, remote)
        PS->>DB: PaymentModel.updateOne({paidAt: null}, set status pending)
        PC-->>PayOS: 200 {success: true}
        Note over PS,DB: No activation. Flagged for support when the link later expires, see sync flow
    end
```

## Flow: Đối soát đơn khi người dùng quay lại
**Trigger**: Người dùng quay lại từ payOS (returnUrl hoặc cancelUrl) hoặc mở lại đơn từ lịch sử thanh toán
**Related UC**: TBD
**Related FR**: TBD
**Related E**: TBD

```mermaid
sequenceDiagram
    actor User as Owner
    participant Web as Web (/goi-dich-vu/xac-nhan)
    participant PC as payment.controller
    participant PS as payment.service
    participant DB as MongoDB
    participant PayOS as payos.service (payOS)

    User->>Web: Open return page, cancel page or payment history
    Web->>PC: POST /api/v1/organizations/:id/payments/:orderCode/sync
    Note over Web,PC: Frontend proxy for /payments is not implemented yet
    PC->>PS: syncPayment(userId, orgId, orderCode)
    PS->>DB: ownedOrder - requireSubscriptionAccess, PaymentModel.findOne({orgId, orderCode})
    DB-->>PS: order {fulfilledAt, status, amount}

    alt Already fulfilled - fulfilledAt is set
        PS-->>PC: view(order)
        PC-->>Web: 200 {status: paid, fulfilledAt}
        Web-->>User: Show purchase successful, plan active
    else Not fulfilled yet
        PS->>PayOS: getPaymentLink(orderCode)
        alt PAID in full - webhook missed or arrived late
            PayOS-->>PS: {status: PAID, amountPaid equals amount}
            PS->>PS: reconcile then fulfill, activatePaidSubscription(..., paidAt)
            PS->>DB: set status paid, paidAt, fulfilledAt, isOpen false
            PC-->>Web: 200 {status: paid, fulfilledAt}
            Web-->>User: Show purchase successful, plan active
        else A1 - CANCELLED, amountPaid 0
            PayOS-->>PS: {status: CANCELLED, amountPaid: 0}
            PS->>DB: set status cancelled, isOpen false
            PC-->>Web: 200 {status: cancelled}
            Web-->>User: Show payment cancelled, plan not activated
        else A2 - EXPIRED after 15 min, amountPaid 0
            PayOS-->>PS: {status: EXPIRED, amountPaid: 0}
            PS->>DB: set status expired, isOpen false
            PC-->>Web: 200 {status: expired}
            Web-->>User: Show order expired, create a new purchase
        else A3 - EXPIRED or CANCELLED with partial amountPaid
            PayOS-->>PS: {status: EXPIRED, amountPaid above 0}
            PS->>DB: set providerError Partial payment received, isOpen stays true
            PC-->>Web: 200 {status: pending, providerError}
            Web-->>User: Show contact support before a new purchase, plan not activated
        end
    end
```
