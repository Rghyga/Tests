import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("https://sfile.co/TzTyQ0c0Zqn");
  const [out, setOut] = useState("");

  async function run() {
    setOut("loading...");
    const r = await fetch(`/api/resolve?url=${encodeURIComponent(url)}`);
    const j = await r.json();
    setOut(JSON.stringify(j, null, 2));
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h2>Sfile Resolver</h2>
      <input style={{ width: "100%", padding: 10 }} value={url} onChange={(e) => setUrl(e.target.value)} />
      <button style={{ marginTop: 12, padding: 10 }} onClick={run}>Resolve</button>
      <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{out}</pre>
    </div>
  );
}