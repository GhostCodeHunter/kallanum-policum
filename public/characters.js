// Original cartoon characters drawn in SVG (no emoji, no image files).
// Each returns an <svg> string sized 1em, so CSS font-size controls its size.
(() => {
  const SK = ['#f2c9a0', '#e0ac7e', '#c98b5a', '#a8693d', '#8a5430', '#6e3f22'];
  const wrap = (inner, bg) =>
    `<svg class="char" viewBox="0 0 120 120" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${bg || ''}${inner}</svg>`;

  // shared face parts — soft clay look: shading blobs, small dot eyes
  function face({ skin, mood = 'smile', brows = '#2a1a10', blush = true }) {
    const mouth = {
      smile: '<path d="M52 77 Q60 83 68 77" stroke="#7a3a22" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      grin: '<path d="M49 75 Q60 88 71 75 Z" fill="#6d1f16"/><path d="M51 76 L69 76 L68 79 L52 79Z" fill="#fff"/>',
      calm: '<path d="M54 78 Q60 81 66 78" stroke="#7a3a22" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      lips: '<path d="M53 76 Q60 82 67 76 Q60 79 53 76Z" fill="#c0504d"/>',
    }[mood];
    return `
      <ellipse cx="34" cy="62" rx="5.5" ry="7" fill="${skin}"/><ellipse cx="86" cy="62" rx="5.5" ry="7" fill="${skin}"/>
      <ellipse cx="34" cy="62" rx="2.5" ry="3.5" fill="#00000018"/><ellipse cx="86" cy="62" rx="2.5" ry="3.5" fill="#00000018"/>
      <ellipse cx="60" cy="58" rx="26" ry="30" fill="${skin}"/>
      <path d="M36 66 Q40 86 60 88 Q80 86 84 66 Q80 82 60 84 Q40 82 36 66Z" fill="#00000014"/>
      <ellipse cx="54" cy="42" rx="12" ry="7" fill="#ffffff26"/>
      ${blush ? '<ellipse cx="45" cy="70" rx="5" ry="3" fill="#ff8a7a" opacity=".35"/><ellipse cx="75" cy="70" rx="5" ry="3" fill="#ff8a7a" opacity=".35"/>' : ''}
      <ellipse cx="50" cy="60" rx="3" ry="3.6" fill="#1c1208"/><ellipse cx="70" cy="60" rx="3" ry="3.6" fill="#1c1208"/>
      <circle cx="51" cy="58.8" r="1" fill="#fff"/><circle cx="71" cy="58.8" r="1" fill="#fff"/>
      <path d="M45 52 Q50 49.5 55 51" stroke="${brows}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M65 51 Q70 49.5 75 52" stroke="${brows}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="60" cy="68" rx="4.5" ry="3.6" fill="${skin}"/><ellipse cx="60" cy="69.5" rx="4" ry="2" fill="#00000020"/>
      <ellipse cx="59" cy="66.6" rx="1.6" ry="1" fill="#ffffff40"/>
      ${mouth}`;
  }
  const body = (color, extra = '') =>
    `<path d="M18 120 Q20 92 60 90 Q100 92 102 120Z" fill="${color}"/>
     <rect x="52" y="80" width="16" height="13" rx="5" fill="currentColor" opacity="0"/>${extra}`;
  const neck = skin => `<path d="M51 80 L69 80 L68 94 Q60 98 52 94Z" fill="${skin}"/>`;
  const stache = (c = '#24140a', curly = false) => curly
    ? `<path d="M60 69 Q50 64 42 70 Q38 73 40 76 Q44 70 50 73 Q55 75 60 72 Q65 75 70 73 Q76 70 80 76 Q82 73 78 70 Q70 64 60 69Z" fill="${c}"/>`
    : `<path d="M60 69 Q52 66 46 71 Q52 74 60 72 Q68 74 74 71 Q68 66 60 69Z" fill="${c}"/>`;

  const ROLE = {
    raja() {
      const skin = SK[2];
      return wrap(`
        ${body('#b3191f', `<path d="M30 104 Q60 118 90 104 L94 120 L26 120Z" fill="#8a0f14"/>
          <path d="M34 98 Q60 112 86 98 L88 106 Q60 120 32 106Z" fill="#fff"/>
          <g fill="#222"><circle cx="42" cy="104" r="1.5"/><circle cx="54" cy="108" r="1.5"/><circle cx="66" cy="108" r="1.5"/><circle cx="78" cy="104" r="1.5"/></g>
          <circle cx="60" cy="112" r="4" fill="#f4b62a" stroke="#8a5a06" stroke-width="1.5"/>`)}
        ${neck(skin)}
        <path d="M34 50 Q36 26 60 26 Q84 26 86 50 Q80 38 60 38 Q40 38 34 50Z" fill="#1f130a"/>
        ${face({ skin })}
        ${stache('#1f130a', true)}
        <path d="M36 34 L38 12 L48 24 L60 6 L72 24 L82 12 L84 34 Q60 28 36 34Z" fill="#f4b62a" stroke="#9a6206" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="35" y="30" width="50" height="8" rx="3" fill="#ffd45e" stroke="#9a6206" stroke-width="2"/>
        <circle cx="60" cy="20" r="3.5" fill="#d8342b"/><circle cx="46" cy="27" r="2.6" fill="#1f8a3c"/><circle cx="74" cy="27" r="2.6" fill="#2563d6"/>
        <circle cx="60" cy="6" r="3" fill="#ffd45e" stroke="#9a6206" stroke-width="1.5"/>`);
    },
    rani() {
      const skin = SK[1];
      return wrap(`
        <path d="M28 58 Q24 96 34 108 L44 92 Q36 80 38 58Z" fill="#1a0f08"/>
        <path d="M92 58 Q96 96 86 108 L76 92 Q84 80 82 58Z" fill="#1a0f08"/>
        ${body('#c2185b', `<path d="M60 92 L86 98 L96 120 L74 120Z" fill="#7b1fa2"/>
          <path d="M60 92 L86 98 L88 102 L62 96Z" fill="#f4b62a"/>
          <path d="M40 100 Q60 108 80 100" stroke="#f4b62a" stroke-width="4" fill="none"/>
          <circle cx="60" cy="106" r="3.5" fill="#f4b62a"/>`)}
        ${neck(skin)}
        <path d="M33 56 Q30 26 60 24 Q90 26 87 56 Q82 38 66 36 Q60 44 50 38 Q38 42 33 56Z" fill="#1a0f08"/>
        ${face({ skin, mood: 'lips', brows: '#1a0f08' })}
        <circle cx="60" cy="47" r="2.4" fill="#d8342b"/>
        <path d="M30 66 l0 8" stroke="#f4b62a" stroke-width="2"/><circle cx="30" cy="77" r="3.5" fill="#f4b62a"/>
        <path d="M90 66 l0 8" stroke="#f4b62a" stroke-width="2"/><circle cx="90" cy="77" r="3.5" fill="#f4b62a"/>
        <path d="M42 30 L48 18 L54 26 L60 14 L66 26 L72 18 L78 30 Q60 24 42 30Z" fill="#ffd45e" stroke="#9a6206" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="60" cy="22" r="2.6" fill="#e91e63"/>
        <g fill="#fff"><circle cx="84" cy="36" r="2.2"/><circle cx="88" cy="40" r="2.2"/><circle cx="86" cy="45" r="2.2"/></g>`);
    },
    manthri() {
      const skin = SK[2];
      return wrap(`
        ${body('#fbf2dc', `<path d="M24 112 Q40 92 60 96 L44 120 L22 120Z" fill="#f4b62a"/>
          <path d="M26 108 Q42 92 58 95" stroke="#c98a10" stroke-width="2" fill="none"/>
          <path d="M60 92 L60 120" stroke="#e0d2ae" stroke-width="2"/>
          <circle cx="64" cy="102" r="1.8" fill="#c9b98a"/><circle cx="64" cy="110" r="1.8" fill="#c9b98a"/>`)}
        ${neck(skin)}
        <path d="M34 48 Q34 40 38 38 L40 56 Q34 56 34 48Z" fill="#9e9e9e"/>
        <path d="M86 48 Q86 40 82 38 L80 56 Q86 56 86 48Z" fill="#9e9e9e"/>
        ${face({ skin, mood: 'calm', brows: '#8d8d8d' })}
        <path d="M54 44 L66 44" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M55 41 L65 41" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
        <circle cx="60" cy="47" r="1.8" fill="#d8342b"/>
        <circle cx="50" cy="59" r="8" fill="#ffffff22" stroke="#6b3d06" stroke-width="2.4"/>
        <circle cx="70" cy="59" r="8" fill="#ffffff22" stroke="#6b3d06" stroke-width="2.4"/>
        <path d="M58 59 L62 59" stroke="#6b3d06" stroke-width="2.4"/>
        ${stache('#9e9e9e')}
        <path d="M36 40 Q38 28 60 27 Q82 28 84 40 Q76 34 60 34 Q44 34 36 40Z" fill="${skin}"/>`);
    },
    police() {
      const skin = SK[3];
      return wrap(`
        ${body('#c8a96a', `<path d="M60 90 L50 120 M60 90 L70 120" stroke="#a88a4c" stroke-width="2"/>
          <path d="M40 96 L50 92 L58 104Z M80 96 L70 92 L62 104Z" fill="#b8975a"/>
          <rect x="24" y="100" width="20" height="5" rx="2" fill="#7b5a2a"/><rect x="76" y="100" width="20" height="5" rx="2" fill="#7b5a2a"/>
          <path d="M74 108 l6 -3 l6 3 l-1 7 l-5 3 l-5 -3Z" fill="#f4b62a" stroke="#8a5a06" stroke-width="1.2"/>
          <rect x="34" y="110" width="14" height="4" rx="1" fill="#2a3e8f"/>`)}
        ${neck(skin)}
        ${face({ skin, mood: 'calm', brows: '#1a0f08' })}
        <path d="M40 54 L58 54 L56 64 Q48 68 42 63Z" fill="#1c2233"/><path d="M62 54 L80 54 L78 63 Q72 68 64 64Z" fill="#1c2233"/>
        <path d="M58 56 L62 56" stroke="#1c2233" stroke-width="3"/>
        <path d="M44 56 L50 56" stroke="#ffffff88" stroke-width="2" stroke-linecap="round"/><path d="M66 56 L72 56" stroke="#ffffff88" stroke-width="2" stroke-linecap="round"/>
        ${stache('#1a0f08', true)}
        <path d="M30 40 Q32 18 60 16 Q88 18 90 40Z" fill="#1d2a6b"/>
        <path d="M30 40 L90 40 L92 46 L28 46Z" fill="#141c4a"/>
        <path d="M30 46 Q60 56 90 46 L86 50 Q60 60 34 50Z" fill="#0b0f26"/>
        <rect x="30" y="38" width="60" height="4" fill="#f4b62a"/>
        <path d="M60 22 l6 4 l-2 8 l-4 2 l-4 -2 l-2 -8Z" fill="#f4b62a" stroke="#8a5a06" stroke-width="1.4"/>`);
    },
    kallan() {
      const skin = SK[4];
      return wrap(`
        ${body('#fafafa', `<g fill="#222"><path d="M22 106 L98 106 L100 113 L20 113Z"/><path d="M28 96 L92 96 L95 101 L25 101Z"/></g>
          <path d="M84 96 Q104 90 104 112 Q104 120 94 120 L80 120Z" fill="#8d6e43"/>
          <path d="M86 96 Q92 92 98 96" stroke="#5d4527" stroke-width="2" fill="none"/>`)}
        ${neck(skin)}
        ${face({ skin, mood: 'grin', brows: '#111' })}
        <path d="M36 54 Q60 46 84 54 L84 64 Q72 68 60 62 Q48 68 36 64Z" fill="#111"/>
        <ellipse cx="50" cy="58" rx="5" ry="4" fill="#fff"/><ellipse cx="70" cy="58" rx="5" ry="4" fill="#fff"/>
        <circle cx="52" cy="58" r="2.4" fill="#111"/><circle cx="72" cy="58" r="2.4" fill="#111"/>
        <path d="M84 56 Q94 52 96 60" stroke="#111" stroke-width="3" fill="none"/>
        <g fill="#00000033"><circle cx="48" cy="80" r="1"/><circle cx="54" cy="83" r="1"/><circle cx="66" cy="83" r="1"/><circle cx="72" cy="80" r="1"/><circle cx="60" cy="84" r="1"/></g>
        <path d="M32 44 Q32 18 60 18 Q88 18 88 44 Q60 38 32 44Z" fill="#222"/>
        <path d="M31 44 Q60 37 89 44 L89 50 Q60 43 31 50Z" fill="#3a3a3a"/>
        <circle cx="60" cy="16" r="5" fill="#3a3a3a"/>`);
    },
  };

  // 24 player avatars in the style of the user's reference sheet
  const P = (skin, hair, hc, shirt, x = {}) => ({ skin, hair, hc, shirt, ...x });
  const AV = [
    P(1,'bob','#4a2c1a','#f2a93b',{lips:1,stripe:'#c58ad8'}), P(1,'short','#4a2c1a','#7ab4e0'), P(1,'long','#c0562a','#e8a63a',{lips:1}), P(2,'bald','#6b4a32','#6f8f3f',{collar:1}),
    P(2,'quiff','#4a2c1a','#4f7ea8',{stripes:'#c8b37a'}), P(5,'short','#151010','#e8742a'), P(2,'long','#5a3418','#c4521e',{beard:1,collar:1}), P(1,'bangs','#111','#2f6fb5',{lips:1}),
    P(2,'side','#3b2414','#f5f5f5',{tie:'#3a6ea5'}), P(2,'long','#2b1a0c','#4f7ea8',{lips:1,glasses:'#7a3a22'}), P(1,'curly','#b8562a','#f5f0e0',{glasses:'#c0562a',stripes:'#3a6ea5'}), P(4,'cap','#151010','#d8342b',{beard:1,chain:1}),
    P(2,'hat','#3b2414','#41552f',{stache:1,tie:'#c8b37a'}), P(3,'long','#2b1a0c','#d8642a',{lips:1,glasses:'#222'}), P(1,'bun','#c0562a','#d86fb0',{lips:1}), P(2,'afro','#111','#f7d2dc',{hood:1}),
    P(2,'quiff','#4a2c1a','#d88a3a',{check:'#a04a1a',collar:1}), P(2,'spiky','#3b2414','#f3c64a',{check:'#d9a520',collar:1}), P(2,'curlyshort','#151010','#e9b03a'), P(2,'short','#151010','#3f6ea0',{collar:1}),
    P(1,'short','#2b1a0c','#d8342b',{glasses:'#111'}), P(5,'afro','#151010','#e08a7a',{lips:1,earring:1}), P(1,'quiff','#7a4a1f','#1f5f6b',{collar:1}), P(0,'mohawk','#d8342b','#222',{jacket:1}),
  ];
  function hairShape(kind, c) {
    switch (kind) {
      case 'short': return `<path d="M34 52 Q30 24 60 24 Q90 24 86 52 Q84 36 72 34 Q60 40 46 34 Q36 38 34 52Z" fill="${c}"/>`;
      case 'quiff': return `<path d="M34 52 Q30 26 54 22 Q66 12 80 22 Q90 30 86 52 Q84 36 70 36 Q56 30 44 38 Q36 42 34 52Z" fill="${c}"/>`;
      case 'spiky': return `<path d="M33 52 L31 34 L41 36 L42 22 L51 30 L57 17 L63 28 L73 19 L74 32 L86 27 L84 40 L89 41 L87 52 Q80 38 60 38 Q40 38 33 52Z" fill="${c}"/>`;
      case 'side': return `<path d="M34 52 Q30 24 62 24 Q90 26 86 50 Q72 30 42 42 Q37 46 34 52Z" fill="${c}"/>`;
      case 'bob': return `<path d="M28 74 Q24 26 60 24 Q96 26 92 74 L82 74 Q86 46 74 36 Q60 44 46 36 Q34 46 38 74Z" fill="${c}"/>`;
      case 'long': return `<path d="M28 104 Q22 26 60 22 Q98 26 92 104 L80 100 Q86 52 74 36 Q60 44 46 36 Q34 52 40 100Z" fill="${c}"/>`;
      case 'bangs': return `<path d="M28 104 Q22 24 60 22 Q98 24 92 104 L82 100 Q86 60 84 52 L36 52 Q34 60 38 100Z" fill="${c}"/>`;
      case 'bun': return `<circle cx="60" cy="18" r="11" fill="${c}"/><path d="M30 76 Q26 26 60 26 Q94 26 90 76 L84 74 Q86 44 74 36 Q60 42 46 36 Q34 44 36 74Z" fill="${c}"/>`;
      case 'curly': return `<g fill="${c}">${[[38,40],[46,30],[56,25],[66,25],[76,30],[83,40],[36,50],[85,50]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="8.5"/>`).join('')}</g>`;
      case 'curlyshort': return `<g fill="${c}">${[[40,38],[48,30],[58,27],[68,28],[77,32],[83,42],[36,46]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('')}</g>`;
      case 'afro': return `<g fill="${c}">${Array.from({length:14},(_,i)=>{const a=Math.PI*(1.05+i/13*.9);return `<circle cx="${(60+Math.cos(a)*30).toFixed(1)}" cy="${(48+Math.sin(a)*26).toFixed(1)}" r="9"/>`;}).join('')}<ellipse cx="60" cy="34" rx="26" ry="12"/></g>`;
      case 'bald': return `<path d="M35 52 Q34 42 38 40 L40 58 Q35 58 35 52Z M85 52 Q86 42 82 40 L80 58 Q85 58 85 52Z" fill="${c}"/>`;
      case 'cap': return `<path d="M32 46 Q32 20 60 20 Q88 20 88 46Z" fill="#ef8a2a"/><path d="M32 44 Q60 38 92 46 L96 50 Q60 42 30 48Z" fill="#c96a16"/><circle cx="60" cy="20" r="3" fill="#c96a16"/>`;
      case 'hat': return `<path d="M38 36 Q40 14 60 14 Q80 14 82 36Z" fill="#3e4f2a"/><rect x="38" y="30" width="44" height="5" fill="#2a3a1c"/><ellipse cx="60" cy="37" rx="34" ry="6" fill="#4a5f32"/>`;
      case 'mohawk': return `<path d="M54 30 L60 6 L66 30Z" fill="${c}"/><path d="M36 44 Q38 32 46 30 M84 44 Q82 32 74 30" stroke="#00000030" stroke-width="3" fill="none"/>`;
    }
    return '';
  }
  function avatar(i) {
    const a = AV[i % AV.length], skin = SK[a.skin], hc = a.hc;
    const bg = `<circle cx="60" cy="60" r="60" fill="#fbe6da"/>`;
    const back = (a.hair === 'long' || a.hair === 'bangs' || a.hair === 'bob' || a.hair === 'bun') ? hairShape(a.hair, hc) : '';
    const front = { long: `<path d="M34 54 Q34 30 60 28 Q86 30 86 54 Q78 36 60 38 Q42 36 34 54Z" fill="${hc}"/>`,
      bangs: `<path d="M34 52 Q34 26 60 26 Q86 26 86 52Z" fill="${hc}"/>`,
      bob: `<path d="M34 52 Q34 28 60 27 Q86 28 86 52 Q76 36 58 40 Q44 40 34 52Z" fill="${hc}"/>`,
      bun: `<path d="M34 52 Q34 30 60 29 Q86 30 86 52 Q78 36 60 37 Q42 36 34 52Z" fill="${hc}"/>` }[a.hair] || hairShape(a.hair, hc);
    let shirt = `<path d="M16 120 Q18 92 60 90 Q102 92 104 120Z" fill="${a.shirt}"/>
      <path d="M16 120 Q18 92 60 90 Q30 96 26 120Z" fill="#ffffff22"/><path d="M104 120 Q102 92 60 90 Q90 96 94 120Z" fill="#00000018"/>`;
    if (a.stripe) shirt += `<rect x="20" y="104" width="80" height="8" fill="${a.stripe}"/>`;
    if (a.stripes) shirt += `<g fill="${a.stripes}">${[98,106,114].map(y => `<rect x="18" y="${y}" width="84" height="3.5"/>`).join('')}</g>`;
    if (a.check) shirt += `<g stroke="${a.check}" stroke-width="2.5" opacity=".7">${[30,44,58,72,86].map(x => `<path d="M${x} 94 L${x} 120"/>`).join('')}<path d="M18 104 L102 104 M18 114 L102 114"/></g>`;
    if (a.collar) shirt += `<path d="M48 90 L60 102 L72 90 L68 88 L60 96 L52 88Z" fill="#ffffffcc"/>`;
    if (a.tie) shirt += `<path d="M50 90 L60 100 L70 90" fill="none" stroke="#ddd" stroke-width="3"/><path d="M57 98 L63 98 L65 120 L55 120Z" fill="${a.tie}"/>`;
    if (a.hood) shirt += `<path d="M38 92 Q60 108 82 92" stroke="#fff" stroke-width="6" fill="none"/><path d="M52 100 L52 112 M68 100 L68 112" stroke="#fff" stroke-width="2"/><rect x="18" y="112" width="84" height="8" fill="#e46a8a"/>`;
    if (a.chain) shirt += `<path d="M44 92 Q60 108 76 92" stroke="#e8c04a" stroke-width="4" fill="none" stroke-dasharray="3 1.5"/>`;
    if (a.jacket) shirt += `<path d="M16 120 Q18 92 50 90 L56 120Z M104 120 Q102 92 70 90 L64 120Z" fill="#1a1a1a"/><circle cx="80" cy="106" r="3.5" fill="#d8342b"/>`;
    return wrap(`
      ${back}
      ${shirt}
      ${neck(skin)}
      ${face({ skin, mood: a.lips ? 'lips' : (a.beard ? 'calm' : 'smile'), brows: hc === '#d8342b' ? '#5a3418' : hc })}
      ${a.beard ? `<path d="M36 64 Q38 90 60 92 Q82 90 84 64 Q80 80 70 80 Q60 76 50 80 Q40 80 36 64Z" fill="${hc}"/><path d="M53 76 Q60 81 67 76" stroke="#7a3a22" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : ''}
      ${a.stache ? stache(hc, true) : ''}
      ${a.glasses ? `<circle cx="50" cy="60" r="7.5" fill="#ffffff22" stroke="${a.glasses}" stroke-width="2.6"/><circle cx="70" cy="60" r="7.5" fill="#ffffff22" stroke="${a.glasses}" stroke-width="2.6"/><path d="M57.5 60 L62.5 60" stroke="${a.glasses}" stroke-width="2.6"/>` : ''}
      ${a.earring ? '<circle cx="33" cy="72" r="2.4" fill="#e8c04a"/><circle cx="87" cy="72" r="2.4" fill="#e8c04a"/>' : ''}
      ${front}`, bg);
  }

  const TROPHY = wrap(`
    <path d="M34 22 Q14 22 16 40 Q18 56 40 58" stroke="#e8a317" stroke-width="7" fill="none"/>
    <path d="M86 22 Q106 22 104 40 Q102 56 80 58" stroke="#e8a317" stroke-width="7" fill="none"/>
    <path d="M32 14 L88 14 Q90 60 60 72 Q30 60 32 14Z" fill="#f4b62a" stroke="#9a6206" stroke-width="3"/>
    <path d="M42 20 Q44 50 58 62" stroke="#fff3b0" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M60 30 l5 10 l11 1 l-8 7 l3 11 l-11 -6 l-11 6 l3 -11 l-8 -7 l11 -1Z" fill="#fff6c8"/>
    <rect x="53" y="70" width="14" height="16" fill="#d99413"/>
    <path d="M38 86 L82 86 L86 102 L34 102Z" fill="#7b4416" stroke="#3d1f08" stroke-width="3"/>
    <rect x="46" y="91" width="28" height="6" rx="2" fill="#f4b62a"/>`);

  window.CHARS = { role: k => ROLE[k](), avatar, count: AV.length, trophy: TROPHY };
})();
