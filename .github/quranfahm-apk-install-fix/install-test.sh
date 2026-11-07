#!/usr/bin/env bash
set -euo pipefail
APK='.github/android-package-build/app/build/outputs/apk/dates/release/app-dates-release.apk'
OUT='quranfahm-apk-fix-output'
git fetch --no-tags --depth=1 origin d9ba2741b1e10c3ad9bd0806934f55e9db93bf8c
git show d9ba2741b1e10c3ad9bd0806934f55e9db93bf8c:X/android/output/QuranAQ-v1030.26-Dates.apk > "$RUNNER_TEMP/previous-dates.apk"
adb install "$RUNNER_TEMP/previous-dates.apk" | tee "$OUT/install-test.txt"
adb shell pm path com.hassanme2050.quranaq.dates | tee -a "$OUT/install-test.txt"
adb install -r "$APK" | tee -a "$OUT/install-test.txt"
adb shell pm path com.hassanme2050.quranfahm | tee -a "$OUT/install-test.txt"
adb shell am start -W -n com.hassanme2050.quranfahm/com.hassanme2050.quranaq.MainActivity | tee -a "$OUT/install-test.txt"
sleep 12
adb shell pidof com.hassanme2050.quranfahm | tee -a "$OUT/install-test.txt"
adb shell pm path com.hassanme2050.quranaq.dates | tee -a "$OUT/install-test.txt"
adb shell screencap -p /sdcard/quranfahm-installed.png
adb pull /sdcard/quranfahm-installed.png "$OUT/installation-screen.png"
echo 'PASS: previous Dates and fixed QuranFahm are both installed; QuranFahm launches and remains running.' | tee -a "$OUT/install-test.txt"
