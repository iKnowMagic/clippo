// koffee 1.4.0

/*
00     00   0000000   000  000   000
000   000  000   000  000  0000  000
000000000  000000000  000  000 0 000
000 0 000  000   000  000  000  0000
000   000  000   000  000  000   000
 */
var _, activeApp, app, appIconSync, appName, buffers, childp, clearBuffer, clipboard, clippoWatch, copyIndex, deleteIndex, electron, empty, first, fs, getActiveApp, iconDir, kerror, klog, macClipboardChanged, nativeImage, noon, onClipboardChanged, onWillShowWin, originApp, os, osascript, pasteIndex, pkg, post, prefs, quit, readBuffer, ref, reload, saveAppIcon, saveBuffer, slash, watch, watchClipboard, winClipboardChanged;

ref = require('kxk'), watch = ref.watch, post = ref.post, osascript = ref.osascript, childp = ref.childp, slash = ref.slash, empty = ref.empty, first = ref.first, prefs = ref.prefs, noon = ref.noon, app = ref.app, os = ref.os, fs = ref.fs, kerror = ref.kerror, klog = ref.klog, _ = ref._;

electron = require('electron');

pkg = require('../package.json');

if (os.platform() === 'darwin') {
    appIconSync = require('./appiconsync');
}

app = new app({
    dir: __dirname,
    pkg: pkg,
    shortcut: 'CmdOrCtrl+Alt+V',
    index: 'index.html',
    icon: '../img/app.ico',
    tray: '../img/menu@2x.png',
    about: '../img/about.png',
    onQuit: function() {
        return quit();
    },
    onWillShowWin: function() {
        return onWillShowWin();
    },
    width: 1000,
    height: 1200,
    minWidth: 300,
    minHeight: 200
});

clipboard = electron.clipboard;

nativeImage = electron.nativeImage;

buffers = [];

iconDir = "";

activeApp = "";

originApp = null;

clippoWatch = null;

appName = 'clippo';

post.on('paste', function(index) {
    return pasteIndex(index);
});

post.on('del', function(index) {
    return deleteIndex(index);
});

post.onGet('buffers', function() {
    return buffers;
});

post.on('clearBuffer', function() {
    return clearBuffer();
});

post.on('saveBuffer', function() {
    return saveBuffer();
});

getActiveApp = function() {
    var info, script, wxw;
    if (os.platform() === 'win32') {
        wxw = require('wxw');
        info = first(wxw('info', 'top'));
        appName = slash.base(info.path);
    } else if (os.platform() === 'darwin') {
        script = osascript("tell application \"System Events\"\n    set n to name of first application process whose frontmost is true\nend tell\ndo shell script \"echo \" & n");
        appName = childp.execSync("osascript " + script);
        appName = String(appName).trim();
    }
    return appName;
};

saveAppIcon = function(appName) {
    var iconPath, png;
    iconPath = iconDir + "/" + appName + ".png";
    if (!slash.isFile(iconPath)) {
        png = appIconSync(appName, iconDir, 128);
        if (!png) {
            appName = "clippo";
        }
    }
    return appName;
};

onWillShowWin = function() {
    return activeApp = getActiveApp();
};

winClipboardChanged = function() {
    var exapp, exclude, i, iconPath, len, winInfo, wxw;
    wxw = require('wxw');
    appName = 'clippo';
    winInfo = first(wxw('info', 'top'));
    appName = slash.base(winInfo.path);
    exclude = prefs.get('exclude', ['password-turtle']);
    if (!empty(exclude)) {
        for (i = 0, len = exclude.length; i < len; i++) {
            exapp = exclude[i];
            if (appName.startsWith(exapp)) {
                return;
            }
        }
    }
    iconPath = iconDir + "/" + appName + ".png";
    if (!slash.isFile(iconPath)) {
        wxw('icon', winInfo.path, iconPath);
    }
    return onClipboardChanged();
};

macClipboardChanged = function() {
    var currentApp;
    currentApp = getActiveApp();
    if (currentApp.toLowerCase() === 'electron') {
        currentApp = 'clippo';
    }
    if ((!originApp) && (!currentApp)) {
        originApp = 'clippo';
    }
    saveAppIcon(originApp != null ? originApp : currentApp);
    return onClipboardChanged();
};

