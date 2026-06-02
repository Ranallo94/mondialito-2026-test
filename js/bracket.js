/**
 * MONDIALITO 2026 — bracket.js
 * Modulo condiviso: costanti del tabellone eliminatorie e funzioni
 * di rendering read-only (usato da profilo.js per la scheda altrui).
 */

// ── BRACKET SEDICESIMI (ordine bracket ufficiale FIFA 2026) ──────────────
// Coppie adiacenti alimentano lo stesso ottavo:
// O1: S02+S05 | O2: S01+S03 | O3: S11+S12 | O4: S09+S10
// O5: S04+S06 | O6: S07+S08 | O7: S14+S16 | O8: S13+S15
export const SEDICESIMI_BRACKET = [
  { id:'S02', casa:{t:'1',g:'E'}, trasf:{t:'3slot',slot:'E'} },  // M74
  { id:'S05', casa:{t:'1',g:'I'}, trasf:{t:'3slot',slot:'I'} },  // M77
  { id:'S01', casa:{t:'2',g:'A'}, trasf:{t:'2',g:'B'} },         // M73
  { id:'S03', casa:{t:'1',g:'F'}, trasf:{t:'2',g:'C'} },         // M75
  { id:'S11', casa:{t:'2',g:'K'}, trasf:{t:'2',g:'L'} },         // M83
  { id:'S12', casa:{t:'1',g:'H'}, trasf:{t:'2',g:'J'} },         // M84
  { id:'S09', casa:{t:'1',g:'D'}, trasf:{t:'3slot',slot:'D'} },  // M81
  { id:'S10', casa:{t:'1',g:'G'}, trasf:{t:'3slot',slot:'G'} },  // M82
  { id:'S04', casa:{t:'1',g:'C'}, trasf:{t:'2',g:'F'} },         // M76
  { id:'S06', casa:{t:'2',g:'E'}, trasf:{t:'2',g:'I'} },         // M78
  { id:'S07', casa:{t:'1',g:'A'}, trasf:{t:'3slot',slot:'A'} },  // M79
  { id:'S08', casa:{t:'1',g:'L'}, trasf:{t:'3slot',slot:'L'} },  // M80
  { id:'S14', casa:{t:'1',g:'J'}, trasf:{t:'2',g:'H'} },         // M86
  { id:'S16', casa:{t:'2',g:'D'}, trasf:{t:'2',g:'G'} },         // M88
  { id:'S13', casa:{t:'1',g:'B'}, trasf:{t:'3slot',slot:'B'} },  // M85
  { id:'S15', casa:{t:'1',g:'K'}, trasf:{t:'3slot',slot:'K'} },  // M87
];

// ── BRACKET FEEDS (ufficiale FIFA 2026) ───────────────
export const BRACKET_FEEDS = {
  'O1': { casa:{fase:'sedicesimi',id:'S02'}, trasf:{fase:'sedicesimi',id:'S05'} }, // M74 vs M77 → M89
  'O2': { casa:{fase:'sedicesimi',id:'S01'}, trasf:{fase:'sedicesimi',id:'S03'} }, // M73 vs M75 → M90
  'O3': { casa:{fase:'sedicesimi',id:'S11'}, trasf:{fase:'sedicesimi',id:'S12'} }, // M83 vs M84 → M93
  'O4': { casa:{fase:'sedicesimi',id:'S09'}, trasf:{fase:'sedicesimi',id:'S10'} }, // M81 vs M82 → M94
  'O5': { casa:{fase:'sedicesimi',id:'S04'}, trasf:{fase:'sedicesimi',id:'S06'} }, // M76 vs M78 → M91
  'O6': { casa:{fase:'sedicesimi',id:'S07'}, trasf:{fase:'sedicesimi',id:'S08'} }, // M79 vs M80 → M92
  'O7': { casa:{fase:'sedicesimi',id:'S14'}, trasf:{fase:'sedicesimi',id:'S16'} }, // M86 vs M88 → M95
  'O8': { casa:{fase:'sedicesimi',id:'S13'}, trasf:{fase:'sedicesimi',id:'S15'} }, // M85 vs M87 → M96
  'Q1': { casa:{fase:'ottavi',id:'O1'}, trasf:{fase:'ottavi',id:'O2'} },           // M89 vs M90 → M97
  'Q2': { casa:{fase:'ottavi',id:'O3'}, trasf:{fase:'ottavi',id:'O4'} },           // M93 vs M94 → M98
  'Q3': { casa:{fase:'ottavi',id:'O5'}, trasf:{fase:'ottavi',id:'O6'} },           // M91 vs M92 → M99
  'Q4': { casa:{fase:'ottavi',id:'O7'}, trasf:{fase:'ottavi',id:'O8'} },           // M95 vs M96 → M100
  'SF1': { casa:{fase:'quarti',id:'Q1'}, trasf:{fase:'quarti',id:'Q2'} },          // M97 vs M98 → M101
  'SF2': { casa:{fase:'quarti',id:'Q3'}, trasf:{fase:'quarti',id:'Q4'} },          // M99 vs M100 → M102
  'F':   { casa:{fase:'semifinali',id:'SF1'}, trasf:{fase:'semifinali',id:'SF2'} }, // M101 vs M102 → M104
};

