import React, { useState, useRef, useEffect } from 'react';

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.15;

export default function Carte() {
  const [zoom, setZoom] = useState(0.5);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const imgRef = useRef(null);

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  }

  function handleMouseMove(e) {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  }

  function handleMouseUp() { setDragging(false); }

  // Touch support
  const lastTouch = useRef(null);
  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragStart.current = { mx: t.clientX, my: t.clientY, px: pos.x, py: pos.y };
    }
  }
  function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && dragStart.current) {
      const t = e.touches[0];
      setPos({ x: dragStart.current.px + t.clientX - dragStart.current.mx, y: dragStart.current.py + t.clientY - dragStart.current.my });
    }
  }

  function zoomIn()  { setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP * 2).toFixed(2))); }
  function zoomOut() { setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP * 2).toFixed(2))); }
  function reset()   { setZoom(0.5); setPos({ x: 0, y: 0 }); }

  const btnStyle = {
    width: 36, height: 36, borderRadius: 3,
    border: '1px solid rgba(201,168,76,.5)',
    background: 'rgba(26,14,4,.85)',
    color: 'var(--gold)', fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Special Elite', cursive",
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>

      {/* Contrôles zoom */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button style={btnStyle} onClick={zoomIn}>+</button>
        <button style={btnStyle} onClick={zoomOut}>−</button>
        <button style={{ ...btnStyle, fontSize: 14 }} onClick={reset}>↺</button>
      </div>

      {/* Indicateur zoom */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 20,
        fontFamily: "'Special Elite', cursive", fontSize: 11,
        color: 'rgba(201,168,76,.8)', background: 'rgba(26,14,4,.65)',
        padding: '3px 10px', borderRadius: 2, border: '1px solid rgba(201,168,76,.25)',
        pointerEvents: 'none',
      }}>
        🗺 {Math.round(zoom * 100)}%  — Molette pour zoomer · Cliquer-glisser pour déplacer
      </div>

      {/* Zone carte */}
      <div
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        style={{
          width: '100%',
          height: 'calc(100vh - 140px)',
          overflow: 'hidden',
          cursor: dragging ? 'grabbing' : 'grab',
          background: '#d4b896',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        <img
          ref={imgRef}
          src={process.env.PUBLIC_URL + '/map.jpg'}
          alt="Carte du comté de Lemoyne"
          draggable={false}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 0.08s ease',
            maxWidth: 'none',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
