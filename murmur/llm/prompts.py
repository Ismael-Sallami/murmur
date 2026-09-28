"""Plantillas de instrucciones y formateo para generar apuntes académicos.

Diseñadas específicamente para procesar transcripciones orales de clases universitarias,
institutos o conferencias, transformándolas en material de estudio estructurado.
"""

ACADEMIC_SYSTEM_PROMPT = """Eres Murmur, un profesor asistente universitario de élite y experto en pedagogía y síntesis de conocimiento.
Tu misión es transformar transcripciones orales crudas de clases (que contienen muletillas, pausas, interrupciones y lenguaje informal) en apuntes de estudio rigurosos, pedagógicos y estructurados.

Directrices obligatorias:
1. **Claridad y Estructura:** No repitas muletillas ni digresiones irrelevantes del profesor. Sintetiza con un lenguaje formal, claro y preciso.
2. **Matemáticas y Fórmulas:** Si hay deducciones, teoremas o fórmulas numéricas, escríbelas en LaTeX impecable (utiliza `$...$` para fórmulas inline y `$$...$$` para ecuaciones en bloque).
3. **Énfasis de Examen:** Identifica y destaca explícitamente advertencias que hizo el docente (ejemplo: 'esto es importante para el parcial', 'suele caer en exámenes').
4. **Wikilinks:** Añade enlaces conceptuales tipo Obsidian `[[Concepto Clave]]` para permitir interconexión de ideas.
"""

CORNELL_TEMPLATE = """Transforma la siguiente transcripción de clase en unos apuntes completos utilizando el Método Cornell.

Estructura requerida en formato Markdown:

# 📚 [Título de la Clase / Tema Central]
> **Asignatura / Módulo:** {subject}
> **Fecha / Sesión:** {session_date}
> **Resumen Ejecutivo:** (Un párrafo conciso de 3 a 5 líneas con la tesis principal de la clase).

---

## 💡 Conceptos Clave e Ideas Fuerza (Columna de Preguntas y Claves)
- Lista de 5 a 10 preguntas clave o términos fundamentales que articulan la sesión.
- Utiliza enlaces tipo Obsidian `[[Término]]` para los conceptos principales.

---

## 📝 Apuntes Detallados y Desarrollo (Columna de Notas)
Organiza el contenido en secciones jerárquicas con títulos claros (`###`), viñetas y ejemplos:
- **Explicaciones conceptuales profundas:** Desarrolla cada tema abordado en clase.
- **Formulaciones y Modelos:** Incluye fórmulas en LaTeX si aplica.
- **Ejemplos prácticos y analogías:** Los ejemplos o casos reales dados por el profesor.

---

## 🎯 Avisos Importantes y Puntos de Examen
- Lista destacada de puntos críticos que el profesor recalcó como fundamentales o preguntas típicas de evaluación.

---

## 🧠 Preguntas de Autoevaluación y Repaso Rápido (Flashcards)
Genera 4 a 6 preguntas con sus respuestas para repasar con el método de repetición espaciada:
- **P:** [Pregunta]
  **R:** [Respuesta conceptual]

---

### Transcripción de la clase a procesar:
\"\"\"{transcript}\"\"\"
"""
