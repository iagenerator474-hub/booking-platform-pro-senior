## About this repository

This repository is a **frozen production reference** shared for **peer review and technical discussion**.

It demonstrates a **pragmatic and reliable Stripe Checkout integration**
(signed webhooks, database-level idempotence, correct ACK strategy)
built on a sober **Express + PostgreSQL** backend.

This is **not**:
- a starter template
- a boilerplate
- a SaaS product
- something intended to be reused as-is

The goal is to show how to build a backend that **handles payments correctly,
survives retries, and remains easy to operate in production**.

Feedback is welcome, especially on:
- Stripe webhook design and ACK policy
- idempotence strategy
- production pragmatism
