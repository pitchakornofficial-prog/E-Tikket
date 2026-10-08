# SPEC-008: Scanner Torch, Haptic, Sound & Fast Continuous Mode

- Status: ready
- Requirement: [Gate Staff Real-world Usability Enhancements: Flashlight, Haptic/Sound, and Continuous Auto-Scan]
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: None

## Problem and outcome

Gate staff operating at live music venues, pubs, bars, and concert entrances face three critical field challenges:
1. **Low Light / Darkness:** Entrances are often dim or dark at night, making camera QR recognition slow or impossible without a flashlight.
2. **High Noise / Sensory Feedback:** Concert environments are loud with bass and ambient crowd noise. Gate staff need immediate multi-sensory feedback (haptic vibration + clear synthetic audio chime) to confirm entry without squinting at the screen.
3. **Queue Throughput (Bottleneck of Manual Next):** When 50–100 attendees queue at the gate, requiring the staff to manually tap "สแกนคนถัดไป" for every single ticket slows down entry lines significantly.

By introducing:
1. **Flashlight (Torch) toggle:** Using MediaStreamTrack constraints with graceful fallback.
2. **Multi-sensory feedback:** Haptic vibration (`navigator.vibrate`) + Web Audio chime (pleasant chime on success, low buzzer on reject/duplicate) with a sound mute/unmute toggle.
3. **Continuous Auto-Scan Mode:** An automated countdown/reset timer (1.5s on success, 2.5s on warning) that resets the scanner ready for the next ticket automatically, while preserving manual tap override.

## In scope

1. **Dedicated Scanner Page (`src/app/scanner/[token]/page.tsx`):**
   - Torch button in viewfinder controls when hardware supports it.
   - Haptic vibration patterns: short single buzz on VALID (`[120]`), distinct double buzz on error/duplicate/invalid (`[150, 100, 250]`).
   - Web Audio API synthesizer for clean offline chime/alert sound without external audio files.
   - Sound toggle button (Mute / Unmute) with status persisted in local session.
   - Continuous Scan toggle switch (เปิด/ปิด "สแกนต่อเนื่องอัตโนมัติ") with configurable visual countdown bar.
   - Automatic resume to active scanning after 1.5s on VALID, 2.5s on error/duplicate, while allowing immediate manual "สแกนคนถัดไป" click.
2. **Organizer Scanner Component (`src/components/organizer-scanner.tsx`):**
   - Synchronize identical torch, haptic, audio, and continuous scan features if accessed directly by staff.
3. **Monochromatic Light & Dark Mode Compatibility:**
   - Visual controls fit high-contrast black/white styling with clear active/inactive indicator states.

## Out of scope

- Native iOS/Android camera application development (runs in mobile browser).
- External audio file hosting/assets (all sound generated natively via Web Audio API).
- Offline token caching database (all scans are verified via server API).

## Acceptance Criteria

- AC-01: When the device camera supports torch/flashlight, a Torch toggle button appears on the scanner interface allowing staff to toggle the light on/off.
- AC-02: If the device does not support torch or permission is denied, the Torch button is cleanly disabled or hidden with no runtime error.
- AC-03: On successful ticket scan (`VALID`), the device triggers a success haptic vibration (if supported) and a pleasant synthetic audio chime (if unmuted).
- AC-04: On failed or warning ticket scan (`ALREADY_CHECKED_IN`, `INVALID`, `WRONG_EVENT`, `CANCELLED`), the device triggers a warning haptic vibration (if supported) and a distinct warning buzzer tone (if unmuted).
- AC-05: A sound toggle button is provided on the scanner interface to allow staff to mute or unmute audio feedback at any time.
- AC-06: A Continuous Auto-Scan toggle is provided. When enabled, valid scans display feedback and automatically resume camera scanning after ~1.5s without requiring manual tap.
- AC-07: When Continuous Auto-Scan is enabled and an error/warning occurs, scanner pauses for ~2.5s with clear warning indicator before auto-resuming, or allows immediate manual retry.
- AC-08: When Continuous Auto-Scan is disabled, the scanner waits for manual tap on "สแกนคนถัดไป" as before.
- AC-09: All UI controls and feedback banners maintain full Monochromatic Light and Dark mode styling and responsiveness.

## Verification Plan

| AC | Verification |
| --- | --- |
| AC-01, AC-02 | Verify torch toggle functionality and graceful fallback when track constraints lack torch capability. |
| AC-03, AC-04, AC-05 | Test scan with valid and invalid tickets; verify Web Audio synthesizer sound triggers and mute button silences audio. |
| AC-06, AC-07, AC-08 | Verify continuous scan toggle resumes camera scanning automatically within set timer, and manual button remains responsive. |
| AC-09 | Check responsive mobile layout, dark/light theme contrast, and run `npm run typecheck` & `npm run build`. |
