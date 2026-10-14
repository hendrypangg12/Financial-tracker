def pod(i, body='capsule', c1='#2dd4bf', c2='#818cf8', core='#5eead4', eyes='round', mouth='smile', cheeks=True,
        antenna='ball', ears=False, halo=False, hand='wave', extra=''):
    g=f'p{i}'
    defs=f'''<defs>
 <linearGradient id="{g}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".78"/><stop offset=".55" stop-color="{c2}" stop-opacity=".16"/><stop offset="1" stop-color="{c1}" stop-opacity=".30"/></linearGradient>
 <radialGradient id="{g}c" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="{core}"/><stop offset="1" stop-color="{core}" stop-opacity="0"/></radialGradient>
 <linearGradient id="{g}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2a48"/><stop offset="1" stop-color="#0a1020"/></linearGradient>
 <linearGradient id="{g}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>
</defs>'''
    s=[defs, f'<ellipse cx="150" cy="316" rx="58" ry="9" fill="{c1}" opacity=".28"/>']
    # body
    if body=='capsule':
        top,bot,bx,bw = 58,288,88,124
        shape=f'<rect x="{bx}" y="{top}" width="{bw}" height="{bot-top}" rx="62"'
        vis=(104,86,92,66); corey=216
    elif body=='egg':
        top,bot=60,292
        shape='<path d="M150 60 C210 60 222 150 222 200 C222 262 190 292 150 292 C110 292 78 262 78 200 C78 150 90 60 150 60Z"'
        vis=(102,96,96,66); corey=222
    else: # chubby
        top,bot=74,290
        shape='<rect x="70" y="74" width="160" height="216" rx="80"'
        vis=(96,98,108,70); corey=226
    if halo:
        s.append(f'<ellipse cx="150" cy="{top-14}" rx="44" ry="10" fill="none" stroke="url(#{g}a)" stroke-width="5"/><ellipse cx="150" cy="{top-14}" rx="52" ry="14" fill="none" stroke="{c1}" stroke-opacity=".25" stroke-width="2"/>')
    if antenna=='ball':
        s.append(f'<line x1="150" y1="{top-22}" x2="150" y2="{top+2}" stroke="rgba(255,255,255,.75)" stroke-width="3"/><circle cx="150" cy="{top-28}" r="8" fill="{c2}"/><circle cx="150" cy="{top-28}" r="16" fill="{c2}" opacity=".25"/>')
    elif antenna=='heart':
        s.append(f'<line x1="150" y1="{top-20}" x2="150" y2="{top+2}" stroke="rgba(255,255,255,.75)" stroke-width="3"/><path d="M150 {top-18} c-14 -10 -14 -26 0 -20 c14 -6 14 10 0 20z" fill="#fb7185"/><circle cx="150" cy="{top-28}" r="16" fill="#fb7185" opacity=".2"/>')
    elif antenna=='star':
        s.append(f'<line x1="150" y1="{top-18}" x2="150" y2="{top+2}" stroke="rgba(255,255,255,.75)" stroke-width="3"/><path d="M150 {top-40} l5 10 l11 2 l-8 8 l2 11 l-10 -5 l-10 5 l2 -11 l-8 -8 l11 -2z" fill="#fbbf24"/>')
    elif antenna=='leaf':
        s.append(f'<path d="M150 {top+2} Q146 {top-16} 160 {top-30}" stroke="rgba(255,255,255,.75)" stroke-width="3" fill="none"/><path d="M160 {top-30} q22 -6 24 12 q-20 8 -24 -12z" fill="{c1}"/>')
    if ears:
        s.append(f'<rect x="{150-vis[2]/2-30}" y="{vis[1]+10}" width="22" height="42" rx="11" fill="url(#{g}a)"/><rect x="{150+vis[2]/2+8}" y="{vis[1]+10}" width="22" height="42" rx="11" fill="url(#{g}a)"/>')
    s.append(shape+f' fill="url(#{g}b)" stroke="rgba(255,255,255,.85)" stroke-width="2"/>')
    # inner circuit + core
    s.append(f'<g stroke="{core}" stroke-opacity=".35" stroke-width="1.5" fill="none"><path d="M150 {corey+16} V{corey+46} M150 {corey+16} l-24 18 M150 {corey+16} l24 18"/></g>')
    s.append(f'<circle cx="150" cy="{corey}" r="36" fill="url(#{g}c)" opacity=".9"/><circle cx="150" cy="{corey}" r="15" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2"/>')
    # visor
    vx,vy,vw,vh=vis
    s.append(f'<rect x="{150-vw/2}" y="{vy}" width="{vw}" height="{vh}" rx="{vh/2}" fill="url(#{g}v)"/>')
    ey=vy+vh*0.46; lx=150-vw*0.2; rx=150+vw*0.2
    E=core
    def round_eye(x): return f'<rect x="{x-9}" y="{ey-14}" width="18" height="28" rx="9" fill="{E}"/><rect x="{x-14}" y="{ey-19}" width="28" height="38" rx="14" fill="{E}" opacity=".18"/><circle cx="{x+3}" cy="{ey-7}" r="3.5" fill="#fff"/>'
    def happy_eye(x): return f'<path d="M{x-12} {ey+5} Q{x} {ey-13} {x+12} {ey+5}" stroke="{E}" stroke-width="6" fill="none" stroke-linecap="round"/>'
    def big_eye(x): return f'<circle cx="{x}" cy="{ey}" r="14" fill="{E}"/><circle cx="{x+4}" cy="{ey-5}" r="5" fill="#fff"/><circle cx="{x-5}" cy="{ey+5}" r="2.2" fill="#fff"/>'
    def closed_eye(x): return f'<path d="M{x-11} {ey-2} Q{x} {ey+9} {x+11} {ey-2}" stroke="{E}" stroke-width="5" fill="none" stroke-linecap="round"/>'
    def heart_eye(x): return f'<path d="M{x} {ey+10} c-16 -10 -14 -26 0 -18 c14 -8 16 8 0 18z" fill="#fb7185"/>'
    def star_eye(x): return f'<path d="M{x} {ey-14} l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1z" fill="{E}"/>'
    m={'round':(round_eye,round_eye),'happy':(happy_eye,happy_eye),'big':(big_eye,big_eye),'wink':(happy_eye,round_eye),
       'closed':(closed_eye,closed_eye),'heart':(heart_eye,heart_eye),'star':(star_eye,star_eye)}[eyes]
    s.append(m[0](lx)+m[1](rx))
    my=vy+vh*0.8
    if mouth=='smile': s.append(f'<path d="M140 {my-3} Q150 {my+5} 160 {my-3}" stroke="{E}" stroke-width="3.5" fill="none" stroke-linecap="round"/>')
    elif mouth=='open': s.append(f'<path d="M139 {my-5} Q150 {my+9} 161 {my-5} Z" fill="{E}"/>')
    elif mouth=='cat': s.append(f'<path d="M138 {my-3} q6 6 12 0 q6 6 12 0" stroke="{E}" stroke-width="3.2" fill="none" stroke-linecap="round"/>')
    elif mouth=='o': s.append(f'<ellipse cx="150" cy="{my-1}" rx="5" ry="6" fill="{E}"/>')
    if cheeks: s.append(f'<ellipse cx="{lx-6}" cy="{ey+18}" rx="9" ry="5" fill="#fb7185" opacity=".55"/><ellipse cx="{rx+6}" cy="{ey+18}" rx="9" ry="5" fill="#fb7185" opacity=".55"/>')
    # gloss
    s.append(f'<path d="M{108 if body!="chubby" else 92} {top+26} Q{116 if body!="chubby" else 104} {top+8} {136} {top+4}" stroke="#fff" stroke-opacity=".85" stroke-width="5" fill="none" stroke-linecap="round"/>')
    # hands
    L=f'<ellipse cx="56" cy="206" rx="15" ry="22" fill="url(#{g}b)" stroke="rgba(255,255,255,.85)" stroke-width="2" transform="rotate(20 56 206)"/>'
    if hand=='wave': R=f'<ellipse cx="246" cy="150" rx="15" ry="22" fill="url(#{g}b)" stroke="rgba(255,255,255,.85)" stroke-width="2" transform="rotate(-25 246 150)"/><path d="M268 126 q8 6 6 16 M276 116 q12 10 9 26" stroke="{c2}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>'
    elif hand=='coin': R=f'<ellipse cx="244" cy="200" rx="15" ry="22" fill="url(#{g}b)" stroke="rgba(255,255,255,.85)" stroke-width="2" transform="rotate(-20 244 200)"/><circle cx="250" cy="168" r="16" fill="#fbbf24" stroke="#f59e0b" stroke-width="3"/><text x="250" y="174" font-size="15" font-weight="900" text-anchor="middle" fill="#92400e" font-family="Inter,sans-serif">$</text>'
    elif hand=='card': R=f'<g transform="translate(222 150) rotate(-8)"><rect width="62" height="44" rx="8" fill="{c1}" fill-opacity=".14" stroke="{c1}"/><path d="M8 34 L20 24 L30 28 L42 14 L56 10" stroke="{c1}" stroke-width="2.5" fill="none"/></g><ellipse cx="236" cy="210" rx="15" ry="22" fill="url(#{g}b)" stroke="rgba(255,255,255,.85)" stroke-width="2" transform="rotate(-20 236 210)"/>'
    elif hand=='heart': R=f'<ellipse cx="244" cy="200" rx="15" ry="22" fill="url(#{g}b)" stroke="rgba(255,255,255,.85)" stroke-width="2" transform="rotate(-20 244 200)"/><path d="M252 176 c-18 -12 -16 -30 0 -21 c16 -9 18 9 0 21z" fill="#fb7185"/>'
    elif hand=='both': L=f'<ellipse cx="62" cy="140" rx="15" ry="22" fill="url(#{g}b)" stroke="rgba(255,255,255,.85)" stroke-width="2" transform="rotate(30 62 140)"/>'; R=f'<ellipse cx="238" cy="140" rx="15" ry="22" fill="url(#{g}b)" stroke="rgba(255,255,255,.85)" stroke-width="2" transform="rotate(-30 238 140)"/>'
    else: R=f'<ellipse cx="244" cy="206" rx="15" ry="22" fill="url(#{g}b)" stroke="rgba(255,255,255,.85)" stroke-width="2" transform="rotate(-20 244 206)"/>'
    s.append(L+R+extra)
    return '<svg width="300" height="340" viewBox="0 0 300 340">'+''.join(s)+'</svg>'

