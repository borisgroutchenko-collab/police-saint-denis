import React, { useState, useRef, useEffect } from 'react';

/**
 * Liste déroulante avec recherche intégrée.
 * Props :
 *   value       - valeur sélectionnée
 *   onChange    - callback(newValue)
 *   options     - [{ value, label }]
 *   placeholder - texte quand rien n'est sélectionné
 *   style       - style supplémentaire sur le conteneur
 */
export default function SearchableSelect({ value, onChange, options = [], placeholder = '— Sélectionner —', style }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Fermer si clic extérieur
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find(o => o.value === value);

  function select(val) {
    onChange(val);
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* Bouton principal */}
      <div
        onClick={() => setOpen(o => !o)}
        className="field-select"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none', padding: '8px 12px',
          minHeight: 38,
        }}
      >
        <span style={{ color: selected ? 'var(--paper)' : 'rgba(244,237,216,.35)', fontSize: 13 }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(201,168,76,.6)', marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: '#2a1f0f', border: '1px solid rgba(201,168,76,.4)',
          borderTop: 'none', borderRadius: '0 0 3px 3px',
          maxHeight: 240, display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 20px rgba(0,0,0,.6)',
        }}>
          {/* Champ de recherche */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(201,168,76,.2)', flexShrink: 0 }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', background: 'rgba(0,0,0,.3)',
                border: '1px solid rgba(201,168,76,.3)', borderRadius: 2,
                padding: '5px 8px', fontSize: 12,
                color: 'var(--paper)', fontFamily: "'Special Elite', cursive",
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Options filtrées */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Option vide */}
            <div
              onClick={() => select('')}
              style={{
                padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                color: 'rgba(244,237,216,.35)', fontStyle: 'italic',
                borderBottom: '1px solid rgba(201,168,76,.1)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{placeholder}</div>

            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(244,237,216,.3)', fontStyle: 'italic' }}>
                Aucun résultat
              </div>
            )}

            {filtered.map(o => (
              <div
                key={o.value}
                onClick={() => select(o.value)}
                style={{
                  padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                  color: o.value === value ? 'var(--gold)' : 'var(--paper)',
                  background: o.value === value ? 'rgba(201,168,76,.1)' : 'transparent',
                  borderBottom: '1px solid rgba(201,168,76,.05)',
                  fontFamily: "'IM Fell English', serif",
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,.15)'}
                onMouseLeave={e => e.currentTarget.style.background = o.value === value ? 'rgba(201,168,76,.1)' : 'transparent'}
              >{o.label}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
