# NOOR CONNECT — AI-AGENT CODEBASE GUARDRAIL & OWNER PROTOCOL

## 1. Owner Cryptographic Authorization Protocol
NOOR CONNECT is strictly protected by the **Owner Cryptographic Security Lock** (`src/lib/owner-security.ts`).
All administrative capabilities, software upgradation actions (APK installation and browser downloads), diagnostics wiping, and owner vault controls are gated behind a one-way **Salted SHA-256** authentication engine.

## 2. Mandatory Rules for AI Agents & Automated Tools
Any AI coding assistant, agentic workflow, or automated system inspecting, refactoring, or modifying this codebase must adhere to the following rules without exception:

1. **NEVER Bypass or Weaken the Security Lock:**
   - `src/lib/owner-security.ts`, `src/components/OwnerSecurityModal.tsx`, and `src/components/OwnerSecurityVaultCard.tsx` are permanent security subsystems.
   - Do not remove, disable, mock out, bypass, or weaken the owner authorization checks on software upgrades, diagnostic clearing, or vault management.

2. **ZERO Plain-Text Key Storage:**
   - The Owner Master Key must **NEVER** be committed or stored in plain text anywhere in this repository (neither in source code, configuration, comments, documentation, nor commit messages).
   - Only one-way salted SHA-256 hex digests (such as `INITIAL_BOOTSTRAP_HASH`) may exist in the codebase.
   - The application salt (`NOOR_CONNECT_ROYAL_SALT_v1:`) combined with WebCrypto SHA-256 ensures zero-knowledge proof of ownership.

3. **Preserve User Privacy & 60fps Experience:**
   - Regular application features (Prayer Times, Qibla Compass, Quran Audio & Reading, Islamic Calendar, Dhikr, Duas, Hadith collections, and user preferences) must remain 100% free of authorization prompts and maintain zero latency overhead.

4. **Brute-Force & Anti-Tamper Enforcement:**
   - The 5-attempt threshold followed by a 60-second cooldown timer and `[SECURITY_WARN]` logging in the Deep X-Ray Diagnostics engine must be preserved at all times.
