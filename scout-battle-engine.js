/* VGC Scout battle engine. Training implementation: unsupported moves are explicit. */
(function(root){'use strict';
const self=new Set('Protect|Detect|Trick Room|Tailwind|Wide Guard|Follow Me|Rage Powder|Rain Dance|Sunny Day|Swords Dance|Nasty Plot|Calm Mind|Agility|Recover|Roost|Haze'.split('|'));
const ally=new Set('Helping Hand|Pollen Puff|Heal Pulse'.split('|'));
const spread=new Set('Dazzling Gleam|Heat Wave|Rock Slide|Earthquake|Surf|Discharge|Muddy Water|Make It Rain|Hyper Voice|Snarl|Icy Wind|Eruption|Water Spout|Blizzard|Matcha Gotcha'.split('|'));
const extra=new Set([...self,...ally,'Will-O-Wisp','Thunder Wave','Spore','Taunt','Fake Tears','Charm','Eerie Impulse','Fake Out','Follow Me','Rage Powder','Quick Guard','Reflect','Light Screen','Quash']);
const priority={Protect:4,Detect:4,'Helping Hand':5,'Extreme Speed':2,'Fake Out':3,'Wide Guard':3,'Quick Guard':3,'Follow Me':2,'Rage Powder':2,'First Impression':2,'Sucker Punch':1,'Aqua Jet':1,'Bullet Punch':1,'Extreme Speed':2,'Trick Room':-7};
const natures={Adamant:[1,3],Jolly:[5,3],Modest:[3,1],Timid:[5,1],Bold:[2,1],Calm:[4,1],Careful:[4,3],Impish:[2,3],Brave:[1,5],Quiet:[3,5],Relaxed:[2,5],Sassy:[4,5]};
const core=()=>root.SCOUT_CORE,F=Math.floor,base=s=>s==='Floette-Mega'?'Floette-Eternal':s.replace(/-Mega(?:-[XYZ])?$/,''),clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
const kind=(m,b)=>m==='Expanding Force'&&b?.terrain==='psychic'?'spread':self.has(m)?'self':ally.has(m)?'ally':spread.has(m)?'spread':'foe';
const unsupported=new Set(['Pollen Puff','Heal Pulse','Quash','Double Shock','Population Bomb','Berserk Mode']);
const EXTRA_MOVES={
 'Kowtow Cleave':['Dark',85,'physical'],'Leech Life':['Bug',80,'physical'],'Last Respects':['Ghost',50,'physical'],
 'Extreme Speed':['Normal',80,'physical'],'Mystical Fire':['Fire',75,'special'],'Matcha Gotcha':['Grass',80,'special'],
 'Light of Ruin':['Fairy',140,'special'],'Bug Buzz':['Bug',90,'special'],'Low Kick':['Fighting',80,'physical'],
 'Armor Cannon':['Fire',120,'special'],'Electro Shot':['Electric',130,'special'],'Solar Beam':['Grass',120,'special'],
 'U-turn':['Bug',70,'physical'],'Foul Play':['Dark',95,'physical'],'Nuzzle':['Electric',20,'physical'],
 'Super Fang':['Normal',1,'physical']
};
const known=m=>!unsupported.has(m)&&(extra.has(m)||['Parting Shot','Encore'].includes(m)||!!EXTRA_MOVES[m]||!!core().MOVES[m]);
const ACCURACY={'Hurricane':70,'Fire Blast':85,'Heat Wave':90,'Rock Slide':90,'Gunk Shot':80,'Draco Meteor':90,'Will-O-Wisp':85,'Meteor Mash':90,'Dire Claw':100,'Flare Blitz':100,'Play Rough':90,'Hydro Pump':80,'Spore':100,'Fake Out':100,'Thunder Wave':90};
function roll(b){b.rngSeed=(Math.imul(b.rngSeed||0x31415926,1664525)+1013904223)>>>0;return b.rngSeed/4294967296}
function accurate(b,m){let chance=ACCURACY[m]??100;if(m==='Hurricane'){if(b.weather==='rain')chance=100;if(b.weather==='sun')chance=50}return roll(b)*100<chance}

const msg=(b,s)=>b.log.push(s);
function stat(p,i){const d=core().DATA.dex[p.name]||core().DATA.dex[p.base];if(!d)return 1;const mod=natures[p.nature]||[];const n=mod[0]===i?1.1:mod[1]===i?.9:1;return i?F((d.stats[i]+20+(p.sp[i]||0))*n):d.stats[0]+75+(p.sp[0]||0)}
function refresh(p){p.hp=clamp(p.hp,0,p.maxHP);p.health=F(100*p.hp/p.maxHP);return p.hp}
function make(x,side){const n=base(x.name);const missingBase={'Charizard':[78,84,78,109,85,100],'Floette-Eternal':[74,65,67,125,128,92],'Delphox':[75,69,72,114,100,104],'Gardevoir':[68,65,65,125,115,80],'Gengar':[60,65,60,130,75,110],'Aerodactyl':[80,105,65,60,75,130]};if(!core().DATA.dex[n]&&missingBase[n])core().DATA.dex[n]={name:n,stats:missingBase[n],types:core().DATA.dex[x.name]?.types||['Normal']};if(!core().DATA.dex[n]&&!core().DATA.dex[x.name])throw Error('Statistiche mancanti: '+n);const p={name:n,base:n,megaForm:n!==x.name?x.name:null,megaAbility:String(x.ability||'').split('→').pop().trim(),mega:false,side,ability:String(x.ability||'').split('→')[0].trim(),item:x.item||'',nature:x.nature||'Neutral',sp:x.sp||[0,0,0,0,0,0],moves:(x.moves||[]).filter(Boolean).slice(0,4),stages:[0,0,0,0,0,0],status:null,flinch:false,protected:false,firstTurn:0};p.maxHP=stat(p,0);p.hp=p.maxHP;refresh(p);return p}
function speed(b,p){let v=stat(p,5),s=p.stages[5];if(p.item==='Choice Scarf')v*=1.5;if(p.ability==='Unburden'&&!p.item&&p.hadItem)v*=2;v*=s>=0?(2+s)/2:2/(2-s);if(b.tailwind[p.side])v*=2;if(b.weather==='rain'&&p.ability==='Swift Swim')v*=2;if(b.weather==='sand'&&p.ability==='Sand Rush')v*=2;if(b.weather==='sun'&&p.ability==='Chlorophyll')v*=2;if(p.status==='paralysis')v*=.5;return F(v)}
function boost(p,i,n){p.stages[i]=clamp(p.stages[i]+n,-6,6)}
function ability(b,p){if(p.ability==='Drizzle')setWeather(b,'rain',p.name+' attiva Drizzle');if(p.ability==='Drought')setWeather(b,'sun',p.name+' attiva Drought');if(p.ability==='Sand Stream')setWeather(b,'sand',p.name+' attiva Sand Stream');if(p.ability==='Intimidate')for(const t of b.team[1-p.side].slice(0,2))if(t&&t.hp)boost(t,1,-1);if(p.ability==='Electric Surge'){b.terrain='electric';b.terrainTurns=5;msg(b,'Electric Terrain attivo.')}if(p.ability==='Psychic Surge'){b.terrain='psychic';b.terrainTurns=5;msg(b,'Psychic Terrain attivo.')}}
function setWeather(b,v,why){b.weather=v;b.weatherTurns=5;msg(b,why+' → '+v)}
function enter(b,p,pos,why){p.firstTurn=b.turn;p.flinch=false;p.protected=false;msg(b,(p.side?'Avversario':'Tu')+': entra '+p.name+' nello slot '+(pos+1)+' ('+why+').');ability(b,p)}
function init(ours,foes){if(ours.length!==4||foes.length!==4)throw Error('Selezionare 4 Pokémon per squadra');const b={team:[ours.map(x=>make(x,0)),foes.map(x=>make(x,1))],rngSeed:(Math.random()*4294967295)>>>0,turn:0,phase:'playing',replace:[],log:[],weather:'',weatherTurns:0,terrain:'',terrainTurns:0,trickRoomTurns:0,tailwind:[0,0],megaUsed:[false,false]};b.ours=b.team[0];b.foes=b.team[1];for(let side=0;side<2;side++)for(let i=0;i<2;i++)enter(b,b.team[side][i],i,'lead');return b}
function mega(b,p){if(!p.megaForm||p.mega||b.megaUsed[p.side])return;const ratio=p.hp/p.maxHP;p.name=p.megaForm;p.mega=true;b.megaUsed[p.side]=true;p.ability=p.megaAbility||p.ability;p.maxHP=stat(p,0);p.hp=clamp(F(p.maxHP*ratio),1,p.maxHP);refresh(p);msg(b,p.base+' megaevolve in '+p.name+'!');ability(b,p)}
function dmg(b,p,d,m,count=1){const move=core().MOVES[m]||EXTRA_MOVES[m];if(!move||move[1]<=0||move[2]==='status')return null;let [type,power,cat]=move;if(m==='Stored Power')power=20+20*p.stages.slice(1).reduce((sum,n)=>sum+Math.max(0,n),0);if(m==='Last Respects')power=Math.min(300,50+50*b.team[p.side].filter(x=>x.hp<=0).length);if(m==='Expanding Force'&&b.terrain==='psychic')power=F(power*1.5);if(m==='Acrobatics'&&!p.item)power=110;if(m==='Low Kick')power=80;if(m==='Knock Off'&&d.item&&!/ite(?: X| Y| Z)?$/i.test(d.item))power=F(power*1.5);if(m==='Solar Beam'&&b.weather&&b.weather!=='sun')power=F(power/2);if(['Eruption','Water Spout'].includes(m))power=Math.max(1,F(power*p.hp/p.maxHP));if(p.ability==='Aerilate'&&type==='Normal'){type='Flying';power=F(power*1.2)}if(p.ability==='Pixilate'&&type==='Normal'){type='Fairy';power=F(power*1.2)}if(m==='Weather Ball'&&b.weather){type={rain:'Water',sun:'Fire',sand:'Rock'}[b.weather]||type;power=100}
const a=cat==='physical'?1:3,df=cat==='physical'?2:4;let atk=stat(m==='Foul Play'?d:p,a),def=stat(d,df);const st=i=>{let v=(m==='Foul Play'?d:p).stages[i];return v>=0?(2+v)/2:2/(2-v)},dt=i=>{let v=d.stages[i];return v>=0?(2+v)/2:2/(2-v)};atk*=st(a);def*=dt(df);if(cat==='physical'&&p.status==='burn')atk*=.5;let eff=core().effectiveness(type,core().DATA.dex[d.name]?.types||core().DATA.dex[d.base].types);if(d.ability==='Levitate'&&type==='Ground')eff=0;if(d.ability==='Flash Fire'&&type==='Fire')eff=0;let stab=(core().DATA.dex[p.name]?.types||core().DATA.dex[p.base].types).includes(type)?1.5:1;let value=F(F(22*power*atk/Math.max(1,def))/50)+2;if(b.weather==='rain')value*=type==='Water'?1.5:type==='Fire'?.5:1;if(b.weather==='sun')value*=type==='Fire'?1.5:type==='Water'?.5:1;if(p.item==='Life Orb')value*=1.3;if(p.item==='Choice Band'&&cat==='physical')value*=1.5;if(p.item==='Choice Specs'&&cat==='special')value*=1.5;if(p.item==='Expert Belt'&&eff>1)value*=1.2;if(b.screens[d.side]?.[cat==='physical'?'Reflect':'Light Screen']>0)value*=2/3;if(kind(m,b)==='spread'&&count>1)value*=.75;if(p.helping)value*=1.5;return {hp:Math.max(0,F(value*.925*stab*eff)),eff}}
function hit(b,p,d,m,total){if(!d||!d.hp)return;
if(p.side!==d.side&&actionPriority(b,p,m)>0){const guard=b.team[d.side].slice(0,2).find(x=>x.hp>0&&['Armor Tail','Queenly Majesty','Dazzling'].includes(x.ability));const dex=core().DATA.dex[d.name]||core().DATA.dex[d.base];const grounded=d.ability!=='Levitate'&&!dex?.types.includes('Flying');if(guard){msg(b,m+' bloccata da '+guard.ability+' di '+guard.name+'.');return}if(b.terrain==='psychic'&&grounded){msg(b,m+' bloccata da Psychic Terrain.');return}}
if(d.protected){msg(b,d.name+' usa Protect: blocca '+m);return}if(spread.has(m)&&b.guards[d.side]){msg(b,d.name+' protetto da Wide Guard.');return}
if(!accurate(b,m)){msg(b,p.name+' usa '+m+' ma manca '+d.name+'.');return}
const c=dmg(b,p,d,m,total);if(!c){msg(b,'Effetto non supportato per '+m+'.');return}if(c.eff===0){msg(b,m+' non ha effetto su '+d.name);return}
let randomized=F(c.hp*(.85+roll(b)*.15)/.925);const isCrit=roll(b)<1/24;if(isCrit){randomized=F(randomized*1.5);msg(b,'Brutto colpo!')}const hpBefore=d.hp;let n=Math.min(d.hp,randomized);if(d.item==='Focus Sash'&&hpBefore===d.maxHP&&c.hp>=hpBefore&&hpBefore>1){n=hpBefore-1;d.item='';msg(b,d.name+' resiste grazie a Focus Sash.')}d.hp-=n;refresh(d);msg(b,p.name+' usa '+m+' su '+d.name+': -'+n+' PS ('+d.health+'%).');if(m==='Fake Out')d.flinch=true;if(m==='Nuzzle'&&!d.status)d.status='paralysis';if(m==='Knock Off'&&d.item&&!/ite(?: X| Y| Z)?$/i.test(d.item)){msg(b,d.name+' perde '+d.item+' per Knock Off.');d.item=''}if(['Leech Life','Giga Drain','Draining Kiss','Matcha Gotcha'].includes(m)&&p.hp>0){const ratio=m==='Draining Kiss'?.75:.5;const amount=Math.max(1,F(n*ratio));p.hp=clamp(p.hp+amount,0,p.maxHP);refresh(p);msg(b,p.name+' recupera '+amount+' PS con '+m+'.')}if(m==='Rock Slide'||m==='Iron Head'){if(roll(b)<.3)d.flinch=true}if(m==='Scald'&&!d.status&&roll(b)<.3)d.status='burn';if(m==='Flare Blitz'&&!d.status&&roll(b)<.1)d.status='burn';if(m==='Dire Claw'&&!d.status&&roll(b)<.5){d.status=['sleep','poison','paralysis'][Math.floor(roll(b)*3)];if(d.status==='sleep')d.sleepTurns=2;msg(b,d.name+': effetto Dire Claw → '+d.status)}if(m==='Icy Wind')boost(d,5,-1);if(m==='Mystical Fire')boost(d,3,-1);if(m==='Snarl')boost(d,3,-1);if(m==='Icy Wind')boost(d,5,-1);if(m==='Snarl')boost(d,3,-1);if(m==='Close Combat'){boost(p,2,-1);boost(p,4,-1)}if(m==='Draco Meteor')boost(p,3,-2);
if(['Volt Switch','U-turn'].includes(m)&&p.hp>0&&n>0&&b.team[p.side].some((x,j)=>j>=2&&x.hp>0)){b.pivotSwitch={side:p.side,pos:b.team[p.side].indexOf(p)};b.pivotCause=m;msg(b,p.name+' rientra con '+m+'.')}
if(p.item==='Life Orb'&&p.lastLifeOrbSeq!==b.activeMoveSequence){p.lastLifeOrbSeq=b.activeMoveSequence;p.hp-=Math.max(1,F(p.maxHP/10));refresh(p);msg(b,p.name+': recoil Life Orb ('+p.health+'%).')}
if(['Flare Blitz','Wood Hammer','Brave Bird','Volt Tackle','Wave Crash','Double-Edge','Light of Ruin'].includes(m)&&p.ability!=='Rock Head'){p.hp-=Math.max(1,F(n*(m==='Light of Ruin'?.5:1/3)));refresh(p);msg(b,p.name+': recoil '+m+' ('+p.health+'%).')}
if(d.item==='Sitrus Berry'&&d.hp>0&&d.hp<=d.maxHP/2){d.hp=clamp(d.hp+F(d.maxHP/4),0,d.maxHP);d.item='';refresh(d);msg(b,d.name+' recupera PS con Sitrus Berry.')}
if(d.item==='Eject Button'&&n>0&&d.hp>0&&b.team[d.side].some((x,j)=>j>=2&&x.hp>0)){d.item='';b.pivotSwitch={side:d.side,pos:b.team[d.side].indexOf(d)};b.pivotCause='Eject Button';msg(b,'Eject Button di '+d.name+' si attiva: serve una sostituzione.')}if(d.hp===0)msg(b,d.name+' è esausto.')}
function resolve(b,a){const p=b.team[a.side][a.pos];if(!p||p.hp<=0||(a.p&&a.p!==p))return;if(p.flinch){msg(b,p.name+' tentenna.');return}if(p.status==='sleep'){p.sleepTurns=(p.sleepTurns??2)-1;if(p.sleepTurns>0){msg(b,p.name+' dorme e non può agire.');return}p.status=null;msg(b,p.name+' si sveglia.')}if(p.status==='paralysis'&&b.turn%4===3){msg(b,p.name+' è completamente paralizzato.');return}
let m=a.move;if(p.charging&&m!==p.charging){m=p.charging;msg(b,p.name+' completa '+m+' dopo la carica.')}if(!known(m)){msg(b,'Mossa non ancora supportata: '+m);return}p.lastMove=m;if(m==='Sucker Punch'){const opponentAction=b.actionMap?.[1-a.side]?.[a.target===1?1:0];const activeAttack=opponentAction&&opponentAction.move!=='__switch__'&&opponentAction.move!=='__pass__'&&!self.has(opponentAction.move)&&!ally.has(opponentAction.move)&&!['Will-O-Wisp','Thunder Wave','Spore','Taunt'].includes(opponentAction.move);if(!activeAttack){msg(b,p.name+': Sucker Punch fallisce (il bersaglio non sta attaccando).');return}}if(p.taunt&&['Trick Room','Tailwind','Helping Hand','Protect','Detect','Recover','Roost'].includes(m)){msg(b,p.name+' non può usare '+m+' per Taunt.');return}
if(m==='First Impression'&&p.firstTurn!==b.turn){msg(b,p.name+': First Impression fallisce fuori dal primo turno.');return}
if(m==='Electro Shot'||m==='Solar Beam'){const instant=(m==='Electro Shot'&&b.weather==='rain')||(m==='Solar Beam'&&b.weather==='sun');if(!instant&&p.charging!==m){p.charging=m;p.chargeTarget=a.target;if(m==='Electro Shot')boost(p,3,1);msg(b,p.name+' prepara '+m+' (attacco nel turno successivo).');return}if(p.charging===m){p.charging=null;a.target=p.chargeTarget??a.target}else if(m==='Electro Shot')boost(p,3,1)}
if(m==='Fake Out'&&p.firstTurn!==b.turn){msg(b,p.name+': Fake Out fallisce, non è il primo turno.');return}
if(m==='Protect'||m==='Detect'){p.protectUsed=true;const chance=1/Math.pow(3,p.protectChain||0);if(roll(b)<chance){p.protected=true;msg(b,p.name+' si protegge.')}else msg(b,p.name+': '+m+' fallisce per utilizzo consecutivo.');p.protectChain=Math.min(4,(p.protectChain||0)+1);return}
if(m==='Wide Guard'){b.guards[p.side]=true;msg(b,p.name+' usa Wide Guard.');return}
if(m==='Quick Guard'){b.quickGuard[p.side]=true;msg(b,p.name+' usa Quick Guard.');return}
if(m==='Follow Me'||m==='Rage Powder'){p.redirectMove=m;b.redirect[p.side]=p;msg(b,p.name+' attira su di sé gli attacchi singoli con '+m+'.');return}
if(m==='Trick Room'){b.trickRoomTurns=b.trickRoomTurns?0:5;msg(b,p.name+(b.trickRoomTurns?' attiva':' annulla')+' Trick Room.');return}
if(m==='Tailwind'){b.tailwind[p.side]=4;msg(b,p.name+' attiva Tailwind.');return}
if(m==='Rain Dance'||m==='Sunny Day'){setWeather(b,m==='Rain Dance'?'rain':'sun',p.name+' usa '+m);return}
if(m==='Helping Hand'){let other=b.team[p.side][1-a.pos];if(other?.hp>0){other.helping=true;msg(b,p.name+' potenzia '+other.name+' con Helping Hand.')}return}
if(m==='Swords Dance'||m==='Nasty Plot'||m==='Agility'){boost(p,m==='Swords Dance'?1:m==='Nasty Plot'?3:5,2);msg(b,p.name+' usa '+m);return}
if(m==='Calm Mind'){boost(p,3,1);boost(p,4,1);msg(b,p.name+' usa Calm Mind.');return}
if(m==='Recover'||m==='Roost'){p.hp=clamp(p.hp+F(p.maxHP/2),0,p.maxHP);refresh(p);msg(b,p.name+' recupera PS.');return}
if(m==='Haze'){for(const team of b.team)for(const t of team)t.stages=[0,0,0,0,0,0];msg(b,'Haze azzera tutti i modificatori.');return}
if(m==='Reflect'||m==='Light Screen'){b.screens[p.side][m]=5;msg(b,p.name+' usa '+m+'.');return}
if(m==='Parting Shot'){const d=b.team[1-p.side][a.target||0];if(d?.hp>0&&!d.protected){boost(d,1,-1);boost(d,3,-1);msg(b,p.name+' usa Parting Shot: '+d.name+' perde Attacco e Attacco Speciale.');if(b.team[p.side].some((x,j)=>j>=2&&x.hp>0)){b.pivotSwitch={side:p.side,pos:a.pos};b.pivotCause='Parting Shot'}}return}
if(m==='Encore'){const d=b.team[1-p.side][a.target||0];if(d?.lastMove&&d.hp>0&&!d.protected){d.encoreMove=d.lastMove;d.encoreTurns=3;msg(b,d.name+' è bloccato su '+d.lastMove+' da Encore.')}else msg(b,'Encore fallisce.');return}
if(m==='Taunt'){const d=b.team[1-p.side][a.target||0];if(d){d.taunt=3;msg(b,d.name+' subisce Taunt.')}return}
if(m==='Fake Tears'||m==='Charm'||m==='Eerie Impulse'){const d=b.team[1-p.side][a.target||0];if(d&&!d.protected){boost(d,m==='Charm'?1:m==='Fake Tears'?4:3,-2);msg(b,d.name+' subisce '+m+' (-2 livelli).')}return}
const foes=b.team[1-a.side];const area=kind(m,b)==='spread';let targets=area?(new Set(['Earthquake','Discharge','Surf']).has(m)?[...foes.slice(0,2),b.team[a.side][1-a.pos]]:[...foes.slice(0,2)]).filter(x=>x?.hp>0):[foes[a.target===1?1:0]].filter(x=>x?.hp>0);
if(!area&&b.redirect[1-p.side]?.hp>0){const redirect=b.redirect[1-p.side];const grassImmune=redirect.redirectMove==='Rage Powder'&&(core().DATA.dex[redirect.name]?.types||core().DATA.dex[redirect.base].types).includes('Grass');if(!grassImmune)targets=[redirect]}
if(a.side!==targets[0]?.side&&b.quickGuard[1-p.side]&&actionPriority(b,p,m)>0){msg(b,m+' bloccata da Quick Guard.');return}
if(m==='Will-O-Wisp'||m==='Thunder Wave'||m==='Spore'){for(const t of targets)if(!t.protected&&!t.status){if(!accurate(b,m)){msg(b,m+' manca '+t.name+'.');continue}if(m==='Spore'&&((core().DATA.dex[t.name]?.types||core().DATA.dex[t.base].types).includes('Grass')||t.item==='Safety Goggles')){msg(b,t.name+' è immune a Spore.');continue}t.status=m==='Will-O-Wisp'?'burn':m==='Thunder Wave'?'paralysis':'sleep';if(t.status==='sleep')t.sleepTurns=2;msg(b,t.name+': '+t.status)}return}
if(m==='Quash'){const d=targets[0];if(d){d.quashed=b.turn;msg(b,d.name+' subisce Quash (ordine semplificato).')}return}
if(self.has(m)||ally.has(m)){msg(b,m+' non è ancora simulata fedelmente.');return}
b.activeMoveSequence=(b.activeMoveSequence||0)+1;
for(const t of targets)hit(b,p,t,m,targets.length);
if(m==='Make It Rain'||m==='Armor Cannon'){if(m==='Make It Rain')boost(p,3,-1);else{boost(p,2,-1);boost(p,4,-1)}}if(['Draco Meteor','Overheat','Leaf Storm'].includes(m))boost(p,3,-2);if(m==='Close Combat'){boost(p,2,-1);boost(p,4,-1)}if(m==='Superpower'){boost(p,1,-1);boost(p,2,-1)}}
function switchMon(b,side,pos,to,forced=false){const team=b.team[side];to=Number(to);if(to<2||to>=4||!team[to]||team[to].hp<=0||(!forced&&team[pos].hp<=0))return false;const old=team[pos];[team[pos],team[to]]=[team[to],team[pos]];old.stages=[0,0,0,0,0,0];enter(b,team[pos],pos,forced?'sostituzione per KO':'switch');if(!forced)team[pos].firstTurn=b.turn+1;return true}
function opponent(b){
 const out=[];for(let i=0;i<2;i++){
  const p=b.foes[i];if(!p||p.hp<=0)continue;let best=null;
  for(const move of p.moves){
   if(!known(move))continue;
   if(['Fake Out','First Impression'].includes(move)&&p.firstTurn!==b.turn)continue;
   if(move==='Trick Room'&&b.trickRoomTurns)continue;
   if(move==='Tailwind'&&b.tailwind[1])continue;
   for(let target=0;target<2;target++){
    const d=b.ours[target];if(!d?.hp)continue;
    const candidate=dmg(b,p,d,move);
    const hit=Math.min(candidate?.hp||0,d.hp);
    let score=hit/Math.max(1,d.maxHP)*100+(candidate?.hp>=d.hp?42:0);
    if(move==='Fake Out')score+=28;
    if(move==='Trick Room')score=b.trickRoomTurns?0:b.foes.slice(0,2).reduce((n,t)=>n+((t&&speed(b,t)<speed(b,d))?10:0),15);
    if(move==='Tailwind')score=25;
    if(move==='Protect')score=p.health<=35?27:2;
    if(move==='Helping Hand')score=15;
    if(!best||score>best.score)best={side:1,pos:i,move,target,score};
   }
  }
  if(best){if(p.megaForm&&!b.megaUsed[1])best.mega=true;out.push(best)}
 }
 return out;
}
function actionPriority(b,p,m){const statusMove=self.has(m)||(extra.has(m)&&m!=='Fake Out')||core().MOVES[m]?.[2]==='status';return (priority[m]||0)+(p.ability==='Prankster'&&statusMove?1:0)}
function turn(b,actions){if(b.phase!=='playing')throw Error('Sostituzione necessaria o partita conclusa');if(actions?.length!==2)throw Error('Due azioni richieste');
for(let i=0;i<2;i++){if(!b.ours[i]?.hp){if(actions[i]?.move==='__pass__')continue;throw Error('Pokémon esausto da sostituire')}if(!actions[i]?.move)throw Error('Azione mancante');if(actions[i].move!=='__switch__'&&!b.ours[i].moves.includes(actions[i].move))throw Error('Mossa non presente nel set')}
b.guards=[false,false];b.quickGuard=[false,false];b.redirect=[null,null];b.screens=b.screens||[{},{}];for(const t of b.team.flat()){t.protected=false;t.flinch=false;t.helping=false;t.protectUsed=false}
const queue=[...actions.map((a,i)=>({side:0,pos:i,...a})),...opponent(b)];for(const a of queue){const p=b.team[a.side][a.pos];if(p?.encoreTurns>0&&p.encoreMove&&a.move!=='__switch__'){a.move=p.encoreMove;msg(b,p.name+' deve ripetere '+a.move+' per Encore.')}}b.actionMap=[[],[]];for(const a of queue)b.actionMap[a.side][a.pos]=a;
for(const a of queue.filter(a=>a.move==='__switch__'))switchMon(b,a.side,a.pos,a.switchTo);
for(const a of queue.filter(a=>a.move!=='__switch__'&&a.mega))mega(b,b.team[a.side][a.pos]);
const ordered=queue.filter(a=>a.move!=='__switch__'&&a.move!=='__pass__').map(a=>({...a,p:b.team[a.side][a.pos]}));
ordered.sort((a,z)=>actionPriority(b,z.p,z.move)-actionPriority(b,a.p,a.move)||(b.trickRoomTurns?speed(b,a.p)-speed(b,z.p):speed(b,z.p)-speed(b,a.p))||a.side-z.side);
msg(b,'── Turno '+(b.turn+1)+' ──'+(b.trickRoomTurns?' · Trick Room':''));
b.remainingActions=ordered;
return continueRound(b);
}
function continueRound(b){
 while(b.remainingActions.length){
  const action=b.remainingActions.shift();
  resolve(b,action);
  if(b.pivotSwitch){
    const pivot=b.pivotSwitch;
    if(pivot.side===0){
      b.phase='pivot';
      msg(b,(b.pivotCause||'Cambio')+': scegli una riserva per '+b.ours[pivot.pos].name+' prima che il turno continui.');
      return b;
    }
    const reserve=b.team[1].findIndex((x,i)=>i>=2&&x.hp>0);
    if(reserve>=2)switchPivot(b,1,pivot.pos,reserve);
    b.pivotSwitch=null;b.pivotCause='';
  }
 }
 b.remainingActions=[];
 for(const t of b.team.flat()){
  if(t.hp<=0)continue;
  if(t.status==='burn'){t.hp-=Math.max(1,F(t.maxHP/16));refresh(t)}
  if(t.taunt>0)t.taunt--;if(t.encoreTurns>0){t.encoreTurns--;if(!t.encoreTurns)t.encoreMove=null}if(!t.protectUsed)t.protectChain=0;
  if(t.item==='Leftovers'){t.hp+=Math.max(1,F(t.maxHP/16));refresh(t)}
 }
 if(b.trickRoomTurns)b.trickRoomTurns--;
 for(let i=0;i<2;i++)if(b.tailwind[i])b.tailwind[i]--;
 for(const sc of b.screens)for(const key of Object.keys(sc))if(sc[key]>0)sc[key]--;
 if(b.weatherTurns&&!--b.weatherTurns)b.weather='';
 if(b.terrainTurns&&!--b.terrainTurns)b.terrain='';
 b.turn++;b.replace=[];
 for(let side=0;side<2;side++)for(let pos=0;pos<2;pos++)
  if(!b.team[side][pos]?.hp&&b.team[side].some((t,j)=>j>=2&&t.hp>0)){
   if(side===0){b.replace.push(pos);msg(b,'Il Pokémon nello slot '+(pos+1)+' è esausto: scegli la riserva.')}
   else{const k=b.team[side].findIndex((t,j)=>j>=2&&t.hp>0);switchMon(b,side,pos,k,true)}
  }
 if(b.replace.length)b.phase='replace';
 else if(!b.ours.some(t=>t.hp)||!b.foes.some(t=>t.hp)){b.phase='finished';msg(b,b.ours.some(t=>t.hp)?'Vittoria!':'Sconfitta.')}
 else b.phase='playing';
 return b;
}
function switchPivot(b,side,pos,to){
 const team=b.team[side];const k=Number(to);
 if(k<2||k>=4||!team[k]||!team[k].hp)throw Error('Riserva non valida per Eject Button');
 const old=team[pos];[team[pos],team[k]]=[team[k],team[pos]];
 old.stages=[0,0,0,0,0,0];
 enter(b,team[pos],pos,(b.pivotCause||'Cambio')+' di '+old.name);
}
function pivotReplacement(b,to){
 if(b.phase!=='pivot'||!b.pivotSwitch||b.pivotSwitch.side!==0)throw Error('Nessuna scelta Eject Button richiesta');
 switchPivot(b,0,b.pivotSwitch.pos,to);b.pivotSwitch=null;b.pivotCause='';b.phase='playing';
 return continueRound(b);
}
function replacement(b,pos,to){if(!b.replace.includes(pos))throw Error('Nessuna sostituzione richiesta');if(!switchMon(b,0,pos,to,true))throw Error('Riserva non valida');b.replace=b.replace.filter(i=>i!==pos);if(!b.replace.length)b.phase='playing';return b}
root.SCOUT_BATTLE={make,init,turn,replacement,pivotReplacement,kind,known,dmg,speed};
})(typeof window!=='undefined'?window:globalThis);