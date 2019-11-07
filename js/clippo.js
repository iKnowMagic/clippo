// koffee 1.4.0

/*
 0000000  000      000  00000000   00000000    0000000
000       000      000  000   000  000   000  000   000
000       000      000  00000000   00000000   000   000
000       000      000  000        000        000   000
 0000000  0000000  000  000        000         0000000
 */
var $, _, buffers, changeFontSize, clamp, current, defaultFontSize, doPaste, electron, elem, getFontSize, highlight, kstr, lineForTarget, loadBuffers, main, onWheel, pkg, post, prefs, ref, resetFontSize, setFocus, setFontSize, setStyle, slash, valid, w, win;

ref = require('kxk'), post = ref.post, setStyle = ref.setStyle, slash = ref.slash, clamp = ref.clamp, valid = ref.valid, prefs = ref.prefs, elem = ref.elem, kstr = ref.kstr, win = ref.win, $ = ref.$, _ = ref._;

pkg = require('../package.json');

electron = require('electron');

w = new win({
    dir: __dirname,
    pkg: pkg,
    menu: '../coffee/menu.noon',
    icon: '../img/menu@2x.png'
});

current = 0;

buffers = [];

main = $("#main");

main.style.overflow = 'scroll';

doPaste = function() {
    return post.toMain('paste', current);
};

highlight = function(index) {
    var cdiv, line;
    cdiv = $('.current');
    if (cdiv != null) {
        cdiv.classList.remove('current');
    }
    current = Math.max(0, Math.min(index, buffers.length - 1));
    line = $("line" + current);
    if (line != null) {
        line.classList.add('current');
        line.scrollIntoViewIfNeeded();
        return setFocus();
    }
};

window.onload = function() {
    highlight(buffers.length - 1);
    return setFocus();
};

setFocus = function() {
    return main.focus();
};

lineForTarget = function(target) {
    var upElem;
    if (upElem = elem.upElem(target, {
        "class": 'line-div'
    })) {
        return parseInt(upElem.id.substr(4));
    }
};

main.addEventListener('mouseover', function(event) {
    var id;
    id = lineForTarget(event.target);
    if (valid(id)) {
        return highlight(id);
    }
});

main.addEventListener('click', function(event) {
    var id;
    id = lineForTarget(event.target);
    if (valid(id)) {
        highlight(id);
        return doPaste();
    }
});

post.on('loadBuffers', function(buffs, index) {
    return loadBuffers(buffs, index);
});

post.on('schemeChanged', function() {
    return loadBuffers(buffers, current);
});

loadBuffers = function(buffs, index) {
    var buf, div, encl, i, iconDir, j, l, len, s;
    buffers = buffs;
    if (buffers.length === 0) {
        s = prefs.get('scheme', 'dark');
        $('main').innerHTML = "<center><img class='info' src=\"" + __dirname + "/../img/empty_" + s + ".png\"></center>";
        return;
    }
    iconDir = slash.encode(slash.join(electron.remote.app.getPath('userData'), 'icons'));
    $('main').innerHTML = "<div id='buffer'></div>";
    i = 0;
    for (j = 0, len = buffers.length; j < len; j++) {
        buf = buffers[j];
        div = elem({
            id: "line" + i,
            "class": 'line-div',
            child: elem('span', {
                "class": 'line-span',
                children: [
                    elem('img', {
                        "class": 'appicon',
                        src: iconDir + "/" + buf.app + ".png"
                    }), buf.image != null ? elem('img', {
                        src: "data:image/png;base64," + buf.image,
                        "class": 'image'
                    }) : buf.text != null ? (encl = (function() {
                        var k, len1, ref1, results;
                        ref1 = buf.text.split("\n");
                        results = [];
                        for (k = 0, len1 = ref1.length; k < len1; k++) {
                            l = ref1[k];
                            results.push(kstr.encode(l));
                        }
                        return results;
                    })(), elem('pre', {
                        html: encl.join("<br>")
                    })) : elem('pre')
                ]
            })
        });
        $('buffer').insertBefore(div, $('buffer').firstChild);
        i += 1;
    }
    return highlight(index != null ? index : buffers.length - 1);
};

