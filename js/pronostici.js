/**
 * MONDIALITO 2026 — pronostici.js
 */

import DB from '../mondialito_db.json' with { type: 'json' };
import { STATE } from './app.js';
import { getPronostici, savePronostici, onSistemaSnapshot } from './db.js';
import { showToast, showSpinner } from './ui.js';

// ══════════════════════════════════════════
// SEDICESIMI: template bracket ufficiale FIFA 2026
// Slot '1'=primo, '2'=secondo, '3slot'=miglior terzo (assegnato da COMB_3I)
// ══════════════════════════════════════════
const SEDICESIMI_BRACKET = [
  { id:'S01', match:'M73', desc:'2° Girone A vs 2° Girone B', casa:{t:'2',g:'A'}, trasf:{t:'2',g:'B'} },
  { id:'S02', match:'M74', desc:'1° Girone E vs Miglior 3° (A/B/C/D/F)', casa:{t:'1',g:'E'}, trasf:{t:'3slot',slot:'E'} },
  { id:'S03', match:'M75', desc:'1° Girone F vs 2° Girone C', casa:{t:'1',g:'F'}, trasf:{t:'2',g:'C'} },
  { id:'S04', match:'M76', desc:'1° Girone C vs 2° Girone F', casa:{t:'1',g:'C'}, trasf:{t:'2',g:'F'} },
  { id:'S05', match:'M77', desc:'1° Girone I vs Miglior 3° (C/D/F/G/H)', casa:{t:'1',g:'I'}, trasf:{t:'3slot',slot:'I'} },
  { id:'S06', match:'M78', desc:'2° Girone E vs 2° Girone I', casa:{t:'2',g:'E'}, trasf:{t:'2',g:'I'} },
  { id:'S07', match:'M79', desc:'1° Girone A vs Miglior 3° (C/E/F/H/I)', casa:{t:'1',g:'A'}, trasf:{t:'3slot',slot:'A'} },
  { id:'S08', match:'M80', desc:'1° Girone L vs Miglior 3° (E/H/I/J/K)', casa:{t:'1',g:'L'}, trasf:{t:'3slot',slot:'L'} },
  { id:'S09', match:'M81', desc:'1° Girone D vs Miglior 3° (B/E/F/I/J)', casa:{t:'1',g:'D'}, trasf:{t:'3slot',slot:'D'} },
  { id:'S10', match:'M82', desc:'1° Girone G vs Miglior 3° (A/E/H/I/J)', casa:{t:'1',g:'G'}, trasf:{t:'3slot',slot:'G'} },
  { id:'S11', match:'M83', desc:'2° Girone K vs 2° Girone L', casa:{t:'2',g:'K'}, trasf:{t:'2',g:'L'} },
  { id:'S12', match:'M84', desc:'1° Girone H vs 2° Girone J', casa:{t:'1',g:'H'}, trasf:{t:'2',g:'J'} },
  { id:'S13', match:'M85', desc:'1° Girone B vs Miglior 3° (E/F/G/I/J)', casa:{t:'1',g:'B'}, trasf:{t:'3slot',slot:'B'} },
  { id:'S14', match:'M86', desc:'1° Girone J vs 2° Girone H', casa:{t:'1',g:'J'}, trasf:{t:'2',g:'H'} },
  { id:'S15', match:'M87', desc:'1° Girone K vs Miglior 3° (D/E/I/J/L)', casa:{t:'1',g:'K'}, trasf:{t:'3slot',slot:'K'} },
  { id:'S16', match:'M88', desc:'2° Girone D vs 2° Girone G', casa:{t:'2',g:'D'}, trasf:{t:'2',g:'G'} },
];

