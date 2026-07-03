const cp437 = ' ☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼' +
              ' !"#$%&\'()*+,-./0123456789:;<=>?' +
              '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_' +
              '`abcdefghijklmnopqrstuvwxyz{|}~⌂' +
              'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒ' +
              'áíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐' +
              '└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
              'αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';

const charToByte = {};
for (let i = 0; i < 256; i++) {
  charToByte[cp437[i]] = i;
}
charToByte['\u00A0'] = 255;

function fixMojibake(str) {
  if (!str) return str;
  let bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    let b = charToByte[c];
    if (b === undefined) {
      b = c.charCodeAt(0);
    }
    bytes.push(b);
  }
  return Buffer.from(bytes).toString('utf8');
}

const garbled = 'ÔÇ£AllahÔÇÖs Messenger (Allah bless him and give him peace) was neither';
console.log('Fixed:', fixMojibake(garbled));

const garbled2 = 'The Noble Features Of Rasoolullah Ï¿ÏºÏ¿ ┘àÏº Ï¼ÏºÏí ┘ü┘è Ï«┘ä┘é Ï▒Ï│┘ê┘ä Ïº┘ä┘ä┘ç ÏÁ┘ä┘ë Ïº┘ä┘ä┘ç Ï╣┘ä┘è┘ç ┘êÏ│┘ä┘à';
console.log('Fixed2:', fixMojibake(garbled2));
