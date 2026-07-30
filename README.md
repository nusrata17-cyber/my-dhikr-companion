# My Dhikr Companion

Build a simple, mobile-first Progressive Web App (PWA) called Dhikr Counter that uses the user's microphone and voice recognition to automatically count repeated dhikr.

The primary goal of this MVP is to test one important question:

Can the app accurately listen to a Muslim user reciting "Astaghfirullah" or "La ilaha illallah" repeatedly and automatically count each complete repetition?

The app should prioritize simplicity, usability, privacy, and recognition accuracy. Keep the architecture modular and easy to expand later with more dhikr phrases, better AI voice recognition, and additional features.

1. MVP DHIKR OPTIONS

For the first version, include only two dhikr options:

Option 1

Astaghfirullah
Arabic: أستغفر الله

Option 2

La ilaha illallah
Arabic: لا إله إلا الله

The user must be able to select either dhikr from the main screen.

When selected, clearly display:

Arabic text

English transliteration

Current counter

2. MAIN USER FLOW

The user flow should be:

User opens the app.

Show a peaceful, clean, modern Islamic-inspired interface.

User selects one of the two dhikr options.

If the selected dhikr has not been calibrated yet, guide the user through voice calibration.

If the selected dhikr has already been calibrated, allow the user to start listening immediately.

User taps a large Start Listening microphone button.

Browser requests microphone permission.

Once permission is granted, begin listening.

The app detects each complete repetition of the selected dhikr.

Each recognized complete repetition increases the counter by exactly 1.

Display the counter as a very large number in the center of the screen.

Include a Stop Listening button.

Include a Reset Counter button.

Include a manual +1 button to correct the counter when the app misses a repetition.

Include an optional recognition feedback feature after detected repetitions.

The app should not include unnecessary features such as:

Login

User accounts

Advertisements

Social features

Streaks

Complicated dashboards

Payments

The MVP should be as simple and functional as possible.

3. VOICE CALIBRATION SYSTEM

The app should use a simple personalized voice calibration process based on the complete dhikr phrase.

Do NOT break the dhikr into individual words or pronunciation components.

Each dhikr should be calibrated as one complete phrase, exactly as the user naturally recites it.

The goal is to learn the user's natural pronunciation, rhythm, speed, and reasonable pronunciation variations for the complete dhikr phrase.

The calibration should be performed separately for each dhikr.

For example:

Astaghfirullah has its own personalized voice profile.

La ilaha illallah has its own personalized voice profile.

The system should not require the user to pronounce each individual word separately.

4. CALIBRATION FLOW — ASTAGHFIRULLAH

For:

أستغفر الله

Astaghfirullah

Treat the complete dhikr as one phrase.

Do NOT break it into:

Astaghfir

Allah

Display:

Let's learn how you pronounce this dhikr

أستغفر الله

Astaghfirullah

Please say "Astaghfirullah" naturally.

Ask the user to say the complete dhikr 5 separate times.

Show progress clearly:

1 / 5

Then:

2 / 5

Then:

3 / 5

Then:

4 / 5

Then:

5 / 5

Each successful sample should be captured or processed as part of the user's personalized pronunciation profile for the complete phrase.

The system should learn:

The user's natural pronunciation

Reasonable pronunciation variations

Natural speaking speed

Natural rhythm

The way the user naturally recites the complete phrase

If the app cannot detect a clear pronunciation sample, allow the user to retry that sample without losing previous progress.

After completing 5 successful samples, display:

Your personal dhikr voice profile is ready 🤍

You can now start counting your dhikr.

Add a clear button:

Start Counting

5. CALIBRATION FLOW — LA ILAHA ILLALLAH

For:

لا إله إلا الله

La ilaha illallah

Treat the complete dhikr as one phrase.

Do NOT break it into:

La

ilaha

illa

Allah

Display:

Let's learn how you pronounce this dhikr

لا إله إلا الله

La ilaha illallah

Please say "La ilaha illallah" naturally.

Ask the user to say the complete dhikr 5 separate times.

Show progress clearly:

1 / 5

Then:

2 / 5

Then:

3 / 5

Then:

4 / 5

Then:

5 / 5

Each successful sample should be captured or processed as part of the user's personalized pronunciation profile for the complete phrase.

The system should learn:

The user's natural pronunciation

Reasonable pronunciation variations

Natural speaking speed

Natural rhythm

The way the user naturally recites the complete phrase

If the app cannot detect a clear pronunciation sample, allow the user to retry that sample without losing previous progress.

After completing 5 successful samples, display:

Your personal dhikr voice profile is ready 🤍

You can now start counting your dhikr.

Add a clear button:

Start Counting

6. CALIBRATION UX

Keep calibration simple, peaceful, and guided.

For Astaghfirullah, show:

Step 1 of 1