// ── COMB_3I (Tabella FIFA Annex C) ────────────────────
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

// ══════════════════════════════════════════════════════
// HELPERS CONDIVISI
// ══════════════════════════════════════════════════════

/** Classifica di un girone calcolata dai pronostici (no risultati reali). */
export function getClassificaGirone(lettera, pronosticiGironi, db) {
  const girone = db.gironi[lettera];
  if (!girone) return [];
  const stats = {};
  girone.squadre.forEach(id => { stats[id] = { pt:0, gf:0, gs:0, gd:0, g:0 }; });
  girone.partite.forEach(p => {
    const pr = pronosticiGironi?.[p.id];
    const gc = Number(pr?.gol_casa), gt = Number(pr?.gol_trasferta);
    if (pr?.gol_casa == null || pr?.gol_trasferta == null) return;
    stats[p.casa].g++;      stats[p.trasferta].g++;
    stats[p.casa].gf += gc; stats[p.casa].gs += gt;  stats[p.casa].gd += gc - gt;
    stats[p.trasferta].gf += gt; stats[p.trasferta].gs += gc; stats[p.trasferta].gd += gt - gc;
    if (gc > gt)       stats[p.casa].pt += 3;
    else if (gc === gt){ stats[p.casa].pt++;    stats[p.trasferta].pt++; }
    else               stats[p.trasferta].pt += 3;
  });
  return girone.squadre
    .map(id => ({ id, ...stats[id] }))
    .sort((a,b) => (b.pt-a.pt) || (b.gd-a.gd) || (b.gf-a.gf));
}

/** Determina i terzi classificati qualificati e i loro slot nel bracket. */
export function calcola3rdiSlots(pronosticiGironi, db) {
  const terzi = {};
  Object.keys(db.gironi).forEach(lettera => {
    const cl = getClassificaGirone(lettera, pronosticiGironi, db);
    if (cl.length < 3 || cl[2].g === 0) return;
    const t = cl[2];
    terzi[lettera] = { teamId: t.id, pt: t.pt, gd: t.gd, gf: t.gf };
  });
  const sorted = Object.entries(terzi).sort(([,a],[,b]) => b.pt-a.pt || b.gd-a.gd || b.gf-a.gf);
  if (sorted.length < 8) return null;
  const qualGroups = sorted.slice(0,8).map(([l]) => l).sort().join('');
  const combo = COMB_3I[qualGroups];
  if (!combo) return null;
  const result = {};
  COMB_SLOT_ORDER.forEach((slot, i) => {
    result[slot] = terzi[combo[i]]?.teamId || null;
  });
  return result;
}

/** Risolve uno slot di sedicesimi → team ID. */
export function resolveSlot(slotDef, standings, terziSlots) {
  if (slotDef.t === '1') return standings[slotDef.g]?.[0] || null;
  if (slotDef.t === '2') return standings[slotDef.g]?.[1] || null;
  if (slotDef.t === '3slot') return terziSlots ? (terziSlots[slotDef.slot] || null) : null;
  return null;
}

/** Recupera il vincitore pronosticato di un match. */
function getVincitore(fase, matchId, pronostici) {
  return pronostici?.fase_eliminatoria?.[fase]?.[matchId]?.vincitore || null;
}

// ══════════════════════════════════════════════════════
// RENDER RIEPILOGO GIRONI (read-only)
// ══════════════════════════════════════════════════════
export function renderRiepilogoGironi(container, pronostici, db) {
  if (!container) return;
  const squadre = db.squadre || {};
  const pGironi = pronostici?.gironi || {};
  const lettere = Object.keys(db.gironi);

  let gridHtml = '<div class="riepilogo-grid">';
  lettere.forEach(lettera => {
    const cl = getClassificaGirone(lettera, pGironi, db);
    const hasData = cl.some(t => t.g > 0);
    gridHtml += '<div class="riepilogo-card">'
      + '<div class="riepilogo-card-header">Girone ' + lettera + '</div>'
      + '<table class="riepilogo-table">'
      + '<thead><tr><th>#</th><th>Squadra</th><th>Pt</th><th>GD</th></tr></thead>'
      + '<tbody>';
    cl.forEach((t, i) => {
      const sq = squadre[t.id];
      const gdStr = t.gd >= 0 ? '+' + t.gd : '' + t.gd;
      const gdCls = t.gd > 0 ? 'gd-pos' : t.gd < 0 ? 'gd-neg' : '';
      const rowCls = i < 2 ? 'qualificata' : i === 2 ? 'terza' : '';
      gridHtml += '<tr class="' + rowCls + '">'
        + '<td class="riepilogo-pos">' + (i + 1) + '</td>'
        + '<td class="riepilogo-team">' + (sq?.flag || '') + ' ' + (sq?.nome || t.id) + '</td>'
        + '<td class="riepilogo-pt">' + (hasData ? t.pt : '—') + '</td>'
        + '<td class="riepilogo-gd">' + (hasData ? '<span class="' + gdCls + '">' + gdStr + '</span>' : '—') + '</td>'
        + '</tr>';
    });
    gridHtml += '</tbody></table></div>';
  });
  gridHtml += '</div>';

  container.innerHTML = gridHtml;
}