defaultFontSize = 15;

getFontSize = function() {
    return prefs.get('fontSize', defaultFontSize);
};

setFontSize = function(s) {
    var iconSize;
    if (!_.isFinite(s)) {
        s = getFontSize();
    }
    s = clamp(4, 44, s);
    prefs.set("fontSize", s);
    setStyle("#buffer", 'font-size', s + "px");
    iconSize = clamp(18, 64, s * 2);
    setStyle('img.appicon', 'height', iconSize + "px");
    setStyle('img.appicon', 'width', iconSize + "px");
    return setStyle('img.appicon', 'padding-top', "6px");
};

changeFontSize = function(d) {
    var f, s;
    s = getFontSize();
    if (s >= 30) {
        f = 4;
    } else if (s >= 50) {
        f = 10;
    } else if (s >= 20) {
        f = 2;
    } else {
        f = 1;
    }
    return setFontSize(s + f * d);
};

resetFontSize = function() {
    prefs.set('fontSize', defaultFontSize);
    return setFontSize(defaultFontSize);
};

onWheel = function(event) {
    if (0 <= w.modifiers.indexOf('ctrl')) {
        return changeFontSize(-event.deltaY / 100);
    }
};

setFontSize(getFontSize());

window.document.addEventListener('wheel', onWheel);

post.on('combo', function(combo, info) {
    switch (combo) {
        case 'esc':
            return post.toMain('closeWin');
        case 'down':
        case 'right':
            return highlight(current - 1);
        case 'up':
        case 'left':
            return highlight(current + 1);
        case 'home':
        case 'page up':
            return highlight(buffers.length - 1);
        case 'end':
        case 'page down':
            return highlight(0);
        case 'enter':
        case 'command+v':
        case 'ctrl+v':
            return doPaste();
        case 'backspace':
        case 'command+backspace':
        case 'ctrl+backspace':
        case 'delete':
            return post.toMain('del', current);
    }
});

post.on('menuAction', function(action) {
    switch (action) {
        case 'Clear':
            return post.toMain('clearBuffer');
        case 'Save':
            return post.toMain('saveBuffer');
        case 'Increase':
            return changeFontSize(+1);
        case 'Decrease':
            return changeFontSize(-1);
        case 'Reset':
            return resetFontSize();
    }
});