SPARK=lambda c:f'<path d="M40 70 l5 12 l12 5 l-12 5 l-5 12 l-5 -12 l-12 -5 l12 -5z" fill="{c}"/><path d="M262 260 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 l9 -4z" fill="#fbbf24"/>'
variants=[
 ('A','Ruvi Klasik','Senyum menyapa 👋','Bentuk kapsul asli. Mata bulat bercahaya, pipi merona, tangan melambai. Paling seimbang: pintar tapi hangat.',
   dict(body='capsule',eyes='round',mouth='smile',hand='wave'),'linear-gradient(160deg,#e6fbf6,#eef1ff)'),
 ('B','Ruvi Ceria','Tertawa senang 😄','Mata "^ ^" dan mulut terbuka, kedua tangan terangkat. Cocok untuk momen pemasukan masuk atau target tercapai.',
   dict(body='capsule',eyes='happy',mouth='open',hand='both',antenna='star',extra=SPARK('#a78bfa')),'linear-gradient(160deg,#fff7e6,#f3edff)'),
 ('C','Ruvi Gemoy','Mata berbinar ✨','Badan lebih bulat dan pendek, mata besar berkilau. Paling imut, gampang disukai semua umur.',
   dict(body='chubby',eyes='big',mouth='cat',hand='rest',c1='#38bdf8',c2='#a78bfa',core='#67e8f9',antenna='ball'),'linear-gradient(160deg,#e9f6ff,#f6efff)'),
 ('D','Ruvi Santai','Tenang & ramah 😌','Mata terpejam tersenyum dengan cincin halo di atas kepala. Kesan asisten yang sabar dan menenangkan.',
   dict(body='egg',eyes='closed',mouth='smile',hand='rest',halo=True,antenna=None,c1='#2dd4bf',c2='#60a5fa',core='#5eead4'),'linear-gradient(160deg,#e8fbf5,#e9f1ff)'),
 ('E','Ruvi Kedip','Mengedip jahil 😉','Satu mata mengedip, "telinga" lampu di samping kepala, sambil memegang koin. Kesan seru dan sedikit jahil.',
   dict(body='capsule',eyes='wink',mouth='open',hand='coin',ears=True,antenna='ball',c1='#f472b6',c2='#818cf8',core='#5eead4'),'linear-gradient(160deg,#fff0f6,#eef0ff)'),
 ('F','Ruvi Sayang','Mata hati 🥰','Mata berbentuk hati dan antena hati, sambil memegang hati. Untuk momen user rajin mencatat atau berhasil hemat.',
   dict(body='egg',eyes='heart',mouth='smile',hand='heart',antenna='heart',c1='#fb7185',c2='#c084fc',core='#5eead4'),'linear-gradient(160deg,#fff1f2,#f5efff)'),
]
cards=''
for i,(k,name,expr,desc,kw,bg) in enumerate(variants):
    rec='<span class="rec">⭐ REKOMENDASI</span>' if k=='A' else ''
    cards+=f'<div class="card"><div class="stage" style="background:{bg}"><span class="num">{k}</span>{rec}{pod(i,**kw)}<span class="ex">{expr}</span></div><h2>{name}</h2><p>{desc}</p></div>'
