/**
 * Hidden WebView document: PDF.js reads the injected PDF bytes and posts
 * each page's text back to React Native (page 1 = chapter 1).
 */
export function getPdfJsExtractorHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
<script>
(function () {
  function post(payload) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } catch (e) {}
  }

  function itemsToText(items) {
    var lines = [];
    var line = "";
    var lastY = null;
    if (!items || !items.length) return "";
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var str = item && item.str ? String(item.str) : "";
      if (!str) continue;
      var y = item.transform ? item.transform[5] : 0;
      if (lastY !== null && Math.abs(y - lastY) > 6) {
        if (line.trim()) lines.push(line.trim());
        line = str;
      } else {
        if (line && !/\\s$/.test(line) && !/^\\s/.test(str)) line += " ";
        line += str;
      }
      lastY = y;
      if (item.hasEOL) {
        if (line.trim()) lines.push(line.trim());
        line = "";
        lastY = null;
      }
    }
    if (line.trim()) lines.push(line.trim());
    return lines.join("\\n").replace(/\\n{3,}/g, "\\n\\n").trim();
  }

  function b64ToUint8(b64) {
    var raw = atob(b64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  window.__pdfB64 = "";
  window.__extracting = false;

  window.__extractPdf = function () {
    if (window.__extracting) return;
    var b64 = window.__pdfB64 || "";
    if (!b64) {
      post({ type: "error", message: "No PDF data" });
      return;
    }
    if (!window.pdfjsLib) {
      post({ type: "error", message: "PDF.js failed to load. Check your connection and try again." });
      return;
    }
    window.__extracting = true;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    pdfjsLib
      .getDocument({
        data: b64ToUint8(b64),
        disableRange: true,
        disableStream: true,
        isEvalSupported: false,
      })
      .promise.then(function (pdf) {
        var total = pdf.numPages || 0;
        post({ type: "started", totalPages: total });
        var i = 1;
        function nextPage() {
          if (i > total) {
            post({ type: "done", totalPages: total });
            window.__extracting = false;
            window.__pdfB64 = "";
            return;
          }
          pdf.getPage(i).then(function (page) {
            return page.getTextContent().then(function (content) {
              var text = itemsToText(content.items || []);
              post({ type: "page", pageNumber: i, text: text, totalPages: total });
              i += 1;
              nextPage();
            });
          }).catch(function (err) {
            post({
              type: "page",
              pageNumber: i,
              text: "",
              totalPages: total,
              error: String(err && err.message ? err.message : err),
            });
            i += 1;
            nextPage();
          });
        }
        nextPage();
      })
      .catch(function (err) {
        window.__extracting = false;
        post({
          type: "error",
          message: String(err && err.message ? err.message : err),
        });
      });
  };

  post({ type: "ready" });
})();
</script>
</body>
</html>`;
}
