/** Namespaced CSS: avoids touching TIDAL's React-owned layout. */
export const css = `
#aa-launch{position:fixed;z-index:2147482900;right:22px;bottom:94px;border:1px solid #4d7276;background:#182c32;color:#effeff;border-radius:30px;box-shadow:0 8px 22px #0008;padding:11px 17px;font:600 13px system-ui,sans-serif;cursor:pointer;transition:background .15s}
#aa-launch:hover,#aa-launch:focus-visible{background:#22505a;outline:2px solid #57cfd7;outline-offset:2px}
#aa-backdrop{position:fixed;inset:0;z-index:2147483000;background:#000a;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;box-sizing:border-box}
#aa-backdrop *,#aa-backdrop *::before,#aa-backdrop *::after{box-sizing:border-box}
#aa-dialog{width:min(1080px,100%);height:min(850px,96vh);border:1px solid #435157;border-radius:16px;display:flex;flex-direction:column;background:#171b20;color:#ecf1f2;box-shadow:0 22px 80px #000a;overflow:hidden;font-size:14px}
#aa-dialog button,#aa-dialog select,#aa-dialog input{font:inherit}
#aa-dialog button{cursor:pointer}
#aa-dialog button:disabled{opacity:.45;cursor:not-allowed}
#aa-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px;border-bottom:1px solid #303941;background:#1c2229}
#aa-head h2{margin:0 0 4px;font-size:22px;line-height:1.25;letter-spacing:-.4px}
#aa-head p{margin:0;color:#9aa8ad;font-size:12px}
#aa-head-actions{display:flex;gap:9px;align-items:center}
#aa-dialog button.aa-primary{border:0;border-radius:7px;color:#091a1e;background:#6ce0dd;padding:9px 13px;font-weight:700}
#aa-dialog button.aa-secondary{border:1px solid #506068;color:#e5eaed;background:#293239;border-radius:7px;padding:8px 12px}
#aa-dialog button.aa-icon{background:none;border:1px solid #4c585e;color:#fff;border-radius:8px;width:34px;height:34px;font-size:22px;line-height:1}
#aa-dialog .aa-stats{padding:14px 22px 7px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
#aa-dialog .aa-stat{background:#232b32;border:1px solid #313a41;border-radius:9px;padding:10px 12px}
#aa-dialog .aa-stat b{display:block;font-size:22px;line-height:1.4;font-variant-numeric:tabular-nums}
#aa-dialog .aa-stat span{display:block;font-size:11px;color:#b9c5c9}
#aa-dialog .aa-status{padding:10px 22px;font-size:12px;color:#adbdc2;min-height:38px}
#aa-dialog .aa-warning{margin:0 22px 10px;background:#372d1d;border:1px solid #7b5933;border-radius:7px;padding:9px 12px;font-size:12px;color:#ffdba2}
#aa-dialog .aa-filters{display:flex;align-items:end;flex-wrap:wrap;gap:9px;padding:13px 22px;background:#20262c;border-block:1px solid #313840}
#aa-dialog .aa-filter{display:flex;flex-direction:column;gap:4px;min-width:104px;flex:1}
#aa-dialog .aa-filter.aa-search{flex:2;min-width:150px}
#aa-dialog .aa-filter label{color:#b3c0c5;font-size:11px}
#aa-dialog .aa-filter input,#aa-dialog .aa-filter select{background:#13191e;color:#eaf1f2;border:1px solid #48555c;padding:8px 9px;height:35px;border-radius:6px;min-width:0;width:100%}
#aa-dialog .aa-checkbox{display:flex;align-items:center;gap:6px;padding-bottom:8px;white-space:nowrap;color:#c3cbce;font-size:12px}
#aa-dialog .aa-tabs{padding:13px 22px 8px;display:flex;gap:6px;flex-wrap:wrap}
#aa-dialog .aa-tab{border:1px solid #49555c;background:transparent;border-radius:20px;padding:7px 12px;color:#d5dcdf;font-size:12px}
#aa-dialog .aa-tab[aria-selected='true']{color:#132525;background:#75ddd7;border-color:#75ddd7;font-weight:700}
#aa-dialog .aa-results{padding:0 22px 18px;overflow:auto;flex:1;min-height:0}
#aa-dialog .aa-count{font-size:12px;color:#b5c2c6;margin:7px 0 12px}
#aa-dialog .aa-card{display:grid;grid-template-columns:58px minmax(0,1fr) 106px;gap:13px;padding:12px;border:1px solid #364149;border-radius:10px;margin-bottom:9px;background:#20272e}
#aa-dialog .aa-art{width:58px;height:58px;background:#34424b;border-radius:6px;object-fit:cover}
#aa-dialog .aa-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#aa-dialog .aa-name a{color:#f0f6f8;font-weight:700;text-decoration:none;overflow-wrap:anywhere}
#aa-dialog .aa-name a:hover{text-decoration:underline;color:#78e2e0}
#aa-dialog .aa-artist{color:#b0bfc4;font-size:12px;margin-top:3px}
#aa-dialog .aa-meter{height:7px;background:#3b484f;border-radius:8px;margin-top:9px;overflow:hidden}
#aa-dialog .aa-meter>span{display:block;height:100%;border-radius:8px;background:#73d9c3}
#aa-dialog .aa-sub{font-size:11px;color:#aab9bd;margin-top:6px}
#aa-dialog .aa-score{text-align:right;font-size:25px;font-weight:750;line-height:1.25;font-variant-numeric:tabular-nums}
#aa-dialog .aa-score small{display:block;font-size:11px;color:#b9c8c9;font-weight:400;margin-top:6px}
#aa-dialog .aa-tag{font-size:10px;background:#334b4b;color:#bdf6ed;border:1px solid #4a7470;border-radius:12px;padding:3px 7px}
#aa-dialog .aa-card-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}
#aa-dialog button.aa-love{font-size:11px;border:1px solid #66a3ab;background:#163840;color:#b7f8f3;padding:6px 10px;border-radius:16px;font-weight:700}
#aa-dialog button.aa-love:hover:not(:disabled){background:#215158;border-color:#87dfda}
#aa-dialog button.aa-love.aa-loved{background:#1e463f;border-color:#4a8f74;color:#b5f7d4;opacity:1;cursor:default}
#aa-dialog .aa-details-toggle{border:0;background:transparent;color:#8ddce0;font-size:11px;padding:6px 0 0;text-decoration:underline}
#aa-dialog .aa-breakdown{grid-column:1/-1;border-top:1px solid #39464d;padding-top:10px;display:flex;flex-direction:column;gap:5px}
#aa-dialog .aa-track{font-size:12px;color:#c7d4d7;padding:5px 8px;background:#192127;border-radius:4px;display:flex;gap:10px}
#aa-dialog .aa-track span{color:#6fdfca;min-width:15px}
#aa-dialog .aa-empty{background:#20282d;border:1px dashed #506269;color:#bdc8cb;text-align:center;border-radius:10px;margin-top:12px;padding:35px 12px}
#aa-dialog .aa-load{display:block;margin:15px auto;background:#29383d;color:#d7f4f4;border:1px solid #4f6d6d;border-radius:7px;padding:10px 20px}
#aa-dialog .aa-footer{padding:10px 22px;font-size:11px;color:#a3afb5;border-top:1px solid #323c42;display:flex;justify-content:space-between;gap:12px}
@media(max-width:700px){#aa-backdrop{padding:4px}#aa-dialog{height:99vh;border-radius:8px}#aa-head{padding:12px}#aa-head h2{font-size:18px}#aa-head p{display:none}#aa-dialog .aa-stats{grid-template-columns:repeat(2,1fr);padding-inline:12px}#aa-dialog .aa-filters{padding-inline:12px}#aa-dialog .aa-results{padding-inline:12px}#aa-dialog .aa-tabs{padding-inline:12px}#aa-dialog .aa-card{grid-template-columns:46px minmax(0,1fr) 68px;gap:8px;padding:9px}#aa-dialog .aa-art{width:46px;height:46px}#aa-dialog .aa-score{font-size:19px}}
`;
