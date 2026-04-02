export const COLORS = [
  "preto",
  "branco",
  "marrom",
  "cinza",
  "bege",
  "azul",
  "verde",
  "vermelho",
  "rosa",
  "caramelo",
  "cafe",       // sem acento
  "café",       // com acento
  "off white",  // com espaço
  "off-white",  // com traço
  "offwhite",   // junto
  "camel",      // nome estranho
  
  /* outras cores podem ser adicionadas aqui conforme necessário.
  */
];

/**
 * remove acentos e normaliza espaços/pontuação básica.
 */
function stripAccents(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeProductName(name: string): string {
  // lowercase remove acentos (pra "café" == "cafe")
  const base = stripAccents(name.toLowerCase());

  // tenta remover uma cor como palavra/termo isolado (não dentro de outra)
  for (const rawColor of COLORS) {
    const color = stripAccents(rawColor.toLowerCase());

    // regex para encontrar a cor como palavra isolada
    const escaped = color.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");

    if (re.test(base)) {
      return base
        .replace(re, " ")          // remove a cor
        .replace(/\s+/g, " ")      // normaliza espaços
        .trim();
    }
  }

  return base.replace(/\s+/g, " ").trim();
}