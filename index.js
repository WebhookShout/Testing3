const ServiceKey = "AdRa-hXtp-44pk-uopl-cVIp-QdG1-Dnh1-adO0-russ-1ov3";

//-- Encode Decode Word Function
const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function toBase32(bytes) {
  let bits = 0, value = 0, output = '';
  for (let byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += base32Alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function fromBase32(str) {
  let bits = 0, value = 0, output = [];
  for (let c of str.toUpperCase()) {
    const index = base32Alphabet.indexOf(c);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

function EncodeText(text, key) {
  const data = new TextEncoder().encode(text);
  const keyData = new TextEncoder().encode(key);
  const encrypted = data.map((b, i) => b ^ keyData[i % keyData.length]);
  return toBase32(encrypted);
}

function DecodeText(encoded, key) {
  const data = fromBase32(encoded);
  const keyData = new TextEncoder().encode(key);
  const decrypted = data.map((b, i) => b ^ keyData[i % keyData.length]);
  return new TextDecoder().decode(new Uint8Array(decrypted));
}
//--

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const domain = url.origin; // get service full link
    const userAgent = request.headers.get('User-Agent') || ''; // get User-Agent    
    const pathname = decodeURIComponent(url.pathname.slice(1)); // remove leading '/'
    const message = url.searchParams.get("message"); // get key in '?message=Hello'
    const auth = url.searchParams.get("auth"); // get key in '?auth=Key'
    
    // Handle Access
    if (pathname && auth) {
      const key = pathname;
      const linkData = links[key];
      const data = JSON.parse(DecodeText(auth, ServiceKey));
      
      if (!linkData || !data) {
        return new Response(`404: Not Found`, { status: 404 });
      }

      // Detect if Access ID is Expired
      if (data.Expiration < Date.now()) {
         return new Response(`404: Not Found`, { status: 404 });
      }
      
      const resp = await fetch(linkData);
      if (!resp.ok) {
        return new Response(`${resp.status}: Failed to fetch content`, { status: 500 });
      }

      const textContent = await resp.text();
      const content = `game:GetService("ReplicatedStorage"):WaitForChild("${data.Name}").Value = tostring(math.random(1000000, 10000000))\n${textContent}`;
      const encoded = EncodeScript(content, String(data.Key));
      const script = `local function Decode(encodedStr, key) local result = {} local parts = string.split(encodedStr, "/") for i = 1, #parts do local byte = tonumber(parts[i]) local k = key:byte(((i - 1) % #key) + 1) local decoded = (byte - k + 256) % 256 table.insert(result, string.char(decoded)) end return table.concat(result) end local a = game local b = "GetService" local c = "ReplicatedStorage" local d = "Destroy" local obj = a[b](a, c)["${data.Name}"] loadstring(Decode("${encoded}", obj.Value))()`;
      
      return new Response(script, {
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Create Link
    if (pathname && pathname === "create" && message) {
      const json = JSON.stringify({
        "message": message,
        "expired": false
      })
      return new Response(json, {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Home Page
    const homepage = `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>One Time Link Generator</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #121212;
      color: #eee;
      margin: 30;
      padding: 0;
    }
    .main-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }
    h1 {
      margin-bottom: 1rem;
      font-weight: 500;
      color: white;
      font-size: 1.2rem;
    }
    textarea {
      width: 100%;
      max-width: 500px;
      height: 100px;
      padding: 10px;
      font-size: 1rem;
      border-radius: 8px;
      border: none;
      resize: vertical;
      background: #222;
      color: #eee;
      margin-bottom: 1rem;
    }
    button {
      background: white;
      border: none;
      color: #121212;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.3s ease;
      margin-bottom: 1rem;
      width: 200px;
    }
    button:hover {
      background: #ccc;
    }
    .result {
      max-width: 500px;
      word-break: break-word;
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
      user-select: all;
    }
    a {
      color: white;
      text-decoration: none;
    }

    /* Styles for API Documentation */
    .doc-container {
      max-width: 900px;
      margin: auto;
      padding: 2rem;
      font-family: Arial, sans-serif;
      line-height: 1.6;
    }
    .doc-container h1, .doc-container h2 {
      color: #ffffff;
    }
    .doc-container code, .doc-container pre {
      background-color: #1e1e1e;
      padding: 5px;
      border-radius: 5px;
      display: block;
      overflow-x: auto;
      color: #90ee90;
    }
    .doc-container section {
      margin-bottom: 2rem;
    }
    .doc-container a {
      color: #61dafb;
    }
  </style>
</head>
<body>
  <div class="main-container">
    <h1>One Time Link Generator</h1>
    <textarea id="message" placeholder="Enter your message here..."></textarea>
    <button id="generateBtn">Generate Link</button>
    <div class="result" id="result"></div>
  </div>

  <div class="doc-container">
    <h2>API Documentation</h2>

    <section>
      <h1>POST /api/create</h1>
      <p>Generates a one-time-use link from a user-provided message.</p>
      <h3>Request</h3>
      <p><strong>URL:</strong> <pre>https://one-time-link-generator.onrender.com/api/create</pre></p>
      <p><strong>Method:</strong> POST</p>
      <p><strong>Headers:</strong></p>
      <pre>{
  "Content-Type": "application/json"
}</pre>
      <p><strong>Body:</strong></p>
      <pre>{
  "message": "Your message here"
}</pre>
      <h3>Response</h3>
      <p>Returns a JSON object with a generated one-time link:</p>
      <pre>{
  "id": "abc123",
  "url": "https://one-time-link-generator.onrender.com/use/abc123",
  "direct_Url": "https://one-time-link-generator.onrender.com/api/use/abc123"
}</pre>
    </section>

    <section>
      <h2>Notes</h2>
      <ul>
        <li>Each link can be used only once.</li>
        <li>After the first visit, the message is deleted from the server.</li>
        <li>Useful for sharing temporary messages securely.</li>
      </ul>
    </section>
    <footer>
      <p>© 2025 One Time Link Generator</p>
    </footer>
  </div>

  <script>
    document.getElementById('generateBtn').addEventListener('click', () => {
    const message = document.getElementById('message').value.trim();
    const resultDiv = document.getElementById('result');

    if (!message) {
      alert('Please enter a message.');
      return;
    }

    try {
      const response = await fetch('${domain}/${url.pathname.slice(1)}create?message=\${message}');
            
      resultDiv.innerHTML = \`<a href="Hi" target="_blank" rel="noopener noreferrer">Hi</a>\`;
    } catch (error) {
      resultDiv.textContent = 'Error: ' + error.message;
    }
  });
</script>
</body>
</html>`
    
    return new Response(homepage, {
       headers: { "Content-Type": "text/html" }
    });
  }
}
