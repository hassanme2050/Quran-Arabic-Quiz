# QuranAQ Pineapple Android package

Status: Not Tested — APK build verification is separate from user/device testing.

This Android application bundles the student quiz, review mode, dictionary and current vocabulary. Teacher Editor, Test Generator and CP.txt are excluded. Alexandria and html2canvas are bundled for offline operation. The Android Back button returns to the quiz menu; scorecards use Android's Save File picker.

Package: com.hassanme2050.quranaq.pineapple. Version: 1.0.1024.26-Pineapple-test. Requires Android 6.0 or newer and an up-to-date Android System WebView. This phase uses a debug-signed APK for sideload testing; it is not a Google Play release. Reinstalling a future build signed with a different debug key may require uninstalling this test app first.

The build workflow downloads dependencies on GitHub's runner, prepares an offline asset snapshot from TEST/, builds the APK, runs Android lint and verifies the APK signature. The output artifact contains the installable APK and its SHA-256 checksum. It does not request Internet or storage permissions. Rebuild to include future vocabulary updates; the APK does not automatically sync with the website.

Local build needs Java 17, Gradle 8.13, Android SDK platform 36 and build tools 35.0.0. Run node prepare-assets.cjs from this directory, provide the Alexandria TTF/font license and html2canvas/license in generated assets, then run gradle assembleDebug lintDebug. The GitHub workflow automates these steps.