// Tabella 495 combinazioni FIFA (Annex C del regolamento)
// Chiave: 8 lettere dei gironi qualificati come 3° classificato (ordinati)
// Valore: 8 lettere del girone del 3° assegnato a ciascuno slot
// Ordine slot: A, B, D, E, G, I, K, L
const COMB_3I = {
  'ABCDEFGH':'HGBCAFDE','ABCDEFGI':'CGBDAFEI','ABCDEFGJ':'CGBDAFEJ',
  'ABCDEFGK':'CGBDAFEK','ABCDEFGL':'CGBDAFLE','ABCDEFHI':'HEBCAFIK',
  'ABCDEFHJ':'HJBCAFDE','ABCDEFHK':'HEBCAFDK','ABCDEFHL':'HFBCADLE',
  'ABCDEFIJ':'CJBDAFEI','ABCDEFIK':'CEBDAFIK','ABCDEFIL':'CEBDAFLI',
  'ABCDEFJK':'CJBDAFEK','ABCDEFJL':'CJBDAFLE','ABCDEFKL':'CEBDAFLK',
  'ABCDEGHI':'EGBCAHIK','ABCDEGHJ':'HGBCADEJ','ABCDEGHK':'EGBCAHIK',
  'ABCDEGHL':'HGBCADEL','ABCDEGIJ':'EJBCADIJ','ABCDEGIK':'EJBCADIK',
  'ABCDEGIL':'EJBCADLI','ABCDEGJK':'EJBCADJK','ABCDEGJL':'EJBCADLJ',
  'ABCDEGKL':'EJBCADLK','ABCDEHIJ':'HJBCADEI','ABCDEHIK':'HEBCADIK',
  'ABCDEHIL':'HEBCADLI','ABCDEHJK':'HJBCADEK','ABCDEHJL':'HJBCADLE',
  'ABCDEHKL':'HEBCADLK','ABCDEIJK':'EJBCADIK','ABCDEIJL':'EJBCADLI',
  'ABCDEIKL':'EIBCADLK','ABCDEJKL':'EJBCADLK','ABCDFGHI':'HGBCAFDI',
  'ABCDFGHJ':'HGBCAFDJ','ABCDFGHK':'HGBCAFDK','ABCDFGHL':'CGBDAFLH',
  'ABCDFGIJ':'CGBDAFIJ','ABCDFGIK':'CGBDAFIK','ABCDFGIL':'CGBDAFLI',
  'ABCDFGJK':'CGBDAFJK','ABCDFGJL':'CGBDAFLJ','ABCDFGKL':'CGBDAFLK',
  'ABCDFHIJ':'HJBCAFDI','ABCDFHIK':'HFBCADIK','ABCDFHIL':'HFBCADLI',
  'ABCDFHJK':'HJBCAFDK','ABCDFHJL':'CJBDAFLH','ABCDFHKL':'HFBCADLK',
  'ABCDFIJK':'CJBDAFIK','ABCDFIJL':'CJBDAFLI','ABCDFIKL':'CIBDAFLK',
  'ABCDFJKL':'CJBDAFLK','ABCDGHIJ':'HGBCADIJ','ABCDGHIK':'HGBCADIK',
  'ABCDGHIL':'HGBCADLI','ABCDGHJK':'HGBCADJK','ABCDGHJL':'HGBCADLJ',
  'ABCDGHKL':'HGBCADLK','ABCDGIJK':'CJBDAGIK','ABCDGIJL':'CJBDAGLI',
  'ABCDGIKL':'IGBCADLK','ABCDGJKL':'CJBDAGLK','ABCDHIJK':'HJBCADIK',
  'ABCDHIJL':'HJBCADLI','ABCDHIKL':'HIBCADLK','ABCDHJKL':'HJBCADLK',
  'ABCDIJKL':'IJBCADLK','ABCEFGHI':'HGBCAFEI','ABCEFGHJ':'HGBCAFEJ',
  'ABCEFGHK':'HGBCAFEK','ABCEFGHL':'HGBCAFLE','ABCEFGIJ':'EGBCAFIJ',
  'ABCEFGIK':'EGBCAFIK','ABCEFGIL':'EGBCAFLI','ABCEFGJK':'EGBCAFJK',
  'ABCEFGJL':'EGBCAFLJ','ABCEFGKL':'EGBCAFLK','ABCEFHIJ':'HJBCAFEI',
  'ABCEFHIK':'HEBCAFIK','ABCEFHIL':'HEBCAFLI','ABCEFHJK':'HJBCAFEK',
  'ABCEFHJL':'HJBCAFLE','ABCEFHKL':'HEBCAFLK','ABCEFIJK':'EJBCAFIK',
  'ABCEFIJL':'EJBCAFLI','ABCEFIKL':'EIBCAFLK','ABCEFJKL':'EJBCAFLK',
  'ABCEGHIJ':'HJBCAGEI','ABCEGHIK':'EGBCAHIK','ABCEGHIL':'EGBCAHLI',
  'ABCEGHJK':'HJBCAGEK','ABCEGHJL':'HJBCAGLE','ABCEGHKL':'EGBCAHLK',
  'ABCEGIJK':'EJBCAGIK','ABCEGIJL':'EJBCAGLI','ABCEGIKL':'EGBAICLK',
  'ABCEGJKL':'EJBCAGLK','ABCEHIJK':'EJBCAHIK','ABCEHIJL':'EJBCAHLI',
  'ABCEHIKL':'EIBCAHLK','ABCEHJKL':'EJBCAHLK','ABCEIJKL':'EJBAICLK',
  'ABCFGHIJ':'HGBCAFIJ','ABCFGHIK':'HGBCAFIK','ABCFGHIL':'HGBCAFLI',
  'ABCFGHJK':'HGBCAFJK','ABCFGHJL':'HGBCAFLJ','ABCFGHKL':'HGBCAFLK',
  'ABCFGIJK':'CJBFAGIK','ABCFGIJL':'CJBFAGLI','ABCFGIKL':'IGBCAFLK',
  'ABCFGJKL':'CJBFAGLK','ABCFHIJK':'HJBCAFIK','ABCFHIJL':'HJBCAFLI',
  'ABCFHIKL':'HIBCAFLK','ABCFHJKL':'HJBCAFLK','ABCFIJKL':'IJBCAFLK',
  'ABCGHIJK':'HJBCAGIK','ABCGHIJL':'HJBCAGLI','ABCGHIKL':'IGBCAHLK',
  'ABCGHJKL':'HJBCAGLK','ABCGIJKL':'IJBCAGLK','ABCHIJKL':'IJBCAHLK',
  'ABDEFGHI':'HGBDAFEI','ABDEFGHJ':'HGBDAFEJ','ABDEFGHK':'HGBDAFEK',
  'ABDEFGHL':'HGBDAFLE','ABDEFGIJ':'EGBDAFIJ','ABDEFGIK':'EGBDAFIK',
  'ABDEFGIL':'EGBDAFLI','ABDEFGJK':'EGBDAFJK','ABDEFGJL':'EGBDAFLJ',
  'ABDEFGKL':'EGBDAFLK','ABDEFHIJ':'HJBDAFEI','ABDEFHIK':'HEBDAFIK',
  'ABDEFHIL':'HEBDAFLI','ABDEFHJK':'HJBDAFEK','ABDEFHJL':'HJBDAFLE',
  'ABDEFHKL':'HEBDAFLK','ABDEFIJK':'EJBDAFIK','ABDEFIJL':'EJBDAFLI',
  'ABDEFIKL':'EIBDAFLK','ABDEFJKL':'EJBDAFLK','ABDEGHIJ':'HJBDAGEI',
  'ABDEGHIK':'EGBDAHIK','ABDEGHIL':'EGBDAHLI','ABDEGHJK':'HJBDAGEK',
  'ABDEGHJL':'HJBDAGLE','ABDEGHKL':'EGBDAHLK','ABDEGIJK':'EJBDAGIK',
  'ABDEGIJL':'EJBDAGLI','ABDEGIKL':'EGBAIDLK','ABDEGJKL':'EJBDAGLK',
  'ABDEHIJK':'EJBDAHIK','ABDEHIJL':'EJBDAHLI','ABDEHIKL':'EIBDAHLK',
  'ABDEHJKL':'EJBDAHLK','ABDEIJKL':'EJBAIDLK','ABDFGHIJ':'HGBDAFIJ',
  'ABDFGHIK':'HGBDAFIK','ABDFGHIL':'HGBDAFLI','ABDFGHJK':'HGBDAFJK',
  'ABDFGHJL':'HGBDAFLJ','ABDFGHKL':'HGBDAFLK','ABDFGIJK':'FJBDAGIK',
  'ABDFGIJL':'FJBDAGLI','ABDFGIKL':'IGBDAFLK','ABDFGJKL':'FJBDAGLK',
  'ABDFHIJK':'HJBDAFIK','ABDFHIJL':'HJBDAFLI','ABDFHIKL':'HIBDAFLK',
  'ABDFHJKL':'HJBDAFLK','ABDFIJKL':'IJBDAFLK','ABDGHIJK':'HJBDAGIK',
  'ABDGHIJL':'HJBDAGLI','ABDGHIKL':'IGBDAHLK','ABDGHJKL':'HJBDAGLK',
  'ABDGIJKL':'IJBDAGLK','ABDHIJKL':'IJBDAHLK','ABEFGHIJ':'HJBFAGEI',
  'ABEFGHIK':'EGBFAHIK','ABEFGHIL':'EGBFAHLI','ABEFGHJK':'HJBFAGEK',
  'ABEFGHJL':'HJBFAGLE','ABEFGHKL':'EGBFAHLK','ABEFGIJK':'EJBFAGIK',
  'ABEFGIJL':'EJBFAGLI','ABEFGIKL':'EGBAIFLK','ABEFGJKL':'EJBFAGLK',
  'ABEFHIJK':'EJBFAHIK','ABEFHIJL':'EJBFAHLI','ABEFHIKL':'EIBFAHLK',
  'ABEFHJKL':'EJBFAHLK','ABEFIJKL':'EJBAIFLK','ABEGHIJK':'EJBAHGIK',
  'ABEGHIJL':'EJBAHGLI','ABEGHIKL':'EGBAIHLK','ABEGHJKL':'EJBAHGLK',
  'ABEGIJKL':'EJBAIGLK','ABEHIJKL':'EJBAIHLK','ABFGHIJK':'HJBFAGIK',
  'ABFGHIJL':'HJBFAGLI','ABFGHIKL':'HGBAIFLK','ABFGHJKL':'HJBFAGLK',
  'ABFGIJKL':'IJBFAGLK','ABFHIJKL':'HJBAIFLK','ABGHIJKL':'HJBAIGLK',
  'ACDEFGHI':'HGECAFDI','ACDEFGHJ':'HGJCAFDE','ACDEFGHK':'HGECAFDK',
  'ACDEFGHL':'HGFCADLE','ACDEFGIJ':'CGJDAFEI','ACDEFGIK':'CGEDAFIK',
  'ACDEFGIL':'CGEDAFLI','ACDEFGJK':'CGJDAFEK','ACDEFGJL':'CGJDAFLE',
  'ACDEFGKL':'CGEDAFLK','ACDEFHIJ':'HJECAFDI','ACDEFHIK':'HEFCADIK',
  'ACDEFHIL':'HEFCADLI','ACDEFHJK':'HJECAFDK','ACDEFHJL':'HJFCADLE',
  'ACDEFHKL':'HEFCADLK','ACDEFIJK':'CJEDAFIK','ACDEFIJL':'CJEDAFLI',
  'ACDEFIKL':'CEIDAFLK','ACDEFJKL':'CJEDAFLK','ACDEGHIJ':'HGJCADEI',
  'ACDEGHIK':'HGECADIK','ACDEGHIL':'HGECADLI','ACDEGHJK':'HGJCADEK',
  'ACDEGHJL':'HGJCADLE','ACDEGHKL':'HGECADLK','ACDEGIJK':'EGJCADIK',
  'ACDEGIJL':'EGJCADLI','ACDEGIKL':'EGICADLK','ACDEGJKL':'EGJCADLK',
  'ACDEHIJK':'HJECADIK','ACDEHIJL':'HJECADLI','ACDEHIKL':'HEICADLK',
  'ACDEHJKL':'HJECADLK','ACDEIJKL':'EJICADLK','ACDFGHIJ':'HGJCAFDI',
  'ACDFGHIK':'HGFCADIK','ACDFGHIL':'HGFCADLI','ACDFGHJK':'HGJCAFDK',
  'ACDFGHJL':'CGJDAFLH','ACDFGHKL':'HGFCADLK','ACDFGIJK':'CGJDAFIK',
  'ACDFGIJL':'CGJDAFLI','ACDFGIKL':'CGIDAFLK','ACDFGJKL':'CGJDAFLK',
  'ACDFHIJK':'HJFCADIK','ACDFHIJL':'HJFCADLI','ACDFHIKL':'HFICADLK',
  'ACDFHJKL':'HJFCADLK','ACDFIJKL':'CJIDAFLK','ACDGHIJK':'HGJCADIK',
  'ACDGHIJL':'HGJCADLI','ACDGHIKL':'HGICADLK','ACDGHJKL':'HGJCADLK',
  'ACDGIJKL':'IGJCADLK','ACDHIJKL':'HJICADLK','ACEFGHIJ':'HGJCAFEI',
  'ACEFGHIK':'HGECAFIK','ACEFGHIL':'HGECAFLI','ACEFGHJK':'HGJCAFEK',
  'ACEFGHJL':'HGJCAFLE','ACEFGHKL':'HGECAFLK','ACEFGIJK':'EGJCAFIK',
  'ACEFGIJL':'EGJCAFLI','ACEFGIKL':'EGICAFLK','ACEFGJKL':'EGJCAFLK',
  'ACEFHIJK':'HJECAFIK','ACEFHIJL':'HJECAFLI','ACEFHIKL':'HEICAFLK',
  'ACEFHJKL':'HJECAFLK','ACEFIJKL':'EJICAFLK','ACEGHIJK':'EGJCAHIK',
  'ACEGHIJL':'EGJCAHLI','ACEGHIKL':'EGICAHLK','ACEGHJKL':'EGJCAHLK',
  'ACEGIJKL':'EJICAGLK','ACEHIJKL':'EJICAHLK','ACFGHIJK':'HGJCAFIK',
  'ACFGHIJL':'HGJCAFLI','ACFGHIKL':'HGICAFLK','ACFGHJKL':'HGJCAFLK',
  'ACFGIJKL':'IGJCAFLK','ACFHIJKL':'HJICAFLK','ACGHIJKL':'HJICAGLK',
  'ADEFGHIJ':'HGJDAFEI','ADEFGHIK':'HGEDAFIK','ADEFGHIL':'HGEDAFLI',
  'ADEFGHJK':'HGJDAFEK','ADEFGHJL':'HGJDAFLE','ADEFGHKL':'HGEDAFLK',
  'ADEFGIJK':'EGJDAFIK','ADEFGIJL':'EGJDAFLI','ADEFGIKL':'EGIDAFLK',
  'ADEFGJKL':'EGJDAFLK','ADEFHIJK':'HJEDAFIK','ADEFHIJL':'HJEDAFLI',
  'ADEFHIKL':'HEIDAFLK','ADEFHJKL':'HJEDAFLK','ADEFIJKL':'EJIDAFLK',
  'ADEGHIJK':'EGJDAHIK','ADEGHIJL':'EGJDAHLI','ADEGHIKL':'EGIDAHLK',
  'ADEGHJKL':'EGJDAHLK','ADEGIJKL':'EJIDAGLK','ADEHIJKL':'EJIDAHLK',
  'ADFGHIJK':'HGJDAFIK','ADFGHIJL':'HGJDAFLI','ADFGHIKL':'HGIDAFLK',
  'ADFGHJKL':'HGJDAFLK','ADFGIJKL':'IGJDAFLK','ADFHIJKL':'HJIDAFLK',
  'ADGHIJKL':'HJIDAGLK','AEFGHIJK':'EGJFAHIK','AEFGHIJL':'EGJFAHLI',
  'AEFGHIKL':'EGIFAHLK','AEFGHJKL':'EGJFAHLK','AEFGIJKL':'EJIFAGLK',
  'AEFHIJKL':'EJIFAHLK','AEGHIJKL':'EJIAHGLK','AFGHIJKL':'HJIFAGLK',
  'BCDEFGHI':'CGBDHFEI','BCDEFGHJ':'HGBCJFDE','BCDEFGHK':'CGBDHFEK',
  'BCDEFGHL':'CGBDHFLE','BCDEFGIJ':'CGBDJFEI','BCDEFGIK':'CGBDEFIK',
  'BCDEFGIL':'CGBDEFLI','BCDEFGJK':'CGBDJFEK','BCDEFGJL':'CGBDJFLE',
  'BCDEFGKL':'CGBDEFLK','BCDEFHIJ':'CJBDHFEI','BCDEFHIK':'CEBDHFIK',
  'BCDEFHIL':'CEBDHFLI','BCDEFHJK':'CJBDHFEK','BCDEFHJL':'CJBDHFLE',
  'BCDEFHKL':'CEBDHFLK','BCDEFIJK':'CJBDEFIK','BCDEFIJL':'CJBDEFLI',
  'BCDEFIKL':'CEBDIFLK','BCDEFJKL':'CJBDEFLK','BCDEGHIJ':'HGBCJDEI',
  'BCDEGHIK':'EGBCHDIK','BCDEGHIL':'EGBCHDLI','BCDEGHJK':'HGBCJDEK',
  'BCDEGHJL':'HGBCJDLE','BCDEGHKL':'EGBCHDLK','BCDEGIJK':'EGBCJDIK',
  'BCDEGIJL':'EGBCJDLI','BCDEGIKL':'EGBCIDLK','BCDEGJKL':'EGBCJDLK',
  'BCDEHIJK':'EJBCHDIK','BCDEHIJL':'EJBCHDLI','BCDEHIKL':'EIBCHDLK',
  'BCDEHJKL':'EJBCHDLK','BCDEIJKL':'EJBCIDLK','BCDFGHIJ':'HGBCJFDI',
  'BCDFGHIK':'CGBDHFIK','BCDFGHIL':'CGBDHFLI','BCDFGHJK':'HGBCJFDK',
  'BCDFGHJL':'CGBDHFLJ','BCDFGHKL':'CGBDHFLK','BCDFGIJK':'CGBDJFIK',
  'BCDFGIJL':'CGBDJFLI','BCDFGIKL':'CGBDIFLK','BCDFGJKL':'CGBDJFLK',
  'BCDFHIJK':'CJBDHFIK','BCDFHIJL':'CJBDHFLI','BCDFHIKL':'CIBDHFLK',
  'BCDFHJKL':'CJBDHFLK','BCDFIJKL':'CJBDIFLK','BCDGHIJK':'HGBCJDIK',
  'BCDGHIJL':'HGBCJDLI','BCDGHIKL':'HGBCIDLK','BCDGHJKL':'HGBCJDLK',
  'BCDGIJKL':'IGBCJDLK','BCDHIJKL':'HJBCIDLK','BCEFGHIJ':'HGBCJFEI',
  'BCEFGHIK':'EGBCHFIK','BCEFGHIL':'EGBCHFLI','BCEFGHJK':'HGBCJFEK',
  'BCEFGHJL':'HGBCJFLE','BCEFGHKL':'EGBCHFLK','BCEFGIJK':'EGBCJFIK',
  'BCEFGIJL':'EGBCJFLI','BCEFGIKL':'EGBCIFLK','BCEFGJKL':'EGBCJFLK',
  'BCEFHIJK':'EJBCHFIK','BCEFHIJL':'EJBCHFLI','BCEFHIKL':'EIBCHFLK',
  'BCEFHJKL':'EJBCHFLK','BCEFIJKL':'EJBCIFLK','BCEGHIJK':'EJBCHGIK',
  'BCEGHIJL':'EJBCHGLI','BCEGHIKL':'EGBCIHLK','BCEGHJKL':'EJBCHGLK',
  'BCEGIJKL':'EJBCIGLK','BCEHIJKL':'EJBCIHLK','BCFGHIJK':'HGBCJFIK',
  'BCFGHIJL':'HGBCJFLI','BCFGHIKL':'HGBCIFLK','BCFGHJKL':'HGBCJFLK',
  'BCFGIJKL':'IGBCJFLK','BCFHIJKL':'HJBCIFLK','BCGHIJKL':'HJBCIGLK',
  'BDEFGHIJ':'HGBDJFEI','BDEFGHIK':'EGBDHFIK','BDEFGHIL':'EGBDHFLI',
  'BDEFGHJK':'HGBDJFEK','BDEFGHJL':'HGBDJFLE','BDEFGHKL':'EGBDHFLK',
  'BDEFGIJK':'EGBDJFIK','BDEFGIJL':'EGBDJFLI','BDEFGIKL':'EGBDIFLK',
  'BDEFGJKL':'EGBDJFLK','BDEFHIJK':'EJBDHFIK','BDEFHIJL':'EJBDHFLI',
  'BDEFHIKL':'EIBDHFLK','BDEFHJKL':'EJBDHFLK','BDEFIJKL':'EJBDIFLK',
  'BDEGHIJK':'EJBDHGIK','BDEGHIJL':'EJBDHGLI','BDEGHIKL':'EGBDIHLK',
  'BDEGHJKL':'EJBDHGLK','BDEGIJKL':'EJBDIGLK','BDEHIJKL':'EJBDIHLK',
  'BDFGHIJK':'HGBDJFIK','BDFGHIJL':'HGBDJFLI','BDFGHIKL':'HGBDIFLK',
  'BDFGHJKL':'HGBDJFLK','BDFGIJKL':'IGBDJFLK','BDFHIJKL':'HJBDIFLK',
  'BDGHIJKL':'HJBDIGLK','BEFGHIJK':'EJBFHGIK','BEFGHIJL':'EJBFHGLI',
  'BEFGHIKL':'EGBFIHLK','BEFGHJKL':'EJBFHGLK','BEFGIJKL':'EJBFIGLK',
  'BEFHIJKL':'EJBFIHLK','BEGHIJKL':'EJIBHGLK','BFGHIJKL':'HJBFIGLK',
  'CDEFGHIJ':'CGJDHFEI','CDEFGHIK':'CGEDHFIK','CDEFGHIL':'CGEDHFLI',
  'CDEFGHJK':'CGJDHFEK','CDEFGHJL':'CGJDHFLE','CDEFGHKL':'CGEDHFLK',
  'CDEFGIJK':'CGEDJFIK','CDEFGIJL':'CGEDJFLI','CDEFGIKL':'CGEDIFLK',
  'CDEFGJKL':'CGEDJFLK','CDEFHIJK':'CJEDHFIK','CDEFHIJL':'CJEDHFLI',
  'CDEFHIKL':'CEIDHFLK','CDEFHJKL':'CJEDHFLK','CDEFIJKL':'CJEDIFLK',
  'CDEGHIJK':'EGJCHDIK','CDEGHIJL':'EGJCHDLI','CDEGHIKL':'EGICHDLK',
  'CDEGHJKL':'EGJCHDLK','CDEGIJKL':'EGICJDLK','CDEHIJKL':'EJICHDLK',
  'CDFGHIJK':'CGJDHFIK','CDFGHIJL':'CGJDHFLI','CDFGHIKL':'CGIDHFLK',
  'CDFGHJKL':'CGJDHFLK','CDFGIJKL':'CGIDJFLK','CDFHIJKL':'CJIDHFLK',
  'CDGHIJKL':'HGICJDLK','CEFGHIJK':'EGJCHFIK','CEFGHIJL':'EGJCHFLI',
  'CEFGHIKL':'EGICHFLK','CEFGHJKL':'EGJCHFLK','CEFGIJKL':'EGICJFLK',
  'CEFHIJKL':'EJICHFLK','CEGHIJKL':'EJICHGLK','CFGHIJKL':'HGICJFLK',
  'DEFGHIJK':'EGJDHFIK','DEFGHIJL':'EGJDHFLI','DEFGHIKL':'EGIDHFLK',
  'DEFGHJKL':'EGJDHFLK','DEFGIJKL':'EGIDJFLK','DEFHIJKL':'EJIDHFLK',
  'DEGHIJKL':'EJIDHGLK','DFGHIJKL':'HGIDJFLK','EFGHIJKL':'EJIFHGLK',
};
const COMB_SLOT_ORDER = ['A','B','D','E','G','I','K','L'];

