/* VGC Scout battle engine. Training implementation: unsupported moves are explicit. */
(function(root){'use strict';
const self=new Set('Protect|Detect|Trick Room|Tailwind|Wide Guard|Rain Dance|Sunny Day|Swords Dance|Nasty Plot|Calm Mind|Agility|Recover|Roost|Haze'.split('|'));
const ally=new Set('Helping Hand|Pollen Puff|Heal Pulse'.split('|'));
const spread=new Set('Dazzling Gleam|Heat Wave|Rock Slide|Earthquake|Surf|Discharge|Muddy Water|Make It Rain|Hyper Voice|Snarl|Icy Wind|Eruption|Water Spout|Blizzard'.split('|'));
const extra=new Set([...self,...ally,'Will-O-Wisp','Thunder Wave','Spore','Taunt','Fake Tears','Charm','Eerie Impulse','Fake Out','Follow Me','Rage Powder','Quick Guard','Reflect','Light Screen','Quash']);
const priority={Protect:4,Detect:4,'Helping Hand':5,'Fake Out':3,'Wide Guard':3,'Quick Guard':3,'Follow Me':2,'Rage Powder':2,'First Impression':2,'Sucker Punch':1,'Aqua Jet':1,'Bullet Punch':1,'Extreme Speed':2,'Trick Room':-7};
const natures={Adamant:[1,3],Jolly:[5,3],Modest:[3,1],Timid:[5,1],Bold:[2,1],Calm:[4,1],Careful:[4,3],Impish:[2,3],Brave:[1,5],Quiet:[3,5],Relaxed:[2,5],Sassy:[4,5]};
const core=()=>root.SCOUT_CORE,F=Math.floor,base=s=>s.replace(/-Mega(?:-[XYZ])?$/,''),clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
const kind=m=>self.has(m)?'self':ally.has(m)?'ally':spread.has(m)?'spread':'foe';
const known=m=>extra.has(m)||!!core().MOVES[m];
const msg=(b,s)=>b.log.push(s);
function stat(p,i){const d=core().DATA.dex[p.name]||core().DATA.dex[p.base];if(!d)return 1;const mod=natures[p.nature]||[];const n=mod[0]===i?1.1:mod[1]===i?.9:1;return i?F((d.stats[i]+20+(p.sp[i]||0))*n):d.stats[0]+75+(p.sp[0]||0)}
function refresh(p){p.hp=clamp(p.hp,0,p.maxHP);p.health=F(100*p.hp/p.maxHP);return p.hp}
function make(x,side){const n=base(x.name);if(!core().DATA.dex[n]&&!core().DATA.dex[x.name])throw Error('Statistiche mancanti: '+n);const p={name:n,base:n,megaForm:n!==x.name?x.name:null,megaAbility:String(x.ability||'').split('→').pop().trim(),mega:false,side,ability:String(x.ability||'').split('→')[0].trim(),item:x.item||'',nature:x.nature||'Neutral',sp:x.sp||[0,0,0,0,0,0],moves:(x.moves||[]).filter(Boolean).slice(0,4),stages:[0,0,0,0,0,0],status:null,flinch:false,protected:false,firstTurn:0};p.maxHP=stat(p,0);p.hp=p.maxHP;refresh(p);return p}
function speed(b,p){let v=stat(p,5),s=p.stages[5];v*=s>=0?(2+s)/2:2/(2-s);if(b.tailwind[p.side])v*=2;if(b.weather==='rain'&&p.ability==='Swift Swim')v*=2;if(b.weather==='sand'&&p.ability==='Sand Rush')v*=2;if(b.weather==='sun'&&p.ability==='Chlorophyll')v*=2;if(p.status==='paralysis')v*=.5;return F(v)}
function boost(p,i,n){p.stages[i]=clamp(p.stages[i]+n,-6,6)}
function ability(b,p){if(p.ability==='Drizzle')setWeather(b,'rain',p.name+' attiva Drizzle');if(p.ability==='Drought')setWeather(b,'sun',p.name+' attiva Drought');if(p.ability==='Sand Stream')setWeather(b,'sand',p.name+' attiva Sand Stream');if(p.ability==='Intimidate')for(const t of b.team[1-p.side].slice(0,2))if(t&&t.hp)boost(t,1,-1);if(p.ability==='Electric Surge'){b.terrain='electric';b.terrainTurns=5;msg(b,'Electric Terrain attivo.')}if(p.ability==='Psychic Surge'){b.terrain='psychic';b.terrainTurns=5;msg(b,'Psychic Terrain attivo.')}}
function setWeather(b,v,why){b.weather=v;b.weatherTurns=5;msg(b,why+' → '+v)}
function enter(b,p,pos,why){p.firstTurn=b.turn;p.flinch=false;p.protected=false;msg(b,(p.side?'Avversario':'Tu')+': entra '+p.name+' nello slot '+(pos+1)+' ('+why+').');ability(b,p)}
function init(ours,foes){if(ours.length!==4||foes.length!==4)throw Error('Selezionare 4 Pokémon per squadra');const b={team:[ours.map(x=>make(x,0)),foes.map(x=>make(x,1))],turn:0,phase:'playing',replace:[],log:[],weather:'',weatherTurns:0,terrain:'',terrainTurns:0,trickRoomTurns:0,tailwind:[0,0],megaUsed:[false,false]};b.ours=b.team[0];b.foes=b.team[1];for(let side=0;side<2;side++)for(let i=0;i<2;i++)enter(b,b.team[side][i],i,'lead');return b}
function mega(b,p){if(!p.megaForm||p.mega||b.megaUsed[p.side])return;const ratio=p.hp/p.maxHP;p.name=p.megaForm;p.mega=true;b.megaUsed[p.side]=true;p.ability=p.megaAbility||p.ability;p.maxHP=stat(p,0);p.hp=clamp(F(p.maxHP*ratio),1,p.maxHP);refresh(p);msg(b,p.base+' megaevolve in '+p.name+'!');ability(b,p)}
function dmg(b,p,d,m,count=1){const move=core().MOVES[m];if(!move||move[1]<=0||move[2]==='status')return null;let [type,power,cat]=move;if(p.ability==='Aerilate'&&type==='Normal'){type='Flying';power=F(power*1.2)}if(m==='Weather Ball'&&b.weather){type={rain:'Water',sun:'Fire',sand:'Rock'}[b.weather]||type;power=100}
const a=cat==='physical'?1:3,df=cat==='physical'?2:4;let atk=stat(p,a),def=stat(d,df);const st=i=>{let v=p.stages[i];return v>=0?(2+v)/2:2/(2-v)},dt=i=>{let v=d.stages[i];return v>=0?(2+v)/2:2/(2-v)};atk*=st(a);def*=dt(df);if(cat==='physical'&&p.status==='burn')atk*=.5;let eff=core().effectiveness(type,core().DATA.dex[d.name]?.types||core().DATA.dex[d.base].types);if(d.ability==='Levitate'&&type==='Ground')eff=0;if(d.ability==='Flash Fire'&&type==='Fire')eff=0;let stab=(core().DATA.dex[p.name]?.types||core().DATA.dex[p.base].types).includes(type)?1.5:1;let value=F(F(22*power*atk/Math.max(1,def))/50)+2;if(b.weather==='rain')value*=type==='Water'?1.5:type==='Fire'?.5:1;if(b.weather==='sun')value*=type==='Fire'?1.5:type==='Water'?.5:1;if(p.item==='Life Orb')value*=1.3;if(b.screens[d.side]?.[cat==='physical'?'Reflect':'Light Screen']>0)value*=2/3;if(spread.has(m)&&count>1)value*=.75;if(p.helping)value*=1.5;return {hp:Math.max(0,F(value*.925*stab*eff)),eff}}
function hit(b,p,d,m,total){if(!d||!d.hp)return;if(d.protected){msg(b,d.name+' usa Protect: blocca '+m);return}if(spread.has(m)&&b.guards[d.side]){msg(b,d.name+' protetto da Wide Guard.');return}
const c=dmg(b,p,d,m,total);if(!c){msg(b,'Effetto non supportato per '+m+'.');return}if(c.eff===0){msg(b,m+' non ha effetto su '+d.name);return}
const n=Math.min(d.hp,c.hp);d.hp-=n;refresh(d);msg(b,p.name+' usa '+m+' su '+d.name+': -'+n+' PS ('+d.health+'%).');if(m==='Fake Out')d.flinch=true;if(m==='Icy Wind')boost(d,5,-1);if(m==='Snarl')boost(d,3,-1);if(m==='Close Combat'){boost(p,2,-1);boost(p,4,-1)}if(m==='Draco Meteor')boost(p,3,-2);
if(p.item==='Life Orb'){p.hp-=Math.max(1,F(p.maxHP/10));refresh(p);msg(b,p.name+': recoil Life Orb ('+p.health+'%).')}
if(['Flare Blitz','Wood Hammer','Brave Bird','Volt Tackle','Wave Crash'].includes(m)){p.hp-=Math.max(1,F(n/3));refresh(p);msg(b,p.name+': recoil '+m+' ('+p.health+'%).')}
if(d.item==='Focus Sash'&&d.hp===0&&n>=d.maxHP&&d.maxHP>1){d.hp=1;d.item='';refresh(d);msg(b,d.name+' resiste grazie a Focus Sash.')}if(d.item==='Sitrus Berry'&&d.hp>0&&d.hp<=d.maxHP/2){d.hp=clamp(d.hp+F(d.maxHP/4),0,d.maxHP);d.item='';refresh(d);msg(b,d.name+' recupera PS con Sitrus Berry.')}
if(d.hp===0)msg(b,d.name+' è esausto.')}
function resolve(b,a){const p=b.team[a.side][a.pos];if(!p||p.hp<=0)return;if(p.flinch){msg(b,p.name+' tentenna.');return}if(p.status==='sleep'){p.sleepTurns=(p.sleepTurns??2)-1;if(p.sleepTurns>0){msg(b,p.name+' dorme e non può agire.');return}p.status=null;msg(b,p.name+' si sveglia.')}if(p.status==='paralysis'&&b.turn%4===3){msg(b,p.name+' è completamente paralizzato.');return}
const m=a.move;if(!known(m)){msg(b,'Mossa non ancora supportata: '+m);return}if(p.taunt&&['Trick Room','Tailwind','Helping Hand','Protect','Detect','Recover','Roost'].includes(m)){msg(b,p.name+' non può usare '+m+' per Taunt.');return}
if(m==='Fake Out'&&p.firstTurn!==b.turn){msg(b,p.name+': Fake Out fallisce, non è il primo turno.');return}
if(m==='Protect'||m==='Detect'){p.protected=true;msg(b,p.name+' si protegge.');return}
if(m==='Wide Guard'){b.guards[p.side]=true;msg(b,p.name+' usa Wide Guard.');return}
if(m==='Quick Guard'){b.quickGuard[p.side]=true;msg(b,p.name+' usa Quick Guard.');return}
if(m==='Follow Me'||m==='Rage Powder'){b.redirect[p.side]=p;msg(b,p.name+' attira su di sé gli attacchi singoli con '+m+'.');return}
if(m==='Trick Room'){b.trickRoomTurns=b.trickRoomTurns?0:5;msg(b,p.name+(b.trickRoomTurns?' attiva':' annulla')+' Trick Room.');return}
if(m==='Tailwind'){b.tailwind[p.side]=4;msg(b,p.name+' attiva Tailwind.');return}
if(m==='Rain Dance'||m==='Sunny Day'){setWeather(b,m==='Rain Dance'?'rain':'sun',p.name+' usa '+m);return}
if(m==='Helping Hand'){let other=b.team[p.side][1-a.pos];if(other?.hp>0){other.helping=true;msg(b,p.name+' potenzia '+other.name+' con Helping Hand.')}return}
if(m==='Swords Dance'||m==='Nasty Plot'||m==='Agility'){boost(p,m==='Swords Dance'?1:m==='Nasty Plot'?3:5,2);msg(b,p.name+' usa '+m);return}
if(m==='Calm Mind'){boost(p,3,1);boost(p,4,1);msg(b,p.name+' usa Calm Mind.');return}
if(m==='Recover'||m==='Roost'){p.hp=clamp(p.hp+F(p.maxHP/2),0,p.maxHP);refresh(p);msg(b,p.name+' recupera PS.');return}
if(m==='Haze'){for(const team of b.team)for(const t of team)t.stages=[0,0,0,0,0,0];msg(b,'Haze azzera tutti i modificatori.');return}
if(m==='Reflect'||m==='Light Screen'){b.screens[p.side][m]=5;msg(b,p.name+' usa '+m+'.');return}
if(m==='Taunt'){const d=b.team[1-p.side][a.target||0];if(d){d.taunt=3;msg(b,d.name+' subisce Taunt.')}return}
if(m==='Fake Tears'||m==='Charm'||m==='Eerie Impulse'){const d=b.team[1-p.side][a.target||0];if(d&&!d.protected){boost(d,m==='Charm'?1:m==='Fake Tears'?4:3,-2);msg(b,d.name+' subisce '+m+' (-2 livelli).')}return}
const foes=b.team[1-a.side];let targets=spread.has(m)?foes.slice(0,2).filter(x=>x.hp>0):[foes[a.target===1?1:0]].filter(x=>x?.hp>0);
if(!spread.has(m)&&b.redirect[1-p.side]?.hp>0)targets=[b.redirect[1-p.side]];
if(a.side!==targets[0]?.side&&b.quickGuard[1-p.side]&&actionPriority(b,p,m)>0){msg(b,m+' bloccata da Quick Guard.');return}
if(m==='Will-O-Wisp'||m==='Thunder Wave'||m==='Spore'){for(const t of targets)if(!t.protected&&!t.status){t.status=m==='Will-O-Wisp'?'burn':m==='Thunder Wave'?'paralysis':'sleep';if(t.status==='sleep')t.sleepTurns=2;msg(b,t.name+': '+t.status)}return}
if(m==='Quash'){const d=targets[0];if(d){d.quashed=b.turn;msg(b,d.name+' subisce Quash (ordine semplificato).')}return}
if(self.has(m)||ally.has(m)){msg(b,m+' non è ancora simulata fedelmente.');return}
for(const t of targets)hit(b,p,t,m,targets.length);}
function switchMon(b,side,pos,to,forced=false){const team=b.team[side];to=Number(to);if(to<2||to>=4||!team[to]||team[to].hp<=0||(!forced&&team[pos].hp<=0))return false;const old=team[pos];[team[pos],team[to]]=[team[to],team[pos]];old.stages=[0,0,0,0,0,0];enter(b,team[pos],pos,forced?'sostituzione per KO':'switch');if(!forced)team[pos].firstTurn=b.turn+1;return true}
function opponent(b){const out=[];for(let i=0;i<2;i++){const p=b.foes[i];if(!p||p.hp<=0)continue;let best=null;for(const move of p.moves){if(!known(move))continue;for(let target=0;target<2;target++){const d=b.ours[target];if(!d?.hp)continue;const value=dmg(b,p,d,move)?.hp||0;const score=value/(d.maxHP||1)+(move==='Fake Out'&&p.firstTurn===b.turn?.1:0);if(!best||score>best.score)best={side:1,pos:i,move,target,score}}}if(best)out.push(best)}return out}
function actionPriority(b,p,m){return (priority[m]||0)+(p.ability==='Prankster'&&self.has(m)?1:0)}
function turn(b,actions){if(b.phase!=='playing')throw Error('Sostituzione necessaria o partita conclusa');if(actions?.length!==2)throw Error('Due azioni richieste');
for(let i=0;i<2;i++){if(!b.ours[i]?.hp){if(actions[i]?.move==='__pass__')continue;throw Error('Pokémon esausto da sostituire')}if(!actions[i]?.move)throw Error('Azione mancante');if(actions[i].move!=='__switch__'&&!b.ours[i].moves.includes(actions[i].move))throw Error('Mossa non presente nel set')}
b.guards=[false,false];b.quickGuard=[false,false];b.redirect=[null,null];b.screens=b.screens||[{},{}];for(const t of b.team.flat()){t.protected=false;t.flinch=false;t.helping=false}
const queue=[...actions.map((a,i)=>({side:0,pos:i,...a})),...opponent(b)];
for(const a of queue.filter(a=>a.move==='__switch__'))switchMon(b,a.side,a.pos,a.switchTo);
for(const a of queue.filter(a=>a.move!=='__switch__'&&a.mega))mega(b,b.team[a.side][a.pos]);
const ordered=queue.filter(a=>a.move!=='__switch__'&&a.move!=='__pass__').map(a=>({...a,p:b.team[a.side][a.pos]}));
ordered.sort((a,z)=>actionPriority(b,z.p,z.move)-actionPriority(b,a.p,a.move)||(b.trickRoomTurns?speed(b,a.p)-speed(b,z.p):speed(b,z.p)-speed(b,a.p))||a.side-z.side);
msg(b,'── Turno '+(b.turn+1)+' ──'+(b.trickRoomTurns?' · Trick Room':''));
ordered.forEach(a=>resolve(b,a));
for(const t of b.team.flat()){if(t.hp<=0)continue;if(t.status==='burn'){t.hp-=Math.max(1,F(t.maxHP/16));refresh(t)}if(t.taunt>0)t.taunt--;if(t.item==='Leftovers'){t.hp+=Math.max(1,F(t.maxHP/16));refresh(t)}}
if(b.trickRoomTurns)b.trickRoomTurns--;for(let i=0;i<2;i++)if(b.tailwind[i])b.tailwind[i]--;for(const sc of b.screens)for(const key of Object.keys(sc)){if(sc[key]>0)sc[key]--}
if(b.weatherTurns&&! --b.weatherTurns)b.weather='';if(b.terrainTurns&&! --b.terrainTurns)b.terrain='';
b.turn++;b.replace=[];for(let side=0;side<2;side++)for(let pos=0;pos<2;pos++)if(!b.team[side][pos]?.hp&&b.team[side].some((t,j)=>j>=2&&t.hp>0)){if(side===0){b.replace.push(pos);msg(b,'Il tuo Pokémon nello slot '+(pos+1)+' è esausto: scegli una riserva.')}else{const k=b.team[side].findIndex((t,j)=>j>=2&&t.hp>0);switchMon(b,side,pos,k,true)}}
if(b.replace.length)b.phase='replace';else if(!b.ours.some(t=>t.hp)||!b.foes.some(t=>t.hp)){b.phase='finished';msg(b,b.ours.some(t=>t.hp)?'Vittoria!':'Sconfitta.')}return b}
function replacement(b,pos,to){if(!b.replace.includes(pos))throw Error('Nessuna sostituzione richiesta');if(!switchMon(b,0,pos,to,true))throw Error('Riserva non valida');b.replace=b.replace.filter(i=>i!==pos);if(!b.replace.length)b.phase='playing';return b}
root.SCOUT_BATTLE={make,init,turn,replacement,kind,known,dmg,speed};
})(typeof window!=='undefined'?window:globalThis);