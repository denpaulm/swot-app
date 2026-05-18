import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Strip markdown code blocks before parsing JSON
function parseJson(text) {
  const clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

// Check thesis formulation and suggest improvements
export async function validateThesis(text, quadrant) {
  const quadrantNames = {
    S: 'Сильная сторона (Strengths) — внутренний позитивный фактор',
    W: 'Слабая сторона (Weaknesses) — внутренний негативный фактор',
    O: 'Возможность (Opportunities) — внешний позитивный фактор',
    T: 'Угроза (Threats) — внешний негативный фактор'
  };

  const prompt = `Ты эксперт по стратегическому анализу. Оцени тезис для SWOT-анализа.

Квадрант: ${quadrantNames[quadrant]}
Тезис: "${text}"

Отклоняй тезис (valid: false) если:
- Слишком абстрактный или расплывчатый ("хорошие сотрудники", "развиваемся")
- Это желание или план, а не факт ("хотим расширить", "планируем внедрить")
- Явно не относится к указанному квадранту
- Бессмысленный или тестовый текст ("аааа", "тест", "123", случайный набор слов)
- Слишком короткий (менее 4 слов) без конкретики

Ответь ТОЛЬКО валидным JSON без markdown:
{"valid": true, "issue": null, "suggestion": null}
или
{"valid": false, "issue": "конкретная причина проблемы", "suggestion": "улучшенная конкретная формулировка"}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    return parseJson(response.content[0].text);
  } catch (e) {
    console.error('AI validate parse error:', e.message, '| raw:', response.content[0].text.slice(0, 200));
    return { valid: true, issue: null, suggestion: null };
  }
}

// Find duplicate/similar theses and suggest merges
export async function findDuplicates(theses) {
  if (theses.length < 2) return [];

  const byQuadrant = { S: [], W: [], O: [], T: [] };
  theses.forEach(t => byQuadrant[t.quadrant].push(t));

  const allProposals = [];

  for (const [quadrant, items] of Object.entries(byQuadrant)) {
    if (items.length < 2) continue;

    const list = items.map((t, i) => `${i + 1}. ID=${t.id} :: ${t.text}`).join('\n');

    const prompt = `Ты эксперт по стратегическому анализу. Найди похожие и дублирующие тезисы в списке.

Квадрант: ${quadrant}
Тезисы:
${list}

Считай тезисы похожими если они:
- Описывают один и тот же факт разными словами
- Перекрываются по смыслу более чем на 50%
- Являются частными случаями одного и того же явления

Для каждой группы похожих тезисов (минимум 2 штуки) предложи одну объединённую формулировку.
Используй точные ID из списка (значения после ID=).

Ответь ТОЛЬКО валидным JSON без markdown:
[{"ids": ["id1", "id2"], "proposedText": "объединённая формулировка"}]

Если похожих тезисов нет совсем — ответь: []`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const proposals = parseJson(response.content[0].text);
      if (Array.isArray(proposals)) allProposals.push(...proposals);
    } catch (e) {
      console.error('AI duplicates parse error:', e.message, '| raw:', response.content[0].text.slice(0, 300));
    }
  }

  return allProposals;
}

// Pre-fill matrix intersections (which S/W intersects with O/T)
export async function prefillMatrix(topTheses) {
  const { S, W, O, T } = topTheses;
  const result = { SO: [], ST: [], WO: [], WT: [] };

  const pairs = [
    { key: 'SO', rows: S, cols: O, rowLabel: 'Сильная сторона', colLabel: 'Возможность' },
    { key: 'ST', rows: S, cols: T, rowLabel: 'Сильная сторона', colLabel: 'Угроза' },
    { key: 'WO', rows: W, cols: O, rowLabel: 'Слабая сторона', colLabel: 'Возможность' },
    { key: 'WT', rows: W, cols: T, rowLabel: 'Слабая сторона', colLabel: 'Угроза' },
  ];

  for (const { key, rows, cols, rowLabel, colLabel } of pairs) {
    if (!rows.length || !cols.length) {
      result[key] = rows.map(() => cols.map(() => false));
      continue;
    }

    const rowList = rows.map((t, i) => `${i + 1}. ${t.text}`).join('\n');
    const colList = cols.map((t, i) => `${i + 1}. ${t.text}`).join('\n');

    const prompt = `Ты эксперт по стратегическому анализу. Определи стратегические взаимодействия между элементами.

${rowLabel}ы (строки 0..${rows.length - 1}):
${rowList}

${colLabel}и (столбцы 0..${cols.length - 1}):
${colList}

Для каждой пары (строка i, столбец j) поставь true если между ними есть значимое стратегическое взаимодействие.
Будь щедрым на true — лучше лишнее пересечение, чем пропустить важное.

Ответь ТОЛЬКО валидным JSON без markdown:
{"matrix": [[true,false,...], [false,true,...], ...]}

Матрица должна иметь ровно ${rows.length} строк и ${cols.length} столбцов.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const parsed = parseJson(response.content[0].text);
      result[key] = parsed.matrix;
    } catch (e) {
      console.error('AI matrix parse error:', e.message, '| raw:', response.content[0].text.slice(0, 300));
      result[key] = rows.map(() => cols.map(() => false));
    }
  }

  return result;
}