// ── CALCOLO CLASSIFICA PURA (senza rendering) ──────────────────────────
function _getClassificaCompleta(lettera) {
  const girone = DB.gironi[lettera];
  if (!girone) return [];
  const stats = {};
  girone.squadre.forEach(id => { stats[id] = { pt:0, gf:0, gs:0, gd:0, g:0 }; });
  girone.partite.forEach(p => {
    const pr = _pronostici?.gironi?.[p.id];
    const gc = pr?.gol_casa, gt = pr?.gol_trasferta;
    if (gc == null || gt == null) return;
    stats[p.casa].g++;       stats[p.trasferta].g++;
    stats[p.casa].gf += gc;  stats[p.casa].gs += gt;  stats[p.casa].gd += gc-gt;
    stats[p.trasferta].gf += gt; stats[p.trasferta].gs += gc; stats[p.trasferta].gd += gt-gc;
    if (gc > gt) stats[p.casa].pt += 3;
    else if (gc === gt) { stats[p.casa].pt++; stats[p.trasferta].pt++; }
    else stats[p.trasferta].pt += 3;
  });
  return girone.squadre.map(id => ({ id, ...stats[id] }))
    .sort((a,b) => b.pt-a.pt || b.gd-a.gd || b.gf-a.gf);
}

// ── DETERMINA I TERZI IN BASE ALLA TABELLA FIFA ─────────────────────────
function _calcola3rdiSlots() {
  // Calcola tutti i 12 terzi classificati e i loro record
  const terzi = {};
  Object.keys(DB.gironi).forEach(lettera => {
    const cl = _getClassificaCompleta(lettera);
    if (cl.length < 3 || cl[2].g === 0) return; // girone non ancora compilato
    const t = cl[2];
    terzi[lettera] = { teamId: t.id, pt: t.pt, gd: t.gd, gf: t.gf };
  });
  // Ordina e prendi i migliori 8
  const sorted = Object.entries(terzi)
    .sort(([,a],[,b]) => b.pt-a.pt || b.gd-a.gd || b.gf-a.gf);
  if (sorted.length < 8) return null; // non ancora abbastanza gironi completati
  const top8 = sorted.slice(0, 8);
  const qualGroups = top8.map(([l]) => l).sort().join('');
  const combo = COMB_3I[qualGroups];
  if (!combo) return null;
  // Mappa: slotLetter → teamId
  const result = {};
  COMB_SLOT_ORDER.forEach((slot, i) => {
    const srcGrp = combo[i];
    result[slot] = terzi[srcGrp]?.teamId || null;
  });
  return result;
}