Learning how you pronounce:

أستغفر الله

Astaghfirullah

Please say the complete dhikr naturally.

1 / 5

The progress should update until:

5 / 5

For La ilaha illallah, show:

Step 1 of 1

Learning how you pronounce:

لا إله إلا الله

La ilaha illallah

Please say the complete dhikr naturally.

1 / 5

The progress should update until:

5 / 5

Use a clear visual microphone indicator while recording/listening.

Show clear feedback such as:

"Listening..."

"Got it!"

"Please try again"

"Great!"

"5 of 5 complete"

The user should always be able to:

Retry the current sample

Restart calibration

Cancel calibration

Recalibrate later from settings

The calibration system should be reusable so additional complete dhikr phrases can be added in the future.

7. PERSONALIZED VOICE RECOGNITION

After calibration, the app should use the personalized pronunciation profile of the complete dhikr phrase when recognizing repetitions.

For Astaghfirullah, use the user's personalized profile for:

أستغفر الله — Astaghfirullah

For La ilaha illallah, use the user's personalized profile for:

لا إله إلا الله — La ilaha illallah

The system should NOT rely only on exact speech-to-text spelling.

Instead, use the personalized calibration data as an additional signal to determine whether the user has spoken the intended complete dhikr.

The recognition system should consider available signals such as:

Personalized pronunciation profile

Speech-to-text transcription

Fuzzy matching

Normalized transcription

Known pronunciation/transcription variations

Natural speaking speed

Phrase-level matching

Timing and voice activity

The app should recognize the complete phrase as one unit and count one complete recitation as exactly one repetition.

Do not count individual words separately.

Do not require the user to pronounce every word exactly according to the written transliteration.

The primary goal is to recognize how the individual user naturally says the complete dhikr phrase.

8. RECOGNITION VARIATIONS

The system should recognize reasonable pronunciation and transcription variations.

For Astaghfirullah, possible variations include:

Astaghfirullah

Astagfirullah

Astagh ferullah

Astaghfir Allah

For La ilaha illallah, possible variations include:

La ilaha illallah

La ilaha illa Allah

La ilaha ilallah

Do not depend on exact spelling only.

Use fuzzy matching and normalization where appropriate.

The system should be designed to tolerate reasonable variations in:

Spacing

Capitalization

Minor transcription differences

Common pronunciation variations

Avoid overly aggressive matching that could cause unrelated words to be counted as dhikr.

Accuracy is more important than speed.

9. REPETITION COUNTING LOGIC

The app must count:

One complete dhikr repetition = One count

For example:

User says:

"Astaghfirullah"

Counter becomes:

1

User pauses briefly and says:

"Astaghfirullah"

Counter becomes:

2

User says it again:

Counter becomes:

3

The system should avoid double-counting a single repetition.

Use appropriate debouncing, cooldown, phrase segmentation, or voice activity detection logic.

For the MVP, it is acceptable to instruct users to leave a very short pause between repetitions if that improves recognition accuracy.

During listening mode, show a subtle status such as:

Listening...

When a repetition is detected, provide a subtle visual confirmation and increment the counter by exactly 1.

Do not continuously increment while the user is holding a sound or repeating the same phrase without a clear separation.

10. MAIN COUNTING SCREEN

The main screen should include:

Header

Dhikr Counter

Dhikr Selection

Two clean selection cards:

أستغفر الله
Astaghfirullah

and

لا إله إلا الله
La ilaha illallah

Clearly highlight the selected dhikr.

If the selected dhikr has not been calibrated, show:

Set Up Voice Profile

If it has already been calibrated, show:

Voice Profile Ready

Allow the user to recalibrate if needed.

Selected Dhikr Display

Show the selected dhikr prominently.

For Astaghfirullah:

Arabic:
أستغفر الله

English:
Astaghfirullah

For La ilaha illallah:

Arabic:
لا إله إلا الله

English:
La ilaha illallah

Counter

Display the current count as a very large number in the center.

Example:

27

Make this the main visual focus.

Voice Controls

Large primary microphone button:

🎙 Start Listening

After listening starts:

Stop Listening

Clearly indicate microphone/listening status.

Manual Correction

Include a clear:

+1

button.

This allows the user to manually add one count if the app misses a repetition.

Reset

Include:

Reset Counter

Ask for confirmation before resetting if appropriate.

11. RECOGNITION FEEDBACK FEATURE

Add a simple optional recognition feedback feature.

After the app detects and counts a repetition, allow the user to provide feedback.

Options:

Correct

Missed a repetition

Counted incorrectly

The feedback should be easy and unobtrusive.

The purpose is to test and improve recognition accuracy during the MVP phase.

If possible, store anonymous/local feedback data locally for testing.

Do not require an account.

12. PRIVACY REQUIREMENTS

Privacy is very important.

