const cp850 = 
  '\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0B\f\r\x0E\x0F' +
  '\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F' +
  ' !"#$%&\'()*+,-./0123456789:;<=>?' +
  '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_' +
  '`abcdefghijklmnopqrstuvwxyz{|}~\x7F' +
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒ' +
  'áíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐' +
  '└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀' +
  'ÓßÔÒõÕµþÞÚÛÙýÝ¯´\xAD±‗¾¶§÷¸°¨·¹³²■\xA0';

const charToByte = {};
for (let i = 0; i < 256; i++) {
  charToByte[cp850[i]] = i;
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

const garbled2 = 'Isn─üd';
console.log('Fixed2:', fixMojibake(garbled2));