// ══════════════════════════════════════════════════════
// RENDER TABELLONE (read-only, stessa grafica di pronostici.js)
// ══════════════════════════════════════════════════════
export function renderTabellone(container, pronostici, db) {
  if (!container) return;
  const squadre = db.squadre || {};
  const pGironi = pronostici?.gironi || {};

  // Calcola standings
  const standings = {};
  Object.keys(db.gironi).forEach(l => {
    const cl = getClassificaGirone(l, pGironi, db);
    standings[l] = cl.map(t => t.id);
  });
  const terziSlots = calcola3rdiSlots(pGironi, db);

  function vinc(fase, matchId) { return getVincitore(fase, matchId, pronostici); }

  function teamId(slotOrFeed, fromFase) {
    if (!slotOrFeed) return null;
    if (fromFase) return vinc(fromFase, slotOrFeed) || null;
    return resolveSlot(slotOrFeed, standings, terziSlots) || null;
  }

  function cell(id, rowStart, rowEnd, casaId, trasfId, vincitoreId, faseId) {
    const casa = casaId ? squadre[casaId] : null;
    const trasf = trasfId ? squadre[trasfId] : null;
    const colOf = { sedicesimi:1, ottavi:2, quarti:3, semifinali:4, finale:5 };
    const mkTeam = (tid, sq) => {
      if (!tid) return '<div class="tb-team tb-unknown">?</div>';
      const w = vincitoreId === tid ? ' tb-winner' : '';
      return '<div class="tb-team' + w + '">' + (sq?.flag || '') + ' <span>' + (sq?.nome || tid) + '</span></div>';
    };
    return '<div class="tb-cell" style="grid-row:' + rowStart + '/' + rowEnd + ';grid-column:' + colOf[faseId] + '">'
      + mkTeam(casaId, casa) + '<div class="tb-sep"></div>' + mkTeam(trasfId, trasf) + '</div>';
  }

  let html = '<div class="tb-wrapper"><div class="tb-header">';
  ['Sedicesimi','Ottavi','Quarti','Semifinali','Finale'].forEach((l, i) => {
    html += '<div class="tb-col-label" style="grid-column:' + (i+1) + '">' + l + '</div>';
  });
  html += '</div><div class="tb-grid">';

  // Sedicesimi
  SEDICESIMI_BRACKET.forEach((b, i) => {
    const row = i + 1;
    const casaId  = teamId(b.casa,  null);
    const trasfId = teamId(b.trasf, null);
    html += cell(b.id, row, row + 1, casaId, trasfId, vinc('sedicesimi', b.id), 'sedicesimi');
  });

  // Ottavi
  ['O1','O2','O3','O4','O5','O6','O7','O8'].forEach((oid, i) => {
    const row = i * 2 + 1;
    const feed = BRACKET_FEEDS[oid];
    html += cell(oid, row, row + 2,
      vinc('sedicesimi', feed.casa.id), vinc('sedicesimi', feed.trasf.id),
      vinc('ottavi', oid), 'ottavi');
  });

  // Quarti
  ['Q1','Q2','Q3','Q4'].forEach((qid, i) => {
    const row = i * 4 + 1;
    const feed = BRACKET_FEEDS[qid];
    html += cell(qid, row, row + 4,
      vinc('ottavi', feed.casa.id), vinc('ottavi', feed.trasf.id),
      vinc('quarti', qid), 'quarti');
  });

  // Semifinali
  [['SF1',1],['SF2',9]].forEach(([sfid, row]) => {
    const feed = BRACKET_FEEDS[sfid];
    html += cell(sfid, row, row + 8,
      vinc('quarti', feed.casa.id), vinc('quarti', feed.trasf.id),
      vinc('semifinali', sfid), 'semifinali');
  });

  // Finale
  {
    const feed = BRACKET_FEEDS['F'];
    html += cell('F', 1, 17,
      vinc('semifinali', feed.casa.id), vinc('semifinali', feed.trasf.id),
      vinc('finale', 'F'), 'finale');
  }

  html += '</div>';

  const campione = vinc('finale', 'F');
  if (campione) {
    const sq = squadre[campione];
    html += '<div class="tb-campione">🏆 ' + (sq?.flag || '') + ' ' + (sq?.nome || campione) + '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}