// ── RISOLVE UN SINGOLO SLOT → TEAM ID ──────────────────────────────────
function _resolveSlot(slotDef, standings, terziSlots) {
  if (slotDef.t === '1') return standings[slotDef.g]?.[0] || null;
  if (slotDef.t === '2') return standings[slotDef.g]?.[1] || null;
  if (slotDef.t === '3slot') return terziSlots ? (terziSlots[slotDef.slot] || null) : null;
  return null;
}

// ── AGGIORNA I SEDICESIMI IN BASE AI GIRONI COMPILATI ──────────────────
function _ricalcolaSedicesimi() {
  // Calcola standings per tutti i gironi
  const standings = {};
  Object.keys(DB.gironi).forEach(l => {
    const cl = _getClassificaCompleta(l);
    standings[l] = cl.map(t => t.id);
  });
  const terziSlots = _calcola3rdiSlots();

  SEDICESIMI_BRACKET.forEach(bracket => {
    const card = document.querySelector('.elim-match-card[data-fase="sedicesimi"][data-id="' + bracket.id + '"]');
    if (!card) return;

    const casaId  = _resolveSlot(bracket.casa, standings, terziSlots);
    const trasfId = _resolveSlot(bracket.trasf, standings, terziSlots);

    // Aggiorna etichette squadre nel matchup
    const spans = card.querySelectorAll('.elim-team');
    if (spans.length >= 2) {
      const casaSq  = casaId  ? DB.squadre[casaId]  : null;
      const trasfSq = trasfId ? DB.squadre[trasfId] : null;
      spans[0].textContent = casaSq  ? (casaSq.flag  || '') + ' ' + casaSq.nome  : _slotLabel(bracket.casa);
      spans[1].textContent = trasfSq ? (trasfSq.flag || '') + ' ' + trasfSq.nome : _slotLabel(bracket.trasf);
    }

    // Aggiorna le opzioni del select vincitore
    const sel = card.querySelector('.vincitore-select');
    if (!sel) return;
    const currVal = sel.value;
    const teams = [casaId, trasfId].filter(Boolean);
    let opts = '<option value="">— Seleziona —</option>';
    teams.forEach(id => {
      const sq = DB.squadre[id];
      const selected = (currVal === id) ? ' selected' : '';
      opts += '<option value="' + id + '"' + selected + '>' + (sq?.flag || '') + ' ' + sq.nome + '</option>';
    });
    // Aggiungi l'opzione corrente se non è più valida (slot non ancora risolto)
    if (currVal && !teams.includes(currVal)) {
      const sq = DB.squadre[currVal];
      if (sq) opts += '<option value="' + currVal + '" selected>' + (sq.flag || '') + ' ' + sq.nome + ' ⚠️</option>';
      // Reset se la squadra selezionata non appartiene più a questa partita
      _setElim('sedicesimi', bracket.id, 'vincitore', null);
    }
    sel.innerHTML = opts;
  });
}

