/**
 * Every player-facing string, in Hinglish (`hi`) and English (`en`).
 * Some words stay identical in both on purpose (SHARMA JI CHAI, BUG FIXED, CTRL+Z · CONTINUE, COMBO).
 * Use `{name}` placeholders and `t('key', { name: value })` for values.
 */
import { load, save, KEYS } from '../storage';

export type Lang = 'hi' | 'en';

export const STRINGS = {
  // ---- brand / page shell ----
  brandSub: { hi: 'Office Run · by @cipherboy.dev', en: 'Office Run · by @cipherboy.dev' },
  langHi: { hi: 'Hinglish', en: 'Hinglish' },
  langEn: { hi: 'English', en: 'English' },
  langLabel: { hi: 'Bhasha', en: 'Language' },
  pause: { hi: 'Pause', en: 'Pause' },
  resume: { hi: '▶ WAPAS KAAM PE', en: '▶ BACK TO WORK' },
  restart: { hi: 'Restart', en: 'Restart' },
  soundOn: { hi: 'Sound on', en: 'Sound on' },
  soundOff: { hi: 'Sound off', en: 'Sound off' },
  fullscreen: { hi: 'Fullscreen', en: 'Fullscreen' },
  loading: { hi: 'Chai garam ho rahi hai...', en: 'Heating the chai...' },
  rotate: {
    hi: 'Phone ghumao: landscape mein mazaa double',
    en: 'Rotate your phone: landscape is twice the fun',
  },
  credits: {
    hi: 'Original characters aur art: @cipherboy.dev',
    en: 'Original characters and art: @cipherboy.dev',
  },

  // ---- info panels ----
  mapTitle1: { hi: 'Level 1-1 ka map', en: 'Level 1-1 map' },
  mapTitle2: { hi: 'Level 2 ka map', en: 'Level 2 map' },
  mapTitle3: { hi: 'Level 3 ka map', en: 'Level 3 map' },
  mapGoal1: {
    hi: 'Goal: 9:30 se pehle 1RK se metro tak pahuncho. Bandar se Office ID wapas lo!',
    en: 'Goal: get from your 1RK flat to the metro before 9:30. Win your office ID back from the monkey!',
  },
  mapGoal2: {
    hi: 'Goal: lobby se biometric tak pahuncho, Manager ko harao, aur 9:30 se pehle punch karo!',
    en: 'Goal: get from the lobby to the biometric machine, beat the Manager and punch in before 9:30!',
  },
  mapGoal3: {
    hi: 'Goal: lunch ke rush se bacho, Canteen Aunty ko harao, aur 1:30 se pehle desk pe wapas!',
    en: 'Goal: survive the lunch rush, beat the Canteen Aunty and get back to your desk before 1:30!',
  },
  howTitle: { hi: 'Kaise khelein', en: 'How to play' },
  howMove: { hi: '← → ya A D: chalo / bhaago', en: '← → or A D: move' },
  howJump: {
    hi: '↑, W ya Space: jump (dabaye raho = oonchi jump)',
    en: '↑, W or Space: jump (hold for higher)',
  },
  howStomp: {
    hi: 'Dushman ke upar kudo: bug fix, kutta khush',
    en: 'Jump on enemies: bugs get fixed, dogs get happy',
  },
  howCoins: { hi: '100 coins = +1 dil (max 5)', en: '100 coins = +1 heart (max 5)' },
  howChai: { hi: 'Chai = double jump (15 sec)', en: 'Chai = double jump (15 s)' },
  howPhones: {
    hi: 'Headphones = invincible, sab MUTE (8 sec)',
    en: 'Headphones = invincible, everything MUTED (8 s)',
  },
  howHazard: {
    hi: 'Bus, eent aur kele se bacho: inpe kuda nahi ja sakta',
    en: "Dodge buses, bricks and bananas: you can't stomp them",
  },
  howPause: {
    hi: 'P ya Esc: pause · Phone pe neeche buttons',
    en: 'P or Esc: pause · On phones, use the buttons below',
  },
  howDash: { hi: 'Shift: coffee dash (sirf Level 2)', en: 'Shift: coffee dash (Level 2 only)' },

  // ---- zones: Level 1 ----
  z1_1: { hi: '1RK Building', en: '1RK Building' },
  z1_2: { hi: 'Gali', en: 'The Lane' },
  z1_3: { hi: 'Main Road', en: 'Main Road' },
  z1_cp: { hi: 'Chai Tapri', en: 'Chai Stall' },
  z1_4: { hi: 'Construction', en: 'Construction Site' },
  z1_5: { hi: 'Chhatein', en: 'Rooftops' },
  z1_6: { hi: 'Metro Station', en: 'Metro Station' },
  z1_1Tip: { hi: 'Seedhiyan utro, toota step dhyaan se!', en: 'Go down the stairs. Watch the broken step!' },
  z1_2Tip: { hi: 'Kapdon ki rassi par kudo, kutte peeche!', en: 'Jump across the clotheslines. Dogs ahead!' },
  z1_3Tip: {
    hi: 'Auto ki chhat pe chadho, DTC bus se bacho!',
    en: 'Ride the auto roof to dodge the city bus!',
  },
  z1_cpTip: { hi: 'Chai pi lo: double jump milega', en: 'Drink the chai to get a double jump' },
  z1_4Tip: { hi: 'Upar dekho, eentein gir rahi hain!', en: 'Look up: bricks are falling!' },
  z1_5Tip: { hi: 'Bandar ne tumhara Office ID chheen liya!', en: 'A monkey stole your office ID!' },
  z1_6Tip: { hi: 'Darwaza band hone se pehle andar ghuso!', en: 'Get in before the doors close!' },
  z1_1Desc: {
    hi: 'Crate ki seedhiyan, toota step, pehla bug',
    en: 'Crate stairs, a broken step, your first bug',
  },
  z1_2Desc: { hi: 'Kapdon ki rassi, gali ke kutte', en: 'Clotheslines and street dogs' },
  z1_3Desc: { hi: 'Auto ki chhat, gaay, DTC bus', en: 'Auto roof, a cow, the DTC bus' },
  z1_cpDesc: { hi: 'Checkpoint + free chai', en: 'Checkpoint + free chai' },
  z1_4Desc: { hi: 'Hilte beam, girti eentein', en: 'Moving beams, falling bricks' },
  z1_5Desc: { hi: 'Chhat se chhat, Bandar mini-boss', en: 'Roof hopping, Monkey mini-boss' },
  z1_6Desc: {
    hi: 'Ulta escalator, scanner, 25 sec ka darwaza',
    en: 'Reverse escalator, scanner, 25-second doors',
  },

  // ---- zones: Level 2 ----
  z2_1: { hi: 'Lobby', en: 'Lobby' },
  z2_2: { hi: 'Lift Shaft', en: 'Lift Shaft' },
  z2_3: { hi: 'Open Office', en: 'Open Office' },
  z2_cp: { hi: 'Water Cooler', en: 'Water Cooler' },
  z2_4: { hi: 'Pantry', en: 'Pantry' },
  z2_5: { hi: 'Server Room', en: 'Server Room' },
  z2_boss: { hi: 'Meeting Room', en: 'Meeting Room' },
  z2_fin: { hi: 'Biometric', en: 'Biometric' },
  z2_1Tip: { hi: 'ID dikhao, turnstile kholo!', en: 'Show your ID to open the turnstile!' },
  z2_2Tip: { hi: 'Lift pakdo. Laal wali FULL hai!', en: 'Catch a lift. The red one is FULL!' },
  z2_3Tip: { hi: 'Kursi pe sawaari, coworkers se bacho!', en: 'Ride the chairs, avoid the coworkers!' },
  z2_cpTip: { hi: 'Coffee lo: Shift se dash!', en: 'Grab a coffee: Shift to dash!' },
  z2_4Tip: { hi: 'Farsh geela hai, popcorn phat rahe hain!', en: 'Wet floor and popping popcorn!' },
  z2_5Tip: {
    hi: 'Andhera hai. Laser se bacho, AC hawa pakdo!',
    en: "It's dark. Dodge the lasers, ride the AC air!",
  },
  z2_bossTip: { hi: 'Manager: "Ek quick call?"', en: 'Manager: "Got a minute for a quick call?"' },
  z2_finTip: { hi: '9:30 se pehle punch karo!', en: 'Punch in before 9:30!' },
  z2_1Desc: { hi: 'Turnstile, receptionist', en: 'Turnstile, receptionist' },
  z2_2Desc: { hi: 'Lift cabins, "LIFT FULL!"', en: 'Lift cabins, "LIFT FULL!"' },
  z2_3Desc: {
    hi: 'Desks, rolling chairs, printer, coworkers',
    en: 'Desks, rolling chairs, printer, coworkers',
  },
  z2_cpDesc: { hi: 'Checkpoint + coffee dash', en: 'Checkpoint + coffee dash' },
  z2_4Desc: { hi: 'Geela farsh, popcorn microwave, fridge', en: 'Wet floor, popcorn microwave, fridge' },
  z2_5Desc: { hi: 'Andhera, firewall laser, AC updraft', en: 'Darkness, firewall lasers, AC updrafts' },
  z2_bossDesc: { hi: 'Manager boss, 3 phase', en: 'Manager boss, 3 phases' },
  z2_finDesc: { hi: 'Punch in, promotion!', en: 'Punch in, get promoted!' },

  // ---- zones: Level 3 ----
  z3_1: { hi: 'Cafeteria', en: 'Cafeteria' },
  z3_2: { hi: 'Food Counters', en: 'Food Counters' },
  z3_cp: { hi: 'Chai Counter', en: 'Chai Counter' },
  z3_3: { hi: 'Dal Spill Zone', en: 'Dal Spill Zone' },
  z3_4: { hi: 'Plate Stack', en: 'Plate Stack' },
  z3_boss: { hi: 'Kitchen', en: 'Kitchen' },
  z3_fin: { hi: 'Wapas Desk', en: 'Back to Desk' },
  z3_1Tip: { hi: 'Line mein lago... ya upar se kood jao!', en: 'Join the queue... or jump right over it!' },
  z3_2Tip: { hi: 'Tray pe sawaari, tawa ke tel se bacho!', en: 'Ride the trays, dodge the hot tawa oil!' },
  z3_cpTip: { hi: 'Cutting chai pi lo: double jump!', en: 'Grab a cutting chai: double jump!' },
  z3_3Tip: {
    hi: 'Dal gir gayi! Farsh phisal raha hai',
    en: 'Someone spilled the dal! The floor is slippery',
  },
  z3_4Tip: { hi: 'Upar dekho, plates gir rahi hain!', en: 'Look up: plates are falling!' },
  z3_bossTip: { hi: 'Canteen Aunty: "Aur roti loge?"', en: 'Canteen Aunty: "One more roti?"' },
  z3_finTip: { hi: '1:30 se pehle desk pe wapas!', en: 'Back at your desk before 1:30!' },
  z3_1Desc: { hi: 'Lambi queue, bhookhe coworkers', en: 'Long queues, hungry coworkers' },
  z3_2Desc: { hi: 'Tray conveyor, garam tawa', en: 'Tray conveyor, hot tawa' },
  z3_cpDesc: { hi: 'Checkpoint + cutting chai', en: 'Checkpoint + cutting chai' },
  z3_3Desc: { hi: 'Phisalti dal, bugs, lunch invites', en: 'Slippery dal, bugs, lunch invites' },
  z3_4Desc: { hi: 'Plate towers, girti plates', en: 'Plate towers, falling plates' },
  z3_bossDesc: { hi: 'Canteen Aunty boss, 3 phase', en: 'Canteen Aunty boss, 3 phases' },
  z3_finDesc: { hi: 'Punch back, promotion!', en: 'Punch back in, get promoted!' },

  // ---- title / select ----
  world1: { hi: 'WORLD 1-1 · GHAR SE METRO', en: 'WORLD 1-1 · HOME TO METRO' },
  world2: { hi: 'WORLD 1-2 · OFFICE FLOOR', en: 'WORLD 1-2 · OFFICE FLOOR' },
  world3: { hi: 'WORLD 1-3 · LUNCH BREAK', en: 'WORLD 1-3 · LUNCH BREAK' },
  level1Name: { hi: 'Ghar se Metro', en: 'Home to Metro' },
  level2Name: { hi: 'Office Floor', en: 'Office Floor' },
  level3Name: { hi: 'Lunch Break', en: 'Lunch Break' },
  logoTop: { hi: 'SUPER CIPHER', en: 'SUPER CIPHER' },
  logoBottom: { hi: 'OFFICE RUN', en: 'OFFICE RUN' },
  sub: {
    hi: '9:30 ki meeting hai. 1RK se nikal ke metro pakdo: kutton se bacho, bugs fix karo, chai pi ke double jump maaro!',
    en: 'Your meeting is at 9:30. Get from your 1RK flat to the metro: dodge dogs, fix bugs, and drink chai for a double jump!',
  },
  chooseChar: { hi: 'Apna hero chuno', en: 'Pick your hero' },
  charBoy: { hi: 'Cipherboy', en: 'Cipherboy' },
  charGirl: { hi: 'Ciphergirl', en: 'Ciphergirl' },
  perkHighJump: { hi: 'Perk: oonchi jump', en: 'Perk: high jump' },
  perkFastRun: { hi: 'Perk: tez daud', en: 'Perk: fast run' },
  start: { hi: '▶ NAUKRI SHURU', en: '▶ START WORK' },
  levels: { hi: 'LEVELS', en: 'LEVELS' },
  controlsHint: {
    hi: '← → chalo · ↑/Space jump · P pause · Enter se shuru',
    en: '← → move · ↑/Space jump · P pause · Enter to start',
  },
  selectTitle: { hi: 'Level chuno', en: 'Choose a level' },
  back: { hi: '← Wapas', en: '← Back' },
  best: { hi: 'Best', en: 'Best' },
  locked: { hi: 'LOCKED', en: 'LOCKED' },
  unlockToPlay: { hi: 'Unlock karo ▶', en: 'Unlock ▶' },
  play: { hi: '▶ KHELO', en: '▶ PLAY' },
  comingSoon: { hi: 'Level {n} jaldi aa raha hai', en: 'Level {n} coming soon' },
  followForNews: { hi: 'Naye level ki khabar ke liye follow karo', en: 'Follow for new level drops' },

  // ---- pause / game over ----
  paused: { hi: 'PAUSED', en: 'PAUSED' },
  pauseSub: {
    hi: 'Chai break chal raha hai. Manager ko mat batana.',
    en: "Chai break in progress. Don't tell your manager.",
  },
  overBig: { hi: 'RESIGNATION ACCEPTED', en: 'RESIGNATION ACCEPTED' },
  overMsg: {
    hi: 'Saare dil khatam. Par HR ne ek mauka aur diya hai.',
    en: 'You ran out of hearts. HR is giving you one more chance.',
  },
  overNote: {
    hi: 'CTRL+Z se last checkpoint se shuru karo (score aadha ho jayega).',
    en: 'CTRL+Z restarts from the last checkpoint (your score is halved).',
  },
  continue: { hi: 'CTRL+Z · CONTINUE', en: 'CTRL+Z · CONTINUE' },
  startOver: { hi: 'Shuru se', en: 'Start over' },
  menu: { hi: 'Menu', en: 'Menu' },

  // ---- level clear ----
  clearBig: { hi: 'METRO PAKAD LI!', en: 'YOU CAUGHT THE METRO!' },
  clearBig2: { hi: 'PRESENT! TIME PE PAHUNCH GAYE!', en: 'PRESENT! YOU MADE IT ON TIME!' },
  clearBig3: { hi: 'PET BHARA, KAAM SHURU!', en: 'LUNCH DONE, BACK TO WORK!' },
  title1: { hi: 'Jugaadu Intern', en: 'Hustling Intern' },
  title2: { hi: 'Chai-Sutta Engineer', en: 'Chai-Powered Engineer' },
  title3: { hi: 'Tech Lead Material', en: 'Tech Lead Material' },
  promotion: { hi: 'Promotion: {from} → {to}', en: 'Promotion: {from} → {to}' },
  statScore: { hi: 'Score', en: 'Score' },
  statCoins: { hi: 'Coins', en: 'Coins' },
  statTime: { hi: 'Time', en: 'Time' },
  statBest: { hi: 'Best', en: 'Best' },
  statAppraisal: { hi: 'Appraisal', en: 'Appraisal' },
  newBest: { hi: 'NAYA BEST!', en: 'NEW BEST!' },
  unlockNext: { hi: 'LEVEL {n} UNLOCK KARO ▶', en: 'UNLOCK LEVEL {n} ▶' },
  nextLevel: { hi: 'LEVEL {n} ▶', en: 'LEVEL {n} ▶' },
  playAgain: { hi: '▶ PHIR SE', en: '▶ PLAY AGAIN' },
  copyChallenge: { hi: 'Challenge copy karo', en: 'Copy challenge' },
  copied: { hi: 'Copy ho gaya!', en: 'Copied!' },
  copyFailed: {
    hi: 'Copy nahi hua: text select karke copy karo',
    en: "Couldn't copy: select the text and copy it",
  },
  challenge: {
    hi: 'Maine Super Cipher: Office Run mein {s} score kiya aur {c} coins uthaye! Tu beat karke dikha. @cipherboy.dev',
    en: 'I scored {s} and collected {c} coins in Super Cipher: Office Run! Can you beat me? @cipherboy.dev',
  },
  starsHint1: { hi: '⭐ Level khatam', en: '⭐ Finish the level' },
  starsHint2: { hi: '⭐ 60% coins', en: '⭐ 60% of coins' },
  starsHint3a: { hi: '⭐ 4:00 se kam', en: '⭐ Under 4:00' },
  starsHint3b: { hi: '⭐ Saare 5 Appraisal Points', en: '⭐ All 5 Appraisal Points' },

  // ---- unlock flow ----
  unlockTitle: { hi: 'LEVEL {n} UNLOCK', en: 'UNLOCK LEVEL {n}' },
  unlockIntro: {
    hi: 'Level {n} ka code DM mein milega. 4 simple steps:',
    en: "You'll get the Level {n} code by DM. 4 simple steps:",
  },
  step1: { hi: '1. Story lagao', en: '1. Post a story' },
  step1Text: {
    hi: 'Screenshot lo ya long-press karke save karo, story par lagao, @cipherboy.dev ko tag karo',
    en: 'Take a screenshot or long-press to save, post it to your story and tag @cipherboy.dev',
  },
  saveCard: { hi: 'Card save karo', en: 'Save card' },
  openInstagram: { hi: 'Instagram kholo', en: 'Open Instagram' },
  step2: { hi: '2. Follow karo', en: '2. Follow' },
  follow: { hi: 'Follow @cipherboy.dev', en: 'Follow @cipherboy.dev' },
  step3: { hi: '3. DM karo', en: '3. Send a DM' },
  step3Text: { hi: 'Tumhara Player ID:', en: 'Your Player ID:' },
  copyDm: { hi: 'DM message copy karo', en: 'Copy DM message' },
  openDm: { hi: 'DM kholo', en: 'Open DM' },
  dmMessage: {
    hi: 'Hi! Maine Super Cipher Level 1-{done} clear kiya aur story lagayi 🎉 Mera Player ID: {pid}. Level {n} ka code bhej do please!',
    en: 'Hi! I cleared Super Cipher Level 1-{done} and posted a story 🎉 My Player ID: {pid}. Please send me the Level {n} code!',
  },
  step4: { hi: '4. Code daalo', en: '4. Enter the code' },
  codePlaceholder: { hi: '6-akshar ka code', en: '6-character code' },
  unlockBtn: { hi: 'UNLOCK', en: 'UNLOCK' },
  wrongCode: {
    hi: 'Ye code sahi nahi hai. DM mein mila code dobara check karo.',
    en: "That code isn't right. Check the code from your DM again.",
  },
  unlocked: { hi: 'LEVEL {n} UNLOCKED!', en: 'LEVEL {n} UNLOCKED!' },
  playLevel2: { hi: '▶ LEVEL {n} KHELO', en: '▶ PLAY LEVEL {n}' },
  close: { hi: 'Band karo', en: 'Close' },

  // ---- story card ----
  cardClear: { hi: 'LEVEL {n} CLEAR!', en: 'LEVEL {n} CLEAR!' },
  cardBeat: { hi: 'TU BEAT KARKE DIKHA!', en: 'CAN YOU BEAT ME?' },
  cardScore: { hi: 'SCORE', en: 'SCORE' },
  cardCoins: { hi: 'COINS', en: 'COINS' },
  cardAlt: { hi: 'Instagram story card: tumhara score', en: 'Instagram story card with your score' },

  // ---- admin ----
  adminTitle: { hi: 'Owner tool: unlock code', en: 'Owner tool: unlock code' },
  adminPid: { hi: 'Player ID', en: 'Player ID' },
  adminLevel: { hi: 'Level', en: 'Level' },
  adminGenerate: { hi: 'Code banao / Generate', en: 'Code banao / Generate' },
  adminCopy: { hi: 'Copy reply', en: 'Copy reply' },
  adminBadPid: { hi: 'Player ID aisa dikhna chahiye: CB-XXXXXX', en: 'Player ID should look like CB-XXXXXX' },
  adminReply: {
    hi: 'Shukriya story ke liye! / Thanks for the story! Level {n} unlock code ({pid}): {code}',
    en: 'Shukriya story ke liye! / Thanks for the story! Level {n} unlock code ({pid}): {code}',
  },

  // ---- in-game popups ----
  plusHeart: { hi: '+1 DIL!', en: '+1 HEART!' },
  bugFixed: { hi: 'BUG FIXED +100', en: 'BUG FIXED +100' },
  goodBoy: { hi: 'GOOD BOY +50', en: 'GOOD BOY +50' },
  bark: { hi: 'BHOW!', en: 'WOOF!' },
  meetingDeclined: { hi: 'MEETING DECLINED +200', en: 'MEETING DECLINED +200' },
  mute: { hi: 'MUTE!', en: 'MUTE!' },
  fell: { hi: 'GIR GAYE!', en: 'YOU FELL!' },
  dogBite: { hi: 'KAAT LIYA!', en: 'DOG BITE!' },
  bugHit: { hi: 'BUG NE KAATA!', en: 'BUGGED!' },
  meetingHit: { hi: 'MEETING ME PHAS GAYE!', en: 'STUCK IN A MEETING!' },
  busHit: { hi: 'BUS SE TAKKAR!', en: 'HIT BY THE BUS!' },
  brickHit: { hi: 'EENT LAGI!', en: 'BRICK TO THE HEAD!' },
  bananaHit: { hi: 'KELA LAGA!', en: 'BANANA HIT!' },
  monkeyHit: { hi: 'BANDAR NE MAARA!', en: 'MONKEY ATTACK!' },
  busWarn: { hi: 'BUS AA RAHI! ←', en: 'BUS COMING! ←' },
  honk: { hi: 'PAAN-PAAN!', en: 'HONK HONK!' },
  moo: { hi: 'MOO', en: 'MOO' },
  needId: { hi: 'ID CHAHIYE', en: 'NEED ID' },
  missedMetro: { hi: 'METRO CHHOOT GAYI! PHIR SE', en: 'MISSED THE METRO! TRY AGAIN' },
  doors: { hi: 'DARWAZA', en: 'DOORS' },
  beep: { hi: 'BEEP!', en: 'BEEP!' },
  chaiGot: { hi: 'CHAI! DOUBLE JUMP', en: 'CHAI! DOUBLE JUMP' },
  phonesGot: { hi: 'HEADPHONES! SAB MUTE', en: 'HEADPHONES! MUTE ALL' },
  coffeeGot: { hi: 'COFFEE! SHIFT = DASH', en: 'COFFEE! SHIFT = DASH' },
  idGot: { hi: 'OFFICE ID MIL GAYA! +500', en: 'GOT YOUR OFFICE ID! +500' },
  gateOpen: { hi: 'GATE KHUL GAYA!', en: 'GATE OPEN!' },
  checkpoint: { hi: 'CHAI BREAK! SAVE HO GAYA', en: 'CHAI BREAK! SAVED' },
  checkpoint2: { hi: 'PAANI PI LO! SAVE HO GAYA', en: 'WATER BREAK! SAVED' },
  combo: { hi: 'COMBO x{n}!', en: 'COMBO x{n}!' },
  bossMonkey: { hi: 'MINI-BOSS · BANDAR', en: 'MINI-BOSS · MONKEY' },
  monkeyName: { hi: 'BANDAR', en: 'MONKEY' },
  ook: { hi: 'OOK OOK!', en: 'OOK OOK!' },
  monkeyGone: { hi: 'BANDAR BHAAG GAYA!', en: 'THE MONKEY RAN OFF!' },
  shared: { hi: 'SHARMA JI CHAI', en: 'SHARMA JI CHAI' },
  saveFlag: { hi: 'SAVE', en: 'SAVE' },
  pit: { hi: 'GADDA', en: 'PIT' },
  exit: { hi: 'EXIT', en: 'EXIT' },
  poster: { hi: 'GYM CODE CHAI SLEEP REPEAT', en: 'GYM CODE CHAI SLEEP REPEAT' },
  time: { hi: 'TIME', en: 'TIME' },
  late: { hi: 'LATE MARK!', en: 'LATE MARK!' },

  // ---- Level 2 popups ----
  accessOk: { hi: 'BEEP! ACCESS OK', en: 'BEEP! ACCESS OK' },
  receptionist: { hi: 'Visitor ho? Register karo!', en: 'Visitor? Please register!' },
  liftFull: { hi: 'LIFT FULL!', en: 'LIFT FULL!' },
  dhakka: { hi: 'Dhakka!', en: 'Shove!' },
  floor7: { hi: 'FLOOR 7', en: 'FLOOR 7' },
  chairDrift: { hi: 'CHAIR DRIFT x2!', en: 'CHAIR DRIFT x2!' },
  coworkerAsk: { hi: 'Bhai ek help? 2 min!', en: 'Got a minute? Quick help!' },
  helpLater: { hi: 'HELP LATER +50', en: 'HELP LATER +50' },
  paperJam: { hi: 'PAPER JAM!', en: 'PAPER JAM!' },
  paperHit: { hi: 'PRINTOUT LAGA!', en: 'PAPER CUT!' },
  gossip: { hi: 'Suna? Appraisal late hai!', en: 'Heard? Appraisals are delayed!' },
  wetFloor: { hi: 'GEELA FARSH', en: 'WET FLOOR' },
  popPop: { hi: 'POP! POP!', en: 'POP! POP!' },
  popcornHit: { hi: 'GARAM POPCORN!', en: 'HOT POPCORN!' },
  laserHit: { hi: 'FIREWALL!', en: 'FIREWALL!' },
  appraisalGot: { hi: 'APPRAISAL POINT! {n}/5', en: 'APPRAISAL POINT! {n}/5' },
  bossManager: { hi: 'BOSS · MANAGER', en: 'BOSS · MANAGER' },
  managerName: { hi: 'MANAGER', en: 'MANAGER' },
  quickCall: { hi: 'Ek quick call?', en: 'Quick call?' },
  syncUp: { hi: 'Sync-up 9:30', en: 'Sync-up 9:30' },
  cameraOn: { hi: 'Camera on karo!', en: 'Camera on, please!' },
  deadline: { hi: 'Deadline kal hai!', en: 'Deadline is tomorrow!' },
  muted: { hi: 'MUTED! +300', en: 'MUTED! +300' },
  inviteHit: { hi: 'INVITE ACCEPT HO GAYA!', en: 'INVITE AUTO-ACCEPTED!' },
  ringHit: { hi: 'PHONE BAJ GAYA!', en: 'RING RING!' },
  deadlineHit: { hi: 'DEADLINE LAGI!', en: 'DEADLINE HIT!' },
  managerBye: { hi: 'Chalo, kal baat karte hain', en: "Let's take this offline" },
  phase1: { hi: 'Phase 1: Sync-up', en: 'Phase 1: Sync-up' },
  phase2: { hi: 'Phase 2: Camera on karo!', en: 'Phase 2: Camera on!' },
  phase3: { hi: 'Phase 3: Deadline!', en: 'Phase 3: Deadline!' },
  scanning: { hi: 'SCAN HO RAHA HAI...', en: 'SCANNING...' },
  present: { hi: 'PRESENT ✓ {time}', en: 'PRESENT ✓ {time}' },
  bioLocked: { hi: 'PEHLE MANAGER!', en: 'BEAT THE MANAGER FIRST!' },
  dash: { hi: 'DASH', en: 'DASH' },
  jump: { hi: 'JUMP', en: 'JUMP' },
  left: { hi: 'Baayein', en: 'Left' },
  right: { hi: 'Daayein', en: 'Right' },
  quarterDeadline: { hi: 'Q4 DEADLINE!!!', en: 'Q4 DEADLINE!!!' },
  quickCallScreen: { hi: 'EK QUICK CALL?', en: 'QUICK CALL?' },
  companyName: { hi: 'CIPHER TECH PVT. LTD.', en: 'CIPHER TECH PVT. LTD.' },
  // ---- Level 3 ----
  bossAunty: { hi: 'BOSS · CANTEEN AUNTY', en: 'BOSS · CANTEEN AUNTY' },
  auntyName: { hi: 'CANTEEN AUNTY', en: 'CANTEEN AUNTY' },
  auntyHi: { hi: 'Aur roti loge?', en: 'One more roti?' },
  auntyP1: { hi: 'Phase 1: Roti ki barsaat', en: 'Phase 1: Roti rain' },
  auntyP2: { hi: 'Phase 2: Garam sambar!', en: 'Phase 2: Hot sambar!' },
  auntyP3: { hi: 'Phase 3: Mirchi toofan!', en: 'Phase 3: Chilli storm!' },
  auntyLine2: { hi: 'Khana waste mat karo!', en: "Don't waste food!" },
  auntyLine3: { hi: 'Ab mirchi wala tadka!', en: 'Now the spicy tadka!' },
  auntyBye: { hi: 'Theek hai beta, kal jaldi aana', en: 'Fine, beta. Come early tomorrow' },
  cookerHit: { hi: 'SEETI BAJ GAYI! +300', en: 'WHISTLE BLOWN! +300' },
  rotiThrow: { hi: 'Garam roti!', en: 'Hot roti!' },
  rotiHit: { hi: 'ROTI LAGI!', en: 'ROTI TO THE FACE!' },
  sambarHit: { hi: 'GARAM SAMBAR!', en: 'HOT SAMBAR!' },
  chilliHit: { hi: 'MIRCHI LAGI! 🌶️', en: 'TOO SPICY! 🌶️' },
  oilHit: { hi: 'TEL KE CHHEENTE!', en: 'OIL SPLASH!' },
  plateHit: { hi: 'PLATE TOOTI!', en: 'PLATE CRASH!' },
  sizzle: { hi: 'CHHSSS!', en: 'SIZZLE!' },
  hotTawa: { hi: 'GARAM TAWA', en: 'HOT TAWA' },
  queueShout: { hi: 'Line mein lago bhai!', en: 'Hey, get in line!' },
  menuBoard: { hi: 'AAJ KA MENU', en: "TODAY'S MENU" },
  dalSpill: { hi: 'DAL GIRI HAI', en: 'DAL SPILL' },
  lunchOver: { hi: 'LUNCH LATE!', en: 'LUNCH OVERTIME!' },
  scareAunty: { hi: 'AUR ROTI LOGE?!', en: 'ONE MORE ROTI?!' },
  exitFullscreen: { hi: 'Fullscreen band karo', en: 'Exit fullscreen' },
  // Daily Manager mood
  moodTitle: { hi: 'AAJ KA MANAGER MOOD', en: "TODAY'S MANAGER MOOD" },
  moodSun: { hi: 'Overtime Sunday 😩', en: 'Overtime Sunday 😩' },
  moodSunDesc: { hi: 'Sab thode tez hain (+15%)', en: 'Everyone is a bit faster (+15%)' },
  moodMon: { hi: 'Monday Blues 😵', en: 'Monday Blues 😵' },
  moodMonDesc: { hi: 'Dushman 20% tez', en: 'Enemies 20% faster' },
  moodTue: { hi: 'Chai Tuesday ☕', en: 'Chai Tuesday ☕' },
  moodTueDesc: { hi: 'Power-ups double time', en: 'Power-ups last twice as long' },
  moodWed: { hi: 'Monsoon Wednesday 🌧️', en: 'Monsoon Wednesday 🌧️' },
  moodWedDesc: { hi: 'Baarish! Bahar sab geela', en: 'Rain! Everything outside is wet' },
  moodThu: { hi: 'Bug Bash Thursday 🐞', en: 'Bug Bash Thursday 🐞' },
  moodThuDesc: { hi: 'Bug fix = double points', en: 'Bug fixes score double' },
  moodFri: { hi: 'Friday Feeling 🎉', en: 'Friday Feeling 🎉' },
  moodFriDesc: { hi: 'Coins = double points', en: 'Coins score double' },
  moodSat: { hi: 'Half Day Saturday 😌', en: 'Half Day Saturday 😌' },
  moodSatDesc: { hi: 'Dushman aalsi (−15%)', en: 'Enemies are lazy (−15%)' },
  // Skins
  skinTitle: { hi: 'Style', en: 'Style' },
  skinNone: { hi: 'Normal', en: 'Classic' },
  skinLanyard: { hi: 'ID Lanyard', en: 'ID Lanyard' },
  skinCap: { hi: 'Cap', en: 'Cap' },
  skinShades: { hi: 'Shades 😎', en: 'Shades 😎' },
  skinGold: { hi: 'Gold Headphones', en: 'Gold Headphones' },
  skinLocked: { hi: '{n}⭐ chahiye', en: 'Needs {n}⭐' },
  // Overworld
  mapWorld: { hi: 'NAUKRI KA NAKSHA', en: 'CAREER MAP' },
  mapHome: { hi: 'Ghar', en: 'Home' },
  lv3: { hi: 'Lunch Break', en: 'Lunch Break' },
  lv4: { hi: 'Deadline Night', en: 'Deadline Night' },
  lv5: { hi: 'Client Visit', en: 'Client Visit' },
  lv6: { hi: 'Offsite Trip', en: 'Offsite Trip' },
  lv7: { hi: 'Appraisal Season', en: 'Appraisal Season' },
  lv8: { hi: 'Resign ya CTO?', en: 'Resign or CTO?' },
  soonShort: { hi: 'Jaldi aa raha', en: 'Coming soon' },
  // Intro cutscene
  introAlarm: { hi: 'TRRRING! 9:12!', en: 'TRRRING! 9:12!' },
  introWake: { hi: 'LATE HO GAYA!!', en: "I'M LATE!!" },
  introSkip: { hi: 'Skip: koi bhi button', en: 'Skip: any button' },
  // Promotion
  promoted: { hi: 'PROMOTION!', en: 'PROMOTED!' },
  // Clip
  saveClip: { hi: '🎬 Boss clip save karo', en: '🎬 Save boss clip' },
  // Reaction stickers
  stickerPit: { hi: 'BHAI KYA KAR RAHA HAI TU 😭', en: 'BRO WHAT ARE YOU DOING 😭' },
  stickerCombo: { hi: 'SIGMA DEV MODE 😎', en: 'SIGMA DEV MODE 😎' },
  stickerBoss: { hi: 'APPRAISAL PAKKA 💯', en: 'APPRAISAL SECURED 💯' },
  stickerClose: { hi: 'BAAL BAAL BACHE 😮‍💨', en: 'THAT WAS CLOSE 😮‍💨' },
  stickerClean: { hi: 'EK BHI DIL NAHI GAYA 🔥', en: 'FLAWLESS RUN 🔥' },
  onFire: { hi: 'ON FIRE!', en: 'ON FIRE!' },
  splat: { hi: 'SPLAT!', en: 'SPLAT!' },
  slip: { hi: 'PHISAL GAYE!', en: 'SLIPPED!' },
  tangled: { hi: 'CALENDAR MEIN PHANSE!', en: 'CALENDAR-TANGLED!' },
  scareMonkey: { hi: 'OOK OOK! ID MERA HAI!', en: 'OOK OOK! THE ID IS MINE!' },
  scareBug: { hi: 'BUG IN PRODUCTION!!!', en: 'BUG IN PRODUCTION!!!' },
  scareManager: { hi: 'EK QUICK CALL?!', en: 'GOT A MINUTE?!' },
} as const satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

let current: Lang = load(KEYS.lang) === 'en' ? 'en' : 'hi';
const listeners = new Set<(lang: Lang) => void>();

export const getLang = (): Lang => current;

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  save(KEYS.lang, lang);
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn: (lang: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function t(key: StringKey, vars?: Record<string, string | number>, lang: Lang = current): string {
  return format(STRINGS[key][lang], vars);
}

/** `<html lang>` value for a language. */
export const htmlLang = (lang: Lang): string => (lang === 'hi' ? 'hi-Latn' : 'en');
