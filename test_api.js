const url = "http://localhost:3000/api/analyze";
fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://www.youtube.com/watch?v=zBjJUV-lzHo" })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
