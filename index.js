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
    
    return new Response("404: Not Found", { status: 404 });
  }
}