function _slotLabel(slotDef) {
  if (slotDef.t === '1') return '1° Girone ' + slotDef.g;
  if (slotDef.t === '2') return '2° Girone ' + slotDef.g;
  if (slotDef.t === '3slot') return 'Miglior 3°';
  return '?';
}


let _pronostici = {};
let _sistemaUnsub = null;
let _pronosticiAperti = true;

export async function initPronostici() {
  showSpinner('gironi-container', 'Caricamento pronostici...');
  _sistemaUnsub = onSistemaSnapshot((cfg) => {
    _pronosticiAperti = cfg.pronostici_aperti !== false;
    _aggiornaStatoBanner();
    _aggiornaBtnSalva();
  });
  try {
    const saved = await getPronostici(STATE.utente.id);
    _pronostici = saved || {};
  } catch (e) {
    _pronostici = {};
  }
  _renderGironi();
  _renderEliminatoria();
  _renderSpeciali();
  Object.keys(DB.gironi).forEach(l => _ricalcolaClassificaGirone(l));
  _ricalcolaSedicesimi();
  _renderRiepilogoGironi();
  document.getElementById('form-pronostici').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!_pronosticiAperti) { showToast('I pronostici sono chiusi!', 'error'); return; }
    await _salvaPronostici();
  });
}

function _aggiornaStatoBanner() {
  const banner = document.getElementById('pronostici-banner');
  const status = document.getElementById('pronostici-status');
  if (_pronosticiAperti) {
    banner.style.display = 'none';
    status.textContent = '✅ Pronostici aperti';
    status.style.color = 'var(--verde-light)';
  } else {
    banner.style.display = '';
    banner.className = 'info-banner info-banner--red';
    banner.innerHTML = '<span>🔒</span><span>I pronostici sono <strong>chiusi</strong>.</span>';
    status.textContent = '🔒 Pronostici chiusi';
    status.style.color = 'var(--oro)';
  }
}

function _aggiornaBtnSalva() {
  const btn = document.getElementById('btn-salva-pronostici');
  if (btn) btn.disabled = !_pronosticiAperti;
}

