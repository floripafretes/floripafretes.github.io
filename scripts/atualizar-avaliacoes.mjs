// Busca nota, total e avaliações do Google Maps pelo SerpApi e grava em avaliacoes.json.
// Roda sozinho 2x por dia pelo GitHub Actions. Precisa do segredo SERPAPI_KEY no repositório.
import { readFileSync, writeFileSync } from "node:fs";

const KEY = process.env.SERPAPI_KEY;
const PLACE_ID = process.env.PLACE_ID || "ChIJaVklUP85J5URQGmIEHzvdA0"; // Floripa Fretes e Mudanças
if (!KEY) { console.error("Falta o segredo SERPAPI_KEY."); process.exit(1); }

const url = "https://serpapi.com/search.json?engine=google_maps_reviews&hl=pt-br&sort_by=newestFirst"
  + "&place_id=" + encodeURIComponent(PLACE_ID) + "&api_key=" + encodeURIComponent(KEY);
const r = await fetch(url);
const d = await r.json();
if (!r.ok || d.error) { console.error("Erro do SerpApi:", d.error || r.status); process.exit(1); }

let atual = {};
try { atual = JSON.parse(readFileSync("avaliacoes.json", "utf8")); } catch {}

const corta = (t) => (t.length > 320 ? t.slice(0, 317).replace(/\s+\S*$/, "") + "…" : t);
const novas = (d.reviews || []).map((x) => ({
  autor: x.user?.name || "Cliente",
  nota: Math.round(x.rating || 0),
  texto: corta(((x.extracted_snippet && x.extracted_snippet.original) || x.snippet || "").trim()),
  data: (x.iso_date || "").slice(0, 10),
})).filter((x) => x.nota >= 4 && x.texto.length > 15);

// Junta com as já salvas (sem repetir) para o carrossel crescer com o tempo; mais recentes primeiro.
const lista = [...novas];
for (const a of atual.avaliacoes || []) if (!lista.some((b) => b.autor === a.autor)) lista.push(a);
lista.sort((a, b) => (b.data || "").localeCompare(a.data || ""));

const info = d.place_info || {};
const saida = {
  atualizado: new Date().toISOString(),
  nota: info.rating ?? atual.nota ?? null,
  total: info.reviews ?? atual.total ?? null,
  avaliacoes: lista.slice(0, 20),
};
writeFileSync("avaliacoes.json", JSON.stringify(saida, null, 2) + "\n");
console.log(`Nota ${saida.nota} · ${saida.total} avaliações · ${saida.avaliacoes.length} no carrossel`);