loadBuffers(post.get('buffers'));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcHBvLmpzIiwic291cmNlUm9vdCI6Ii4iLCJzb3VyY2VzIjpbIiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7O0FBQUEsSUFBQTs7QUFRQSxNQUF3RSxPQUFBLENBQVEsS0FBUixDQUF4RSxFQUFFLGVBQUYsRUFBUSx1QkFBUixFQUFrQixpQkFBbEIsRUFBeUIsaUJBQXpCLEVBQWdDLGlCQUFoQyxFQUF1QyxpQkFBdkMsRUFBOEMsZUFBOUMsRUFBb0QsZUFBcEQsRUFBMEQsYUFBMUQsRUFBK0QsU0FBL0QsRUFBa0U7O0FBRWxFLEdBQUEsR0FBWSxPQUFBLENBQVEsaUJBQVI7O0FBQ1osUUFBQSxHQUFZLE9BQUEsQ0FBUSxVQUFSOztBQUVaLENBQUEsR0FBSSxJQUFJLEdBQUosQ0FDQTtJQUFBLEdBQUEsRUFBUSxTQUFSO0lBQ0EsR0FBQSxFQUFRLEdBRFI7SUFFQSxJQUFBLEVBQVEscUJBRlI7SUFHQSxJQUFBLEVBQVEsb0JBSFI7Q0FEQTs7QUFNSixPQUFBLEdBQVU7O0FBQ1YsT0FBQSxHQUFVOztBQUNWLElBQUEsR0FBUyxDQUFBLENBQUUsT0FBRjs7QUFDVCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVgsR0FBc0I7O0FBRXRCLE9BQUEsR0FBVSxTQUFBO1dBQUcsSUFBSSxDQUFDLE1BQUwsQ0FBWSxPQUFaLEVBQXFCLE9BQXJCO0FBQUg7O0FBUVYsU0FBQSxHQUFZLFNBQUMsS0FBRDtBQUVSLFFBQUE7SUFBQSxJQUFBLEdBQU0sQ0FBQSxDQUFFLFVBQUY7SUFDTixJQUFHLFlBQUg7UUFDSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQWYsQ0FBc0IsU0FBdEIsRUFESjs7SUFHQSxPQUFBLEdBQVUsSUFBSSxDQUFDLEdBQUwsQ0FBUyxDQUFULEVBQVksSUFBSSxDQUFDLEdBQUwsQ0FBUyxLQUFULEVBQWdCLE9BQU8sQ0FBQyxNQUFSLEdBQWUsQ0FBL0IsQ0FBWjtJQUVWLElBQUEsR0FBTSxDQUFBLENBQUUsTUFBQSxHQUFPLE9BQVQ7SUFF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QjtBQUVxRCxtQkFBTyxTQUFBLENBQVUsT0FBQSxHQUFRLENBQWxCO0FBRjVELGFBR1MsSUFIVDtBQUFBLGFBR2lCLE1BSGpCO0FBR3FELG1CQUFPLFNBQUEsQ0FBVSxPQUFBLEdBQVEsQ0FBbEI7QUFINUQsYUFJUyxNQUpUO0FBQUEsYUFJaUIsU0FKakI7QUFJcUQsbUJBQU8sU0FBQSxDQUFVLE9BQU8sQ0FBQyxNQUFSLEdBQWUsQ0FBekI7QUFKNUQsYUFLUyxLQUxUO0FBQUEsYUFLaUIsV0FMakI7QUFLcUQsbUJBQU8sU0FBQSxDQUFVLENBQVY7QUFMNUQsYUFNUyxPQU5UO0FBQUEsYUFNa0IsV0FObEI7QUFBQSxhQU0rQixRQU4vQjtBQU1xRCxtQkFBTyxPQUFBLENBQUE7QUFONUQsYUFPUyxXQVBUO0FBQUEsYUFPc0IsbUJBUHRCO0FBQUEsYUFPMkMsZ0JBUDNDO0FBQUEsYUFPNkQsUUFQN0Q7QUFPMkUsbUJBQU8sSUFBSSxDQUFDLE1BQUwsQ0FBWSxLQUFaLEVBQW1CLE9BQW5CO0FBUGxGO0FBRmEsQ0FBakI7O0FBaUJBLElBQUksQ0FBQyxFQUFMLENBQVEsWUFBUixFQUFzQixTQUFDLE1BQUQ7QUFFbEIsWUFBTyxNQUFQO0FBQUEsYUFDUyxPQURUO21CQUN5QixJQUFJLENBQUMsTUFBTCxDQUFZLGFBQVo7QUFEekIsYUFFUyxNQUZUO21CQUV5QixJQUFJLENBQUMsTUFBTCxDQUFZLFlBQVo7QUFGekIsYUFHUyxVQUhUO21CQUd5QixjQUFBLENBQWUsQ0FBQyxDQUFoQjtBQUh6QixhQUlTLFVBSlQ7bUJBSXlCLGNBQUEsQ0FBZSxDQUFDLENBQWhCO0FBSnpCLGFBS1MsT0FMVDttQkFLeUIsYUFBQSxDQUFBO0FBTHpCO0FBRmtCLENBQXRCOztBQVNBLFdBQUEsQ0FBWSxJQUFJLENBQUMsR0FBTCxDQUFTLFNBQVQsQ0FBWiIsInNvdXJjZXNDb250ZW50IjpbIiMjI1xuIDAwMDAwMDAgIDAwMCAgICAgIDAwMCAgMDAwMDAwMDAgICAwMDAwMDAwMCAgICAwMDAwMDAwXG4wMDAgICAgICAgMDAwICAgICAgMDAwICAwMDAgICAwMDAgIDAwMCAgIDAwMCAgMDAwICAgMDAwXG4wMDAgICAgICAgMDAwICAgICAgMDAwICAwMDAwMDAwMCAgIDAwMDAwMDAwICAgMDAwICAgMDAwXG4wMDAgICAgICAgMDAwICAgICAgMDAwICAwMDAgICAgICAgIDAwMCAgICAgICAgMDAwICAgMDAwXG4gMDAwMDAwMCAgMDAwMDAwMCAgMDAwICAwMDAgICAgICAgIDAwMCAgICAgICAgIDAwMDAwMDBcbiMjI1xuXG57IHBvc3QsIHNldFN0eWxlLCBzbGFzaCwgY2xhbXAsIHZhbGlkLCBwcmVmcywgZWxlbSwga3N0ciwgd2luLCAkLCBfIH0gPSByZXF1aXJlICdreGsnXG5cbnBrZyAgICAgICA9IHJlcXVpcmUgJy4uL3BhY2thZ2UuanNvbidcbmVsZWN0cm9uICA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuXG53ID0gbmV3IHdpbiBcbiAgICBkaXI6ICAgIF9fZGlybmFtZVxuICAgIHBrZzogICAgcGtnXG4gICAgbWVudTogICAnLi4vY29mZmVlL21lbnUubm9vbidcbiAgICBpY29uOiAgICcuLi9pbWcvbWVudUAyeC5wbmcnXG4gICAgXG5jdXJyZW50ID0gMFxuYnVmZmVycyA9IFtdXG5tYWluICAgID0kIFwiI21haW5cIlxubWFpbi5zdHlsZS5vdmVyZmxvdyA9ICdzY3JvbGwnXG5cbmRvUGFzdGUgPSAtPiBwb3N0LnRvTWFpbiAncGFzdGUnLCBjdXJyZW50XG5cbiMgMDAwICAgMDAwICAwMDAgICAwMDAwMDAwICAgMDAwICAgMDAwICAwMDAgICAgICAwMDAgICAwMDAwMDAwICAgMDAwICAgMDAwICAwMDAwMDAwMDBcbiMgMDAwICAgMDAwICAwMDAgIDAwMCAgICAgICAgMDAwICAgMDAwICAwMDAgICAgICAwMDAgIDAwMCAgICAgICAgMDAwICAgMDAwICAgICAwMDBcbiMgMDAwMDAwMDAwICAwMDAgIDAwMCAgMDAwMCAgMDAwMDAwMDAwICAwMDAgICAgICAwMDAgIDAwMCAgMDAwMCAgMDAwMDAwMDAwICAgICAwMDBcbiMgMDAwICAgMDAwICAwMDAgIDAwMCAgIDAwMCAgMDAwICAgMDAwICAwMDAgICAgICAwMDAgIDAwMCAgIDAwMCAgMDAwICAgMDAwICAgICAwMDBcbiMgMDAwICAgMDAwICAwMDAgICAwMDAwMDAwICAgMDAwICAgMDAwICAwMDAwMDAwICAwMDAgICAwMDAwMDAwICAgMDAwICAgMDAwICAgICAwMDBcblxuaGlnaGxpZ2h0ID0gKGluZGV4KSAtPlxuICAgIFxuICAgIGNkaXYgPSQgJy5jdXJyZW50J1xuICAgIGlmIGNkaXY/XG4gICAgICAgIGNkaXYuY2xhc3NMaXN0LnJlbW92ZSAnY3VycmVudCdcblxuICAgIGN1cnJlbnQgPSBNYXRoLm1heCAwLCBNYXRoLm1pbiBpbmRleCwgYnVmZmVycy5sZW5ndGgtMVxuICAgIFxuICAgIGxpbmUgPSQgXCJsaW5lI3tjdXJyZW50fVwiXG4gICAgXG4gICAgaWYgbGluZT9cbiAgICAgICAgbGluZS5jbGFzc0xpc3QuYWRkICdjdXJyZW50J1xuICAgICAgICBsaW5lLnNjcm9sbEludG9WaWV3SWZOZWVkZWQoKVxuICAgICAgICBzZXRGb2N1cygpXG4gICAgICAgIFxud2luZG93Lm9ubG9hZCA9IC0+XG5cbiAgICBoaWdobGlnaHQgYnVmZmVycy5sZW5ndGgtMVxuICAgIHNldEZvY3VzKClcblxuIyAwMCAgICAgMDAgICAwMDAwMDAwICAgMDAwICAgMDAwICAgMDAwMDAwMCAgMDAwMDAwMDAgIFxuIyAwMDAgICAwMDAgIDAwMCAgIDAwMCAgMDAwICAgMDAwICAwMDAgICAgICAgMDAwICAgICAgIFxuIyAwMDAwMDAwMDAgIDAwMCAgIDAwMCAgMDAwICAgMDAwICAwMDAwMDAwICAgMDAwMDAwMCAgIFxuIyAwMDAgMCAwMDAgIDAwMCAgIDAwMCAgMDAwICAgMDAwICAgICAgIDAwMCAgMDAwICAgICAgIFxuIyAwMDAgICAwMDAgICAwMDAwMDAwICAgIDAwMDAwMDAgICAwMDAwMDAwICAgMDAwMDAwMDAgIFxuXG5zZXRGb2N1cyA9IC0+IG1haW4uZm9jdXMoKVxuXG5saW5lRm9yVGFyZ2V0ID0gKHRhcmdldCkgLT5cbiAgICBcbiAgICBpZiB1cEVsZW0gPSBlbGVtLnVwRWxlbSB0YXJnZXQsIHsgY2xhc3M6J2xpbmUtZGl2JyB9XG4gICAgICAgIHJldHVybiBwYXJzZUludCB1cEVsZW0uaWQuc3Vic3RyIDRcbiAgICBcbm1haW4uYWRkRXZlbnRMaXN0ZW5lciAnbW91c2VvdmVyJywgKGV2ZW50KSAtPlxuICAgIFxuICAgIGlkID0gbGluZUZvclRhcmdldCBldmVudC50YXJnZXRcbiAgICBpZiB2YWxpZCBpZFxuICAgICAgICBoaWdobGlnaHQgaWRcblxubWFpbi5hZGRFdmVudExpc3RlbmVyICdjbGljaycsIChldmVudCkgLT5cbiAgICBcbiAgICBpZCA9IGxpbmVGb3JUYXJnZXQgZXZlbnQudGFyZ2V0XG4gICAgaWYgdmFsaWQgaWRcbiAgICAgICAgaGlnaGxpZ2h0IGlkIFxuICAgICAgICBkb1Bhc3RlKClcbiAgICBcbiMgMDAwICAgICAgIDAwMDAwMDAgICAgMDAwMDAwMCAgIDAwMDAwMDBcbiMgMDAwICAgICAgMDAwICAgMDAwICAwMDAgICAwMDAgIDAwMCAgIDAwMFxuIyAwMDAgICAgICAwMDAgICAwMDAgIDAwMDAwMDAwMCAgMDAwICAgMDAwXG4jIDAwMCAgICAgIDAwMCAgIDAwMCAgMDAwICAgMDAwICAwMDAgICAwMDBcbiMgMDAwMDAwMCAgIDAwMDAwMDAgICAwMDAgICAwMDAgIDAwMDAwMDBcblxucG9zdC5vbiAnbG9hZEJ1ZmZlcnMnLCAoYnVmZnMsIGluZGV4KSAtPiBsb2FkQnVmZmVycyBidWZmcywgaW5kZXhcbnBvc3Qub24gJ3NjaGVtZUNoYW5nZWQnLCAtPiBsb2FkQnVmZmVycyBidWZmZXJzLCBjdXJyZW50XG5cbmxvYWRCdWZmZXJzID0gKGJ1ZmZzLCBpbmRleCkgLT5cblxuICAgIGJ1ZmZlcnMgPSBidWZmc1xuICAgIFxuICAgIGlmIGJ1ZmZlcnMubGVuZ3RoID09IDBcbiAgICAgICAgcyA9IHByZWZzLmdldCAnc2NoZW1lJywgJ2RhcmsnXG4gICAgICAgICQoJ21haW4nKS5pbm5lckhUTUwgPSBcIjxjZW50ZXI+PGltZyBjbGFzcz0naW5mbycgc3JjPVxcXCIje19fZGlybmFtZX0vLi4vaW1nL2VtcHR5XyN7c30ucG5nXFxcIj48L2NlbnRlcj5cIlxuICAgICAgICByZXR1cm5cblxuICAgIGljb25EaXIgPSBzbGFzaC5lbmNvZGUgc2xhc2guam9pbiBlbGVjdHJvbi5yZW1vdGUuYXBwLmdldFBhdGgoJ3VzZXJEYXRhJyksICdpY29ucydcblxuICAgICQoJ21haW4nKS5pbm5lckhUTUwgPSBcIjxkaXYgaWQ9J2J1ZmZlcic+PC9kaXY+XCJcblxuICAgIGkgPSAwXG4gICAgZm9yIGJ1ZiBpbiBidWZmZXJzXG4gICAgICAgIGRpdiA9IGVsZW0gaWQ6IFwibGluZSN7aX1cIiwgY2xhc3M6ICdsaW5lLWRpdicsIGNoaWxkOlxuICAgICAgICAgICAgZWxlbSAnc3BhbicsIGNsYXNzOiAnbGluZS1zcGFuJywgY2hpbGRyZW46IFtcbiAgICAgICAgICAgICAgICBlbGVtICdpbWcnLCBjbGFzczogJ2FwcGljb24nLCBzcmM6IFwiI3tpY29uRGlyfS8je2J1Zi5hcHB9LnBuZ1wiXG4gICAgICAgICAgICAgICAgaWYgYnVmLmltYWdlP1xuICAgICAgICAgICAgICAgICAgICBlbGVtICdpbWcnLCBzcmM6IFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LCN7YnVmLmltYWdlfVwiLCBjbGFzczogJ2ltYWdlJ1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgYnVmLnRleHQ/XG4gICAgICAgICAgICAgICAgICAgIGVuY2wgPSAoIGtzdHIuZW5jb2RlKGwpIGZvciBsIGluIGJ1Zi50ZXh0LnNwbGl0IFwiXFxuXCIgKVxuICAgICAgICAgICAgICAgICAgICBlbGVtICdwcmUnLCBodG1sOiBlbmNsLmpvaW4gXCI8YnI+XCJcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGVsZW0gJ3ByZSdcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICQoJ2J1ZmZlcicpLmluc2VydEJlZm9yZSBkaXYsICQoJ2J1ZmZlcicpLmZpcnN0Q2hpbGRcbiAgICAgICAgaSArPSAxXG5cbiAgICBoaWdobGlnaHQgaW5kZXggPyBidWZmZXJzLmxlbmd0aC0xXG5cbiMgMDAwMDAwMDAgICAwMDAwMDAwICAgMDAwICAgMDAwICAwMDAwMDAwMDAgICAgICAwMDAwMDAwICAwMDAgIDAwMDAwMDAgIDAwMDAwMDAwXG4jIDAwMCAgICAgICAwMDAgICAwMDAgIDAwMDAgIDAwMCAgICAgMDAwICAgICAgICAwMDAgICAgICAgMDAwICAgICAwMDAgICAwMDBcbiMgMDAwMDAwICAgIDAwMCAgIDAwMCAgMDAwIDAgMDAwICAgICAwMDAgICAgICAgIDAwMDAwMDAgICAwMDAgICAgMDAwICAgIDAwMDAwMDBcbiMgMDAwICAgICAgIDAwMCAgIDAwMCAgMDAwICAwMDAwICAgICAwMDAgICAgICAgICAgICAgMDAwICAwMDAgICAwMDAgICAgIDAwMFxuIyAwMDAgICAgICAgIDAwMDAwMDAgICAwMDAgICAwMDAgICAgIDAwMCAgICAgICAgMDAwMDAwMCAgIDAwMCAgMDAwMDAwMCAgMDAwMDAwMDBcblxuZGVmYXVsdEZvbnRTaXplID0gMTVcblxuZ2V0Rm9udFNpemUgPSAtPiBwcmVmcy5nZXQgJ2ZvbnRTaXplJywgZGVmYXVsdEZvbnRTaXplXG5cbnNldEZvbnRTaXplID0gKHMpIC0+XG4gICAgICAgIFxuICAgIHMgPSBnZXRGb250U2l6ZSgpIGlmIG5vdCBfLmlzRmluaXRlIHNcbiAgICBzID0gY2xhbXAgNCwgNDQsIHNcblxuICAgIHByZWZzLnNldCBcImZvbnRTaXplXCIsIHNcblxuICAgIHNldFN0eWxlIFwiI2J1ZmZlclwiLCAnZm9udC1zaXplJywgXCIje3N9cHhcIlxuICAgIGljb25TaXplID0gY2xhbXAgMTgsIDY0LCBzICogMlxuICAgIHNldFN0eWxlICdpbWcuYXBwaWNvbicsICdoZWlnaHQnLCBcIiN7aWNvblNpemV9cHhcIlxuICAgIHNldFN0eWxlICdpbWcuYXBwaWNvbicsICd3aWR0aCcsICBcIiN7aWNvblNpemV9cHhcIlxuICAgIHNldFN0eWxlICdpbWcuYXBwaWNvbicsICdwYWRkaW5nLXRvcCcsICBcIjZweFwiXG5cbmNoYW5nZUZvbnRTaXplID0gKGQpIC0+XG4gICAgXG4gICAgcyA9IGdldEZvbnRTaXplKClcbiAgICBpZiAgICAgIHMgPj0gMzAgdGhlbiBmID0gNFxuICAgIGVsc2UgaWYgcyA+PSA1MCB0aGVuIGYgPSAxMFxuICAgIGVsc2UgaWYgcyA+PSAyMCB0aGVuIGYgPSAyXG4gICAgZWxzZSAgICAgICAgICAgICAgICAgZiA9IDFcbiAgICAgICAgXG4gICAgc2V0Rm9udFNpemUgcyArIGYqZFxuXG5yZXNldEZvbnRTaXplID0gLT5cbiAgICBcbiAgICBwcmVmcy5zZXQgJ2ZvbnRTaXplJywgZGVmYXVsdEZvbnRTaXplXG4gICAgc2V0Rm9udFNpemUgZGVmYXVsdEZvbnRTaXplXG4gICAgIFxub25XaGVlbCA9IChldmVudCkgLT5cbiAgICBcbiAgICBpZiAwIDw9IHcubW9kaWZpZXJzLmluZGV4T2YgJ2N0cmwnXG4gICAgICAgIGNoYW5nZUZvbnRTaXplIC1ldmVudC5kZWx0YVkvMTAwXG4gIFxuc2V0Rm9udFNpemUgZ2V0Rm9udFNpemUoKVxud2luZG93LmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIgJ3doZWVsJywgb25XaGVlbCAgICBcbiAgICBcbiMgIDAwMDAwMDAgICAwMDAwMDAwICAgMDAgICAgIDAwICAwMDAwMDAwICAgICAwMDAwMDAwICAgXG4jIDAwMCAgICAgICAwMDAgICAwMDAgIDAwMCAgIDAwMCAgMDAwICAgMDAwICAwMDAgICAwMDAgIFxuIyAwMDAgICAgICAgMDAwICAgMDAwICAwMDAwMDAwMDAgIDAwMDAwMDAgICAgMDAwICAgMDAwICBcbiMgMDAwICAgICAgIDAwMCAgIDAwMCAgMDAwIDAgMDAwICAwMDAgICAwMDAgIDAwMCAgIDAwMCAgXG4jICAwMDAwMDAwICAgMDAwMDAwMCAgIDAwMCAgIDAwMCAgMDAwMDAwMCAgICAgMDAwMDAwMCAgIFxuXG5wb3N0Lm9uICdjb21ibycsIChjb21ibywgaW5mbykgLT5cblxuICAgIHN3aXRjaCBjb21ib1xuICAgICAgICB3aGVuICdlc2MnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZW4gcmV0dXJuIHBvc3QudG9NYWluICdjbG9zZVdpbidcbiAgICAgICAgd2hlbiAnZG93bicsICdyaWdodCcgICAgICAgICAgICAgICAgICAgICAgICB0aGVuIHJldHVybiBoaWdobGlnaHQgY3VycmVudC0xXG4gICAgICAgIHdoZW4gJ3VwJyAgLCAnbGVmdCcgICAgICAgICAgICAgICAgICAgICAgICAgdGhlbiByZXR1cm4gaGlnaGxpZ2h0IGN1cnJlbnQrMVxuICAgICAgICB3aGVuICdob21lJywgJ3BhZ2UgdXAnICAgICAgICAgICAgICAgICAgICAgIHRoZW4gcmV0dXJuIGhpZ2hsaWdodCBidWZmZXJzLmxlbmd0aC0xXG4gICAgICAgIHdoZW4gJ2VuZCcsICAncGFnZSBkb3duJyAgICAgICAgICAgICAgICAgICAgdGhlbiByZXR1cm4gaGlnaGxpZ2h0IDBcbiAgICAgICAgd2hlbiAnZW50ZXInLCAnY29tbWFuZCt2JywgJ2N0cmwrdicgICAgICAgICB0aGVuIHJldHVybiBkb1Bhc3RlKClcbiAgICAgICAgd2hlbiAnYmFja3NwYWNlJywgJ2NvbW1hbmQrYmFja3NwYWNlJywgJ2N0cmwrYmFja3NwYWNlJywgJ2RlbGV0ZScgdGhlbiByZXR1cm4gcG9zdC50b01haW4gJ2RlbCcsIGN1cnJlbnRcblxuIyAwMCAgICAgMDAgIDAwMDAwMDAwICAwMDAgICAwMDAgIDAwMCAgIDAwMCAgIDAwMDAwMDAgICAgMDAwMDAwMCAgMDAwMDAwMDAwICAwMDAgICAwMDAwMDAwICAgMDAwICAgMDAwICBcbiMgMDAwICAgMDAwICAwMDAgICAgICAgMDAwMCAgMDAwICAwMDAgICAwMDAgIDAwMCAgIDAwMCAgMDAwICAgICAgICAgIDAwMCAgICAgMDAwICAwMDAgICAwMDAgIDAwMDAgIDAwMCAgXG4jIDAwMDAwMDAwMCAgMDAwMDAwMCAgIDAwMCAwIDAwMCAgMDAwICAgMDAwICAwMDAwMDAwMDAgIDAwMCAgICAgICAgICAwMDAgICAgIDAwMCAgMDAwICAgMDAwICAwMDAgMCAwMDAgIFxuIyAwMDAgMCAwMDAgIDAwMCAgICAgICAwMDAgIDAwMDAgIDAwMCAgIDAwMCAgMDAwICAgMDAwICAwMDAgICAgICAgICAgMDAwICAgICAwMDAgIDAwMCAgIDAwMCAgMDAwICAwMDAwICBcbiMgMDAwICAgMDAwICAwMDAwMDAwMCAgMDAwICAgMDAwICAgMDAwMDAwMCAgIDAwMCAgIDAwMCAgIDAwMDAwMDAgICAgIDAwMCAgICAgMDAwICAgMDAwMDAwMCAgIDAwMCAgIDAwMCAgXG5cbnBvc3Qub24gJ21lbnVBY3Rpb24nLCAoYWN0aW9uKSAtPlxuXG4gICAgc3dpdGNoIGFjdGlvblxuICAgICAgICB3aGVuICdDbGVhcicgICAgdGhlbiBwb3N0LnRvTWFpbiAnY2xlYXJCdWZmZXInXG4gICAgICAgIHdoZW4gJ1NhdmUnICAgICB0aGVuIHBvc3QudG9NYWluICdzYXZlQnVmZmVyJ1xuICAgICAgICB3aGVuICdJbmNyZWFzZScgdGhlbiBjaGFuZ2VGb250U2l6ZSArMVxuICAgICAgICB3aGVuICdEZWNyZWFzZScgdGhlbiBjaGFuZ2VGb250U2l6ZSAtMVxuICAgICAgICB3aGVuICdSZXNldCcgICAgdGhlbiByZXNldEZvbnRTaXplKClcbiAgICAgICAgXG5sb2FkQnVmZmVycyBwb3N0LmdldCAnYnVmZmVycydcbiJdfQ==
//# sourceURL=../coffee/clippo.coffee