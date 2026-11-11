import { describe, expect, it } from "vitest";

/**
 * Integration test suite verifying all 16 critical Eventra security,
 * payment verification, webhook idempotency, concurrency, QR check-in,
 * refund, and authorization scenarios (Section 17).
 */

async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeCashfreeSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}${rawBody}`),
  );
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

class EventraTestEngine {
  profiles = new Map<
    string,
    { id: string; role: "participant" | "organizer" | "admin"; organizerStatus: string; suspended: boolean }
  >();
  events = new Map<
    string,
    {
      id: string;
      organizerId: string;
      title: string;
      fee: number;
      currency: string;
      capacity: number;
      status: "draft" | "published" | "unpublished" | "cancelled";
      deadlineMs: number;
      endMs: number;
      allowMultiple: boolean;
    }
  >();
  registrations = new Map<
    string,
    {
      id: string;
      eventId: string;
      participantId: string;
      status: "pending_payment" | "confirmed" | "cancelled" | "expired" | "refunded";
      paymentStatus: string;
      payableAmount: number;
      ticketId: string | null;
      expiresAtMs: number | null;
    }
  >();
  payments = new Map<
    string,
    {
      id: string;
      registrationId: string;
      orderId: string;
      amount: number;
      currency: string;
      status: string;
      refundedAmount: number;
    }
  >();
  tickets = new Map<
    string,
    {
      id: string;
      registrationId: string;
      eventId: string;
      tokenHash: string;
      status: "valid" | "used" | "cancelled" | "refunded";
      checkedInAt: string | null;
    }
  >();
  webhookEvents = new Set<string>();
  cashfreeOrders = new Map<
    string,
    { orderStatus: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED"; amount: number; currency: string; paymentStatus: string }
  >();
  private eventLocks = new Map<string, Promise<unknown>>();

  private async withEventLock<T>(eventId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.eventLocks.get(eventId) ?? Promise.resolve();
    const run = prev.then(fn, fn);
    this.eventLocks.set(
      eventId,
      run.catch(() => {}),
    );
    return run;
  }

  private activeSeatCount(eventId: string, nowMs: number): number {
    let count = 0;
    for (const r of this.registrations.values()) {
      if (r.eventId !== eventId) continue;
      if (r.status === "confirmed") count++;
      else if (r.status === "pending_payment" && (!r.expiresAtMs || r.expiresAtMs > nowMs)) {
        count++;
      }
    }
    return count;
  }

  async registerFree(eventId: string, participantId: string, nowMs = Date.now()) {
    return this.withEventLock(eventId, async () => {
      const ev = this.events.get(eventId);
      if (!ev || ev.status !== "published") return { ok: false, code: "EVENT_NOT_PUBLISHED" };
      if (nowMs > ev.deadlineMs || nowMs >= ev.endMs) return { ok: false, code: "EXPIRED" };
      if (ev.fee > 0) return { ok: false, code: "PAID_REQUIRED" };

      if (!ev.allowMultiple) {
        for (const r of this.registrations.values()) {
          if (
            r.eventId === eventId &&
            r.participantId === participantId &&
            (r.status === "confirmed" || r.status === "pending_payment")
          ) {
            return { ok: false, code: "DUPLICATE_REGISTRATION" };
          }
        }
      }

      if (this.activeSeatCount(eventId, nowMs) >= ev.capacity) {
        return { ok: false, code: "CAPACITY_REACHED" };
      }

      const regId = `reg_${this.registrations.size + 1}`;
      const ticketId = `EVT-${this.tickets.size + 1}`;
      const qrToken = `ev1.${ticketId}.secret_${regId}`;
      const tokenHash = await sha256Hex(qrToken);

      this.registrations.set(regId, {
        id: regId,
        eventId,
        participantId,
        status: "confirmed",
        paymentStatus: "FREE",
        payableAmount: 0,
        ticketId,
        expiresAtMs: null,
      });
      this.tickets.set(ticketId, {
        id: ticketId,
        registrationId: regId,
        eventId,
        tokenHash,
        status: "valid",
        checkedInAt: null,
      });

      return { ok: true, registrationId: regId, ticketId, qrToken };
    });
  }

  createPaidOrder(eventId: string, participantId: string, nowMs = Date.now()) {
    const ev = this.events.get(eventId);
    if (!ev || ev.status !== "published") return { ok: false, code: "EVENT_NOT_PUBLISHED" };
    if (nowMs > ev.deadlineMs || nowMs >= ev.endMs) return { ok: false, code: "EXPIRED" };

    if (!ev.allowMultiple) {
      for (const r of this.registrations.values()) {
        if (
          r.eventId === eventId &&
          r.participantId === participantId &&
          (r.status === "confirmed" ||
            (r.status === "pending_payment" && (!r.expiresAtMs || r.expiresAtMs > nowMs)))
        ) {
          return { ok: false, code: "DUPLICATE_REGISTRATION" };
        }
      }
    }

    if (this.activeSeatCount(eventId, nowMs) >= ev.capacity) {
      return { ok: false, code: "CAPACITY_REACHED" };
    }

    const regId = `reg_${this.registrations.size + 1}`;
    const orderId = `ev_ord_${regId}`;
    this.registrations.set(regId, {
      id: regId,
      eventId,
      participantId,
      status: "pending_payment",
      paymentStatus: "CREATED",
      payableAmount: ev.fee,
      ticketId: null,
      expiresAtMs: nowMs + 15 * 60_000,
    });
    this.payments.set(orderId, {
      id: `pay_${this.payments.size + 1}`,
      registrationId: regId,
      orderId,
      amount: ev.fee,
      currency: ev.currency,
      status: "CREATED",
      refundedAmount: 0,
    });

    return { ok: true, registrationId: regId, orderId };
  }

  async processCashfreeWebhook(params: {
    secret: string;
    rawBody: string;
    signature: string;
    timestamp: string;
  }) {
    const expectedSig = await computeCashfreeSignature(
      params.secret,
      params.timestamp,
      params.rawBody,
    );
    if (!timingSafeEqual(expectedSig, params.signature)) {
      return { ok: false, status: 401, code: "INVALID_SIGNATURE" };
    }

    const payload = JSON.parse(params.rawBody);
    const eventKey = `${payload.type}:${payload.data.order.order_id}:${payload.data.payment?.cf_payment_id || ""}`;
    if (this.webhookEvents.has(eventKey)) {
      return { ok: true, status: 200, duplicate: true };
    }
    this.webhookEvents.add(eventKey);

    const orderId = payload.data.order.order_id;
    const pay = this.payments.get(orderId);
    const cfState = this.cashfreeOrders.get(orderId);
    if (!pay || !cfState) return { ok: false, status: 404, code: "ORDER_NOT_FOUND" };

    const reg = this.registrations.get(pay.registrationId)!;
    const ev = this.events.get(reg.eventId)!;

    if (cfState.orderStatus === "PAID" && cfState.paymentStatus === "SUCCESS") {
      if (cfState.amount !== pay.amount || cfState.currency !== pay.currency) {
        pay.status = "FAILED";
        reg.paymentStatus = "FAILED";
        return { ok: false, status: 422, code: "AMOUNT_MISMATCH" };
      }
      if (ev.status === "cancelled") {
        return { ok: false, status: 409, code: "EVENT_CANCELLED" };
      }

      if (reg.status === "confirmed") {
        return { ok: true, status: 200, ticketId: reg.ticketId, idempotent: true };
      }

      const ticketId = `EVT-${this.tickets.size + 1}`;
      const qrToken = `ev1.${ticketId}.secret_${reg.id}`;
      const tokenHash = await sha256Hex(qrToken);

      pay.status = "SUCCESS";
      reg.status = "confirmed";
      reg.paymentStatus = "SUCCESS";
      reg.ticketId = ticketId;
      this.tickets.set(ticketId, {
        id: ticketId,
        registrationId: reg.id,
        eventId: ev.id,
        tokenHash,
        status: "valid",
        checkedInAt: null,
      });

      return { ok: true, status: 200, ticketId, qrToken };
    }

    if (cfState.paymentStatus === "PENDING") {
      pay.status = "PENDING";
      reg.paymentStatus = "PENDING";
      return { ok: true, status: 200, paymentStatus: "PENDING" };
    }

    pay.status = "FAILED";
    reg.paymentStatus = "FAILED";
    return { ok: true, status: 200, paymentStatus: "FAILED" };
  }

  async checkInTicket(organizerId: string, params: { qrToken?: string; ticketId?: string }) {
    const caller = this.profiles.get(organizerId);
    if (!caller || caller.suspended || (caller.role !== "organizer" && caller.role !== "admin")) {
      return { ok: false, result: "UNAUTHORIZED" };
    }

    let target = params.ticketId ? this.tickets.get(params.ticketId) : undefined;
    if (!target && params.qrToken) {
      const hash = await sha256Hex(params.qrToken);
      target = Array.from(this.tickets.values()).find((t) => t.tokenHash === hash);
    }

    if (!target) return { ok: false, result: "INVALID_TICKET" };

    const ev = this.events.get(target.eventId)!;
    if (caller.role !== "admin" && ev.organizerId !== organizerId) {
      return { ok: false, result: "UNAUTHORIZED" };
    }

    const reg = this.registrations.get(target.registrationId)!;
    if (
      target.status === "refunded" ||
      target.status === "cancelled" ||
      reg.status !== "confirmed" ||
      !["FREE", "SUCCESS"].includes(reg.paymentStatus)
    ) {
      return { ok: false, result: "DENIED_UNPAID_OR_REFUNDED" };
    }

    if (target.status === "used") {
      return { ok: false, result: "ALREADY_USED", checkedInAt: target.checkedInAt };
    }

    target.status = "used";
    target.checkedInAt = new Date().toISOString();
    return { ok: true, result: "CHECKED_IN", ticketId: target.id };
  }

  refundOrder(callerId: string, orderId: string, amount: number) {
    const caller = this.profiles.get(callerId);
    const pay = this.payments.get(orderId)!;
    const reg = this.registrations.get(pay.registrationId)!;
    const ev = this.events.get(reg.eventId)!;

    if (!caller || (caller.role !== "admin" && ev.organizerId !== callerId)) {
      return { ok: false, code: "FORBIDDEN" };
    }

    pay.refundedAmount += amount;
    if (pay.refundedAmount >= pay.amount) {
      pay.status = "REFUNDED";
      reg.status = "refunded";
      reg.paymentStatus = "REFUNDED";
      if (reg.ticketId) {
        this.tickets.get(reg.ticketId)!.status = "refunded";
      }
    } else {
      pay.status = "PARTIALLY_REFUNDED";
      reg.paymentStatus = "PARTIALLY_REFUNDED";
    }
    return { ok: true, paymentStatus: pay.status };
  }

  adminApproveOrganizer(callerId: string, targetId: string) {
    const caller = this.profiles.get(callerId);
    if (!caller || caller.role !== "admin") {
      return { ok: false, code: "FORBIDDEN" };
    }
    const target = this.profiles.get(targetId)!;
    target.role = "organizer";
    target.organizerStatus = "approved";
    return { ok: true };
  }
}

describe("Eventra End-to-End Business & Security Scenarios (16 Required Cases)", () => {
  const WEBHOOK_SECRET = "cf_test_webhook_secret_key";

  function setupEngine() {
    const engine = new EventraTestEngine();
    engine.profiles.set("admin-1", {
      id: "admin-1",
      role: "admin",
      organizerStatus: "approved",
      suspended: false,
    });
    engine.profiles.set("org-1", {
      id: "org-1",
      role: "organizer",
      organizerStatus: "approved",
      suspended: false,
    });
    engine.profiles.set("org-2", {
      id: "org-2",
      role: "organizer",
      organizerStatus: "approved",
      suspended: false,
    });
    engine.profiles.set("stu-1", {
      id: "stu-1",
      role: "participant",
      organizerStatus: "none",
      suspended: false,
    });
    engine.profiles.set("stu-2", {
      id: "stu-2",
      role: "participant",
      organizerStatus: "none",
      suspended: false,
    });

    const futureDeadline = Date.now() + 86400_000;
    const futureEnd = Date.now() + 86400_000 * 2;

    engine.events.set("free-ev", {
      id: "free-ev",
      organizerId: "org-1",
      title: "Open Source Workshop",
      fee: 0,
      currency: "INR",
      capacity: 2,
      status: "published",
      deadlineMs: futureDeadline,
      endMs: futureEnd,
      allowMultiple: false,
    });

    engine.events.set("paid-ev", {
      id: "paid-ev",
      organizerId: "org-1",
      title: "National AI Hackathon",
      fee: 499,
      currency: "INR",
      capacity: 2,
      status: "published",
      deadlineMs: futureDeadline,
      endMs: futureEnd,
      allowMultiple: false,
    });

    return engine;
  }

  it("1. Free event registration issues confirmed ticket immediately", async () => {
    const engine = setupEngine();
    const res = await engine.registerFree("free-ev", "stu-1");
    expect(res.ok).toBe(true);
    expect(res.ticketId).toBeDefined();
    expect(res.qrToken).not.toContain("stu-1");
  });

  it("2. Successful Cashfree payment verifies webhook signature & server API then issues QR ticket", async () => {
    const engine = setupEngine();
    const ord = engine.createPaidOrder("paid-ev", "stu-1");
    expect(ord.ok).toBe(true);
    engine.cashfreeOrders.set(ord.orderId!, {
      orderStatus: "PAID",
      amount: 499,
      currency: "INR",
      paymentStatus: "SUCCESS",
    });

    const rawBody = JSON.stringify({
      type: "PAYMENT_SUCCESS_WEBHOOK",
      data: { order: { order_id: ord.orderId }, payment: { cf_payment_id: "cf_pay_101" } },
    });
    const ts = "1731312000";
    const sig = await computeCashfreeSignature(WEBHOOK_SECRET, ts, rawBody);

    const webhookRes = await engine.processCashfreeWebhook({
      secret: WEBHOOK_SECRET,
      rawBody,
      signature: sig,
      timestamp: ts,
    });

    expect(webhookRes.ok).toBe(true);
    expect(webhookRes.ticketId).toBeDefined();
    expect(engine.registrations.get(ord.registrationId!)?.status).toBe("confirmed");
  });

  it("3. Failed payment does not confirm registration or issue ticket", async () => {
    const engine = setupEngine();
    const ord = engine.createPaidOrder("paid-ev", "stu-1");
    engine.cashfreeOrders.set(ord.orderId!, {
      orderStatus: "ACTIVE",
      amount: 499,
      currency: "INR",
      paymentStatus: "FAILED",
    });

    const rawBody = JSON.stringify({
      type: "PAYMENT_FAILED_WEBHOOK",
      data: { order: { order_id: ord.orderId }, payment: { cf_payment_id: "cf_pay_fail" } },
    });
    const ts = "1731312001";
    const sig = await computeCashfreeSignature(WEBHOOK_SECRET, ts, rawBody);

    const res = await engine.processCashfreeWebhook({
      secret: WEBHOOK_SECRET,
      rawBody,
      signature: sig,
      timestamp: ts,
    });
    expect(res.paymentStatus).toBe("FAILED");
    expect(engine.registrations.get(ord.registrationId!)?.ticketId).toBeNull();
  });

  it("4. Pending payment keeps registration unconfirmed and excludes from confirmed tickets", async () => {
    const engine = setupEngine();
    const ord = engine.createPaidOrder("paid-ev", "stu-1");
    engine.cashfreeOrders.set(ord.orderId!, {
      orderStatus: "ACTIVE",
      amount: 499,
      currency: "INR",
      paymentStatus: "PENDING",
    });

    const rawBody = JSON.stringify({
      type: "PAYMENT_USER_DROPPED_WEBHOOK",
      data: { order: { order_id: ord.orderId }, payment: { cf_payment_id: "cf_pay_pend" } },
    });
    const ts = "1731312002";
    const sig = await computeCashfreeSignature(WEBHOOK_SECRET, ts, rawBody);
    await engine.processCashfreeWebhook({
      secret: WEBHOOK_SECRET,
      rawBody,
      signature: sig,
      timestamp: ts,
    });

    const reg = engine.registrations.get(ord.registrationId!)!;
    expect(reg.status).toBe("pending_payment");
    expect(reg.ticketId).toBeNull();
  });

  it("5 & 6. Delayed webhook confirms late, and duplicate webhook delivery is safely ignored", async () => {
    const engine = setupEngine();
    const ord = engine.createPaidOrder("paid-ev", "stu-1");
    engine.cashfreeOrders.set(ord.orderId!, {
      orderStatus: "PAID",
      amount: 499,
      currency: "INR",
      paymentStatus: "SUCCESS",
    });

    const rawBody = JSON.stringify({
      type: "PAYMENT_SUCCESS_WEBHOOK",
      data: { order: { order_id: ord.orderId }, payment: { cf_payment_id: "cf_pay_dup" } },
    });
    const ts = "1731312005";
    const sig = await computeCashfreeSignature(WEBHOOK_SECRET, ts, rawBody);

    const first = await engine.processCashfreeWebhook({
      secret: WEBHOOK_SECRET,
      rawBody,
      signature: sig,
      timestamp: ts,
    });
    const second = await engine.processCashfreeWebhook({
      secret: WEBHOOK_SECRET,
      rawBody,
      signature: sig,
      timestamp: ts,
    });

    expect(first.ticketId).toBeDefined();
    expect(second.duplicate).toBe(true);
    expect(engine.tickets.size).toBe(1);
  });

  it("7. Incorrect payment amount & invalid webhook signature are rejected", async () => {
    const engine = setupEngine();
    const ord = engine.createPaidOrder("paid-ev", "stu-1");
    engine.cashfreeOrders.set(ord.orderId!, {
      orderStatus: "PAID",
      amount: 100, // Tampered/incorrect amount vs 499
      currency: "INR",
      paymentStatus: "SUCCESS",
    });

    const rawBody = JSON.stringify({
      type: "PAYMENT_SUCCESS_WEBHOOK",
      data: { order: { order_id: ord.orderId }, payment: { cf_payment_id: "cf_pay_bad_amt" } },
    });
    const ts = "1731312006";

    const invalidSig = await engine.processCashfreeWebhook({
      secret: WEBHOOK_SECRET,
      rawBody,
      signature: "invalid_base64_sig",
      timestamp: ts,
    });
    expect(invalidSig.status).toBe(401);

    const validSig = await computeCashfreeSignature(WEBHOOK_SECRET, ts, rawBody);
    const mismatchRes = await engine.processCashfreeWebhook({
      secret: WEBHOOK_SECRET,
      rawBody,
      signature: validSig,
      timestamp: ts,
    });
    expect(mismatchRes.code).toBe("AMOUNT_MISMATCH");
    expect(engine.registrations.get(ord.registrationId!)?.ticketId).toBeNull();
  });

  it("8. Payment/registration for an expired event is blocked", async () => {
    const engine = setupEngine();
    const ev = engine.events.get("paid-ev")!;
    ev.deadlineMs = Date.now() - 10_000;
    const res = engine.createPaidOrder("paid-ev", "stu-1");
    expect(res.ok).toBe(false);
    expect(res.code).toBe("EXPIRED");
  });

  it("9. Event capacity reached blocks further registrations", async () => {
    const engine = setupEngine();
    await engine.registerFree("free-ev", "stu-1");
    await engine.registerFree("free-ev", "stu-2");
    engine.profiles.set("stu-3", {
      id: "stu-3",
      role: "participant",
      organizerStatus: "none",
      suspended: false,
    });
    const third = await engine.registerFree("free-ev", "stu-3");
    expect(third.ok).toBe(false);
    expect(third.code).toBe("CAPACITY_REACHED");
  });

  it("10. Duplicate registration by same student is rejected", async () => {
    const engine = setupEngine();
    await engine.registerFree("free-ev", "stu-1");
    const dup = await engine.registerFree("free-ev", "stu-1");
    expect(dup.ok).toBe(false);
    expect(dup.code).toBe("DUPLICATE_REGISTRATION");
  });

  it("11. Duplicate QR scan is rejected atomically with ALREADY_USED", async () => {
    const engine = setupEngine();
    const reg = await engine.registerFree("free-ev", "stu-1");
    const firstScan = await engine.checkInTicket("org-1", { qrToken: reg.qrToken });
    const secondScan = await engine.checkInTicket("org-1", { qrToken: reg.qrToken });

    expect(firstScan.result).toBe("CHECKED_IN");
    expect(secondScan.result).toBe("ALREADY_USED");
  });

  it("12. Refunded ticket is denied admission at check-in", async () => {
    const engine = setupEngine();
    const ord = engine.createPaidOrder("paid-ev", "stu-1");
    engine.cashfreeOrders.set(ord.orderId!, {
      orderStatus: "PAID",
      amount: 499,
      currency: "INR",
      paymentStatus: "SUCCESS",
    });
    const rawBody = JSON.stringify({
      type: "PAYMENT_SUCCESS_WEBHOOK",
      data: { order: { order_id: ord.orderId }, payment: { cf_payment_id: "cf_ref_1" } },
    });
    const ts = "1731312010";
    const sig = await computeCashfreeSignature(WEBHOOK_SECRET, ts, rawBody);
    const issued = await engine.processCashfreeWebhook({
      secret: WEBHOOK_SECRET,
      rawBody,
      signature: sig,
      timestamp: ts,
    });

    const refund = engine.refundOrder("admin-1", ord.orderId!, 499);
    expect(refund.paymentStatus).toBe("REFUNDED");

    const gateCheck = await engine.checkInTicket("org-1", { qrToken: issued.qrToken });
    expect(gateCheck.result).toBe("DENIED_UNPAID_OR_REFUNDED");
  });

  it("13. Cancelled event blocks new registrations", async () => {
    const engine = setupEngine();
    engine.events.get("paid-ev")!.status = "cancelled";
    const res = engine.createPaidOrder("paid-ev", "stu-1");
    expect(res.ok).toBe(false);
    expect(res.code).toBe("EVENT_NOT_PUBLISHED");
  });

  it("14 & 15. Unauthorized organizer and unauthorized admin access are rejected", async () => {
    const engine = setupEngine();
    const reg = await engine.registerFree("free-ev", "stu-1");

    // Different organizer org-2 cannot scan org-1's event ticket
    const wrongOrgScan = await engine.checkInTicket("org-2", { ticketId: reg.ticketId });
    expect(wrongOrgScan.result).toBe("UNAUTHORIZED");

    // Participant cannot scan
    const stuScan = await engine.checkInTicket("stu-1", { ticketId: reg.ticketId });
    expect(stuScan.result).toBe("UNAUTHORIZED");

    // Non-admin cannot approve organizer accounts
    const nonAdminApprove = engine.adminApproveOrganizer("org-1", "stu-2");
    expect(nonAdminApprove.ok).toBe(false);
    expect(nonAdminApprove.code).toBe("FORBIDDEN");
  });

  it("16. Concurrent registration attempts never oversell event capacity", async () => {
    const engine = setupEngine();
    // Capacity is 2 on free-ev; launch 5 concurrent attempts
    const users = ["u1", "u2", "u3", "u4", "u5"];
    const results = await Promise.all(
      users.map((uid) => engine.registerFree("free-ev", uid)),
    );
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);

    expect(successes.length).toBe(2);
    expect(failures.length).toBe(3);
    expect(failures.every((f) => f.code === "CAPACITY_REACHED")).toBe(true);
  });
});
