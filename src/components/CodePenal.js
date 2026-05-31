import React, { useState } from 'react';
import { PENAL_CODE } from '../data/penalCode';

export default function CodePenal() {
  const [open, setOpen] = useState({});

  function toggle(i) {
    setOpen(prev => ({ ...prev, [i]: !prev[i] }));
  }

  return (
    <div className="card">
      <div className="card-title">📖 Code Pénal — Comté de Lemoyne — Anno Domini 1905</div>
      {PENAL_CODE.map((section, si) => (
        <div key={si} className="penal-section" style={{ marginBottom: 8 }}>
          <div className="penal-section-title" onClick={() => toggle(si)}>
            <span>{section.titre}</span>
            <span style={{ transition: 'transform .2s', transform: open[si] ? 'rotate(180deg)' : 'none', fontSize: 12 }}>▼</span>
          </div>
          {open[si] && (
            <div style={{ marginTop: 12 }}>
              {section.articles.map(art => (
                <div key={art.num} className="article">
                  <div className="article-num">{art.num}</div>
                  <div className="article-name">{art.nom}</div>
                  <div className="article-desc">{art.desc}</div>
                  <span className="article-penalty">⚖ {art.peine}</span>
                  {art.sisika && <span className="tag-sisika">🔒 Sisika</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
