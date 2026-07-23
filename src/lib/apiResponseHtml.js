// Pewarnaan sederhana untuk syntax JSON (key/string/number/boolean/null)
function syntaxHighlightJson(jsonString) {
  const escaped = jsonString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-orange-400'; // number
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'text-sky-400' : 'text-emerald-400'; // key vs string
      } else if (/true|false/.test(match)) {
        cls = 'text-purple-400';
      } else if (/null/.test(match)) {
        cls = 'text-rose-400';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// Bangun HTML custom untuk menampilkan response API (JSON) di dalam Swal
export function buildApiResponseHtml(rawText) {
  let pretty = rawText;
  try {
    pretty = JSON.stringify(JSON.parse(rawText), null, 2);
  } catch (e) {
    // Bukan JSON valid, tampilkan apa adanya
  }
  const highlighted = syntaxHighlightJson(pretty);
  return `
    <div class="text-left">
      <p class="text-xs font-bold uppercase text-slate-400 mb-1.5">Response Body</p>
      <pre class="bg-slate-900 text-slate-200 text-xs leading-relaxed p-3 rounded-lg overflow-auto text-left" style="max-height:320px; white-space:pre-wrap; word-break:break-word;">${highlighted}</pre>
    </div>`;
}