import * as XLSX from 'xlsx';

export function generateExcel(session) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: All theses with scores ──────────────────────────────────────
  const thesisRows = [['Квадрант', 'Тезис', 'Автор', 'Влияние на доходность (avg)', 'Влияние на конк. преимущества (avg)', 'Итого', 'В ТОП']];
  const quadrantNames = { S: 'Сильные стороны', W: 'Слабые стороны', O: 'Возможности', T: 'Угрозы' };

  for (const [q, theses] of Object.entries(session.theses)) {
    for (const t of theses) {
      const s = session.scores[t.id] || {};
      const vals = Object.values(s);
      const avg1 = vals.length ? (vals.reduce((a, v) => a + v.dim1, 0) / vals.length).toFixed(1) : '-';
      const avg2 = vals.length ? (vals.reduce((a, v) => a + v.dim2, 0) / vals.length).toFixed(1) : '-';
      const total = vals.length ? ((parseFloat(avg1) + parseFloat(avg2)) / 2).toFixed(2) : '-';
      const inTop = session.topTheses[q]?.some(tt => tt.id === t.id) ? 'Да' : '';
      thesisRows.push([quadrantNames[q], t.text, t.authorInitials, avg1, avg2, total, inTop]);
    }
  }

  const ws1 = XLSX.utils.aoa_to_sheet(thesisRows);
  ws1['!cols'] = [{ wch: 18 }, { wch: 60 }, { wch: 8 }, { wch: 28 }, { wch: 34 }, { wch: 10 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Тезисы');

  // ── Sheet 2: Matrix with intersection weights ─────────────────────────────
  const matrixPairs = [
    { key: 'SO', rowQ: 'S', colQ: 'O', label: 'SO: Сильные × Возможности' },
    { key: 'ST', rowQ: 'S', colQ: 'T', label: 'ST: Сильные × Угрозы' },
    { key: 'WO', rowQ: 'W', colQ: 'O', label: 'WO: Слабые × Возможности' },
    { key: 'WT', rowQ: 'W', colQ: 'T', label: 'WT: Слабые × Угрозы' },
  ];

  const matrixRows = [];
  for (const { key, rowQ, colQ, label } of matrixPairs) {
    const rows = session.topTheses[rowQ] || [];
    const cols = session.topTheses[colQ] || [];
    const mat = session.matrix[key] || [];

    matrixRows.push([label]);
    matrixRows.push(['', ...cols.map(t => t.text)]);
    rows.forEach((r, i) => {
      const row = [r.text];
      cols.forEach((c, j) => {
        const hasX = mat[i]?.[j];
        if (hasX) {
          const rScore = avgScore(session.scores, r.id);
          const cScore = avgScore(session.scores, c.id);
          row.push((rScore * cScore).toFixed(2));
        } else {
          row.push('');
        }
      });
      matrixRows.push(row);
    });
    matrixRows.push([]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(matrixRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Матрица');

  // ── Sheet 3: Action plan ─────────────────────────────────────────────────
  const planRows = [['Приоритет (вес)', 'Блок', 'Сильная/Слабая сторона', 'Возможность/Угроза', 'Действие', 'Голоса']];
  const planItems = buildPlanItems(session);
  planItems.forEach(item => {
    planRows.push([item.weight, item.block, item.rowText, item.colText, item.action, item.votes]);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(planRows);
  ws3['!cols'] = [{ wch: 14 }, { wch: 6 }, { wch: 50 }, { wch: 50 }, { wch: 70 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'План действий');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function avgScore(scores, thesisId) {
  const s = scores[thesisId] || {};
  const vals = Object.values(s);
  if (!vals.length) return 0;
  const avg1 = vals.reduce((a, v) => a + v.dim1, 0) / vals.length;
  const avg2 = vals.reduce((a, v) => a + v.dim2, 0) / vals.length;
  return (avg1 + avg2) / 2;
}

function buildPlanItems(session) {
  const items = [];
  const matrixPairs = [
    { key: 'SO', rowQ: 'S', colQ: 'O', block: 'SO' },
    { key: 'ST', rowQ: 'S', colQ: 'T', block: 'ST' },
    { key: 'WO', rowQ: 'W', colQ: 'O', block: 'WO' },
    { key: 'WT', rowQ: 'W', colQ: 'T', block: 'WT' },
  ];

  for (const { key, rowQ, colQ, block } of matrixPairs) {
    const rows = session.topTheses[rowQ] || [];
    const cols = session.topTheses[colQ] || [];
    const mat = session.matrix[key] || [];

    rows.forEach((r, i) => {
      cols.forEach((c, j) => {
        if (!mat[i]?.[j]) return;
        const weight = (avgScore(session.scores, r.id) * avgScore(session.scores, c.id)).toFixed(2);
        const actionKey = `${key}_${r.id}_${c.id}`;
        const acts = session.actions[actionKey] || [];
        // top voted actions
        const sorted = [...acts].sort((a, b) => b.votes.length - a.votes.length);
        sorted.forEach(act => {
          items.push({ weight: parseFloat(weight), block, rowText: r.text, colText: c.text, action: act.text, votes: act.votes.length });
        });
      });
    });
  }

  return items.sort((a, b) => b.weight - a.weight);
}