onClipboardChanged = function() {
    var b, format, i, imageBuffer, imageData, j, k, len, len1, len2, ref1, text;
    ref1 = clipboard.availableFormats();
    for (i = 0, len = ref1.length; i < len; i++) {
        format = ref1[i];
        if (format.startsWith('image/')) {
            imageBuffer = clipboard.readImage().toPNG();
            imageData = imageBuffer.toString('base64');
            for (j = 0, len1 = buffers.length; j < len1; j++) {
                b = buffers[j];
                if ((b.image != null) && b.image === imageData) {
                    appName = b.app;
                    _.pull(buffers, b);
                    break;
                }
            }
            buffers.push({
                app: appName,
                image: imageData,
                count: buffers.length
            });
            reload(buffers.length - 1);
            return;
        }
    }
    text = clipboard.readText();
    if (text.length && text.trim().length) {
        for (k = 0, len2 = buffers.length; k < len2; k++) {
            b = buffers[k];
            if ((b.text != null) && b.text === text) {
                appName = b.app;
                _.pull(buffers, b);
                break;
            }
        }
        buffers.push({
            app: appName,
            text: text,
            count: buffers.length - 1
        });
        return reload(buffers.length - 1);
    }
};

watchClipboard = function() {
    var cw;
    cw = require('electron-clipboard-watcher');
    if (os.platform() === 'win32') {
        return cw({
            watchDelay: 200,
            onImageChange: winClipboardChanged,
            onTextChange: winClipboardChanged
        });
    } else {
        return cw({
            watchDelay: 200,
            onImageChange: macClipboardChanged,
            onTextChange: macClipboardChanged
        });
    }
};

copyIndex = function(index) {
    var image;
    if ((index < 0) || (index > buffers.length - 1)) {
        return;
    }
    if (buffers[index].image) {
        image = nativeImage.createFromBuffer(new Buffer(buffers[index].image, 'base64'));
        if (!image.isEmpty() && (image.getSize().width * image.getSize().height > 0)) {
            clipboard.writeImage(image, 'image/png');
        }
    }
    if ((buffers[index].text != null) && (buffers[index].text.length > 0)) {
        return clipboard.writeText(buffers[index].text, 'text/plain');
    }
};

pasteIndex = function(index) {
    var paste, ref1, wxw;
    copyIndex(index);
    originApp = (ref1 = buffers.splice(index, 1)[0]) != null ? ref1.app : void 0;
    if (os.platform() === 'win32') {
        wxw = require('wxw');
        paste = function() {
            if (activeApp === 'mintty') {
                return wxw('key', 'ctrl+shift+v');
            } else {
                return wxw('key', 'ctrl+v');
            }
        };
        app.win.close();
        return setTimeout(paste, 20);
    } else if (os.platform() !== 'darwin') {
        childp.execSync("osascript " + osascript("tell application \"System Events\" to keystroke tab using command down"));
        return childp.execSync("osascript " + osascript("tell application \"System Events\" to keystroke \"v\" using command down"));
    }
};

deleteIndex = function(index) {
    buffers.splice(index, 1);
    return reload(index - 1);
};

quit = function() {
    saveBuffer();
    return clippoWatch != null ? clippoWatch.kill() : void 0;
};

reload = function(index) {
    if (index == null) {
        index = 0;
    }
    return post.toWins('loadBuffers', buffers, index);
};

clearBuffer = function() {
    buffers = [];
    saveBuffer();
    return reload();
};

saveBuffer = function() {
    return noon.save(app.userData + "/buffers.noon", buffers.slice(-prefs.get('maxBuffers', 50)));
};

readBuffer = function() {
    try {
        buffers = noon.load(slash.path(app.userData + "/buffers.noon"));
        return buffers = buffers != null ? buffers : [];
    } catch (error) {
        return buffers = [];
    }
};