function _renderGironi() {
  const container = document.getElementById('gironi-container');
  let html = '';
  Object.entries(DB.gironi).forEach(([lettera, girone]) => {
    html += '<div class="girone-block">'
      + '<div class="girone-header">'
      + '<h3 class="girone-title">Girone ' + lettera + '</h3>'
      + '<div class="girone-squadre">'
      + girone.squadre.map(id => {
          const sq = DB.squadre[id];
          return '<span class="team-chip">' + (sq?.flag||'') + ' ' + (sq?.nome||id) + '</span>';
        }).join('')
      + '</div></div>'
      + '<div class="partite-list">'
      + girone.partite.map(p => _renderPartitaGirone(p)).join('')
      + '</div>'
      + '<div class="girone-classifica-mini" id="classifica-girone-' + lettera + '"></div>'
      + '</div>';
  });
  container.innerHTML = html;
  _bindSegniGirone();
}

function _renderPartitaGirone(p) {
  const casa      = DB.squadre[p.casa];
  const trasferta = DB.squadre[p.trasferta];
  const saved     = _pronostici?.gironi?.[p.id] || {};
  const golCasa   = saved.gol_casa ?? '';
  const golTrasf  = saved.gol_trasferta ?? '';
  const segnoCurr = saved.segno || '';
  const dateLabel = p.data ? '<span class="match-date">' + _fmtData(p.data) + '</span>' : '';
  return '<div class="partita-row" data-id="' + p.id + '">'
    + '<div class="partita-meta">' + dateLabel + ' <span class="match-group-label">Girone ' + p.girone + '</span></div>'
    + '<div class="partita-main">'
    + '<div class="team-name team-home">' + (casa?.flag||'') + ' ' + (casa?.nome||p.casa) + '</div>'
    + '<div class="match-center">'
    + '<div class="segni-group">'
    + ['1','X','2'].map(s => '<button type="button" class="segno-btn' + (segnoCurr===s?' active':'') + '" data-match="' + p.id + '" data-segno="' + s + '">' + s + '</button>').join('')
    + '</div>'
    + '<div class="score-inputs">'
    + '<input type="number" class="score-input" min="0" max="20" name="gol_casa_' + p.id + '" value="' + golCasa + '" placeholder="0" data-match="' + p.id + '" data-field="gol_casa">'
    + '<span class="score-sep">:</span>'
    + '<input type="number" class="score-input" min="0" max="20" name="gol_trasf_' + p.id + '" value="' + golTrasf + '" placeholder="0" data-match="' + p.id + '" data-field="gol_trasferta">'
    + '</div></div>'
    + '<div class="team-name team-away">' + (trasferta?.flag||'') + ' ' + (trasferta?.nome||p.trasferta) + '</div>'
    + '</div></div>';
}

function _bindSegniGirone() {
  document.querySelectorAll('.segno-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const matchId = btn.dataset.match;
      document.querySelectorAll('.segno-btn[data-match="' + matchId + '"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (!_pronostici.gironi) _pronostici.gironi = {};
      if (!_pronostici.gironi[matchId]) _pronostici.gironi[matchId] = {};
      _pronostici.gironi[matchId].segno = btn.dataset.segno;
    });
  });
  document.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('input', () => {
      const matchId = input.dataset.match;
      const val = parseInt(input.value);
      if (!_pronostici.gironi) _pronostici.gironi = {};
      if (!_pronostici.gironi[matchId]) _pronostici.gironi[matchId] = {};
      _pronostici.gironi[matchId][input.dataset.field] = isNaN(val) ? null : val;
      const gc = _pronostici.gironi[matchId].gol_casa;
      const gt = _pronostici.gironi[matchId].gol_trasferta;
      if (gc != null && gt != null) {
        const s = gc > gt ? '1' : gc < gt ? '2' : 'X';
        _pronostici.gironi[matchId].segno = s;
        document.querySelectorAll('.segno-btn[data-match="' + matchId + '"]').forEach(b => b.classList.toggle('active', b.dataset.segno === s));
      }
      const lettera = _getGironeByMatchId(matchId);
      if (lettera) _ricalcolaClassificaGirone(lettera);
    });
  });
}

const FASI_ELIM = [
  { id: 'sedicesimi', label: 'Sedicesimi di finale' },
  { id: 'ottavi',     label: 'Ottavi di finale' },
  { id: 'quarti',     label: 'Quarti di finale' },
  { id: 'semifinali', label: 'Semifinali' },
  { id: 'finale',     label: 'Finale' },
];

function _getMatchesFase(id) {
  if (id === 'finale') {
    const p = DB.fase_eliminatoria?.finale?.partita || {};
    return p.casa || p.trasferta ? [{ id: 'F', ...p }] : [];
  }
  const fase = DB.fase_eliminatoria?.[id]?.partite || {};
  return Object.entries(fase).map(([mid, p]) => ({ id: mid, ...p }));
}

function _renderEliminatoria() {
  const container = document.getElementById('eliminatoria-container');
  let html = '';
  FASI_ELIM.forEach(({ id, label }) => {
    const matches = _getMatchesFase(id);
    if (!matches.length) return;
    html += '<div class="fase-block"><h3 class="fase-title">' + label + '</h3><div class="fase-matches">';
    matches.forEach(m => { html += _renderMatchElim(id, m); });
    html += '</div></div>';
  });
  container.innerHTML = html || '<p>Il bracket sarà disponibile al termine dei gironi.</p>';
  _bindEliminatoria();
}

function _renderMatchElim(faseId, match) {
  const saved    = _pronostici?.fase_eliminatoria?.[faseId]?.[match.id] || {};
  const vincSaved = saved.vincitore || '';
  const modSaved  = saved.modalita  || '';
  // Per i sedicesimi: menù a tendina vuoto, verrà popolato da _ricalcolaSedicesimi
  const sqOpts = faseId === 'sedicesimi' ? '' : Object.entries(DB.squadre)
    .map(([id, sq]) => '<option value="' + id + '"' + (vincSaved===id?' selected':'') + '>' + (sq.flag||'') + ' ' + sq.nome + '</option>')
    .join('');
  const modHtml = [['90min',"90'"],['supplementari','Suppl.'],['rigori','Rigori']].map(([v,l]) =>
    '<button type="button" class="modalita-btn' + (modSaved===v?' active':'') + '" data-fase="' + faseId + '" data-match="' + match.id + '" data-mod="' + v + '">' + l + '</button>'
  ).join('');
  const casaLabel  = match.casa      ? (DB.squadre[match.casa]?.nome      || match.casa)      : '?';
  const trasfLabel = match.trasferta ? (DB.squadre[match.trasferta]?.nome  || match.trasferta) : '?';
  const casaFlag   = match.casa      ? (DB.squadre[match.casa]?.flag      || '') : '';
  const trasfFlag  = match.trasferta ? (DB.squadre[match.trasferta]?.flag  || '') : '';
  const bracketInfo = faseId === 'sedicesimi'
    ? (SEDICESIMI_BRACKET.find(b => b.id === match.id) || {})
    : {};
  const bracketDesc = bracketInfo.desc ? '<div class="elim-bracket-desc">' + bracketInfo.match + ' · ' + bracketInfo.desc + '</div>' : '';
  return '<div class="elim-match-card" data-fase="' + faseId + '" data-id="' + match.id + '">'
    + bracketDesc
    + '<div class="elim-matchup"><span class="elim-team">' + (faseId==='sedicesimi'?_slotLabel(bracketInfo.casa||{}):(casaFlag+' '+casaLabel)) + '</span><span class="elim-vs">vs</span><span class="elim-team">' + (faseId==='sedicesimi'?_slotLabel(bracketInfo.trasf||{}):(trasfFlag+' '+trasfLabel)) + '</span></div>'
    + '<div class="elim-pick"><label class="field-label-sm">Chi passa?</label>'
    + '<select class="field-input field-input-sm vincitore-select" data-fase="' + faseId + '" data-match="' + match.id + '"><option value="">— Seleziona —</option>' + sqOpts + '</select></div>'
    + '<div class="elim-modalita"><label class="field-label-sm">Come?</label><div class="modalita-group">' + modHtml + '</div></div></div>';
}

