# PCC Rate My Professors Extension

**Find professor ratings while browsing Pasadena City College (PCC) classes.**

This free, unofficial browser extension displays ratings from [Rate My Professors](https://www.ratemyprofessors.com/) next to instructor names on the [PCC Class Search website](https://findclasses.pasadena.edu/). You can compare instructors without searching for each professor separately.

> **Browser support:** Google Chrome and Microsoft Edge (Windows and Mac). Safari on Mac supports temporary testing but may require additional setup; Safari compatibility has not been fully verified.

## What you'll see

| Class listing | What it means |
| --- | --- |
| **★ 4.8/5 (125)** | A matching professor profile has a rating. Click the badge to read reviews. *(Example only.)* |
| **No ratings found** | The extension could not find a confident matching professor profile. This does **not** necessarily mean the professor has never been reviewed. |
| **No ratings yet** | A matching profile was found, but it has no rating yet. |
| **No instructor assigned yet** | PCC lists the instructor as **Staff**. The extension replaces “Staff” with this message in the class results. |
| **RMP unavailable** | Ratings could not be loaded, possibly because of a connection or service issue. |

The extension shows badges in **class search results**, not inside the instructor selection filter.

## Download the extension

1. Open this repository's **[Releases](../../releases/latest)** page.
2. Under **Assets**, download the extension `.zip` file, if one is provided.
3. Extract the ZIP:
   - **Windows:** Right-click the file → **Extract All**.
   - **Mac:** Double-click the ZIP file.
4. Open the extracted folder and locate **`manifest.json`**. You'll need to select the folder containing that file during installation.

**No release ZIP available?** On the repository's main page, click **Code → Download ZIP**, then extract that ZIP instead. If there is another folder inside, open it until you find `manifest.json`.

## Install on Google Chrome

1. Open **Google Chrome**.
2. Copy and paste `chrome://extensions` into the address bar, then press **Enter**.
3. Turn on **Developer mode** (usually at the top right).
4. Click **Load unpacked**.
5. Select the **extracted folder that contains `manifest.json`**. Do not select the ZIP file.
6. Open **[PCC Class Search](https://findclasses.pasadena.edu/)**, refresh the page, and search for a class.

**You're done!** Look beside an instructor's name in the class results.

## Install on Microsoft Edge

1. Open **Microsoft Edge**.
2. Copy and paste `edge://extensions` into the address bar, then press **Enter**.
3. Turn on **Developer mode** (usually on the left side).
4. Click **Load unpacked**.
5. Select the **extracted folder that contains `manifest.json`**. Do not select the ZIP file.
6. Open **[PCC Class Search](https://findclasses.pasadena.edu/)**, refresh the page, and search for a class.

**You're done!** Look beside an instructor's name in the class results.

## Safari on MacBook or iMac (experimental)

Safari does not install this Chrome/Edge extension through **Load unpacked**. Newer versions of Safari can **temporarily load a web extension folder for testing**. This is **not** a permanent installation, and this extension has **not been fully tested on Safari**.

### Option A: Temporary installation (no Xcode)

1. Extract the extension ZIP and locate the folder containing `manifest.json`.
2. Open **Safari → Settings → Advanced**.
3. Turn on **Show features for web developers** (the wording may vary).
4. Go to **Safari → Settings → Developer**.
5. Click **Add Temporary Extension…**. If prompted, allow unsigned extensions and authenticate.
6. Select the extracted folder containing `manifest.json`.
7. In **Safari → Settings → Extensions**, enable the extension and allow access to `findclasses.pasadena.edu` if prompted.
8. Open **[PCC Class Search](https://findclasses.pasadena.edu/)** and search for a class.

**Important:** Safari removes temporary extensions after **24 hours or when Safari quits**. You may need to add it again. If you do not see **Add Temporary Extension**, your Safari version might not provide this feature.

### Option B: Package for regular Safari use (advanced)

If you have **Xcode** installed on a Mac, you can use Apple's web extension packager to create a macOS Safari extension project:

```bash
xcrun safari-web-extension-packager /path/to/your/extracted-extension-folder
```

Replace the example path with the real path to the folder containing `manifest.json`. Open the generated project in Xcode, build and run the macOS app, then enable the extension under **Safari → Settings → Extensions**. Signing or further changes may be required. This does **not** mean the current extension is guaranteed to work in Safari.

Apple documentation: [Safari web extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions) · [Packaging for Safari](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)

## How to use it

1. Visit **https://findclasses.pasadena.edu/**.
2. Choose your term and search for a course.
3. Look at the **Instructor** field in the class results.
4. When a rating is available, **click the rating badge** to open that professor's reviews.

You don't need a Rate My Professors account or an API key. The extension caches lookups to reduce repeated requests.

## Troubleshooting

**I installed it, but no badges appear.** Refresh the class search page, search for a course with a named instructor, and verify that the extension is enabled. In Chrome or Edge, open the extension's popup and click **Test RMP connection**.

**It says “No ratings found.”** The extension couldn't confidently match the instructor to a PCC professor profile. The professor may still have a profile; you can search Rate My Professors manually.

**It says “RMP unavailable.”** Rate My Professors may be unreachable, may be blocking requests, or may have changed its service. Retry later.

**My browser says it can't load the extension.** Extract the ZIP first. Select the folder containing `manifest.json`, rather than the ZIP file or an outer folder.

**The extension worked before, but stopped.** PCC's class search layout or Rate My Professors' service may have changed. The extension may need an update.

**Safari isn't working.** The Safari instructions are experimental. Check website access permissions, or use Chrome or Edge for the most straightforward setup.

## Updating or removing the extension

- **Update on Chrome/Edge:** Download the new version, extract it, and replace the files in the folder you installed. Go to `chrome://extensions` or `edge://extensions`, click **Reload** on the extension, then refresh PCC Class Search. Keep the folder in a permanent location.
- **Remove on Chrome/Edge:** Open the same extensions page and click **Remove**.
- **Remove on Safari:** Open **Safari → Settings → Extensions**, disable the extension, and remove the temporary extension or its containing app as appropriate.

> **Note:** Extensions installed using **Load unpacked** do **not** update automatically from GitHub Releases.

## Disclaimer

This is an **independent student project**, not affiliated with or endorsed by Pasadena City College or Rate My Professors. Ratings are user-submitted opinions and may be incomplete, outdated, or matched to the wrong person when names are similar. Always confirm the professor's identity before making a decision. The extension depends on external websites and is provided as-is.

---

**Made to make class registration a little easier.**