The app should store personal pronunciation calibration data locally on the user's device whenever technically possible.

Do not permanently store raw voice recordings unless absolutely necessary.

Prefer privacy-conscious representations such as:

Voice features

Embeddings

Acoustic features

Other non-raw representations

The user should not need to create an account.

Add a settings or profile area with:

Voice Profile

Show:

Astaghfirullah: Calibrated / Not calibrated

La ilaha illallah: Calibrated / Not calibrated

Include:

Recalibrate

and:

Delete My Voice Profile

When the user chooses to delete their voice profile, remove all locally stored calibration data associated with the voice profile.

Clearly communicate that deleting the profile will require the user to calibrate again before personalized recognition can be used.

If any voice data must be sent to a third-party speech recognition API, clearly minimize the data sent and do not permanently store raw recordings.

Keep API keys and secret credentials secure on the backend.

Never expose private API keys or secret credentials directly in frontend code.

13. TECHNICAL REQUIREMENTS

Build the app as a responsive Progressive Web App (PWA).

It should work on:

Mobile browsers

iPhone

Android

Desktop browsers

Use the browser microphone to capture audio.

Use the most suitable available speech-to-text or voice recognition technology for the MVP.

The architecture should allow the recognition provider to be replaced later.

Keep the voice recognition layer modular.

Separate the following concerns where practical:

UI

Dhikr data

Calibration flow

Voice capture

Speech recognition

Pronunciation matching

Repetition detection

Counter logic

Local voice profile storage

Feedback collection

The code should be clean, maintainable, and easy to expand.

14. PWA REQUIREMENTS

Configure the app as a PWA where technically possible.

Include:

Responsive mobile-first layout

Installable PWA experience

App icon

Web app manifest

Service worker where appropriate

Fast loading

Good performance on mobile devices

The app should gracefully handle browsers that do not support the required speech recognition capabilities.

If the browser does not support the selected voice recognition technology, show a clear message explaining that voice recognition is unavailable and provide the manual +1 counter as a fallback.

15. UI / VISUAL DESIGN

The design should feel:

Peaceful

Minimal

Modern

Clean

Respectful

Islamic-inspired

Mobile-first

Use a calm visual hierarchy.

Avoid excessive decoration.

Avoid unnecessary animations.

Use generous spacing and large touch targets.

The microphone button should be prominent and easy to tap.

The counter should be the primary visual focus.

Use accessible typography and sufficient contrast.

The Arabic text should render correctly with a suitable Arabic font.

The interface should feel appropriate for a Muslim user engaging in dhikr and should not feel like a generic fitness or productivity tracker.

16. CALIBRATION DATA STRUCTURE

Design the local data model so it can support future expansion.

For example, conceptually structure data around:

User voice profile

Dhikr ID

Complete phrase voice profile

Pronunciation samples/features

Calibration status

Calibration version

Timestamp

Recognition feedback

Do not hard-code the calibration flow only for these two phrases.

Create a reusable structure so future dhikr can be added with:

Arabic text

Transliteration

Complete phrase

Recognition variations

Calibration requirements

For example, a future dhikr could be added as a complete phrase:

SubhanAllah

The same calibration engine should be reusable for the new complete phrase without requiring the phrase to be broken into individual words.

17. MVP PRIORITY

Prioritize the following in order:

Accurate recognition of complete dhikr repetitions

Personalized pronunciation calibration for the complete dhikr phrase

Prevention of double-counting

Simple and intuitive user experience

Privacy-conscious local voice profile storage

Manual +1 correction

Recognition feedback

Clean modular architecture

PWA support

Do not over-engineer the MVP.

If a fully personalized voice embedding system is too complex to implement reliably in the first prototype, build the simplest practical architecture that supports the concept and keeps the recognition layer replaceable.

The prototype should be functional and testable first.

18. FINAL SUCCESS CRITERIA

The MVP is successful if a user can:

Open Dhikr Counter.

Select Astaghfirullah or La ilaha illallah.

Complete a guided voice calibration using the complete dhikr phrase.

Say the complete dhikr 5 separate times during calibration.

Have a personalized voice profile stored locally.

Start listening.

Recite the selected dhikr repeatedly.

Have the app recognize complete repetitions.

Automatically increase the counter by one for each repetition.

Avoid double-counting the same repetition.

Manually add +1 if a repetition is missed.

Stop listening.

Reset the counter.

Give feedback about recognition accuracy.

Delete their personal voice profile.

The core objective is:

Create a personalized pronunciation profile for the complete dhikr phrase → Learn how the user naturally recites it → Recognize the user's specific pronunciation → Detect each complete repetition → Count each repetition accurately.

Build the simplest functional prototype possible first, while keeping the architecture easy to improve and expand later.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d19985c9-b190-44cb-9f0a-23d98a808c9c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