function _bindEliminatoria() {
  document.querySelectorAll('.vincitore-select').forEach(sel => {
    sel.addEventListener('change', () => _setElim(sel.dataset.fase, sel.dataset.match, 'vincitore', sel.value || null));
  });
  document.querySelectorAll('.modalita-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modalita-btn[data-fase="' + btn.dataset.fase + '"][data-match="' + btn.dataset.match + '"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _setElim(btn.dataset.fase, btn.dataset.match, 'modalita', btn.dataset.mod);
    });
  });
}

function _setElim(faseId, matchId, field, value) {
  if (!_pronostici.fase_eliminatoria) _pronostici.fase_eliminatoria = {};
  if (!_pronostici.fase_eliminatoria[faseId]) _pronostici.fase_eliminatoria[faseId] = {};
  if (!_pronostici.fase_eliminatoria[faseId][matchId]) _pronostici.fase_eliminatoria[faseId][matchId] = {};
  _pronostici.fase_eliminatoria[faseId][matchId][field] = value;
}

function _renderSpeciali() {
  const container = document.getElementById('speciali-container');
  const pCannon = _pronostici?.capocannoniere || {};
  let html = '<div class="speciali-section"><h3 class="section-title">🥇 Capocannoniere</h3>'
    + '<p class="section-desc">Pronostica i <strong>3 migliori marcatori</strong> in ordine. 1° → 40pt, 2° → 20pt, 3° → 10pt. Bonus +10 nella terna.</p>'
    + '<div class="cannon-inputs">';
  ['primo','secondo','terzo'].forEach((key, i) => {
    html += '<div class="field-group"><label class="field-label">' + (i+1) + '° Capocannoniere</label>'
      + '<input type="text" class="field-input" id="cannon-' + key + '" value="' + (pCannon[key]||'') + '" placeholder="es. Mbappé" autocomplete="off"></div>';
  });
  html += '</div></div>'
    + '<div class="speciali-section"><h3 class="section-title">📊 Posizioni finali nei gironi</h3>'
    + '<p class="section-desc">Le posizioni si aggiornano automaticamente dai risultati. <strong>10pt</strong> per ogni posizione corretta (solo squadre ai sedicesimi).</p>'
    + '<div class="gironi-posiz-grid" id="gironi-posiz-container">'
    + _renderPosizioniGironi()
    + '</div></div>';
  container.innerHTML = html;
  _bindSpeciali();
}

function _renderPosizioniGironi() {
  let html = '';
  Object.entries(DB.gironi).forEach(([lettera, girone]) => {
    const savedPosiz = _pronostici?.posizioni_girone?.[lettera] || [];
    html += '<div class="girone-posiz-card"><div class="girone-posiz-header">Girone ' + lettera + '</div><div class="posiz-slots" data-girone="' + lettera + '">';
    [0,1,2,3].forEach(i => {
      const currId = savedPosiz[i] || '';
      const opts = girone.squadre.map(id => {
        const sq = DB.squadre[id];
        return '<option value="' + id + '"' + (currId===id?' selected':'') + '>' + (sq?.flag||'') + ' ' + (sq?.nome||id) + '</option>';
      }).join('');
      html += '<div class="posiz-slot"><span class="posiz-num">' + (i+1) + '°</span>'
        + '<select class="field-input field-input-sm posiz-select" data-girone="' + lettera + '" data-pos="' + i + '"><option value="">—</option>' + opts + '</select></div>';
    });
    html += '</div></div>';
  });
  return html;
}

function _bindSpeciali() {
  ['primo','secondo','terzo'].forEach(key => {
    const input = document.getElementById('cannon-' + key);
    if (!input) return;
    input.addEventListener('input', () => {
      if (!_pronostici.capocannoniere) _pronostici.capocannoniere = {};
      _pronostici.capocannoniere[key] = input.value.trim() || null;
    });
  });
  document.querySelectorAll('.posiz-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const lettera = sel.dataset.girone;
      const pos = parseInt(sel.dataset.pos);
      if (!_pronostici.posizioni_girone) _pronostici.posizioni_girone = {};
      if (!_pronostici.posizioni_girone[lettera]) _pronostici.posizioni_girone[lettera] = [];
      _pronostici.posizioni_girone[lettera][pos] = sel.value || null;
    });
  });
}

function _getGironeByMatchId(matchId) {
  for (const [lettera, girone] of Object.entries(DB.gironi)) {
    if (girone.partite.some(p => p.id === matchId)) return lettera;
  }
  return null;
}

