/* 
  ============================================================
  PROYECTO: Calculadora con OpenAI + LaTeX (versión segura)
  AUTORA: Hernández Fernández Mary Jose
  CARRERA: Ingeniería en Sistemas Computacionales
  INSTITUCIÓN: Instituto Tecnológico de Pachuca
  FECHA: Noviembre 2025
  DESCRIPCIÓN:
    Este script ahora obtiene la API Key desde MockAPI,
    evitando exponerla directamente en el código.
  ============================================================
*/

/* ============================================
   🔗 CAPTURA DE ELEMENTOS DEL DOM
   ============================================ */
const btnEvaluate = document.getElementById("btnEvaluate");
const btnClear = document.getElementById("btnClear");
const operationInput = document.getElementById("operationInput");
const statusMessage = document.getElementById("statusMessage");
const resultValue = document.getElementById("resultValue");
const resultLatex = document.getElementById("resultLatex");

/* ============================================
   🌍 URL del recurso de MockAPI donde está la API Key
   ============================================ */
const MOCKAPI_URL = "https://690a3d7e1a446bb9cc21e89c.mockapi.io/apiKeyOpenAI";

/* ============================================
   🔑 FUNCIÓN: obtener API Key desde MockAPI
   ============================================ */
async function getApiKeyFromMock() {
  try {
    const res = await fetch(MOCKAPI_URL);

    if (!res.ok) {
      throw new Error(`MockAPI respondió HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log("🔎 Respuesta cruda de MockAPI:", data);

    let key;

    if (Array.isArray(data)) {
      // Caso: GET a /config que regresa [ { ... } ]
      key = data[0]?.apiKey;      // 👈 nombre correcto del campo
    } else {
      // Caso: GET a /config/1 que regresa { ... }
      key = data.apiKey;          // 👈 nombre correcto del campo
    }

    if (!key) {
      throw new Error(
        "No se encontró el campo 'apiKey' en la respuesta de MockAPI. Revisa la estructura."
      );
    }

    console.log("🔐 API Key obtenida desde MockAPI:", key.substring(0, 8) + "...");
    return key;
  } catch (err) {
    console.error("Error al traer la API Key desde MockAPI:", err);
    throw err;
  }
}


/* ============================================
   🧮 EVENTO: Evaluar operación matemática
   ============================================ */
btnEvaluate.addEventListener("click", async () => {
  const operation = operationInput.value.trim();
  if (!operation) {
    statusMessage.textContent = "Escribe una operación primero.";
    statusMessage.classList.remove("text-muted");
    statusMessage.classList.add("text-danger");
    return;
  }

  statusMessage.textContent = "Obteniendo API Key y consultando OpenAI...";
  statusMessage.classList.remove("text-danger");
  statusMessage.classList.add("text-muted");

  resultValue.innerHTML = '<span class="text-muted">Calculando…</span>';
  resultLatex.innerHTML = '<span class="text-muted">Calculando…</span>';

  try {
    // ✅ 1. Obtener la clave desde MockAPI
    const OPENAI_API_KEY = await getApiKeyFromMock();

    // ✅ 2. Llamar a la API de OpenAI con la clave obtenida
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `
          Eres una calculadora matemática.
          Debes evaluar la siguiente operación de manera precisa.

          Reglas IMPORTANTES:
          - Responde ÚNICAMENTE un JSON válido.
          - El JSON debe tener exactamente estos campos:
            {
              "resultado": number,
              "latex": string
            }

          Operación: ${operation}
        `,
        temperature: 0, // sin creatividad, respuesta determinista
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error HTTP:", response.status, errorText);
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();
    let rawText = data.output_text || data.output?.[0]?.content?.[0]?.text;
    if (!rawText) throw new Error("No se encontró el texto de salida en la respuesta.");
    rawText = rawText.trim();

    // 🔧 Quitar posibles ```json ... ``` del texto
    if (rawText.startsWith("```")) {
      const firstNewline = rawText.indexOf("\n");
      if (firstNewline !== -1) rawText = rawText.slice(firstNewline + 1);
      if (rawText.endsWith("```")) rawText = rawText.slice(0, -3);
      rawText = rawText.trim();
    }

    const parsed = JSON.parse(rawText);
    const { resultado, latex } = parsed;

    resultValue.textContent = resultado;
    resultLatex.innerHTML = `$$${latex}$$`;

    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise();
    }

    statusMessage.textContent = "Operación evaluada correctamente ✅";
    statusMessage.classList.remove("text-danger");
    statusMessage.classList.add("text-success");

  } catch (err) {
    console.error(err);
    statusMessage.textContent = "Ocurrió un error al consultar la API.";
    statusMessage.classList.remove("text-success", "text-muted");
    statusMessage.classList.add("text-danger");
    resultValue.innerHTML =
      '<span class="text-muted">Sin resultado por error…</span>';
    resultLatex.innerHTML =
      '<span class="text-muted">Sin resultado por error…</span>';
  }
});

/* ============================================
   🧹 EVENTO: Limpiar campos
   ============================================ */
btnClear.addEventListener("click", () => {
  operationInput.value = "";
  statusMessage.textContent = "";
  resultValue.innerHTML =
    '<span class="text-muted">Sin resultado aún…</span>';
  resultLatex.innerHTML =
    '<span class="text-muted">Sin resultado aún…</span>';
});