post.on('appReady', function() {
    var err;
    readBuffer();
    iconDir = slash.resolve(app.userData + "/icons");
    fs.ensureDirSync(iconDir);
    try {
        fs.accessSync(slash.join(iconDir, 'clippo.png'), fs.R_OK);
    } catch (error) {
        try {
            fs.copySync(__dirname + "/../img/clippo.png", slash.join(iconDir, 'clippo.png'));
        } catch (error) {
            err = error;
            kerror("can't copy clippo icon: " + err);
        }
    }
    return watchClipboard();
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIuIiwic291cmNlcyI6WyIiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7OztBQUFBLElBQUE7O0FBUUEsTUFBcUcsT0FBQSxDQUFRLEtBQVIsQ0FBckcsRUFBRSxpQkFBRixFQUFTLGVBQVQsRUFBZSx5QkFBZixFQUEwQixtQkFBMUIsRUFBa0MsaUJBQWxDLEVBQXlDLGlCQUF6QyxFQUFnRCxpQkFBaEQsRUFBdUQsaUJBQXZELEVBQThELGVBQTlELEVBQW9FLGFBQXBFLEVBQXlFLFdBQXpFLEVBQTZFLFdBQTdFLEVBQWlGLG1CQUFqRixFQUF5RixlQUF6RixFQUErRjs7QUFFL0YsUUFBQSxHQUFXLE9BQUEsQ0FBUSxVQUFSOztBQUNYLEdBQUEsR0FBVyxPQUFBLENBQVEsaUJBQVI7O0FBRVgsSUFBRyxFQUFFLENBQUMsUUFBSCxDQUFBLENBQUEsS0FBaUIsUUFBcEI7SUFDSSxXQUFBLEdBQWMsT0FBQSxDQUFRLGVBQVIsRUFEbEI7OztBQUdBLEdBQUEsR0FBTSxJQUFJLEdBQUosQ0FDRjtJQUFBLEdBQUEsRUFBWSxTQUFaO0lBQ0EsR0FBQSxFQUFZLEdBRFo7SUFFQSxRQUFBLEVBQVksaUJBRlo7SUFHQSxLQUFBLEVBQVksWUFIWjtJQUlBLElBQUEsRUFBWSxnQkFKWjtJQUtBLElBQUEsRUFBWSxvQkFMWjtJQU1BLEtBQUEsRUFBWSxrQkFOWjtJQU9BLE1BQUEsRUFBZSxTQUFBO2VBQUcsSUFBQSxDQUFBO0lBQUgsQ0FQZjtJQVFBLGFBQUEsRUFBZSxTQUFBO2VBQUcsYUFBQSxDQUFBO0lBQUgsQ0FSZjtJQVNBLEtBQUEsRUFBWSxJQVRaO0lBVUEsTUFBQSxFQUFZLElBVlo7SUFXQSxRQUFBLEVBQVksR0FYWjtJQVlBLFNBQUEsRUFBWSxHQVpaO0NBREU7O0FBZU4sU0FBQSxHQUFnQixRQUFRLENBQUM7O0FBQ3pCLFdBQUEsR0FBZ0IsUUFBUSxDQUFDOztBQUN6QixPQUFBLEdBQWdCOztBQUNoQixPQUFB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QixDQUE5QyxFQURKO1NBQUEsYUFBQTtZQUVNO1lBQ0YsTUFBQSxDQUFPLDBCQUFBLEdBQTJCLEdBQWxDLEVBSEo7U0FISjs7V0FRQSxjQUFBLENBQUE7QUFmZ0IsQ0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIjIyNcbjAwICAgICAwMCAgIDAwMDAwMDAgICAwMDAgIDAwMCAgIDAwMFxuMDAwICAgMDAwICAwMDAgICAwMDAgIDAwMCAgMDAwMCAgMDAwXG4wMDAwMDAwMDAgIDAwMDAwMDAwMCAgMDAwICAwMDAgMCAwMDBcbjAwMCAwIDAwMCAgMDAwICAgMDAwICAwMDAgIDAwMCAgMDAwMFxuMDAwICAgMDAwICAwMDAgICAwMDAgIDAwMCAgMDAwICAgMDAwXG4jIyNcblxueyB3YXRjaCwgcG9zdCwgb3Nhc2NyaXB0LCBjaGlsZHAsIHNsYXNoLCBlbXB0eSwgZmlyc3QsIHByZWZzLCBub29uLCBhcHAsIG9zLCBmcywga2Vycm9yLCBrbG9nLCBfIH0gPSByZXF1aXJlICdreGsnXG5cbmVsZWN0cm9uID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5wa2cgICAgICA9IHJlcXVpcmUgJy4uL3BhY2thZ2UuanNvbidcblxuaWYgb3MucGxhdGZvcm0oKSA9PSAnZGFyd2luJ1xuICAgIGFwcEljb25TeW5jID0gcmVxdWlyZSAnLi9hcHBpY29uc3luYydcblxuYXBwID0gbmV3IGFwcFxuICAgIGRpcjogICAgICAgIF9fZGlybmFtZVxuICAgIHBrZzogICAgICAgIHBrZ1xuICAgIHNob3J0Y3V0OiAgICdDbWRPckN0cmwrQWx0K1YnXG4gICAgaW5kZXg6ICAgICAgJ2luZGV4Lmh0bWwnXG4gICAgaWNvbjogICAgICAgJy4uL2ltZy9hcHAuaWNvJ1xuICAgIHRyYXk6ICAgICAgICcuLi9pbWcvbWVudUAyeC5wbmcnXG4gICAgYWJvdXQ6ICAgICAgJy4uL2ltZy9hYm91dC5wbmcnXG4gICAgb25RdWl0OiAgICAgICAgLT4gcXVpdCgpXG4gICAgb25XaWxsU2hvd1dpbjogLT4gb25XaWxsU2hvd1dpbigpXG4gICAgd2lkdGg6ICAgICAgMTAwMFxuICAgIGhlaWdodDogICAgIDEyMDBcbiAgICBtaW5XaWR0aDogICAzMDBcbiAgICBtaW5IZWlnaHQ6ICAyMDBcblxuY2xpcGJvYXJkICAgICA9IGVsZWN0cm9uLmNsaXBib2FyZFxubmF0aXZlSW1hZ2UgICA9IGVsZWN0cm9uLm5hdGl2ZUltYWdlXG5idWZmZXJzICAgICAgID0gW11cbmljb25EaXIgICAgICAgPSBcIlwiXG5hY3RpdmVBcHAgICAgID0gXCJcIlxub3JpZ2luQXBwICAgICA9IG51bGxcbmNsaXBwb1dhdGNoICAgPSBudWxsXG5hcHBOYW1lICAgICAgID0gJ2NsaXBwbydcblxuIyAwMDAwMDAwMCAgICAwMDAwMDAwICAgIDAwMDAwMDAgIDAwMDAwMDAwMFxuIyAwMDAgICAwMDAgIDAwMCAgIDAwMCAgMDAwICAgICAgICAgIDAwMFxuIyAwMDAwMDAwMCAgIDAwMCAgIDAwMCAgMDAwMDAwMCAgICAgIDAwMFxuIyAwMDAgICAgICAgIDAwMCAgIDAwMCAgICAgICAwMDAgICAgIDAwMFxuIyAwMDAgICAgICAgICAwMDAwMDAwICAgMDAwMDAwMCAgICAgIDAwMFxuXG5wb3N0Lm9uICdwYXN0ZScsICAgICAgKGluZGV4KSAtPiBwYXN0ZUluZGV4IGluZGV4XG5wb3N0Lm9uICdkZWwnLCAgICAgICAgKGluZGV4KSAtPiBkZWxldGVJbmRleCBpbmRleFxucG9zdC5vbkdldCAnYnVmZmVycycsICgpICAgICAgLT4gYnVmZmVyc1xucG9zdC5vbiAnY2xlYXJCdWZmZXInLCAtPiBjbGVhckJ1ZmZlcigpXG5wb3N0Lm9uICdzYXZlQnVmZmVyJywgIC0+IHNhdmVCdWZmZXIoKVxuXG4jIDAwMDAwMDAgICAgMDAwMDAwMCAgMDAwMDAwMDAwICAwMDAgIDAwMCAgIDAwMCAgMDAwMDAwMDBcbiMwMDAgICAwMDAgIDAwMCAgICAgICAgICAwMDAgICAgIDAwMCAgMDAwICAgMDAwICAwMDBcbiMwMDAwMDAwMDAgIDAwMCAgICAgICAgICAwMDAgICAgIDAwMCAgIDAwMCAwMDAgICAwMDAwMDAwXG4jMDAwICAgMDAwICAwMDAgICAgICAgICAgMDAwICAgICAwMDAgICAgIDAwMCAgICAgMDAwXG4jMDAwICAgMDAwICAgMDAwMDAwMCAgICAgMDAwICAgICAwMDAgICAgICAwICAgICAgMDAwMDAwMDBcblxuZ2V0QWN0aXZlQXBwID0gLT5cblxuICAgIGlmIG9zLnBsYXRmb3JtKCkgPT0gJ3dpbjMyJ1xuICAgICAgICB3eHcgPSByZXF1aXJlICd3eHcnXG4gICAgICAgIGluZm8gPSBmaXJzdCB3eHcgJ2luZm8nICd0b3AnXG4gICAgICAgICMga2xvZyAnZ2V0QWN0aXZlQXBwJyBpbmZvXG4gICAgICAgIGFwcE5hbWUgPSBzbGFzaC5iYXNlIGluZm8ucGF0aFxuICAgIGVsc2UgaWYgb3MucGxhdGZvcm0oKSA9PSAnZGFyd2luJ1xuICAgICAgICBzY3JpcHQgPSBvc2FzY3JpcHQgXCJcIlwiXG4gICAgICAgIHRlbGwgYXBwbGljYXRpb24gXCJTeXN0ZW0gRXZlbnRzXCJcbiAgICAgICAgICAgIHNldCBuIHRvIG5hbWUgb2YgZmlyc3QgYXBwbGljYXRpb24gcHJvY2VzcyB3aG9zZSBmcm9udG1vc3QgaXMgdHJ1ZVxuICAgICAgICBlbmQgdGVsbFxuICAgICAgICBkbyBzaGVsbCBzY3JpcHQgXCJlY2hvIFwiICYgblxuICAgICAgICBcIlwiXCJcbiAgICAgICAgYXBwTmFtZSA9IGNoaWxkcC5leGVjU3luYyBcIm9zYXNjcmlwdCAje3NjcmlwdH1cIlxuICAgICAgICBhcHBOYW1lID0gU3RyaW5nKGFwcE5hbWUpLnRyaW0oKVxuICAgIGFwcE5hbWVcblxuIyAwMDAwMDAwICAgMDAwMDAwMDAgICAwMDAwMDAwMCAgIDAwMCAgIDAwMDAwMDAgICAwMDAwMDAwICAgMDAwICAgMDAwXG4jMDAwICAgMDAwICAwMDAgICAwMDAgIDAwMCAgIDAwMCAgMDAwICAwMDAgICAgICAgMDAwICAgMDAwICAwMDAwICAwMDBcbiMwMDAwMDAwMDAgIDAwMDAwMDAwICAgMDAwMDAwMDAgICAwMDAgIDAwMCAgICAgICAwMDAgICAwMDAgIDAwMCAwIDAwMFxuIzAwMCAgIDAwMCAgMDAwICAgICAgICAwMDAgICAgICAgIDAwMCAgMDAwICAgICAgIDAwMCAgIDAwMCAgMDAwICAwMDAwXG4jMDAwICAgMDAwICAwMDAgICAgICAgIDAwMCAgICAgICAgMDAwICAgMDAwMDAwMCAgIDAwMDAwMDAgICAwMDAgICAwMDBcblxuc2F2ZUFwcEljb24gPSAoYXBwTmFtZSkgLT5cblxuICAgIGljb25QYXRoID0gXCIje2ljb25EaXJ9LyN7YXBwTmFtZX0ucG5nXCJcbiAgICBpZiBub3Qgc2xhc2guaXNGaWxlIGljb25QYXRoXG4gICAgICAgIHBuZyA9IGFwcEljb25TeW5jIGFwcE5hbWUsIGljb25EaXIsIDEyOFxuICAgICAgICBhcHBOYW1lID0gXCJjbGlwcG9cIiBpZiBub3QgcG5nXG4gICAgYXBwTmFtZVxuXG5vbldpbGxTaG93V2luID0gLT5cbiAgICBcbiAgICBhY3RpdmVBcHAgPSBnZXRBY3RpdmVBcHAoKVxuICAgIFxuIyAwMDAgICAwMDAgIDAwMCAgMDAwICAgMDAwICAgICAgICAwMDAgICAwMDAgICAwMDAwMDAwICAgMDAwMDAwMDAwICAgMDAwMDAwMCAgMDAwICAgMDAwICBcbiMgMDAwIDAgMDAwICAwMDAgIDAwMDAgIDAwMCAgICAgICAgMDAwIDAgMDAwICAwMDAgICAwMDAgICAgIDAwMCAgICAgMDAwICAgICAgIDAwMCAgIDAwMCAgXG4jIDAwMDAwMDAwMCAgMDAwICAwMDAgMCAwMDAgICAgICAgIDAwMDAwMDAwMCAgMDAwMDAwMDAwICAgICAwMDAgICAgIDAwMCAgICAgICAwMDAwMDAwMDAgIFxuIyAwMDAgICAwMDAgIDAwMCAgMDAwICAwMDAwICAgICAgICAwMDAgICAwMDAgIDAwMCAgIDAwMCAgICAgMDAwICAgICAwMDAgICAgICAgMDAwICAgMDAwICBcbiMgMDAgICAgIDAwICAwMDAgIDAwMCAgIDAwMCAgICAgICAgMDAgICAgIDAwICAwMDAgICAwMDAgICAgIDAwMCAgICAgIDAwMDAwMDAgIDAwMCAgIDAwMCAgXG5cbndpbkNsaXBib2FyZENoYW5nZWQgPSAtPlxuXG4gICAgd3h3ID0gcmVxdWlyZSAnd3h3J1xuICAgIGFwcE5hbWUgPSAnY2xpcHBvJ1xuICAgIFxuICAgIHdpbkluZm8gPSBmaXJzdCB3eHcgJ2luZm8nICd0b3AnXG5cbiAgICBhcHBOYW1lID0gc2xhc2guYmFzZSB3aW5JbmZvLnBhdGhcbiAgICBleGNsdWRlID0gcHJlZnMuZ2V0ICdleGNsdWRlJywgWydwYXNzd29yZC10dXJ0bGUnXVxuICAgIGlmIG5vdCBlbXB0eSBleGNsdWRlXG4gICAgICAgIGZvciBleGFwcCBpbiBleGNsdWRlXG4gICAgICAgICAgICByZXR1cm4gaWYgYXBwTmFtZS5zdGFydHNXaXRoIGV4YXBwXG4gICAgaWNvblBhdGggPSBcIiN7aWNvbkRpcn0vI3thcHBOYW1lfS5wbmdcIlxuICAgIGlmIG5vdCBzbGFzaC5pc0ZpbGUgaWNvblBhdGhcbiAgICAgICAgd3h3ICdpY29uJyB3aW5JbmZvLnBhdGgsIGljb25QYXRoXG4gICAgICAgICAgICAgICAgICAgIFxuICAgIG9uQ2xpcGJvYXJkQ2hhbmdlZCgpXG5cbm1hY0NsaXBib2FyZENoYW5nZWQgPSAtPlxuXG4gICAgY3VycmVudEFwcCA9IGdldEFjdGl2ZUFwcCgpXG4gICAgY3VycmVudEFwcCA9ICdjbGlwcG8nIGlmIGN1cnJlbnRBcHAudG9Mb3dlckNhc2UoKSA9PSAnZWxlY3Ryb24nXG4gICAgb3JpZ2luQXBwICA9ICdjbGlwcG8nIGlmIChub3Qgb3JpZ2luQXBwKSBhbmQgKG5vdCBjdXJyZW50QXBwKVxuXG4gICAgc2F2ZUFwcEljb24gb3JpZ2luQXBwID8gY3VycmVudEFwcFxuXG4gICAgb25DbGlwYm9hcmRDaGFuZ2VkKClcbiAgICBcbm9uQ2xpcGJvYXJkQ2hhbmdlZCA9IC0+XG5cbiAgICBmb3IgZm9ybWF0IGluIGNsaXBib2FyZC5hdmFpbGFibGVGb3JtYXRzKClcblxuICAgICAgICBpZiBmb3JtYXQuc3RhcnRzV2l0aCAnaW1hZ2UvJ1xuXG4gICAgICAgICAgICBpbWFnZUJ1ZmZlciA9IGNsaXBib2FyZC5yZWFkSW1hZ2UoKS50b1BORygpXG4gICAgICAgICAgICBpbWFnZURhdGEgICA9IGltYWdlQnVmZmVyLnRvU3RyaW5nKCdiYXNlNjQnKVxuXG4gICAgICAgICAgICBmb3IgYiBpbiBidWZmZXJzXG4gICAgICAgICAgICAgICAgaWYgYi5pbWFnZT8gYW5kIGIuaW1hZ2UgPT0gaW1hZ2VEYXRhXG4gICAgICAgICAgICAgICAgICAgIGFwcE5hbWUgPSBiLmFwcFxuICAgICAgICAgICAgICAgICAgICBfLnB1bGwgYnVmZmVycywgYlxuICAgICAgICAgICAgICAgICAgICBicmVha1xuXG4gICAgICAgICAgICBidWZmZXJzLnB1c2hcbiAgICAgICAgICAgICAgICBhcHA6ICAgYXBwTmFtZVxuICAgICAgICAgICAgICAgIGltYWdlOiBpbWFnZURhdGFcbiAgICAgICAgICAgICAgICBjb3VudDogYnVmZmVycy5sZW5ndGhcblxuICAgICAgICAgICAgcmVsb2FkIGJ1ZmZlcnMubGVuZ3RoLTFcbiAgICAgICAgICAgIHJldHVyblxuXG4gICAgdGV4dCA9IGNsaXBib2FyZC5yZWFkVGV4dCgpXG5cbiAgICBpZiB0ZXh0Lmxlbmd0aCBhbmQgdGV4dC50cmltKCkubGVuZ3RoXG5cbiAgICAgICAgZm9yIGIgaW4gYnVmZmVyc1xuICAgICAgICAgICAgaWYgYi50ZXh0PyBhbmQgYi50ZXh0ID09IHRleHRcbiAgICAgICAgICAgICAgICBhcHBOYW1lID0gYi5hcHBcbiAgICAgICAgICAgICAgICBfLnB1bGwgYnVmZmVycywgYlxuICAgICAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgYnVmZmVycy5wdXNoXG4gICAgICAgICAgICBhcHA6ICAgYXBwTmFtZVxuICAgICAgICAgICAgdGV4dDogIHRleHRcbiAgICAgICAgICAgIGNvdW50OiBidWZmZXJzLmxlbmd0aC0xXG5cbiAgICAgICAgcmVsb2FkIGJ1ZmZlcnMubGVuZ3RoLTFcblxud2F0Y2hDbGlwYm9hcmQgPSAtPlxuICAgIFxuICAgIGN3ID0gcmVxdWlyZSAnZWxlY3Ryb24tY2xpcGJvYXJkLXdhdGNoZXInXG5cbiAgICBpZiBvcy5wbGF0Zm9ybSgpID09ICd3aW4zMidcbiAgICAgICAgY3cgd2F0Y2hEZWxheToyMDAsIG9uSW1hZ2VDaGFuZ2U6d2luQ2xpcGJvYXJkQ2hhbmdlZCwgb25UZXh0Q2hhbmdlOndpbkNsaXBib2FyZENoYW5nZWRcbiAgICBlbHNlXG4gICAgICAgIGN3IHdhdGNoRGVsYXk6MjAwLCBvbkltYWdlQ2hhbmdlOm1hY0NsaXBib2FyZENoYW5nZWQsIG9uVGV4dENoYW5nZTptYWNDbGlwYm9hcmRDaGFuZ2VkXG5cbiMgMDAwMDAwMCAgIDAwMDAwMDAgICAwMDAwMDAwMCAgIDAwMCAgIDAwMFxuIzAwMCAgICAgICAwMDAgICAwMDAgIDAwMCAgIDAwMCAgIDAwMCAwMDBcbiMwMDAgICAgICAgMDAwICAgMDAwICAwMDAwMDAwMCAgICAgMDAwMDBcbiMwMDAgICAgICAgMDAwICAgMDAwICAwMDAgICAgICAgICAgIDAwMFxuIyAwMDAwMDAwICAgMDAwMDAwMCAgIDAwMCAgICAgICAgICAgMDAwXG5cbmNvcHlJbmRleCA9IChpbmRleCkgLT5cblxuICAgIHJldHVybiBpZiAoaW5kZXggPCAwKSBvciAoaW5kZXggPiBidWZmZXJzLmxlbmd0aC0xKVxuICAgIGlmIGJ1ZmZlcnNbaW5kZXhdLmltYWdlXG4gICAgICAgIGltYWdlID0gbmF0aXZlSW1hZ2UuY3JlYXRlRnJvbUJ1ZmZlciBuZXcgQnVmZmVyIGJ1ZmZlcnNbaW5kZXhdLmltYWdlLCAnYmFzZTY0J1xuICAgICAgICBpZiBub3QgaW1hZ2UuaXNFbXB0eSgpIGFuZCAoaW1hZ2UuZ2V0U2l6ZSgpLndpZHRoICogaW1hZ2UuZ2V0U2l6ZSgpLmhlaWdodCA+IDApXG4gICAgICAgICAgICBjbGlwYm9hcmQud3JpdGVJbWFnZSBpbWFnZSwgICdpbWFnZS9wbmcnXG4gICAgaWYgYnVmZmVyc1tpbmRleF0udGV4dD8gYW5kIChidWZmZXJzW2luZGV4XS50ZXh0Lmxlbmd0aCA+IDApXG4gICAgICAgIGNsaXBib2FyZC53cml0ZVRleHQgYnVmZmVyc1tpbmRleF0udGV4dCwgJ3RleHQvcGxhaW4nXG5cbiMwMDAwMDAwMCAgICAwMDAwMDAwICAgIDAwMDAwMDAgIDAwMDAwMDAwMCAgMDAwMDAwMDBcbiMwMDAgICAwMDAgIDAwMCAgIDAwMCAgMDAwICAgICAgICAgIDAwMCAgICAgMDAwXG4jMDAwMDAwMDAgICAwMDAwMDAwMDAgIDAwMDAwMDAgICAgICAwMDAgICAgIDAwMDAwMDBcbiMwMDAgICAgICAgIDAwMCAgIDAwMCAgICAgICAwMDAgICAgIDAwMCAgICAgMDAwXG4jMDAwICAgICAgICAwMDAgICAwMDAgIDAwMDAwMDAgICAgICAwMDAgICAgIDAwMDAwMDAwXG5cbnBhc3RlSW5kZXggPSAoaW5kZXgpIC0+XG5cbiAgICBjb3B5SW5kZXggaW5kZXhcbiAgICBvcmlnaW5BcHAgPSBidWZmZXJzLnNwbGljZShpbmRleCwgMSlbMF0/LmFwcFxuXG4gICAgaWYgb3MucGxhdGZvcm0oKSA9PSAnd2luMzInXG4gICAgICAgIHd4dyA9IHJlcXVpcmUgJ3d4dydcbiAgICAgICAgcGFzdGUgPSAtPlxuICAgICAgICAgICAgaWYgYWN0aXZlQXBwID09ICdtaW50dHknXG4gICAgICAgICAgICAgICAgd3h3ICdrZXknICdjdHJsK3NoaWZ0K3YnXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgd3h3ICdrZXknICdjdHJsK3YnXG4gICAgICAgIGFwcC53aW4uY2xvc2UoKVxuICAgICAgICBzZXRUaW1lb3V0IHBhc3RlLCAyMFxuICAgIGVsc2UgaWYgb3MucGxhdGZvcm0oKSAhPSAnZGFyd2luJ1xuICAgICAgICBjaGlsZHAuZXhlY1N5bmMgXCJvc2FzY3JpcHQgXCIgKyBvc2FzY3JpcHQgXCJcIlwiXG4gICAgICAgICAgICB0ZWxsIGFwcGxpY2F0aW9uIFwiU3lzdGVtIEV2ZW50c1wiIHRvIGtleXN0cm9rZSB0YWIgdXNpbmcgY29tbWFuZCBkb3duXG4gICAgICAgIFwiXCJcIlxuICAgICAgICBjaGlsZHAuZXhlY1N5bmMgXCJvc2FzY3JpcHQgXCIgKyBvc2FzY3JpcHQgXCJcIlwiXG4gICAgICAgICAgICB0ZWxsIGFwcGxpY2F0aW9uIFwiU3lzdGVtIEV2ZW50c1wiIHRvIGtleXN0cm9rZSBcInZcIiB1c2luZyBjb21tYW5kIGRvd25cbiAgICAgICAgXCJcIlwiXG5cbiMwMDAwMDAwICAgIDAwMDAwMDAwICAwMDBcbiMwMDAgICAwMDAgIDAwMCAgICAgICAwMDBcbiMwMDAgICAwMDAgIDAwMDAwMDAgICAwMDBcbiMwMDAgICAwMDAgIDAwMCAgICAgICAwMDBcbiMwMDAwMDAwICAgIDAwMDAwMDAwICAwMDAwMDAwXG5cbmRlbGV0ZUluZGV4ID0gKGluZGV4KSAtPlxuXG4gICAgYnVmZmVycy5zcGxpY2UgaW5kZXgsIDFcbiAgICByZWxvYWQgaW5kZXgtMVxuXG5xdWl0ID0gLT5cblxuICAgIHNhdmVCdWZmZXIoKVxuICAgIGNsaXBwb1dhdGNoPy5raWxsKClcblxucmVsb2FkID0gKGluZGV4PTApIC0+XG5cbiAgICBwb3N0LnRvV2lucyAnbG9hZEJ1ZmZlcnMnLCBidWZmZXJzLCBpbmRleFxuXG5jbGVhckJ1ZmZlciA9IC0+XG5cbiAgICBidWZmZXJzID0gW11cbiAgICBzYXZlQnVmZmVyKClcbiAgICByZWxvYWQoKVxuXG5zYXZlQnVmZmVyID0gLT5cblxuICAgIG5vb24uc2F2ZSBcIiN7YXBwLnVzZXJEYXRhfS9idWZmZXJzLm5vb25cIiwgYnVmZmVycy5zbGljZSgtIHByZWZzLmdldCgnbWF4QnVmZmVycycsIDUwKSlcblxucmVhZEJ1ZmZlciA9IC0+XG5cbiAgICB0cnlcbiAgICAgICAgYnVmZmVycyA9IG5vb24ubG9hZCBzbGFzaC5wYXRoIFwiI3thcHAudXNlckRhdGF9L2J1ZmZlcnMubm9vblwiXG4gICAgICAgIGJ1ZmZlcnMgPSBidWZmZXJzID8gW11cbiAgICBjYXRjaFxuICAgICAgICBidWZmZXJzID0gW11cblxuIzAwMDAwMDAwICAgMDAwMDAwMDAgICAwMDAwMDAwICAgMDAwMDAwMCAgICAwMDAgICAwMDBcbiMwMDAgICAwMDAgIDAwMCAgICAgICAwMDAgICAwMDAgIDAwMCAgIDAwMCAgIDAwMCAwMDBcbiMwMDAwMDAwICAgIDAwMDAwMDAgICAwMDAwMDAwMDAgIDAwMCAgIDAwMCAgICAwMDAwMFxuIzAwMCAgIDAwMCAgMDAwICAgICAgIDAwMCAgIDAwMCAgMDAwICAgMDAwICAgICAwMDBcbiMwMDAgICAwMDAgIDAwMDAwMDAwICAwMDAgICAwMDAgIDAwMDAwMDAgICAgICAgMDAwXG5cbnBvc3Qub24gJ2FwcFJlYWR5JywgLT5cblxuICAgIHJlYWRCdWZmZXIoKVxuXG4gICAgaWNvbkRpciA9IHNsYXNoLnJlc29sdmUgXCIje2FwcC51c2VyRGF0YX0vaWNvbnNcIlxuICAgIGZzLmVuc3VyZURpclN5bmMgaWNvbkRpclxuXG4gICAgdHJ5XG4gICAgICAgIGZzLmFjY2Vzc1N5bmMgc2xhc2guam9pbihpY29uRGlyLCAnY2xpcHBvLnBuZycpLCBmcy5SX09LXG4gICAgY2F0Y2hcbiAgICAgICAgdHJ5XG4gICAgICAgICAgICBmcy5jb3B5U3luYyBcIiN7X19kaXJuYW1lfS8uLi9pbWcvY2xpcHBvLnBuZ1wiLCBzbGFzaC5qb2luIGljb25EaXIsICdjbGlwcG8ucG5nJ1xuICAgICAgICBjYXRjaCBlcnJcbiAgICAgICAgICAgIGtlcnJvciBcImNhbid0IGNvcHkgY2xpcHBvIGljb246ICN7ZXJyfVwiXG5cbiAgICB3YXRjaENsaXBib2FyZCgpXG4iXX0=
//# sourceURL=../coffee/main.coffee