html=f'''<!doctype html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0}}body{{background:#f4f6fb;font-family:Inter,system-ui,-apple-system,sans-serif;color:#0f1d2b}}
.wrap{{width:1680px;padding:44px 56px 52px}}h1{{font-size:42px;letter-spacing:-1.2px}}.sub{{color:#5c7088;font-size:18px;margin:6px 0 28px}}
.grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}}
.card{{background:#fff;border-radius:30px;padding:16px 18px 22px;box-shadow:0 10px 30px rgba(31,45,90,.08);border:1px solid #e8ecf5}}
.stage{{position:relative;height:380px;border-radius:22px;display:flex;align-items:center;justify-content:center;overflow:hidden}}
.num{{position:absolute;top:14px;left:16px;font-size:14px;font-weight:800;color:#0d9488}}
.rec{{position:absolute;top:12px;right:14px;font-size:12px;font-weight:800;color:#fff;background:linear-gradient(90deg,#14b8a6,#6366f1);padding:5px 10px;border-radius:99px}}
.ex{{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:14px;font-weight:700;padding:7px 14px;border-radius:99px;background:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.95);box-shadow:0 4px 14px rgba(31,45,90,.08)}}
h2{{font-size:23px;margin:14px 0 4px;letter-spacing:-.4px}}p{{font-size:14.5px;line-height:1.55;color:#5c7088}}
</style></head><body><div class="wrap"><h1>Ruvi · 6 variasi Kapsul Kaca</h1><p class="sub">Semua tetap badan kaca transparan dengan inti energi di dada, tapi beda bentuk, detail, dan ekspresi.</p><div class="grid">{cards}</div></div></body></html>'''
open('ruvi-pod-variasi.html','w').write(html)