function _ricalcolaClassificaGirone(lettera) {
  const girone = DB.gironi[lettera];
  if (!girone) return;
  const stats = {};
  girone.squadre.forEach(id => { stats[id] = { pt:0, gf:0, gs:0, gd:0, g:0 }; });
  girone.partite.forEach(p => {
    const pr = _pronostici?.gironi?.[p.id];
    const gc = pr?.gol_casa, gt = pr?.gol_trasferta;
    if (gc == null || gt == null) return;
    stats[p.casa].g++;       stats[p.trasferta].g++;
    stats[p.casa].gf += gc;  stats[p.casa].gs += gt;  stats[p.casa].gd += (gc-gt);
    stats[p.trasferta].gf += gt; stats[p.trasferta].gs += gc; stats[p.trasferta].gd += (gt-gc);
    if (gc > gt) stats[p.casa].pt += 3;
    else if (gc === gt) { stats[p.casa].pt++; stats[p.trasferta].pt++; }
    else stats[p.trasferta].pt += 3;
  });
  const cl = girone.squadre.map(id => ({ id, ...stats[id] }))
    .sort((a,b) => b.pt-a.pt || b.gd-a.gd || b.gf-a.gf);
  const hasData = cl.some(t => t.g > 0);
  const miniEl = document.getElementById('classifica-girone-' + lettera);
  if (miniEl) {
    if (!hasData) { miniEl.innerHTML = ''; return; }
    let rows = '';
    cl.forEach((t, i) => {
      const sq = DB.squadre[t.id];
      const gd = (t.gd > 0 ? '+' : '') + t.gd;
      const gdCls = t.gd > 0 ? 'gd-pos' : t.gd < 0 ? 'gd-neg' : '';
      rows += '<tr class="' + (i<2?'qualificata':'') + '">'
        + '<td class="mini-pos">' + (i+1) + '</td>'
        + '<td class="mini-team">' + (sq?.flag||'') + ' ' + (sq?.nome||t.id) + '</td>'
        + '<td class="mini-pt"><strong>' + t.pt + '</strong></td>'
        + '<td>' + t.g + '</td><td>' + t.gf + '</td><td>' + t.gs + '</td>'
        + '<td class="' + gdCls + '">' + gd + '</td></tr>';
    });
    miniEl.innerHTML = '<table class="girone-mini-table"><thead><tr><th>#</th><th>Squadra</th><th>Pt</th><th>G</th><th>GF</th><th>GS</th><th>GD</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  const slots = document.querySelector('.posiz-slots[data-girone="' + lettera + '"]');
  if (slots && hasData) {
    cl.forEach((team, i) => {
      const sel = slots.querySelector('.posiz-select[data-pos="' + i + '"]');
      if (sel) {
        sel.value = team.id;
        if (!_pronostici.posizioni_girone) _pronostici.posizioni_girone = {};
        if (!_pronostici.posizioni_girone[lettera]) _pronostici.posizioni_girone[lettera] = [];
        _pronostici.posizioni_girone[lettera][i] = team.id;
      }
    });
  }
}


// ── RIEPILOGO GIRONI ────────────────────────────────────────────────────
function _renderRiepilogoGironi() {
  const container = document.getElementById('riepilogo-container');
  if (!container) return;

  const lettere = Object.keys(DB.gironi);
  const allClassifiche = {};
  lettere.forEach(l => { allClassifiche[l] = _getClassificaCompleta(l); });

  // ── Griglia classifiche per girone ──
  let gridHtml = '<div class="riepilogo-grid">';
  lettere.forEach(lettera => {
    const cl = allClassifiche[lettera];
    const hasData = cl.some(t => t.g > 0);
    gridHtml += '<div class="riepilogo-card">'
      + '<div class="riepilogo-card-header">Girone ' + lettera + '</div>'
      + '<table class="riepilogo-table">'
      + '<thead><tr><th>#</th><th>Squadra</th><th>Pt</th><th>GD</th></tr></thead>'
      + '<tbody>';
    cl.forEach((t, i) => {
      const sq = DB.squadre[t.id];
      const gdStr = t.gd > 0 ? '+' + t.gd : '' + t.gd;
      const gdCls = t.gd > 0 ? 'gd-pos' : t.gd < 0 ? 'gd-neg' : '';
      const rowCls = i < 2 ? 'qualificata' : i === 2 ? 'terza' : '';
      const ptDisp = hasData ? t.pt : '—';
      const gdDisp = hasData ? '<span class="' + gdCls + '">' + gdStr + '</span>' : '—';
      gridHtml += '<tr class="' + rowCls + '">'
        + '<td class="riepilogo-pos">' + (i + 1) + '</td>'
        + '<td class="riepilogo-team">' + (sq?.flag || '') + ' ' + (sq?.nome || t.id) + '</td>'
        + '<td class="riepilogo-pt">' + ptDisp + '</td>'
        + '<td class="riepilogo-gd">' + gdDisp + '</td>'
        + '</tr>';
    });
    gridHtml += '</tbody></table></div>';
  });
  gridHtml += '</div>';

  // ── Classifica migliori terze ──
  const terziData = [];
  lettere.forEach(lettera => {
    const cl = allClassifiche[lettera];
    if (cl.length < 3) return;
    const t = cl[2];
    terziData.push({ lettera, teamId: t.id, pt: t.pt, gd: t.gd, gf: t.gf, g: t.g });
  });
  terziData.sort((a, b) => b.pt - a.pt || b.gd - a.gd || b.gf - a.gf);

  let terziHtml = '<div class="riepilogo-terze-wrap">'
    + '<h3 class="riepilogo-terze-title">🏅 Migliori terze classificate</h3>'
    + '<p class="riepilogo-terze-desc">Le 8 migliori terze si qualificano per i sedicesimi. L\'ordine qui determina la loro posizione nel bracket.</p>'
    + '<table class="riepilogo-table riepilogo-terze-table">'
    + '<thead><tr><th>#</th><th>Squadra</th><th>Girone</th><th>Pt</th><th>GD</th><th>GF</th></tr></thead>'
    + '<tbody>';

  terziData.forEach((t, i) => {
    const sq = DB.squadre[t.teamId];
    const gdStr = t.gd > 0 ? '+' + t.gd : '' + t.gd;
    const gdCls = t.gd > 0 ? 'gd-pos' : t.gd < 0 ? 'gd-neg' : '';
    const qualif = i < 8;
    const rowCls = qualif ? 'qualificata' : '';
    const hasData = t.g > 0;
    const icon = i === 7 && qualif ? '<span class="terza-cutoff" title="Ultimo posto qualificato">✂️ </span>' : '';
    terziHtml += '<tr class="' + rowCls + '">'
      + '<td class="riepilogo-pos">' + icon + (i + 1) + '</td>'
      + '<td class="riepilogo-team">' + (sq?.flag || '') + ' ' + (sq?.nome || t.teamId) + '</td>'
      + '<td class="riepilogo-girone">Girone ' + t.lettera + '</td>'
      + '<td class="riepilogo-pt">' + (hasData ? t.pt : '—') + '</td>'
      + '<td class="riepilogo-gd"><span class="' + gdCls + '">' + (hasData ? gdStr : '—') + '</span></td>'
      + '<td class="riepilogo-gf">' + (hasData ? t.gf : '—') + '</td>'
      + '</tr>';
  });

  // Linea separatrice tra qualificate e non
  if (terziData.length > 8) {
    // Already handled with row classes above
  }

  terziHtml += '</tbody></table>'
    + '<div class="riepilogo-legend">'
    + '<span class="legend-item legend-qualif">🟢 Qualificate ai sedicesimi</span>'
    + '<span class="legend-item legend-terza">🟡 Terza classificata (non qualificata)</span>'
    + '</div>'
    + '</div>';

  container.innerHTML = gridHtml + terziHtml;
}

async function _salvaPronostici() {
  const btn = document.getElementById('btn-salva-pronostici');
  const msg = document.getElementById('pronostici-save-msg');
  btn.disabled = true;
  btn.textContent = 'Salvataggio...';
  try {
    _raccogliDalDOM();
    await savePronostici(STATE.utente.id, _pronostici);
    showToast('Pronostici salvati!', 'success');
    msg.textContent = 'Salvato il ' + new Date().toLocaleString('it-IT');
    msg.className = 'save-message save-ok';
    msg.style.display = '';
  } catch (e) {
    showToast('Errore nel salvataggio. Riprova.', 'error');
    msg.textContent = 'Errore.';
    msg.className = 'save-message save-error';
    msg.style.display = '';
  } finally {
    btn.disabled = !_pronosticiAperti;
    btn.textContent = 'Salva i miei pronostici';
  }
}

function _raccogliDalDOM() {
  document.querySelectorAll('.score-input').forEach(input => {
    const val = parseInt(input.value);
    if (!_pronostici.gironi) _pronostici.gironi = {};
    if (!_pronostici.gironi[input.dataset.match]) _pronostici.gironi[input.dataset.match] = {};
    _pronostici.gironi[input.dataset.match][input.dataset.field] = isNaN(val) ? null : val;
  });
  ['primo','secondo','terzo'].forEach(key => {
    const input = document.getElementById('cannon-' + key);
    if (!input) return;
    if (!_pronostici.capocannoniere) _pronostici.capocannoniere = {};
    _pronostici.capocannoniere[key] = input.value.trim() || null;
  });
}

function _fmtData(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Rome' });
  } catch { return iso; }
}
